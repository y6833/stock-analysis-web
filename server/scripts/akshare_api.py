#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
import sys
import datetime
import traceback
import os
import pandas as pd
import time
import random
import threading
import functools

# 禁用进度条显示
os.environ['TQDM_DISABLE'] = '1'

# 设置标准输出编码为 UTF-8
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 跨平台的超时装饰器
def timeout(seconds):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = [TimeoutError("操作超时")]

            def target():
                try:
                    result[0] = func(*args, **kwargs)
                except Exception as e:
                    result[0] = e

            thread = threading.Thread(target=target)
            thread.daemon = True
            thread.start()
            thread.join(seconds)

            if thread.is_alive():
                raise TimeoutError("操作超时")

            if isinstance(result[0], Exception):
                raise result[0]

            return result[0]
        return wrapper
    return decorator

# 导入 akshare
try:
    import akshare as ak
except ImportError:
    print(json.dumps({
        'success': False,
        'message': 'AKShare 库未安装，请运行 install_akshare.py 脚本安装'
    }, ensure_ascii=False))
    sys.exit(1)

@timeout(30)  # 设置30秒超时
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
                index_df = ak.stock_zh_index_daily(symbol="sh000001")
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
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "测试连接超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)
        return {
            'success': False,
            'message': f"测试连接失败: {error_message}",
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'连接测试失败: {error_message}'
        }

