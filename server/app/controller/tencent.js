'use strict';

const Controller = require('egg').Controller;
const axios = require('axios');
const iconv = require('iconv-lite');

class TencentController extends Controller {
  // 测试连接
  async test() {
    const { ctx } = this;

    try {
      // 尝试获取上证指数行情，如果成功则连接正常
      const response = await axios.get('http://qt.gtimg.cn/q=sh000001', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        responseType: 'arraybuffer'
      });

      if (response.status === 200 && response.data) {
        // 将GBK编码的响应转换为UTF-8
        const data = iconv.decode(response.data, 'GBK');

        if (data.includes('sh000001')) {
          ctx.body = {
            success: true,
            message: '腾讯股票API连接成功'
          };
        } else {
          ctx.status = 500;
          ctx.body = {
            success: false,
            message: '腾讯股票API连接失败'
          };
        }
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '腾讯股票API连接失败'
        };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '腾讯股票API连接失败',
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

      // 请求腾讯股票API
      const response = await axios.get(`http://qt.gtimg.cn/q=${formattedSymbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        responseType: 'arraybuffer'
      });

      if (response.status === 200 && response.data) {
        // 将GBK编码的响应转换为UTF-8
        const data = iconv.decode(response.data, 'GBK');

        // 解析响应数据
        // 腾讯股票API返回格式：v_sh000001="1~上证指数~000001~3429.35~3415.68~3429.35~4134727~2030992~2103734~3429.35~0~0~0~0~0~0~0~0~0~0~3415.68~0~0~0~0~0~0~0~0~0~0~20230331~15:01:04~13.67~0.40~3432.22~3415.68~3429.35/4134727/14158253760~4134727~1415825";
        const match = data.match(/v_[^=]+=("[^"]+")/) || data.match(/v_[^=]+=(.+);/);

        if (!match) {
          ctx.status = 500;
          ctx.body = {
            success: false,
            message: '无法解析腾讯股票API响应'
          };
          return;
        }

        const stockData = match[1].replace(/"/g, '').split('~');

        // 解析股票数据
        const stockName = stockData[1];
        const price = parseFloat(stockData[3]);
        const preClose = parseFloat(stockData[4]);
        const open = parseFloat(stockData[5]);
        const volume = parseInt(stockData[6]);
        const high = parseFloat(stockData[33]);
        const low = parseFloat(stockData[34]);
        const amount = parseFloat(stockData[37]);

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
            amount,
            change,
            pct_chg: pctChg,
            date: stockData[30],
            time: stockData[31]
          }
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '腾讯股票API返回异常'
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
      // 由于腾讯股票API不提供完整的股票列表，我们使用预定义的主要股票列表
      const mainStocks = [
        { symbol: 'sh000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: 'sz399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: 'sh600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: 'sh601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: 'sh600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: 'sz000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: 'sz000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: 'sh601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: 'sz002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: 'sh600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: 'sh601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: 'sh600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: 'sz000001', name: '平安银行', market: '深圳', industry: '银行' },
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
        { symbol: 'sh000001', name: '上证指数', market: '上海', industry: '指数' },
        { symbol: 'sz399001', name: '深证成指', market: '深圳', industry: '指数' },
        { symbol: 'sh600519', name: '贵州茅台', market: '上海', industry: '白酒' },
        { symbol: 'sh601318', name: '中国平安', market: '上海', industry: '保险' },
        { symbol: 'sh600036', name: '招商银行', market: '上海', industry: '银行' },
        { symbol: 'sz000858', name: '五粮液', market: '深圳', industry: '白酒' },
        { symbol: 'sz000333', name: '美的集团', market: '深圳', industry: '家电' },
        { symbol: 'sh601166', name: '兴业银行', market: '上海', industry: '银行' },
        { symbol: 'sz002415', name: '海康威视', market: '深圳', industry: '电子' },
        { symbol: 'sh600276', name: '恒瑞医药', market: '上海', industry: '医药' },
        { symbol: 'sh601398', name: '工商银行', market: '上海', industry: '银行' },
        { symbol: 'sh600000', name: '浦发银行', market: '上海', industry: '银行' },
        { symbol: 'sz000001', name: '平安银行', market: '深圳', industry: '银行' },
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
      const quoteResponse = await axios.get(`http://qt.gtimg.cn/q=${formattedSymbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        responseType: 'arraybuffer'
      });

