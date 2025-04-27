#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys

try:
    import akshare
    print(f"AKShare 已安装，版本: {akshare.__version__}")
    
    # 尝试获取股票列表
    try:
        stock_df = akshare.stock_zh_a_spot_em()
        print(f"成功获取股票列表，共 {len(stock_df)} 条记录")
        print("前 5 条记录:")
        print(stock_df.head(5))
    except Exception as e:
        print(f"获取股票列表失败: {e}")
except ImportError:
    print("AKShare 未安装，请安装后再试")
    print("安装命令: pip install akshare")
    sys.exit(1)