@timeout(30)  # 设置30秒超时
def get_stock_list():
    """获取股票列表"""
    try:
        # 获取A股股票列表
        print(json.dumps({'status': 'progress', 'message': '正在获取股票列表...'}, ensure_ascii=False), flush=True)

        # 尝试获取A股股票列表（含行业信息）
        try:
            # 使用东方财富网的数据接口获取股票列表
            stock_df = ak.stock_zh_a_spot_em()

            # 获取行业信息
            industry_df = None
            try:
                # 尝试获取行业信息
                industry_df = ak.stock_industry_category_cninfo()
            except Exception as industry_error:
                print(json.dumps({'status': 'progress', 'message': f'获取行业信息失败: {str(industry_error)}'}, ensure_ascii=False), flush=True)

            # 如果数据为空，返回错误
            if stock_df.empty:
                return {'success': False, 'message': '获取股票列表失败，返回数据为空'}

            # 转换为标准格式
            stocks = []
            for _, row in stock_df.iterrows():
                # 获取股票代码和名称
                code = str(row['代码'])
                name = row['名称']

                # 确定市场（上海/深圳）
                if code.startswith('6'):
                    market = '上海'
                    symbol = f"{code}.SH"
                elif code.startswith('0') or code.startswith('3'):
                    market = '深圳'
                    symbol = f"{code}.SZ"
                elif code.startswith('4') or code.startswith('8'):
                    market = '北京'
                    symbol = f"{code}.BJ"
                else:
                    market = '未知'
                    symbol = code

                # 获取行业信息
                industry = '未知'
                if '所属行业' in row.index and not pd.isna(row['所属行业']):
                    industry = row['所属行业']
                elif industry_df is not None:
                    # 从行业信息表中查找
                    industry_row = industry_df[industry_df['股票代码'] == code]
                    if not industry_row.empty and '所属行业' in industry_row.columns:
                        industry = industry_row.iloc[0]['所属行业']

                stocks.append({
                    'symbol': symbol,
                    'name': name,
                    'market': market,
                    'industry': industry
                })

            return {'success': True, 'data': stocks}
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'使用东方财富接口获取股票列表失败，尝试其他接口: {str(e1)}'}, ensure_ascii=False), flush=True)

            # 尝试使用另一个接口获取股票列表
            try:
                # 使用股票信息接口
                stock_info_df = ak.stock_info_a_code_name()

                # 如果数据为空，返回错误
                if stock_info_df.empty:
                    return {'success': False, 'message': '获取股票列表失败，返回数据为空'}

                # 转换为标准格式
                stocks = []
                for _, row in stock_info_df.iterrows():
                    # 获取股票代码和名称
                    code = str(row['code'])
                    name = row['name']

                    # 确定市场（上海/深圳）
                    if code.startswith('6'):
                        market = '上海'
                        symbol = f"{code}.SH"
                    elif code.startswith('0') or code.startswith('3'):
                        market = '深圳'
                        symbol = f"{code}.SZ"
                    elif code.startswith('4') or code.startswith('8'):
                        market = '北京'
                        symbol = f"{code}.BJ"
                    else:
                        market = '未知'
                        symbol = code

                    stocks.append({
                        'symbol': symbol,
                        'name': name,
                        'market': market,
                        'industry': '未知'  # 这个接口没有行业信息
                    })

                return {'success': True, 'data': stocks}
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'使用股票信息接口获取股票列表失败: {str(e2)}'}, ensure_ascii=False), flush=True)

                # 所有尝试都失败，返回预定义的主要股票列表
                mainStocks = [
                    { 'symbol': '000001.SH', 'name': '上证指数', 'market': '上海', 'industry': '指数' },
                    { 'symbol': '399001.SZ', 'name': '深证成指', 'market': '深圳', 'industry': '指数' },
                    { 'symbol': '600519.SH', 'name': '贵州茅台', 'market': '上海', 'industry': '白酒' },
                    { 'symbol': '601318.SH', 'name': '中国平安', 'market': '上海', 'industry': '保险' },
                    { 'symbol': '600036.SH', 'name': '招商银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '000858.SZ', 'name': '五粮液', 'market': '深圳', 'industry': '白酒' },
                    { 'symbol': '000333.SZ', 'name': '美的集团', 'market': '深圳', 'industry': '家电' },
                    { 'symbol': '601166.SH', 'name': '兴业银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '002415.SZ', 'name': '海康威视', 'market': '深圳', 'industry': '电子' },
                    { 'symbol': '600276.SH', 'name': '恒瑞医药', 'market': '上海', 'industry': '医药' },
                    { 'symbol': '601398.SH', 'name': '工商银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '600000.SH', 'name': '浦发银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '000001.SZ', 'name': '平安银行', 'market': '深圳', 'industry': '银行' },
                    # 可以添加更多股票
                ]

                return {'success': True, 'data': mainStocks, 'message': '使用预定义股票列表，因为API调用失败'}
    except Exception as e:
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "获取股票列表超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)
        return {
            'success': False,
            'message': f"获取股票列表失败: {error_message}",
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'获取数据失败: {error_message}'
        }

@timeout(30)  # 设置30秒超时
def get_stock_quote(symbol):
    """获取股票实时行情"""
    try:
        # 转换股票代码格式
        code = format_symbol(symbol)

        # 尝试使用东方财富网的数据接口获取实时行情
        try:
            print(json.dumps({'status': 'progress', 'message': f'正在获取{symbol}的实时行情...'}, ensure_ascii=False), flush=True)

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
                        'time': datetime.datetime.now().strftime('%H:%M:%S'),
                        'data_source': 'external_api',
                        'data_source_message': '数据来自AKShare API (东方财富)'
                    }
                }
                return result
            else:
                raise Exception('未找到股票数据')
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'使用东方财富接口获取实时行情失败，尝试其他接口: {str(e1)}'}, ensure_ascii=False), flush=True)

            # 尝试使用新浪财经的数据接口
            try:
                # 转换为新浪代码格式
                if code.endswith('.SH'):
                    sina_code = 'sh' + code[:-3]
                elif code.endswith('.SZ'):
                    sina_code = 'sz' + code[:-3]
                else:
                    sina_code = code

                # 获取股票实时行情
                stock_df = ak.stock_zh_a_daily(symbol=sina_code, adjust="")

                if not stock_df.empty:
                    # 获取最新一天的数据
                    latest_data = stock_df.iloc[0]

                    result = {
                        'success': True,
                        'data': {
                            'name': symbol,  # 新浪接口不返回股票名称，使用代码代替
                            'price': float(latest_data['close']),
                            'open': float(latest_data['open']),
                            'high': float(latest_data['high']),
                            'low': float(latest_data['low']),
                            'pre_close': float(latest_data['close']) / (1 + float(latest_data['pct_chg'])/100) if 'pct_chg' in latest_data else 0,
                            'volume': int(latest_data['volume']),
                            'amount': float(latest_data['amount']) if 'amount' in latest_data else 0,
                            'change': float(latest_data['close']) - (float(latest_data['close']) / (1 + float(latest_data['pct_chg'])/100)) if 'pct_chg' in latest_data else 0,
                            'pct_chg': float(latest_data['pct_chg']) if 'pct_chg' in latest_data else 0,
                            'date': latest_data['date'] if 'date' in latest_data else datetime.datetime.now().strftime('%Y-%m-%d'),
                            'time': datetime.datetime.now().strftime('%H:%M:%S'),
                            'data_source': 'external_api',
                            'data_source_message': '数据来自AKShare API (新浪财经)'
                        }
                    }
                    return result
                else:
                    raise Exception('未找到股票数据')
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'使用新浪接口获取实时行情失败，使用模拟数据: {str(e2)}'}, ensure_ascii=False), flush=True)

                # 生成模拟数据
                # 获取基础价格
                basePrice = 0
                stockName = ''

                # 根据股票代码设置基础价格和名称
                if symbol == '000001.SH':
                    basePrice = 3000
                    stockName = '上证指数'
                elif symbol == '399001.SZ':
                    basePrice = 10000
                    stockName = '深证成指'
                elif symbol == '600519.SH':
                    basePrice = 1800
                    stockName = '贵州茅台'
                elif symbol == '601318.SH':
                    basePrice = 60
                    stockName = '中国平安'
                elif symbol == '600036.SH':
                    basePrice = 40
                    stockName = '招商银行'
                elif symbol == '000858.SZ':
                    basePrice = 150
                    stockName = '五粮液'
                elif symbol == '000333.SZ':
                    basePrice = 80
                    stockName = '美的集团'
                elif symbol == '601166.SH':
                    basePrice = 20
                    stockName = '兴业银行'
                elif symbol == '002415.SZ':
                    basePrice = 35
                    stockName = '海康威视'
                elif symbol == '600276.SH':
                    basePrice = 50
                    stockName = '恒瑞医药'
                else:
                    basePrice = 100
                    stockName = symbol

                # 生成当前价格（基于随机波动）
                price = basePrice * (1 + (random.random() * 0.1 - 0.05))  # -5% 到 +5% 的随机波动
                preClose = basePrice * (1 + (random.random() * 0.05 - 0.025))  # 昨收价
                open_price = preClose * (1 + (random.random() * 0.03 - 0.015))  # 开盘价
                high = max(price, open_price) * (1 + random.random() * 0.02)  # 最高价
                low = min(price, open_price) * (1 - random.random() * 0.02)  # 最低价
                volume = int(random.random() * 10000000) + 1000000  # 成交量
                amount = price * volume  # 成交额

                # 计算涨跌幅
                change = price - preClose
                pctChg = (change / preClose) * 100

                # 不使用模拟数据，直接抛出错误
                raise Exception(f"无法获取股票{symbol}的行情数据，API调用失败")
    except Exception as e:
        # 捕获所有异常，包括超时异常
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "获取股票行情超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)

        # 返回模拟数据，但标记为失败
        result = {
            'success': False,
            'message': error_message,
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'获取数据失败: {error_message}'
        }

        return result

