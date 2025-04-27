#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import datetime
import traceback
import os
import pandas as pd

# 禁用进度条显示
os.environ['TQDM_DISABLE'] = '1'

# 设置标准输出编码为 UTF-8
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 导入 akshare
try:
    import akshare as ak
except ImportError:
    print(json.dumps({
        'success': False,
        'message': 'AKShare 库未安装，请运行 install_akshare.py 脚本安装'
    }, ensure_ascii=False))
    sys.exit(1)

def test_connection():
    """测试与 AKShare 的连接"""
    try:
        # 尝试获取上证指数行情，如果成功则连接正常
        print(json.dumps({'status': 'progress', 'message': '正在测试连接...'}, ensure_ascii=False), flush=True)

        # 使用 stock_zh_a_spot_em 函数测试连接
        # 这个函数获取A股实时行情数据，是比较稳定的API
        try:
            # 首先尝试获取A股实时行情
            stock_df = ak.stock_zh_a_spot_em()
            if not stock_df.empty:
                return {'success': True, 'message': 'AKShare API连接成功 (A股实时行情)'}
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'A股实时行情获取失败，尝试其他API: {str(e1)}'}, ensure_ascii=False), flush=True)

            try:
                # 尝试获取指数行情
                index_df = ak.index_zh_a_hist(symbol="000001", period="daily", start_date="20230101", end_date="20230110")
                if not index_df.empty:
                    return {'success': True, 'message': 'AKShare API连接成功 (指数历史数据)'}
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'指数历史数据获取失败，尝试其他API: {str(e2)}'}, ensure_ascii=False), flush=True)

                try:
                    # 尝试获取股票列表
                    stock_list = ak.stock_info_a_code_name()
                    if not stock_list.empty:
                        return {'success': True, 'message': 'AKShare API连接成功 (股票列表)'}
                except Exception as e3:
                    # 所有尝试都失败，返回错误
                    return {'success': False, 'message': f'AKShare API连接失败: {str(e3)}', 'traceback': traceback.format_exc()}

        # 如果执行到这里，说明没有成功获取数据
        return {'success': False, 'message': 'AKShare API返回空数据'}
    except Exception as e:
        return {'success': False, 'message': f"测试连接失败: {str(e)}", 'traceback': traceback.format_exc()}

def get_stock_list():
    """获取股票列表"""
    try:
        # 获取A股股票列表
        print(json.dumps({'status': 'progress', 'message': '正在获取股票列表...'}, ensure_ascii=False), flush=True)
        stock_df = ak.stock_zh_a_spot_em()

        # 如果数据为空，返回错误
        if stock_df.empty:
            return {'success': False, 'message': '获取股票列表失败，返回数据为空'}

        # 转换为标准格式
        stocks = []
        for _, row in stock_df.iterrows():
            # 确定市场（上海/深圳）
            if str(row['代码']).endswith('.SH'):
                market = '上海'
                symbol = str(row['代码'])
            elif str(row['代码']).endswith('.SZ'):
                market = '深圳'
                symbol = str(row['代码'])
            else:
                # 如果没有后缀，根据代码判断
                code = str(row['代码'])
                if code.startswith('6'):
                    market = '上海'
                    symbol = f"{code}.SH"
                elif code.startswith('0') or code.startswith('3'):
                    market = '深圳'
                    symbol = f"{code}.SZ"
                else:
                    market = '未知'
                    symbol = code

            # 检查所属行业是否存在
            industry = '未知'
            if '所属行业' in row.index and not pd.isna(row['所属行业']):
                industry = row['所属行业']

            stocks.append({
                'symbol': symbol,
                'name': row['名称'],
                'market': market,
                'industry': industry
            })

        return {'success': True, 'data': stocks}
    except Exception as e:
        return {'success': False, 'message': f"获取股票列表失败: {str(e)}", 'traceback': traceback.format_exc()}

def get_stock_quote(symbol):
    """获取股票实时行情"""
    try:
        # 转换股票代码格式
        code = format_symbol(symbol)

        # 获取股票实时行情
        stock_df = ak.stock_zh_a_spot_em()
        stock_info = stock_df[stock_df['代码'] == code].to_dict('records')

        if stock_info:
            result = {
                'success': True,
                'data': {
                    'name': stock_info[0]['名称'],
                    'price': float(stock_info[0]['最新价']),
                    'open': float(stock_info[0]['开盘价']),
                    'high': float(stock_info[0]['最高价']),
                    'low': float(stock_info[0]['最低价']),
                    'pre_close': float(stock_info[0]['昨收']),
                    'volume': int(stock_info[0]['成交量']),
                    'amount': float(stock_info[0]['成交额']),
                    'change': float(stock_info[0]['涨跌额']),
                    'pct_chg': float(stock_info[0]['涨跌幅']),
                    'date': datetime.datetime.now().strftime('%Y-%m-%d'),
                    'time': datetime.datetime.now().strftime('%H:%M:%S')
                }
            }
        else:
            result = {'success': False, 'message': '未找到股票数据'}
    except Exception as e:
        result = {'success': False, 'message': str(e), 'traceback': traceback.format_exc()}

    return result

