#!/usr/bin/env python3
"""
Start one or more servers, wait for them to be ready, run a command, then **always** clean up.

生命周期契约（与 references/cross-cutting.md 五 一致）：
  1. 启动前预检端口：已被占用则拒绝启动（避免连到上次残留的旧进程产生「假绿」）；
  2. 启动后等待端口就绪；失败时打印服务日志尾部并回收；
  3. 无论测试成功、失败、异常还是 Ctrl+C，都在 finally 中回收**整棵进程树**
     （Windows 上仅 terminate() 只会杀掉 cmd/shell，node 子进程会残留并占住端口）；
  4. 回收后逐个校验端口是否真正释放；仍被占用时以退出码 3 失败，避免静默泄漏。

Usage:
    # Single server
    python scripts/with_server.py --server "npm run dev" --port 5173 -- python automation.py
    python scripts/with_server.py --server "npm start" --port 3000 -- python test.py

    # Multiple servers
    python scripts/with_server.py \
      --server "cd backend && python server.py" --port 3000 \
      --server "cd frontend && npm run dev" --port 5173 \
      -- python test.py

    # 排查用：保留服务不回收（显式 opt-out，仅限人工调试）
    python scripts/with_server.py --server "npm run dev" --port 5173 --keep -- python probe.py

退出码:
    0  测试命令成功且所有端口已释放
    2  参数错误 / 端口预检失败（疑似上次残留）
    3  测试成功但进程/端口未完全释放（资源泄漏）
    *  其余为被测命令自身的退出码
"""

import argparse
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time

IS_WIN = os.name == 'nt'
READY_POLL_INTERVAL = 0.5


def port_listening(port, timeout=0.6):
    """端口是否已有监听（同时探测 IPv4 / IPv6 回环）。"""
    for host in ('127.0.0.1', '::1'):
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False


def wait_for_server(port, timeout):
    """轮询等待端口就绪，返回是否成功。"""
    start = time.time()
    while time.time() - start < timeout:
        if port_listening(port):
            return True
        time.sleep(READY_POLL_INTERVAL)
    return False


def wait_for_release(port, timeout):
    """等待端口释放（回收后校验用）。"""
    start = time.time()
    while time.time() - start < timeout:
        if not port_listening(port, timeout=0.3):
            return True
        time.sleep(0.3)
    return not port_listening(port, timeout=0.3)


def tail(path, lines=20):
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.readlines()
        return ''.join(content[-lines:])
    except OSError:
        return ''


def start_server(cmd, log_path):
    """启动服务：独立进程组/会话，输出重定向到日志文件（避免 PIPE 缓冲区写满导致死锁）。"""
    log_file = open(log_path, 'wb')
    kwargs = {
        'shell': True,
        'stdout': log_file,
        'stderr': subprocess.STDOUT,
        'stdin': subprocess.DEVNULL,
    }
    if IS_WIN:
        # 独立进程组，便于 taskkill /T 精确终止整棵树
        kwargs['creationflags'] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        # 独立会话，便于 killpg 终止整棵树
        kwargs['start_new_session'] = True
    process = subprocess.Popen(cmd, **kwargs)
    return process, log_file