@timeout(30)  # 设置30秒超时
def get_stock_history(symbol, period='daily', count=180):
    """获取股票历史数据"""
    try:
        # 转换股票代码格式
        code = format_symbol(symbol)

        # 计算开始日期（默认获取一年的数据）
        end_date = datetime.datetime.now().strftime('%Y%m%d')
        start_date = (datetime.datetime.now() - datetime.timedelta(days=365)).strftime('%Y%m%d')

        # 尝试使用东方财富网的数据接口获取历史数据
        try:
            print(json.dumps({'status': 'progress', 'message': f'正在获取{symbol}的历史数据...'}, ensure_ascii=False), flush=True)

            # 获取股票历史数据
            if period == 'daily':
                # 日K线数据
                stock_df = ak.stock_zh_a_hist(symbol=code, period="daily", start_date=start_date, end_date=end_date, adjust="")
            elif period == 'weekly':
                # 周K线数据
                stock_df = ak.stock_zh_a_hist(symbol=code, period="weekly", start_date=start_date, end_date=end_date, adjust="")
            elif period == 'monthly':
                # 月K线数据
                stock_df = ak.stock_zh_a_hist(symbol=code, period="monthly", start_date=start_date, end_date=end_date, adjust="")
            else:
                return {'success': False, 'message': f'不支持的周期: {period}'}

            # 如果数据为空，尝试使用其他接口
            if stock_df.empty:
                raise Exception("获取的历史数据为空")

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
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'使用东方财富接口获取历史数据失败，尝试其他接口: {str(e1)}'}, ensure_ascii=False), flush=True)

            # 尝试使用另一个接口获取历史数据
            try:
                # 使用新浪财经的数据接口
                if code.endswith('.SH'):
                    sina_code = 'sh' + code[:-3]
                elif code.endswith('.SZ'):
                    sina_code = 'sz' + code[:-3]
                else:
                    sina_code = code

                # 获取股票历史数据
                if period == 'daily':
                    # 日K线数据
                    stock_df = ak.stock_zh_index_daily(symbol=sina_code)
                elif period == 'weekly':
                    # 周K线数据 - 新浪接口可能不支持，使用日K数据
                    stock_df = ak.stock_zh_index_daily(symbol=sina_code)
                elif period == 'monthly':
                    # 月K线数据 - 新浪接口可能不支持，使用日K数据
                    stock_df = ak.stock_zh_index_daily(symbol=sina_code)
                else:
                    return {'success': False, 'message': f'不支持的周期: {period}'}

                # 如果数据为空，返回错误
                if stock_df.empty:
                    raise Exception("获取的历史数据为空")

                # 限制数据条数
                stock_df = stock_df.tail(int(count))

                # 转换为标准格式
                history_data = []
                for _, row in stock_df.iterrows():
                    # 新浪接口的列名可能不同
                    date_col = '日期' if '日期' in row.index else 'date'
                    open_col = '开盘' if '开盘' in row.index else 'open'
                    high_col = '最高' if '最高' in row.index else 'high'
                    low_col = '最低' if '最低' in row.index else 'low'
                    close_col = '收盘' if '收盘' in row.index else 'close'
                    volume_col = '成交量' if '成交量' in row.index else 'volume'
                    amount_col = '成交额' if '成交额' in row.index else 'amount'

                    history_data.append({
                        'date': str(row[date_col]),
                        'open': float(row[open_col]),
                        'high': float(row[high_col]),
                        'low': float(row[low_col]),
                        'close': float(row[close_col]),
                        'volume': int(row[volume_col]) if pd.notna(row[volume_col]) else 0,
                        'amount': float(row[amount_col]) if amount_col in row.index and pd.notna(row[amount_col]) else 0
                    })

                return {'success': True, 'data': history_data}
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'使用新浪接口获取历史数据失败，使用模拟数据: {str(e2)}'}, ensure_ascii=False), flush=True)

                # 所有尝试都失败，生成模拟数据
                # 获取实时行情作为基准
                try:
                    quote_result = get_stock_quote(symbol)
                    if quote_result['success']:
                        basePrice = quote_result['data']['price']
                        stockName = quote_result['data']['name']
                    else:
                        basePrice = 100  # 默认基准价格
                        stockName = '未知'
                except Exception:
                    basePrice = 100  # 默认基准价格
                    stockName = '未知'

                # 生成模拟历史数据
                today = datetime.datetime.now()
                dates = []
                prices = []
                volumes = []

                # 生成180天的模拟历史数据
                for i in range(int(count), -1, -1):
                    date = today - datetime.timedelta(days=i)
                    # 跳过周末
                    if date.weekday() >= 5:  # 5是周六，6是周日
                        continue

                    dates.append(date.strftime('%Y-%m-%d'))

                    # 生成价格（基于随机波动）
                    if len(prices) == 0:
                        # 第一天的价格
                        prices.append(basePrice * 0.9)  # 假设180天前的价格是当前价格的90%
                    else:
                        # 后续价格基于前一天的价格加上随机波动
                        prevPrice = prices[-1]
                        change = prevPrice * (random.random() * 0.06 - 0.03)  # -3% 到 +3% 的随机波动
                        newPrice = max(prevPrice + change, 1)  # 确保价格不会低于1
                        prices.append(float(round(newPrice, 2)))

                    # 生成成交量
                    volume = int(random.random() * 10000000) + 1000000
                    volumes.append(volume)

                # 构建模拟历史数据
                history_data = []
                for i in range(len(dates)):
                    # 计算当天的开盘价、最高价、最低价
                    close = prices[i]
                    open_price = close * (1 + (random.random() * 0.02 - 0.01))  # 开盘价在收盘价基础上上下1%波动
                    high = max(close, open_price) * (1 + random.random() * 0.01)  # 最高价在较高者基础上上浮1%以内
                    low = min(close, open_price) * (1 - random.random() * 0.01)   # 最低价在较低者基础上下浮1%以内

                    history_data.append({
                        'date': dates[i],
                        'open': float(round(open_price, 2)),
                        'high': float(round(high, 2)),
                        'low': float(round(low, 2)),
                        'close': float(round(close, 2)),
                        'volume': volumes[i],
                        'amount': int(volumes[i] * close)
                    })

                # 不使用模拟数据，直接抛出错误
                raise Exception(f"无法获取股票{symbol}的历史数据，API调用失败")
    except Exception as e:
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "获取股票历史数据超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)
        return {
            'success': False,
            'message': error_message,
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'获取数据失败: {error_message}'
        }

