#!/usr/bin/env python3
"""
从 TAPD 实体 ID 中提取 workspace_id。

TAPD 实体 ID 格式：11{workspace_id}00{sequential}
workspace_id 位于索引 2-9（共 8 位），从第 3 位开始取 8 个字符。

用法：
    python extract_workspace_id.py <entity_id>
    python extract_workspace_id.py 1138260062001029247

输出：
    38260062
"""

import sys


def extract_workspace_id(entity_id: str) -> str:
    """
    从 TAPD 实体 ID 中提取 workspace_id。

    格式：11{8位workspace_id}00{剩余序列号}
    提取索引 2 到 9（共 8 个字符）。

    Args:
        entity_id: TAPD 实体 ID，如 "1138260062001029247"

    Returns:
        workspace_id 字符串

    Raises:
        ValueError: 如果 ID 格式不符合预期
    """
    entity_id = str(entity_id).strip()

    # 格式校验：至少 12 位（11 + 8位workspace_id + 00）
    if len(entity_id) < 12:
        raise ValueError(
            f"ID 长度不足（至少需要 12 位，当前 {len(entity_id)} 位）：{entity_id}"
        )

    # 前缀校验：以 "11" 开头
    if not entity_id.startswith("11"):
        raise ValueError(
            f"ID 前缀不符（期望以 '11' 开头）：{entity_id}"
        )

    # 提取索引 2-9 共 8 位（第 3-10 个字符，1-indexed）
    workspace_id = entity_id[2:10]

    # 校验提取结果全为数字
    if not workspace_id.isdigit():
        raise ValueError(
            f"workspace_id 包含非数字字符：{workspace_id}"
        )

    return workspace_id


def main():
    if len(sys.argv) < 2:
        print("用法：python extract_workspace_id.py <entity_id>", file=sys.stderr)
        print("示例：python extract_workspace_id.py 1138260062001029247", file=sys.stderr)
        sys.exit(1)

    entity_id = sys.argv[1]

    try:
        workspace_id = extract_workspace_id(entity_id)
        print(workspace_id)
    except ValueError as e:
        print(f"错误：{e}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
