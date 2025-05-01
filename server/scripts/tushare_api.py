#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import traceback
import logging
import pandas as pd
import tushare as ts
import datetime
import time
from sqlalchemy import create_engine, text

# 自定义 JSON 编码器，处理日期类型
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# 数据库连接
engine_ts = create_engine('mysql+pymysql://root:root@127.0.0.1:3306/stock_analysis?charset=utf8&use_unicode=1')

# Tushare API Token
TUSHARE_TOKEN = '983b25aa025eee598034c4741dc776ddc53ddcffbb180cf61'

def test_connection():
    """测试与 Tushare API 的连接"""
    try:
        # 首先检查数据库中是否有数据
        try:
            # 检查是否存在股票基本信息表
            with engine_ts.connect() as conn:
                result = conn.execute(text("SHOW TABLES LIKE 'stock_basic'"))
                table_exists = result.fetchone() is not None

            if table_exists:
                # 检查表中是否有数据
                with engine_ts.connect() as conn:
                    result = conn.execute(text("SELECT COUNT(*) FROM stock_basic"))
                    count = result.fetchone()[0]

                if count > 0:
                    # 检查数据更新时间
                    try:
                        with engine_ts.connect() as conn:
                            result = conn.execute(text("SELECT last_update FROM data_update_time WHERE table_name = 'stock_basic'"))
                            update_record = result.fetchone()

                        if update_record:
                            last_update = update_record[0]
                            time_diff = datetime.datetime.now() - last_update
                            hours_ago = round(time_diff.total_seconds() / 3600, 1)

                            return {
                                'success': True,
                                'message': f'数据库中已有股票数据，{hours_ago}小时前更新，无需连接 API',
                                'data_source': 'database',
                                'record_count': count,
                                'last_update': last_update.isoformat()
                            }
                    except Exception as e:
                        logging.warning(f"检查数据更新时间失败: {e}")
        except Exception as e:
            logging.warning(f"检查数据库状态失败: {e}")

        # 如果数据库中没有数据或检查失败，则尝试连接 API
        # 设置 Tushare API Token
        ts.set_token(TUSHARE_TOKEN)
        pro = ts.pro_api()

        # 尝试获取股票列表，如果成功则连接正常
        df = pro.stock_basic(limit=5)

        if not df.empty:
            return {
                'success': True,
                'message': 'Tushare API 连接成功',
                'data_source': 'api',
                'data': df.to_dict('records')
            }
        else:
            return {
                'success': False,
                'message': 'Tushare API 返回空数据'
            }
    except Exception as e:
        if "每分钟最多访问该接口" in str(e):
            return {
                'success': False,
                'message': 'API 访问频率限制，请稍后再试',
                'error': str(e)
            }
        else:
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
                    conn.execute(text("TRUNCATE TABLE stock_basic"))
                    logging.info("表已清空")
            except Exception as e:
                logging.error(f"清空表失败: {e}")
                # 如果表不存在，创建表
                df.to_sql('stock_basic', engine_ts, index=False, if_exists='replace', chunksize=5000)
                logging.info("表已创建")

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
    """获取股票基本信息（优先从数据库读取，必要时从 API 更新）"""
    try:
        # 检查数据库中是否有数据以及数据的更新时间
        try:
            # 首先尝试从数据库读取
            try:
                # 检查是否存在更新时间记录表
                with engine_ts.connect() as conn:
                    result = conn.execute(text("SHOW TABLES LIKE 'data_update_time'"))
                    table_exists = result.fetchone() is not None

                if not table_exists:
                    # 创建更新时间记录表
                    with engine_ts.connect() as conn:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS data_update_time (
                                table_name VARCHAR(50) PRIMARY KEY,
                                last_update DATETIME NOT NULL
                            )
                        """))
                    logging.info("创建数据更新时间记录表")

                # 查询股票基本信息
                sql = """SELECT * FROM stock_basic"""
                df = pd.read_sql_query(sql, engine_ts)

                # 检查数据是否为空
                if df.empty:
                    logging.info("数据库中没有股票基本信息，将从 API 获取")
                    return fetch_from_api_and_update_db()

                # 检查数据更新时间
                with engine_ts.connect() as conn:
                    result = conn.execute(text("SELECT last_update FROM data_update_time WHERE table_name = 'stock_basic'"))
                    update_record = result.fetchone()

                # 如果没有更新记录或者数据已经超过24小时，则从 API 更新
                current_time = datetime.datetime.now()
                if update_record is None:
                    logging.info("没有找到数据更新记录，但数据库中已有数据，将使用数据库数据并记录更新时间")
                    # 记录当前数据更新时间
                    with engine_ts.connect() as conn:
                        conn.execute(text("""
                            INSERT INTO data_update_time (table_name, last_update)
                            VALUES ('stock_basic', :current_time)
                            ON DUPLICATE KEY UPDATE last_update = :current_time
                        """), {"current_time": current_time})
                    return {
                        'success': True,
                        'message': f'成功从数据库获取 {len(df)} 条股票基本信息',
                        'data': df.to_dict('records'),
                        'source': 'database',
                        'update_status': '首次使用，已记录更新时间'
                    }
                else:
                    last_update = update_record[0]
                    time_diff = current_time - last_update

                    # 如果数据超过24小时，尝试从 API 更新
                    if time_diff.total_seconds() > 24 * 60 * 60:
                        logging.info(f"数据已超过24小时未更新，将尝试从 API 获取最新数据。上次更新: {last_update}")
                        try:
                            # 尝试从 API 更新
                            return fetch_from_api_and_update_db()
                        except Exception as e:
                            logging.error(f"从 API 更新数据失败，将使用数据库中的数据: {e}")
                            # 如果 API 更新失败，仍然使用数据库中的数据
                            return {
                                'success': True,
                                'message': f'API 更新失败，使用数据库中的 {len(df)} 条股票基本信息',
                                'data': df.to_dict('records'),
                                'source': 'database',
                                'update_status': f'API 更新失败: {str(e)}'
                            }
                    else:
                        # 数据在24小时内，直接使用数据库中的数据
                        hours_ago = round(time_diff.total_seconds() / 3600, 1)
                        return {
                            'success': True,
                            'message': f'成功从数据库获取 {len(df)} 条股票基本信息',
                            'data': df.to_dict('records'),
                            'source': 'database',
                            'update_status': f'数据在24小时内，{hours_ago}小时前更新'
                        }
            except Exception as e:
                logging.error(f"从数据库获取数据失败: {e}")
                # 如果数据库查询失败，尝试从 API 获取
                return fetch_from_api_and_update_db()
        except Exception as e:
            logging.error(f"检查数据库状态失败: {e}")
            return {
                'success': False,
                'message': f'检查数据库状态失败: {str(e)}',
                'error': str(e)
            }
    except Exception as e:
        return {
            'success': False,
            'message': f'获取股票基本信息失败: {str(e)}',
            'traceback': traceback.format_exc()
        }

def fetch_from_api_and_update_db():
    """从 Tushare API 获取数据并更新数据库"""
    try:
        # 首先检查Redis缓存（通过调用外部API）
        # 由于Python脚本无法直接访问Redis，我们在这里记录一个日志，实际的缓存检查在Node.js层完成
        logging.info("应该先检查Redis缓存，但Python脚本无法直接访问Redis，将在Node.js层处理")

        # 设置 Tushare API Token
        ts.set_token(TUSHARE_TOKEN)
        pro = ts.pro_api()

        try:
            # 获取股票列表
            logging.info("从Tushare API获取股票列表")
            df = pro.stock_basic()

            if not df.empty:
                # 更新数据库
                try:
                    # 清空表
                    with engine_ts.connect() as conn:
                        conn.execute(text("TRUNCATE TABLE stock_basic"))

                    # 写入数据
                    df.to_sql('stock_basic', engine_ts, index=False, if_exists='append', chunksize=5000)

                    # 更新数据更新时间
                    current_time = datetime.datetime.now()
                    with engine_ts.connect() as conn:
                        conn.execute(text("""
                            INSERT INTO data_update_time (table_name, last_update)
                            VALUES ('stock_basic', :current_time)
                            ON DUPLICATE KEY UPDATE last_update = :current_time
                        """), {"current_time": current_time})

                    logging.info("数据库已更新")
                except Exception as e:
                    logging.error(f"更新数据库失败: {e}")
                    # 即使数据库更新失败，仍然返回 API 获取的数据

                return {
                    'success': True,
                    'message': f'成功从 Tushare API 获取 {len(df)} 条股票基本信息',
                    'data': df.to_dict('records'),
                    'source': 'api',
                    'update_time': datetime.datetime.now().isoformat()
                }
            else:
                # 如果API返回空数据，尝试从数据库获取
                logging.info("Tushare API返回空数据，尝试从数据库获取")
                try:
                    sql = """SELECT * FROM stock_basic"""
                    df_db = pd.read_sql_query(sql, engine_ts)

                    if not df_db.empty:
                        logging.info(f"从数据库获取到 {len(df_db)} 条股票基本信息")
                        return {
                            'success': True,
                            'message': f'API返回空数据，从数据库获取到 {len(df_db)} 条股票基本信息',
                            'data': df_db.to_dict('records'),
                            'source': 'database',
                            'update_status': 'API返回空数据，使用数据库数据'
                        }
                except Exception as db_error:
                    logging.error(f"从数据库获取数据失败: {db_error}")
        except Exception as api_error:
            # 如果API调用失败，尝试从数据库获取
            logging.error(f"从API获取数据失败: {api_error}")
            try:
                sql = """SELECT * FROM stock_basic"""
                df_db = pd.read_sql_query(sql, engine_ts)

                if not df_db.empty:
                    logging.info(f"API调用失败，从数据库获取到 {len(df_db)} 条股票基本信息")
                    return {
                        'success': True,
                        'message': f'API调用失败，从数据库获取到 {len(df_db)} 条股票基本信息',
                        'data': df_db.to_dict('records'),
                        'source': 'database',
                        'update_status': f'API调用失败: {str(api_error)}'
                    }
            except Exception as db_error:
                logging.error(f"从数据库获取数据失败: {db_error}")
                # 如果数据库也失败，则抛出原始API错误
                raise api_error
        else:
            return {
                'success': False,
                'message': 'Tushare API 返回空数据'
            }
    except Exception as e:
        if "每分钟最多访问该接口" in str(e):
            # 如果是频率限制错误，返回特定错误信息
            return {
                'success': False,
                'message': 'API 访问频率限制，请稍后再试',
                'error': str(e)
            }
        else:
            # 其他错误，抛出异常
            raise e

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

        print(json.dumps(result, ensure_ascii=False, cls=DateTimeEncoder))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'message': str(e),
            'traceback': traceback.format_exc()
        }, ensure_ascii=False, cls=DateTimeEncoder))
