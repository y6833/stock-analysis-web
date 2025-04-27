'''
Created on 2020年1月30日

@author: JM
'''
import pandas as pd
import tushare as ts
from sqlalchemy import create_engine

engine_ts = create_engine('mysql+pymysql://root:root@127.0.0.1:3306/stock_analysis?charset=utf8&use_unicode=1')

def read_data():
    sql = """SELECT * FROM stock_basic LIMIT 20"""
    df = pd.read_sql_query(sql, engine_ts)
    return df


def write_data(df):
    res = df.to_sql('stock_basic', engine_ts, index=False, if_exists='append', chunksize=5000)
    print(res)


def get_data():
    # 设置Tushare Pro的token
    ts.set_token('983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61')
    pro = ts.pro_api()

    # 添加重试机制
    max_retries = 3
    retry_delay = 60  # 60秒

    for retry in range(max_retries):
        try:
            df = pro.stock_basic()
            return df
        except Exception as e:
            if "每分钟最多访问该接口" in str(e) and retry < max_retries - 1:
                print(f"API访问频率限制，等待{retry_delay}秒后重试...")
                import time
                time.sleep(retry_delay)
            else:
                raise e

    # 如果所有重试都失败，返回空DataFrame
    return pd.DataFrame()


if __name__ == '__main__':
    try:
        # 首先检查数据库中是否已有数据
        try:
            existing_df = read_data()
            print(f"数据库中已有{len(existing_df)}条记录")

            if len(existing_df) > 0:
                print("数据库中已有股票基本信息，如需更新请手动清空表后重新运行")
                print("示例SQL: TRUNCATE TABLE stock_basic;")
                exit(0)
        except Exception as e:
            print(f"读取数据库失败，可能是表不存在: {e}")
            print("继续获取数据并写入数据库...")

        # 获取数据
        print("从Tushare获取股票基本信息...")
        df = get_data()

        if df.empty:
            print("未获取到数据，请检查Tushare API是否正常")
            exit(1)

        print(f"成功获取{len(df)}条股票基本信息")

        # 写入数据库
        print("正在写入数据库...")
        write_data(df)
        print("数据写入完成!")

        # 显示部分数据
        print("\n数据示例:")
        print(df.head(5))

    except Exception as e:
        print(f"程序执行出错: {e}")