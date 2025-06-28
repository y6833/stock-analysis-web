'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');
const iconv = require('iconv-lite');

class EastMoneyController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;

    try {
      // 尝试获取上证指数行情，如果成功则连接正常
      const response = await axios.get('http://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&fields=f43,f57,f58,f169,f170,f46,f44,f45,f168,f47,f48,f60,f49,f171,f50,f51,f52,f59', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200 && response.data && response.data.data) {
        ctx.body = {
          success: true,
          message: '东方财富API连接成功'
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '东方财富API连接失败'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '东方财富API连接失败',
        error: error.message
      };
    }
  }

  // 获取股票行情
  async quote() {
    const { ctx } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      // 转换股票代码格式
      const secid = this.getSecId(symbol);

      // 请求东方财富API
      const response = await axios.get(`http://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f169,f170,f46,f44,f45,f168,f47,f48,f60,f49,f171,f50,f51,f52,f59,f85,f84,f116,f86`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200 && response.data && response.data.data) {
        const data = response.data.data;

        // 解析股票数据
        const stockName = data.f58;
        const price = data.f43 / 100; // 当前价格
        const open = data.f46 / 100; // 开盘价
        const high = data.f44 / 100; // 最高价
        const low = data.f45 / 100; // 最低价
        const preClose = data.f60 / 100; // 昨收价
        const volume = data.f47; // 成交量
        const amount = data.f48; // 成交额
        const change = data.f169 / 100; // 涨跌额
        const pctChg = data.f170 / 100; // 涨跌幅

        ctx.body = {
          success: true,
          data: {
            name: stockName,
            price,
            open,
            high,
            low,
            pre_close: preClose,
            volume,
            amount,
            change,
            pct_chg: pctChg,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0]
          }
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '东方财富API返回异常'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票行情失败',
        error: error.message
      };
    }
  }

  // 获取股票列表
  async stockList() {
    const { ctx } = this;

    try {
      // 尝试获取沪深A股列表
      try {
        // 获取沪市A股列表
        const shResponse = await axios.get('http://83.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&fs=m:1+t:2,m:1+t:23&fields=f12,f14,f100,f3', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        // 获取深市A股列表
        const szResponse = await axios.get('http://83.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&fs=m:0+t:6,m:0+t:80&fields=f12,f14,f100,f3', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        // 获取北交所股票列表
        const bjResponse = await axios.get('http://83.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=500&fs=m:0+t:81+s:2048&fields=f12,f14,f100,f3', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        // 获取指数列表
        const indexResponse = await axios.get('http://83.push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&fs=m:1+s:2,m:0+t:5&fields=f12,f14,f100,f3', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const stocks = [];

        // 处理沪市A股
        if (shResponse.data && shResponse.data.data && shResponse.data.data.diff) {
          const shStocks = shResponse.data.data.diff;
          for (const stock of Object.values(shStocks)) {
            if (stock.f12 && stock.f14) {
              stocks.push({
                symbol: stock.f12 + '.SH',
                name: stock.f14,
                market: '上海',
                industry: stock.f100 || '未知'
              });
            }
          }
        }

        // 处理深市A股
        if (szResponse.data && szResponse.data.data && szResponse.data.data.diff) {
          const szStocks = szResponse.data.data.diff;
          for (const stock of Object.values(szStocks)) {
            if (stock.f12 && stock.f14) {
              stocks.push({
                symbol: stock.f12 + '.SZ',
                name: stock.f14,
                market: '深圳',
                industry: stock.f100 || '未知'
              });
            }
          }
        }

        // 处理北交所股票
        if (bjResponse.data && bjResponse.data.data && bjResponse.data.data.diff) {
          const bjStocks = bjResponse.data.data.diff;
          for (const stock of Object.values(bjStocks)) {
            if (stock.f12 && stock.f14) {
              stocks.push({
                symbol: stock.f12 + '.BJ',
                name: stock.f14,
                market: '北京',
                industry: stock.f100 || '未知'
              });
            }
          }
        }

        // 处理指数
        if (indexResponse.data && indexResponse.data.data && indexResponse.data.data.diff) {
          const indexStocks = indexResponse.data.data.diff;
          for (const stock of Object.values(indexStocks)) {
            if (stock.f12 && stock.f14) {
              const market = stock.f12.startsWith('0') || stock.f12.startsWith('3') ? '深圳' : '上海';
              const suffix = market === '上海' ? '.SH' : '.SZ';
              stocks.push({
                symbol: stock.f12 + suffix,
                name: stock.f14,
                market: market,
                industry: '指数'
              });
            }
          }
        }

        // 如果成功获取到股票列表
        if (stocks.length > 0) {
          ctx.body = {
            success: true,
            data: stocks
          };
          return;
        }
      } catch (apiError) {
        console.error('获取东方财富股票列表失败:', apiError);
      }

      // 如果API请求失败，使用预定义的主要股票列表
      const mainStocks = [
        { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: '601398.SH', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: '600000.SH', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: '000001.SZ', name: '平安银行', market: '深圳', industry: '银行' },
        { symbol: '601668.SH', name: '中国建筑', market: '上海', industry: '建筑' },
        { symbol: '600030.SH', name: '中信证券', market: '上海', industry: '证券' },
        { symbol: '600887.SH', name: '伊利股份', market: '上海', industry: '食品饮料' },
        { symbol: '601288.SH', name: '农业银行', market: '上海', industry: '银行' },
        { symbol: '000651.SZ', name: '格力电器', market: '深圳', industry: '家电' },
        { symbol: '601857.SH', name: '中国石油', market: '上海', industry: '石油石化' },
        { symbol: '600028.SH', name: '中国石化', market: '上海', industry: '石油石化' },
      ];

      ctx.body = {
        success: true,
        data: mainStocks,
        message: '使用预定义股票列表，因为API调用失败'
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取股票列表失败',
        error: error.message
      };
    }
  }

  // 搜索股票
  async search() {
    const { ctx } = this;
    const { keyword } = ctx.query;

    if (!keyword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少搜索关键词参数'
      };
      return;
    }

    try {
      // 请求东方财富搜索API
      const response = await axios.get(`http://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200 && response.data && response.data.QuotationCodeTable && response.data.QuotationCodeTable.Data) {
        const searchResults = response.data.QuotationCodeTable.Data;

        // 转换为标准格式
        const stocks = searchResults.map(item => {
          const market = item.MarketType === 1 ? '上海' : (item.MarketType === 2 ? '深圳' : '未知');
          const symbol = item.Code + (market === '上海' ? '.SH' : '.SZ');

          return {
            symbol,
            name: item.Name,
            market,
            industry: item.MktNum || '未知'
          };
        });

        ctx.body = {
          success: true,
          data: stocks
        };
      } else {
        // 如果API返回异常，使用预定义的股票列表进行本地搜索
        const mainStocks = [
          { symbol: '000001.SH', name: '上证指数', market: '上海', industry: '指数' },
          { symbol: '399001.SZ', name: '深证成指', market: '深圳', industry: '指数' },
          { symbol: '600519.SH', name: '贵州茅台', market: '上海', industry: '白酒' },
          { symbol: '601318.SH', name: '中国平安', market: '上海', industry: '保险' },
          { symbol: '600036.SH', name: '招商银行', market: '上海', industry: '银行' },
          { symbol: '000858.SZ', name: '五粮液', market: '深圳', industry: '白酒' },
          { symbol: '000333.SZ', name: '美的集团', market: '深圳', industry: '家电' },
          { symbol: '601166.SH', name: '兴业银行', market: '上海', industry: '银行' },
          { symbol: '002415.SZ', name: '海康威视', market: '深圳', industry: '电子' },
          { symbol: '600276.SH', name: '恒瑞医药', market: '上海', industry: '医药' },
          { symbol: '601398.SH', name: '工商银行', market: '上海', industry: '银行' },
          { symbol: '600000.SH', name: '浦发银行', market: '上海', industry: '银行' },
          { symbol: '000001.SZ', name: '平安银行', market: '深圳', industry: '银行' },
        ];

        // 在本地过滤
        const results = mainStocks.filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(keyword.toLowerCase()) ||
            stock.name.toLowerCase().includes(keyword.toLowerCase())
        );

        ctx.body = {
          success: true,
          data: results
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '搜索股票失败',
        error: error.message
      };
    }
  }

  // 获取历史数据
  async history() {
    const { ctx } = this;
    const { symbol, period, count } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      // 转换股票代码格式
      const secid = this.getSecId(symbol);
      const periodMap = {
        'daily': 101,
        'weekly': 102,
        'monthly': 103
      };
      const klt = periodMap[period] || 101; // 默认日K
      const fqt = 1; // 前复权
      const lmt = count || 180; // 默认180条数据

      // 请求东方财富K线数据API
      const response = await axios.get(`http://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=${fqt}&end=20500101&lmt=${lmt}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200 && response.data && response.data.data && response.data.data.klines) {
        const klines = response.data.data.klines;

        // 解析K线数据
        const historyData = klines.map(kline => {
          const [date, open, close, high, low, volume, amount] = kline.split(',');

          return {
            date,
            open: parseFloat(open),
            close: parseFloat(close),
            high: parseFloat(high),
            low: parseFloat(low),
            volume: parseInt(volume),
            amount: parseFloat(amount)
          };
        });

        ctx.body = {
          success: true,
          data: historyData
        };
      } else {
        // API返回异常，不生成模拟数据，直接返回错误
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: `东方财富API返回异常，无法获取股票${symbol}的历史数据`,
          error: 'API response invalid',
          data_source: '东方财富API',
          data_source_message: '东方财富API返回数据格式异常'
        };
        return;
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取历史数据失败',
        error: error.message
      };
    }
  }

  // 获取财经新闻
  async news() {
    const { ctx } = this;
    const { count } = ctx.query;
    const newsCount = parseInt(count) || 5;

    try {
      // 尝试获取东方财富财经新闻
      try {
        // 请求东方财富财经新闻API
        const response = await axios.get('https://api.xuangubao.cn/api/pc/msgs?subjids=9,10,723,35,469&limit=20&subj_type=1', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://xuangubao.cn/',
            'Origin': 'https://xuangubao.cn'
          }
        });

        if (response.status === 200 && response.data && response.data.data && Array.isArray(response.data.data.messages)) {
          const newsData = response.data.data.messages;

          // 转换为标准格式
          const news = newsData.map(item => {
            // 判断是否重要新闻
            const title = item.title || '';
            const important = title.includes('重要') ||
              title.includes('突发') ||
              title.includes('紧急') ||
              title.includes('央行') ||
              title.includes('国常会') ||
              title.includes('政策') ||
              title.includes('重磅') ||
              title.includes('利好') ||
              title.includes('利空');

            return {
              title: title,
              time: item.created_at ? new Date(item.created_at * 1000).toLocaleString() : '未知时间',
              source: item.source_name || '东方财富',
              url: item.url || 'https://finance.eastmoney.com/news/',
              important: important,
              content: item.content || ''
            };
          });

          // 返回指定数量的新闻
          ctx.body = {
            success: true,
            data: news.slice(0, newsCount)
          };
          return;
        }
      } catch (apiError) {
        console.error('获取东方财富财经新闻失败:', apiError.message);

        // 尝试获取东方财富首页新闻
        try {
          const homeResponse = await axios.get('https://finance.eastmoney.com/', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            responseType: 'arraybuffer'
          });

          if (homeResponse.status === 200 && homeResponse.data) {
            // 将GBK编码的响应转换为UTF-8
            const html = iconv.decode(homeResponse.data, 'gbk');

            // 简单解析HTML获取新闻标题和链接
            const newsRegex = /<a.*?href="(https?:\/\/finance\.eastmoney\.com\/a\/\d+\.html)".*?>(.*?)<\/a>/g;
            const news = [];
            let match;

            while ((match = newsRegex.exec(html)) !== null && news.length < newsCount * 2) {
              const url = match[1];
              const title = match[2].replace(/<.*?>/g, '').trim();

              if (title && url && !title.includes('img') && title.length > 5) {
                // 判断是否重要新闻
                const important = title.includes('重要') ||
                  title.includes('突发') ||
                  title.includes('紧急') ||
                  title.includes('央行') ||
                  title.includes('国常会') ||
                  title.includes('政策') ||
                  title.includes('重磅') ||
                  title.includes('利好') ||
                  title.includes('利空');

                news.push({
                  title: title,
                  time: new Date().toLocaleString(),
                  source: '东方财富',
                  url: url,
                  important: important,
                  content: ''
                });
              }
            }

            // 去重
            const uniqueNews = [];
            const titles = new Set();

            for (const item of news) {
              if (!titles.has(item.title)) {
                titles.add(item.title);
                uniqueNews.push(item);
              }
            }

            if (uniqueNews.length > 0) {
              // 返回指定数量的新闻
              ctx.body = {
                success: true,
                data: uniqueNews.slice(0, newsCount)
              };
              return;
            }
          }
        } catch (homeError) {
          console.error('获取东方财富首页新闻失败:', homeError.message);
        }
      }

      // 如果所有尝试都失败，返回错误而不是模拟数据
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '无法获取财经新闻数据，所有数据源均不可用',
        error: 'All news sources failed',
        data_source: '东方财富API',
        data_source_message: '东方财富新闻API不可用'
      };

    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取财经新闻失败',
        error: error.message
      };
    }
  }

  // 辅助方法：获取东方财富API的secid
  getSecId(symbol) {
    // 处理不同格式的股票代码
    let code, market;

    if (symbol.includes('.')) {
      // 格式：600519.SH 或 000858.SZ
      const parts = symbol.split('.');
      code = parts[0];
      market = parts[1] === 'SH' ? 1 : 2;
    } else if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
      // 格式：sh600519 或 sz000858
      code = symbol.substring(2);
      market = symbol.startsWith('sh') ? 1 : 2;
    } else {
      // 格式：600519 或 000858
      code = symbol;
      market = symbol.startsWith('6') ? 1 : 2;
    }

    return `${market}.${code}`;
  }
}

module.exports = EastMoneyController;