def get_stock_history(symbol, period='daily', count=180):
    """获取股票历史数据"""
    try:
        # 转换股票代码格式
        code = format_symbol(symbol)

        # 获取股票历史数据
        if period == 'daily':
            # 日K线数据
            stock_df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date="", end_date="", adjust="")
        elif period == 'weekly':
            # 周K线数据
            stock_df = ak.stock_zh_a_hist(symbol=code, period="weekly", start_date="", end_date="", adjust="")
        elif period == 'monthly':
            # 月K线数据
            stock_df = ak.stock_zh_a_hist(symbol=code, period="monthly", start_date="", end_date="", adjust="")
        else:
            return {'success': False, 'message': f'不支持的周期: {period}'}

        # 限制数据条数
        stock_df = stock_df.tail(int(count))

        # 转换为标准格式
        history_data = []
        for _, row in stock_df.iterrows():
            history_data.append({
                'date': row['日期'],
                'open': float(row['开盘']),
                'high': float(row['最高']),
                'low': float(row['最低']),
                'close': float(row['收盘']),
                'volume': int(row['成交量']),
                'amount': float(row['成交额']) if '成交额' in row else 0
            })

        return {'success': True, 'data': history_data}
    except Exception as e:
        return {'success': False, 'message': str(e), 'traceback': traceback.format_exc()}

def search_stocks(keyword):
    """搜索股票"""
    try:
        # 获取A股股票列表
        stock_df = ak.stock_zh_a_spot_em()

        # 在名称和代码中搜索关键词
        filtered_df = stock_df[stock_df['名称'].str.contains(keyword) | stock_df['代码'].str.contains(keyword)]

        # 转换为标准格式
        stocks = []
        for _, row in filtered_df.iterrows():
            # 确定市场（上海/深圳）
            if str(row['代码']).endswith('.SH'):
                market = '上海'
                symbol = str(row['代码'])
            elif str(row['代码']).endswith('.SZ'):
                market = '深圳'
                symbol = str(row['代码'])
            else:
                # 如果没有后缀，根据代码判断
                code = str(row['代码'])
                if code.startswith('6'):
                    market = '上海'
                    symbol = f"{code}.SH"
                elif code.startswith('0') or code.startswith('3'):
                    market = '深圳'
                    symbol = f"{code}.SZ"
                else:
                    market = '未知'
                    symbol = code

            stocks.append({
                'symbol': symbol,
                'name': row['名称'],
                'market': market,
                'industry': row['所属行业'] if '所属行业' in row.index else '未知'
            })

        return {'success': True, 'data': stocks}
    except Exception as e:
        return {'success': False, 'message': str(e), 'traceback': traceback.format_exc()}

def get_financial_news(count=5):
    """获取财经新闻"""
    try:
        # 获取财经新闻
        news_df = ak.stock_news_em(symbol="")

        # 限制数据条数
        news_df = news_df.head(int(count))

        # 转换为标准格式
        news_list = []
        for _, row in news_df.iterrows():
            # 判断是否重要新闻
            title = str(row['新闻标题'])
            important = any(keyword in title for keyword in ['重要', '突发', '紧急', '央行', '国常会', '政策'])

            news_list.append({
                'title': title,
                'time': row['发布时间'],
                'source': '东方财富网',
                'url': row['新闻链接'],
                'important': important,
                'content': ''  # AKShare 不提供新闻内容
            })

        return {'success': True, 'data': news_list}
    except Exception as e:
        return {'success': False, 'message': str(e), 'traceback': traceback.format_exc()}

def format_symbol(symbol):
    """格式化股票代码"""
    # 如果已经包含.SH或.SZ后缀，直接返回
    if symbol.endswith('.SH') or symbol.endswith('.SZ'):
        return symbol

    # 如果包含sh或sz前缀，转换为.SH或.SZ后缀
    if symbol.startswith('sh'):
        return symbol[2:] + '.SH'
    if symbol.startswith('sz'):
        return symbol[2:] + '.SZ'

    # 根据股票代码规则添加后缀
    if symbol.startswith('6'):
        return symbol + '.SH'
    elif symbol.startswith('0') or symbol.startswith('3'):
        return symbol + '.SZ'
    elif symbol.startswith('4') or symbol.startswith('8'):
        return symbol + '.BJ'  # 北交所

    # 默认返回原始代码
    return symbol

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'message': '缺少操作参数'}, ensure_ascii=False))
        sys.exit(1)

    action = sys.argv[1]

    try:
        if action == 'test':
            result = test_connection()
        elif action == 'stock-list':
            result = get_stock_list()
        elif action == 'quote':
            if len(sys.argv) < 3:
                result = {'success': False, 'message': '缺少股票代码参数'}
            else:
                symbol = sys.argv[2]
                result = get_stock_quote(symbol)
        elif action == 'history':
            if len(sys.argv) < 3:
                result = {'success': False, 'message': '缺少股票代码参数'}
            else:
                symbol = sys.argv[2]
                period = sys.argv[3] if len(sys.argv) > 3 else 'daily'
                count = sys.argv[4] if len(sys.argv) > 4 else 180
                result = get_stock_history(symbol, period, count)
        elif action == 'search':
            if len(sys.argv) < 3:
                result = {'success': False, 'message': '缺少搜索关键词参数'}
            else:
                keyword = sys.argv[2]
                result = search_stocks(keyword)
        elif action == 'news':
            count = sys.argv[2] if len(sys.argv) > 2 else 5
            result = get_financial_news(count)
        else:
            result = {'success': False, 'message': f'不支持的操作: {action}'}

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'success': False, 'message': str(e), 'traceback': traceback.format_exc()}, ensure_ascii=False))
