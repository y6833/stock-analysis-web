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


def create_stock_basic_table():
    """创建stock_basic表（如果不存在）"""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS stock_basic (
        ts_code VARCHAR(10) PRIMARY KEY,
        symbol VARCHAR(10),
        name VARCHAR(100),
        area VARCHAR(50),
        industry VARCHAR(50),
        cnspell VARCHAR(20),
        market VARCHAR(20),
        list_date VARCHAR(10),
        act_name VARCHAR(100),
        act_ent_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """

    try:
        # 使用pymysql直接执行SQL
        import pymysql
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='root',
            database='stock_analysis',
            charset='utf8mb4'
        )

        try:
            with conn.cursor() as cursor:
                cursor.execute(create_table_sql)
            conn.commit()
            print("stock_basic表创建成功或已存在")
            return True
        finally:
            conn.close()
    except Exception as e:
        print(f"创建表失败: {e}")
        return False


def load_sample_data():
    """加载示例数据"""
    # 创建一个包含几条示例数据的DataFrame
    data = {
        'ts_code': ['000001.SZ', '000002.SZ', '000004.SZ', '000006.SZ', '000007.SZ'],
        'symbol': ['000001', '000002', '000004', '000006', '000007'],
        'name': ['平安银行', '万科A', '国华网安', '深振业A', '全新好'],
        'area': ['深圳', '深圳', '深圳', '深圳', '深圳'],
        'industry': ['银行', '全国地产', '软件服务', '区域地产', '其他商业'],
        'cnspell': ['payh', 'wka', 'ghwa', 'szya', 'qxh'],
        'market': ['主板', '主板', '主板', '主板', '主板'],
        'list_date': ['19910403', '19910129', '19910114', '19920427', '19920413'],
        'act_name': ['无实际控制人', '深圳市人民政府国有资产监督管理委员会', '李映彤', '深圳市人民政府国有资产监督管理委员会', '王玩虹'],
        'act_ent_type': ['无', '地方国企', '民营企业', '地方国企', '民营企业']
    }
    return pd.DataFrame(data)


if __name__ == '__main__':
    import argparse

    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='股票基本信息数据库导入工具')
    parser.add_argument('--use-sample', action='store_true', help='使用示例数据而不是从Tushare获取')
    parser.add_argument('--create-table', action='store_true', help='仅创建表结构')
    args = parser.parse_args()

    try:
        # 如果只需要创建表
        if args.create_table:
            create_stock_basic_table()
            print("表结构创建完成，退出程序")
            exit(0)

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
            print("尝试创建表结构...")
            create_stock_basic_table()
            print("继续获取数据并写入数据库...")

        # 获取数据
        if args.use_sample:
            print("使用示例数据...")
            df = load_sample_data()
        else:
            print("从Tushare获取股票基本信息...")
            df = get_data()

        if df.empty:
            print("未获取到数据，请检查数据源是否正常")
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