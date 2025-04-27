#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import traceback
import logging
import pandas as pd
import tushare as ts
from sqlalchemy import create_engine

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# 数据库连接
engine_ts = create_engine('mysql+pymysql://root:root@127.0.0.1:3306/stock_analysis?charset=utf8&use_unicode=1')

# Tushare API Token
TUSHARE_TOKEN = '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61'

def test_connection():
    """测试与 Tushare API 的连接"""
    try:
        # 设置 Tushare API Token
        ts.set_token(TUSHARE_TOKEN)
        pro = ts.pro_api()

        # 尝试获取股票列表，如果成功则连接正常
        df = pro.stock_basic(limit=5)

        if not df.empty:
            return {
                'success': True,
                'message': 'Tushare API 连接成功',
                'data': df.to_dict('records')
            }
        else:
            return {
                'success': False,
                'message': 'Tushare API 返回空数据'
            }
    except Exception as e:
        return {
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }

def update_stock_basic():
    """更新股票基本信息到数据库"""
    try:
        # 设置 Tushare API Token
        ts.set_token(TUSHARE_TOKEN)
        pro = ts.pro_api()

        # 尝试获取股票列表
        try:
            df = pro.stock_basic()

            if df.empty:
                return {
                    'success': False,
                    'message': 'Tushare API 返回空数据'
                }

            # 清空表
            try:
                with engine_ts.connect() as conn:
                    conn.execute("TRUNCATE TABLE stock_basic")
                    print("表已清空")
            except Exception as e:
                print(f"清空表失败: {e}")
                # 如果表不存在，创建表
                df.to_sql('stock_basic', engine_ts, index=False, if_exists='replace', chunksize=5000)
                print("表已创建")

            # 写入数据
            df.to_sql('stock_basic', engine_ts, index=False, if_exists='append', chunksize=5000)

            return {
                'success': True,
                'message': f'成功更新 {len(df)} 条股票基本信息到数据库',
                'data': {
                    'count': len(df),
                    'sample': df.head(5).to_dict('records')
                }
            }
        except Exception as e:
            if "每分钟最多访问该接口" in str(e):
                return {
                    'success': False,
                    'message': 'API 访问频率限制，请稍后再试',
                    'error': str(e)
                }
            else:
                raise e
    except Exception as e:
        return {
            'success': False,
            'message': f'更新股票基本信息失败: {str(e)}',
            'traceback': traceback.format_exc()
        }

def get_stock_basic():
    """获取股票基本信息（优先从 API 获取，失败则从数据库读取）"""
    try:
        # 首先尝试从 Tushare API 获取最新数据
        try:
            # 设置 Tushare API Token
            ts.set_token(TUSHARE_TOKEN)
            pro = ts.pro_api()

            # 获取股票列表
            df = pro.stock_basic()

            if not df.empty:
                # 更新数据库
                try:
                    # 清空表
                    with engine_ts.connect() as conn:
                        conn.execute("TRUNCATE TABLE stock_basic")

                    # 写入数据
                    df.to_sql('stock_basic', engine_ts, index=False, if_exists='append', chunksize=5000)
                    # 使用日志记录而不是直接打印
                    logging.info("数据库已更新")
                except Exception as e:
                    # 使用日志记录而不是直接打印
                    logging.error(f"更新数据库失败: {e}")

                return {
                    'success': True,
                    'message': f'成功从 Tushare API 获取 {len(df)} 条股票基本信息',
                    'data': df.to_dict('records'),
                    'source': 'api'
                }
        except Exception as e:
            logging.error(f"从 Tushare API 获取数据失败: {e}")
            if "每分钟最多访问该接口" not in str(e):
                # 如果不是频率限制错误，直接抛出
                raise e

        # 如果 API 获取失败，从数据库读取
        try:
            sql = """SELECT * FROM stock_basic"""
            df = pd.read_sql_query(sql, engine_ts)

            if not df.empty:
                return {
                    'success': True,
                    'message': f'成功从数据库获取 {len(df)} 条股票基本信息',
                    'data': df.to_dict('records'),
                    'source': 'database'
                }
            else:
                return {
                    'success': False,
                    'message': '数据库中没有股票基本信息'
                }
        except Exception as e:
            return {
                'success': False,
                'message': f'从数据库获取数据失败: {str(e)}',
                'error': str(e)
            }
    except Exception as e:
        return {
            'success': False,
            'message': f'获取股票基本信息失败: {str(e)}',
            'traceback': traceback.format_exc()
        }

if __name__ == "__main__":
    # 设置标准输出编码为 UTF-8
    import io
    import sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': '缺少操作参数'}, ensure_ascii=False))
        sys.exit(1)

    action = sys.argv[1]

    try:
        if action == 'test_connection':
            result = test_connection()
        elif action == 'update_stock_basic':
            result = update_stock_basic()
        elif action == 'get_stock_basic':
            result = get_stock_basic()
        else:
            result = {'success': False, 'message': f'不支持的操作: {action}'}

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }, ensure_ascii=False))