@timeout(30)  # 设置30秒超时
def search_stocks(keyword):
    """搜索股票"""
    try:
        print(json.dumps({'status': 'progress', 'message': f'正在搜索股票: {keyword}...'}, ensure_ascii=False), flush=True)

        # 尝试使用东方财富网的数据接口搜索股票
        try:
            # 获取A股股票列表
            stock_df = ak.stock_zh_a_spot_em()

            # 在名称和代码中搜索关键词
            filtered_df = stock_df[stock_df['名称'].str.contains(keyword) | stock_df['代码'].str.contains(keyword)]

            # 如果没有找到匹配的股票，尝试使用其他接口
            if filtered_df.empty:
                raise Exception("未找到匹配的股票")

            # 转换为标准格式
            stocks = []
            for _, row in filtered_df.iterrows():
                # 获取股票代码和名称
                code = str(row['代码'])
                name = row['名称']

                # 确定市场（上海/深圳）
                if code.startswith('6'):
                    market = '上海'
                    symbol = f"{code}.SH"
                elif code.startswith('0') or code.startswith('3'):
                    market = '深圳'
                    symbol = f"{code}.SZ"
                elif code.startswith('4') or code.startswith('8'):
                    market = '北京'
                    symbol = f"{code}.BJ"
                else:
                    market = '未知'
                    symbol = code

                # 获取行业信息
                industry = '未知'
                if '所属行业' in row.index and not pd.isna(row['所属行业']):
                    industry = row['所属行业']

                stocks.append({
                    'symbol': symbol,
                    'name': name,
                    'market': market,
                    'industry': industry
                })

            return {'success': True, 'data': stocks}
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'使用东方财富接口搜索股票失败，尝试其他接口: {str(e1)}'}, ensure_ascii=False), flush=True)

            # 尝试使用另一个接口搜索股票
            try:
                # 使用股票信息接口
                stock_info_df = ak.stock_info_a_code_name()

                # 在名称和代码中搜索关键词
                filtered_df = stock_info_df[stock_info_df['name'].str.contains(keyword) | stock_info_df['code'].str.contains(keyword)]

                # 如果没有找到匹配的股票，返回空列表
                if filtered_df.empty:
                    return {'success': True, 'data': [], 'message': '未找到匹配的股票'}

                # 转换为标准格式
                stocks = []
                for _, row in filtered_df.iterrows():
                    # 获取股票代码和名称
                    code = str(row['code'])
                    name = row['name']

                    # 确定市场（上海/深圳）
                    if code.startswith('6'):
                        market = '上海'
                        symbol = f"{code}.SH"
                    elif code.startswith('0') or code.startswith('3'):
                        market = '深圳'
                        symbol = f"{code}.SZ"
                    elif code.startswith('4') or code.startswith('8'):
                        market = '北京'
                        symbol = f"{code}.BJ"
                    else:
                        market = '未知'
                        symbol = code

                    stocks.append({
                        'symbol': symbol,
                        'name': name,
                        'market': market,
                        'industry': '未知'  # 这个接口没有行业信息
                    })

                return {'success': True, 'data': stocks}
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'使用股票信息接口搜索股票失败: {str(e2)}'}, ensure_ascii=False), flush=True)

                # 所有尝试都失败，使用预定义的股票列表进行本地搜索
                mainStocks = [
                    { 'symbol': '000001.SH', 'name': '上证指数', 'market': '上海', 'industry': '指数' },
                    { 'symbol': '399001.SZ', 'name': '深证成指', 'market': '深圳', 'industry': '指数' },
                    { 'symbol': '600519.SH', 'name': '贵州茅台', 'market': '上海', 'industry': '白酒' },
                    { 'symbol': '601318.SH', 'name': '中国平安', 'market': '上海', 'industry': '保险' },
                    { 'symbol': '600036.SH', 'name': '招商银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '000858.SZ', 'name': '五粮液', 'market': '深圳', 'industry': '白酒' },
                    { 'symbol': '000333.SZ', 'name': '美的集团', 'market': '深圳', 'industry': '家电' },
                    { 'symbol': '601166.SH', 'name': '兴业银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '002415.SZ', 'name': '海康威视', 'market': '深圳', 'industry': '电子' },
                    { 'symbol': '600276.SH', 'name': '恒瑞医药', 'market': '上海', 'industry': '医药' },
                    { 'symbol': '601398.SH', 'name': '工商银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '600000.SH', 'name': '浦发银行', 'market': '上海', 'industry': '银行' },
                    { 'symbol': '000001.SZ', 'name': '平安银行', 'market': '深圳', 'industry': '银行' },
                ]

                # 在本地过滤
                filtered_stocks = [
                    stock for stock in mainStocks
                    if keyword.lower() in stock['symbol'].lower() or keyword.lower() in stock['name'].lower()
                ]

                return {'success': True, 'data': filtered_stocks, 'message': '使用预定义股票列表搜索，因为API调用失败'}
    except Exception as e:
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "搜索股票超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)
        return {
            'success': False,
            'message': error_message,
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'获取数据失败: {error_message}'
        }

@timeout(30)  # 设置30秒超时
def get_financial_news(count=5):
    """获取财经新闻"""
    try:
        print(json.dumps({'status': 'progress', 'message': '正在获取财经新闻...'}, ensure_ascii=False), flush=True)

        # 尝试使用东方财富网的数据接口获取财经新闻
        try:
            # 获取财经新闻
            news_df = ak.stock_news_em(symbol="")

            # 如果数据为空，尝试使用其他接口
            if news_df.empty:
                raise Exception("获取的财经新闻为空")

            # 限制数据条数
            news_df = news_df.head(int(count))

            # 转换为标准格式
            news_list = []
            for _, row in news_df.iterrows():
                # 判断是否重要新闻
                title = str(row['新闻标题'])
                important = any(keyword in title for keyword in ['重要', '突发', '紧急', '央行', '国常会', '政策', '重磅', '利好', '利空'])

                news_list.append({
                    'title': title,
                    'time': row['发布时间'],
                    'source': '东方财富网',
                    'url': row['新闻链接'],
                    'important': important,
                    'content': ''  # AKShare 不提供新闻内容
                })

            return {'success': True, 'data': news_list}
        except Exception as e1:
            print(json.dumps({'status': 'progress', 'message': f'使用东方财富接口获取财经新闻失败，尝试其他接口: {str(e1)}'}, ensure_ascii=False), flush=True)

            # 尝试使用另一个接口获取财经新闻
            try:
                # 使用新浪财经的数据接口
                news_df = ak.stock_news_sina()

                # 如果数据为空，返回模拟数据
                if news_df.empty:
                    raise Exception("获取的财经新闻为空")

                # 限制数据条数
                news_df = news_df.head(int(count))

                # 转换为标准格式
                news_list = []
                for _, row in news_df.iterrows():
                    # 判断是否重要新闻
                    title = str(row['title']) if 'title' in row.index else str(row['标题'])
                    important = any(keyword in title for keyword in ['重要', '突发', '紧急', '央行', '国常会', '政策', '重磅', '利好', '利空'])

                    # 获取时间
                    time_str = row['time'] if 'time' in row.index else (row['时间'] if '时间' in row.index else '未知')

                    # 获取链接
                    url = row['url'] if 'url' in row.index else (row['链接'] if '链接' in row.index else '#')

                    news_list.append({
                        'title': title,
                        'time': time_str,
                        'source': '新浪财经',
                        'url': url,
                        'important': important,
                        'content': ''  # 新浪接口也不提供新闻内容
                    })

                return {'success': True, 'data': news_list}
            except Exception as e2:
                print(json.dumps({'status': 'progress', 'message': f'使用新浪接口获取财经新闻失败，使用模拟数据: {str(e2)}'}, ensure_ascii=False), flush=True)

                # 所有尝试都失败，返回模拟数据
                mockNews = [
                    {
                        'title': '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
                        'time': '10分钟前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': True,
                        'content': '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。此举旨在保持银行体系流动性合理充裕，引导金融机构加大对实体经济的支持力度。'
                    },
                    {
                        'title': '科技板块全线上涨，半导体行业领涨',
                        'time': '30分钟前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': False,
                        'content': '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。分析师认为，这与近期国家对科技创新的政策支持以及全球半导体产业链复苏有关。'
                    },
                    {
                        'title': '多家券商上调A股目标位，看好下半年行情',
                        'time': '1小时前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': False,
                        'content': '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。分析认为，随着经济复苏进程加快，企业盈利有望持续改善，市场流动性仍将保持合理充裕，A股市场有望迎来估值修复行情。'
                    },
                    {
                        'title': '外资连续三日净流入，北向资金今日净买入超50亿',
                        'time': '2小时前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': False,
                        'content': '据统计数据显示，外资已连续三个交易日净流入A股市场，今日北向资金净买入超过50亿元。分析人士表示，这表明国际投资者对中国经济和资本市场的信心正在增强，外资持续流入有望为A股市场提供有力支撑。'
                    },
                    {
                        'title': '新能源汽车销量创新高，相关概念股受关注',
                        'time': '3小时前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': False,
                        'content': '据中国汽车工业协会最新数据，上月我国新能源汽车销量再创历史新高，同比增长超过50%。受此消息影响，今日新能源汽车产业链相关概念股表现活跃，动力电池、充电桩等细分领域多只个股大幅上涨。'
                    },
                    {
                        'title': '国常会：进一步扩大内需，促进消费持续恢复',
                        'time': '4小时前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': True,
                        'content': '国务院常务会议今日召开，会议强调要进一步扩大内需，促进消费持续恢复和升级。会议部署了一系列促消费举措，包括优化汽车、家电等大宗消费政策，发展假日经济、夜间经济，完善农村消费基础设施等。'
                    },
                    {
                        'title': '两部门：加大对先进制造业支持力度，优化融资环境',
                        'time': '5小时前',
                        'source': 'AKShare',
                        'url': 'https://finance.sina.com.cn/news/',
                        'important': False,
                        'content': '财政部、工信部联合发文，要求加大对先进制造业的支持力度，优化融资环境。文件提出，将通过财政贴息、融资担保、风险补偿等方式，引导金融机构加大对先进制造业企业的信贷支持，降低企业融资成本。'
                    }
                ]

                # 随机打乱新闻顺序
                random.shuffle(mockNews)

                # 不使用模拟数据，直接抛出错误
                raise Exception("无法获取财经新闻数据，API调用失败")
    except Exception as e:
        error_message = str(e)
        if isinstance(e, TimeoutError):
            error_message = "获取财经新闻超时，请稍后再试"

        print(json.dumps({'status': 'error', 'message': error_message}, ensure_ascii=False), flush=True)
        return {
            'success': False,
            'message': error_message,
            'traceback': traceback.format_exc(),
            'data_source': 'error',
            'data_source_message': f'获取数据失败: {error_message}'
        }

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