def terminate_tree(process, grace):
    """终止进程及其整棵子进程树。"""
    if process is None or process.poll() is not None:
        return
    if IS_WIN:
        subprocess.run(
            ['taskkill', '/PID', str(process.pid), '/T', '/F'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    else:
        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except OSError:
            try:
                process.terminate()
            except OSError:
                pass
        try:
            process.wait(timeout=grace)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            except OSError:
                pass
    try:
        process.wait(timeout=grace)
    except subprocess.TimeoutExpired:
        pass


def main():
    parser = argparse.ArgumentParser(description='Run command with one or more servers (auto cleanup)')
    parser.add_argument('--server', action='append', dest='servers', required=True, help='Server command (can be repeated)')
    parser.add_argument('--port', action='append', dest='ports', type=int, required=True, help='Port for each server (must match --server count)')
    parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds per server (default: 30)')
    parser.add_argument('--grace', type=int, default=8, help='Grace seconds for process shutdown (default: 8)')
    parser.add_argument('--log-dir', default=None, help='Directory for server logs (default: temp dir)')
    parser.add_argument('--keep', action='store_true', help='DANGER: keep servers running after the command (manual debugging only)')
    parser.add_argument('command', nargs=argparse.REMAINDER, help='Command to run after server(s) ready')

    args = parser.parse_args()

    if args.command and args.command[0] == '--':
        args.command = args.command[1:]

    if not args.command:
        print('Error: No command specified to run')
        return 2

    if len(args.servers) != len(args.ports):
        print('Error: Number of --server and --port arguments must match')
        return 2

    servers = [{'cmd': cmd, 'port': port} for cmd, port in zip(args.servers, args.ports)]

    # ── 预检：端口已被占用 → 拒绝启动（大概率是上次残留） ──────────────
    busy = [s for s in servers if port_listening(s['port'])]
    if busy:
        for s in busy:
            print(f"Error: 端口 {s['port']} 已被占用（可能上次自测进程未回收）: {s['cmd']}")
        print('请先回收残留进程，例如：')
        print('  node scripts/fw-process.cjs check <任务名>')
        print('  node scripts/fw-process.cjs cleanup <任务名>')
        print('确认端口占用者与本任务无关后，再改用其他空闲端口。')
        return 2

    log_dir = args.log_dir or tempfile.mkdtemp(prefix='fw-server-logs-')
    os.makedirs(log_dir, exist_ok=True)

    server_processes = []
    log_files = []
    exit_code = 1
    startup_failed = False

    def _on_sigterm(signum, frame):
        raise SystemExit(143)

    try:
        signal.signal(signal.SIGTERM, _on_sigterm)
    except (ValueError, OSError):
        pass

    try:
        for i, server in enumerate(servers):
            print(f"Starting server {i+1}/{len(servers)}: {server['cmd']}")
            log_path = os.path.join(log_dir, f"server-{i+1}-{server['port']}.log")
            process, log_file = start_server(server['cmd'], log_path)
            server_processes.append(process)
            log_files.append(log_file)

            print(f"Waiting for server on port {server['port']}...")
            if not wait_for_server(server['port'], args.timeout):
                print(f"Error: Server failed to start on port {server['port']} within {args.timeout}s")
                out = tail(log_path).strip()
                if out:
                    print(f"--- server log tail ({log_path}) ---")
                    print(out)
                exit_code = 1
                startup_failed = True
                break
            print(f"Server ready on port {server['port']}")

        if not startup_failed:
            print(f"\nAll {len(servers)} server(s) ready")

            print(f"Running: {' '.join(args.command)}\n")
            result = subprocess.run(args.command)
            exit_code = result.returncode

    except KeyboardInterrupt:
        exit_code = 130
        print('\nInterrupted by user')
    finally:
        if args.keep:
            print('\n--keep 指定：跳过进程回收（请自行确认这些进程会被关闭）')
            for i, process in enumerate(server_processes):
                print(f"  server {i+1}: pid={process.pid} (port={servers[i]['port']})")
        else:
            print(f"\nStopping {len(server_processes)} server(s)...")
            for i, process in enumerate(server_processes):
                terminate_tree(process, args.grace)
                print(f"Server {i+1} stopped (pid={process.pid})")

            leaked = []
            for server in servers:
                if wait_for_release(server['port'], args.grace + 2):
                    print(f"Port {server['port']} released")
                else:
                    leaked.append(server['port'])
                    print(f"WARN: Port {server['port']} still occupied after cleanup")

            if leaked:
                print(
                    'ERROR: 进程回收不完整，端口仍被占用: ' + ', '.join(str(p) for p in leaked) + '\n'
                    '请执行 node scripts/fw-process.cjs cleanup <任务名> 或人工结束占用进程。'
                )
                if exit_code == 0:
                    exit_code = 3

        for f in log_files:
            try:
                f.close()
            except OSError:
                pass

    return exit_code


if __name__ == '__main__':
    code = main()
    sys.exit(code if code is not None else 0)