      if (quoteResponse.status !== 200 || !quoteResponse.data) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '获取股票行情失败'
        };
        return;
      }

      // 将GBK编码的响应转换为UTF-8
      const data = iconv.decode(quoteResponse.data, 'GBK');

      // 解析响应数据
      const match = data.match(/v_[^=]+=("[^"]+")/) || data.match(/v_[^=]+=(.+);/);

      if (!match) {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '无法解析腾讯股票API响应'
        };
        return;
      }

      const stockData = match[1].replace(/"/g, '').split('~');
      const basePrice = parseFloat(stockData[3]); // 当前价格

      // 模拟历史数据生成已移除
      // 现在需要调用真实的历史数据API
      ctx.body = {
        success: false,
        message: '腾讯财经历史数据API尚未实现，请使用其他数据源',
        error: '模拟数据已被移除，需要集成真实的历史数据API'
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
      // 腾讯财经不提供直接的新闻API，这里我们使用模拟数据
      const mockNews = [
        {
          title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
          time: '10分钟前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: true,
          content: '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。此举旨在保持银行体系流动性合理充裕，引导金融机构加大对实体经济的支持力度。'
        },
        {
          title: '科技板块全线上涨，半导体行业领涨',
          time: '30分钟前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: false,
          content: '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。分析师认为，这与近期国家对科技创新的政策支持以及全球半导体产业链复苏有关。'
        },
        {
          title: '多家券商上调A股目标位，看好下半年行情',
          time: '1小时前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: false,
          content: '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。分析认为，随着经济复苏进程加快，企业盈利有望持续改善，市场流动性仍将保持合理充裕，A股市场有望迎来估值修复行情。'
        },
        {
          title: '外资连续三日净流入，北向资金今日净买入超50亿',
          time: '2小时前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: false,
          content: '据统计数据显示，外资已连续三个交易日净流入A股市场，今日北向资金净买入超过50亿元。分析人士表示，这表明国际投资者对中国经济和资本市场的信心正在增强，外资持续流入有望为A股市场提供有力支撑。'
        },
        {
          title: '新能源汽车销量创新高，相关概念股受关注',
          time: '3小时前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: false,
          content: '据中国汽车工业协会最新数据，上月我国新能源汽车销量再创历史新高，同比增长超过50%。受此消息影响，今日新能源汽车产业链相关概念股表现活跃，动力电池、充电桩等细分领域多只个股大幅上涨。'
        },
        {
          title: '国常会：进一步扩大内需，促进消费持续恢复',
          time: '4小时前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
          important: true,
          content: '国务院常务会议今日召开，会议强调要进一步扩大内需，促进消费持续恢复和升级。会议部署了一系列促消费举措，包括优化汽车、家电等大宗消费政策，发展假日经济、夜间经济，完善农村消费基础设施等。'
        },
        {
          title: '两部门：加大对先进制造业支持力度，优化融资环境',
          time: '5小时前',
          source: '腾讯财经',
          url: 'https://finance.qq.com/news/',
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
    // 如果已经包含sh或sz前缀，直接返回
    if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
      return symbol;
    }

    // 如果包含.SH或.SZ后缀，转换为sh或sz前缀
    if (symbol.endsWith('.SH')) {
      return 'sh' + symbol.slice(0, -3);
    }
    if (symbol.endsWith('.SZ')) {
      return 'sz' + symbol.slice(0, -3);
    }

    // 根据股票代码规则添加前缀
    if (symbol.startsWith('6')) {
      return 'sh' + symbol;
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      return 'sz' + symbol;
    } else if (symbol.startsWith('4') || symbol.startsWith('8')) {
      return 'bj' + symbol; // 北交所
    }

    // 默认返回原始代码
    return symbol;
  }
}

module.exports = TencentController;
