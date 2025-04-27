'''
初始化数据库脚本
'''
import pymysql
from pymysql import Error

def create_database():
    try:
        # 连接到MySQL服务器
        connection = pymysql.connect(
            host="127.0.0.1",
            user="root",
            password="root"
        )

        # pymysql 没有 is_connected() 方法，直接使用连接
        if connection:
            cursor = connection.cursor()

            # 创建数据库
            cursor.execute("CREATE DATABASE IF NOT EXISTS stock_analysis")
            print("数据库 'stock_analysis' 创建成功或已存在")

            # 使用数据库
            cursor.execute("USE stock_analysis")

            # 创建stock_basic表
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS stock_basic (
                ts_code VARCHAR(10) PRIMARY KEY,
                symbol VARCHAR(10),
                name VARCHAR(100),
                area VARCHAR(50),
                industry VARCHAR(50),
                market VARCHAR(50),
                list_date DATE,
                fullname VARCHAR(100),
                enname VARCHAR(100),
                cnspell VARCHAR(50),
                exchange VARCHAR(50),
                curr_type VARCHAR(50),
                list_status VARCHAR(10),
                delist_date DATE,
                is_hs VARCHAR(10)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            print("表 'stock_basic' 创建成功或已存在")

    except Error as e:
        print(f"连接数据库时出错: {e}")
    finally:
        if 'connection' in locals() and connection:
            cursor.close()
            connection.close()
            print("MySQL连接已关闭")

if __name__ == "__main__":
    create_database()
    print("数据库初始化完成")
