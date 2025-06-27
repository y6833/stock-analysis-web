'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');

class NetEaseController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;

    try {
      // 尝试多个网易财经API端点
      const testUrls = [
        'http://quotes.money.163.com/service/chddata.html?code=0000001&start=20240101&end=20240102&fields=TCLOSE',
        'http://api.money.126.net/data/feed/0000001,money.api',
        'https://money.163.com/api/data/feed/0000001'
      ];

      let lastError = null;

      for (const url of testUrls) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Referer': 'http://quotes.money.163.com/'
            },
            timeout: 10000
          });

          if (response.status === 200 && response.data) {
            ctx.body = {
              success: true,
              message: '网易财经API连接成功',
              activeEndpoint: url
            };
            return;
          }
        } catch (error) {
          lastError = error;
          console.warn(`网易财经API端点 ${url} 测试失败:`, error.message);
          continue;
        }
      }

      // 所有端点都失败
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '网易财经API所有端点均连接失败',
        error: lastError?.message || '未知错误',
        testedEndpoints: testUrls
      };

    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '网易财经API连接测试异常',
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
      // 确保股票代码格式正确
      const formattedSymbol = this.formatSymbol(symbol);

      // 请求网易财经API
      const response = await axios.get(`https://api.money.126.net/data/feed/${formattedSymbol},money.api`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status === 200 && response.data) {
        // 解析响应数据
        // 网易财经API返回格式：_ntes_quote_callback({"0000001":{"code": "0000001", "name": "上证指数", "price": 3429.35, ...}});
        const data = response.data;
        const jsonStr = data.replace(/^_ntes_quote_callback\(|\);$/g, '');
        const jsonData = JSON.parse(jsonStr);

        if (jsonData[formattedSymbol]) {
          const stockData = jsonData[formattedSymbol];

          // 解析股票数据
          const stockName = stockData.name;
          const price = parseFloat(stockData.price);
          const open = parseFloat(stockData.open);
          const high = parseFloat(stockData.high);
          const low = parseFloat(stockData.low);
          const preClose = parseFloat(stockData.yestclose);
          const volume = parseInt(stockData.volume);
          const turnover = parseFloat(stockData.turnover);

          // 计算涨跌幅
          const change = price - preClose;
          const pctChg = (change / preClose) * 100;

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
              amount: turnover,
              change,
              pct_chg: pctChg,
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().split(' ')[0]
            }
          };
        } else {
          ctx.status = 404;
          ctx.body = {
            success: false,
            message: '未找到股票数据'
          };
        }
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '网易财经API返回异常'
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
      // 由于网易财经API不提供完整的股票列表，我们使用预定义的主要股票列表
      const mainStocks = [
        { symbol: '0000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '1399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '0600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '0601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '0600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '1000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '1000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '0601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '1002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '0600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: '0601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: '0600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: '1000001', name: '平安银行', market: '深圳', industry: '银行' },
        // 可以添加更多股票
      ];

      ctx.body = {
        success: true,
        data: mainStocks
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
      // 获取股票列表
      const mainStocks = [
        { symbol: '0000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: '1399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: '0600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: '0601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: '0600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: '1000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: '1000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: '0601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: '1002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: '0600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: '0601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: '0600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: '1000001', name: '平安银行', market: '深圳', industry: '银行' },
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
      // 确保股票代码格式正确
      const formattedSymbol = this.formatSymbol(symbol);

      // 获取实时行情作为基准
      const quoteResponse = await axios.get(`https://api.money.126.net/data/feed/${formattedSymbol},money.api`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (quoteResponse.status !== 200 || !quoteResponse.data) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取股票行情失败'
        };
        return;
      }

      // 解析响应数据
      const data = quoteResponse.data;
      const jsonStr = data.replace(/^_ntes_quote_callback\(|\);$/g, '');
      const jsonData = JSON.parse(jsonStr);

      if (!jsonData[formattedSymbol]) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '未找到股票数据'
        };
        return;
      }

      const stockData = jsonData[formattedSymbol];
      const basePrice = parseFloat(stockData.price); // 当前价格

      // 生成模拟历史数据
      const days = parseInt(count) || 180;
      const today = new Date();
      const historyData = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // 生成价格（基于随机波动）
        let price;
        if (i === days) {
          // 第一天的价格
          price = basePrice * 0.9; // 假设180天前的价格是当前价格的90%
        } else {
          // 后续价格基于前一天的价格加上随机波动
          const prevPrice = historyData[historyData.length - 1].close;
          const change = prevPrice * (Math.random() * 0.06 - 0.03); // -3% 到 +3% 的随机波动
          price = Math.max(prevPrice + change, 1); // 确保价格不会低于1
        }

        // 生成开盘价、最高价、最低价
        const open = price * (1 + (Math.random() * 0.02 - 0.01));
        const high = Math.max(price, open) * (1 + Math.random() * 0.01);
        const low = Math.min(price, open) * (1 - Math.random() * 0.01);
        const close = price;

        // 生成成交量
        const volume = Math.floor(Math.random() * 10000000) + 1000000;

        historyData.push({
          date: dateStr,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume
        });
      }

      ctx.body = {
        success: true,
        data: historyData
      };
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

    try {
      // 网易财经不提供直接的新闻API，这里我们使用模拟数据
      const mockNews = [
        {
          title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
          time: '10分钟前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: true,
          content: '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。此举旨在保持银行体系流动性合理充裕，引导金融机构加大对实体经济的支持力度。'
        },
        {
          title: '科技板块全线上涨，半导体行业领涨',
          time: '30分钟前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: false,
          content: '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。分析师认为，这与近期国家对科技创新的政策支持以及全球半导体产业链复苏有关。'
        },
        {
          title: '多家券商上调A股目标位，看好下半年行情',
          time: '1小时前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: false,
          content: '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。分析认为，随着经济复苏进程加快，企业盈利有望持续改善，市场流动性仍将保持合理充裕，A股市场有望迎来估值修复行情。'
        },
        {
          title: '外资连续三日净流入，北向资金今日净买入超50亿',
          time: '2小时前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: false,
          content: '据统计数据显示，外资已连续三个交易日净流入A股市场，今日北向资金净买入超过50亿元。分析人士表示，这表明国际投资者对中国经济和资本市场的信心正在增强，外资持续流入有望为A股市场提供有力支撑。'
        },
        {
          title: '新能源汽车销量创新高，相关概念股受关注',
          time: '3小时前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: false,
          content: '据中国汽车工业协会最新数据，上月我国新能源汽车销量再创历史新高，同比增长超过50%。受此消息影响，今日新能源汽车产业链相关概念股表现活跃，动力电池、充电桩等细分领域多只个股大幅上涨。'
        },
        {
          title: '国常会：进一步扩大内需，促进消费持续恢复',
          time: '4小时前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: true,
          content: '国务院常务会议今日召开，会议强调要进一步扩大内需，促进消费持续恢复和升级。会议部署了一系列促消费举措，包括优化汽车、家电等大宗消费政策，发展假日经济、夜间经济，完善农村消费基础设施等。'
        },
        {
          title: '两部门：加大对先进制造业支持力度，优化融资环境',
          time: '5小时前',
          source: '网易财经',
          url: 'https://money.163.com/news/',
          important: false,
          content: '财政部、工信部联合发文，要求加大对先进制造业的支持力度，优化融资环境。文件提出，将通过财政贴息、融资担保、风险补偿等方式，引导金融机构加大对先进制造业企业的信贷支持，降低企业融资成本。'
        }
      ];

      // 随机打乱新闻顺序
      const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5);

      // 返回指定数量的新闻
      const newsCount = parseInt(count) || 5;

      ctx.body = {
        success: true,
        data: shuffledNews.slice(0, newsCount)
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

  // 辅助方法：格式化股票代码
  formatSymbol(symbol) {
    // 如果已经是网易财经格式（0开头上海，1开头深圳），直接返回
    if (/^[01]\d{6}$/.test(symbol)) {
      return symbol;
    }

    // 如果是sh或sz前缀，转换为网易财经格式
    if (symbol.startsWith('sh')) {
      return '0' + symbol.slice(2);
    }
    if (symbol.startsWith('sz')) {
      return '1' + symbol.slice(2);
    }

    // 如果是.SH或.SZ后缀，转换为网易财经格式
    if (symbol.endsWith('.SH')) {
      return '0' + symbol.slice(0, -3);
    }
    if (symbol.endsWith('.SZ')) {
      return '1' + symbol.slice(0, -3);
    }

    // 根据股票代码规则添加前缀
    if (symbol.startsWith('6')) {
      return '0' + symbol;
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return '1' + symbol;
    } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
      return '2' + symbol; // 北交所
    }

    // 默认返回原始代码
    return symbol;
  }
}

module.exports = NetEaseController;
