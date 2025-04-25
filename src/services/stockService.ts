import axios from 'axios'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { tushareService } from './tushareService'
import { marketDataService } from './marketDataService'

// 是否使用 Tushare 数据
const USE_TUSHARE = true

// 模拟数据
const mockStocks: Stock[] = [
  { symbol: '000001.SZ', name: '平安银行', market: '深交所', industry: '银行' },
  { symbol: '600000.SH', name: '浦发银行', market: '上交所', industry: '银行' },
  { symbol: '601318.SH', name: '中国平安', market: '上交所', industry: '保险' },
  { symbol: '000858.SZ', name: '五粮液', market: '深交所', industry: '白酒' },
  { symbol: '600519.SH', name: '贵州茅台', market: '上交所', industry: '白酒' },
  { symbol: '000333.SZ', name: '美的集团', market: '深交所', industry: '家电' },
  { symbol: '600036.SH', name: '招商银行', market: '上交所', industry: '银行' },
  { symbol: '601166.SH', name: '兴业银行', market: '上交所', industry: '银行' },
  { symbol: '002415.SZ', name: '海康威视', market: '深交所', industry: '电子' },
  { symbol: '600276.SH', name: '恒瑞医药', market: '上交所', industry: '医药' },
]

// 生成模拟股票行情数据
function generateMockStockQuote(symbol: string): StockQuote {
  // 查找股票基本信息
  const stock = mockStocks.find((s) => s.symbol === symbol) || {
    symbol,
    name: '未知股票',
    market: '未知',
    industry: '未知',
  }

  // 生成基础价格
  let basePrice = 0
  switch (symbol) {
    case '000001.SZ':
      basePrice = 15
      break
    case '600000.SH':
      basePrice = 10
      break
    case '601318.SH':
      basePrice = 60
      break
    case '000858.SZ':
      basePrice = 150
      break
    case '600519.SH':
      basePrice = 1800
      break
    case '000333.SZ':
      basePrice = 80
      break
    case '600036.SH':
      basePrice = 40
      break
    case '601166.SH':
      basePrice = 20
      break
    case '002415.SZ':
      basePrice = 35
      break
    case '600276.SH':
      basePrice = 50
      break
    default:
      basePrice = 100
  }

  // 生成当前价格（基于随机波动）
  const price = basePrice * (1 + (Math.random() * 0.1 - 0.05)) // -5% 到 +5% 的随机波动
  const preClose = basePrice * (1 + (Math.random() * 0.05 - 0.025)) // 昨收价
  const open = preClose * (1 + (Math.random() * 0.03 - 0.015)) // 开盘价
  const high = Math.max(price, open) * (1 + Math.random() * 0.02) // 最高价
  const low = Math.min(price, open) * (1 - Math.random() * 0.02) // 最低价
  const volume = Math.floor(Math.random() * 10000000) + 1000000 // 成交量
  const amount = price * volume // 成交额

  // 计算涨跌幅
  const change = price - preClose
  const pctChg = (change / preClose) * 100

  return {
    symbol,
    name: stock.name,
    price,
    open,
    high,
    low,
    close: price,
    pre_close: preClose,
    change,
    pct_chg: pctChg,
    vol: volume,
    amount,
    turnover_rate: Math.random() * 5, // 换手率
    pe: Math.random() * 30 + 5, // 市盈率
    pb: Math.random() * 5 + 0.5, // 市净率
    total_mv: price * (Math.random() * 10000000000 + 1000000000), // 总市值
    circ_mv: price * (Math.random() * 5000000000 + 500000000), // 流通市值
    update_time: new Date().toISOString(),
  }
}

// 生成模拟财经新闻
function generateMockFinancialNews(count: number = 5): FinancialNews[] {
  const mockNews: FinancialNews[] = [
    {
      title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
      time: '10分钟前',
      source: '财经日报',
      url: '#',
      important: true,
      content:
        '中国人民银行今日宣布，决定于下周一起下调金融机构存款准备金率0.5个百分点，预计将释放长期资金约1万亿元。此举旨在保持银行体系流动性合理充裕，引导金融机构加大对实体经济的支持力度。',
    },
    {
      title: '科技板块全线上涨，半导体行业领涨',
      time: '30分钟前',
      source: '证券时报',
      url: '#',
      important: false,
      content:
        '今日A股市场，科技板块表现强势，全线上涨。其中，半导体行业领涨，多只个股涨停。分析师认为，这与近期国家对科技创新的政策支持以及全球半导体产业链复苏有关。',
    },
    {
      title: '多家券商上调A股目标位，看好下半年行情',
      time: '1小时前',
      source: '上海证券报',
      url: '#',
      important: false,
      content:
        '近日，多家券商发布研报，上调A股目标位，普遍看好下半年市场行情。分析认为，随着经济复苏进程加快，企业盈利有望持续改善，市场流动性仍将保持合理充裕，A股市场有望迎来估值修复行情。',
    },
    {
      title: '外资连续三日净流入，北向资金今日净买入超50亿',
      time: '2小时前',
      source: '中国证券报',
      url: '#',
      important: false,
      content:
        '据统计数据显示，外资已连续三个交易日净流入A股市场，今日北向资金净买入超过50亿元。分析人士表示，这表明国际投资者对中国经济和资本市场的信心正在增强，外资持续流入有望为A股市场提供有力支撑。',
    },
    {
      title: '新能源汽车销量创新高，相关概念股受关注',
      time: '3小时前',
      source: '第一财经',
      url: '#',
      important: false,
      content:
        '据中国汽车工业协会最新数据，上月我国新能源汽车销量再创历史新高，同比增长超过50%。受此消息影响，今日新能源汽车产业链相关概念股表现活跃，动力电池、充电桩等细分领域多只个股大幅上涨。',
    },
    {
      title: '国常会：进一步扩大内需，促进消费持续恢复',
      time: '4小时前',
      source: '新华社',
      url: '#',
      important: true,
      content:
        '国务院常务会议今日召开，会议强调要进一步扩大内需，促进消费持续恢复和升级。会议部署了一系列促消费举措，包括优化汽车、家电等大宗消费政策，发展假日经济、夜间经济，完善农村消费基础设施等。',
    },
    {
      title: '两部门：加大对先进制造业支持力度，优化融资环境',
      time: '5小时前',
      source: '经济参考报',
      url: '#',
      important: false,
      content:
        '财政部、工信部联合发文，要求加大对先进制造业的支持力度，优化融资环境。文件提出，将通过财政贴息、融资担保、风险补偿等方式，引导金融机构加大对先进制造业企业的信贷支持，降低企业融资成本。',
    },
    {
      title: '央行数据：6月新增人民币贷款1.8万亿元，社融规模增量2.8万亿元',
      time: '6小时前',
      source: '金融时报',
      url: '#',
      important: false,
      content:
        '中国人民银行今日公布金融统计数据显示，6月份新增人民币贷款1.8万亿元，同比多增3000亿元；社会融资规模增量为2.8万亿元，比上年同期多5000亿元。专家表示，这表明货币信贷保持了合理增长，为实体经济提供了有力支持。',
    },
    {
      title: '证监会：推动提高上市公司质量，严厉打击财务造假',
      time: '7小时前',
      source: '证券日报',
      url: '#',
      important: true,
      content:
        '证监会今日召开新闻发布会，表示将持续推动提高上市公司质量，严厉打击财务造假等违法违规行为。证监会强调，将完善上市公司退市机制，加大对重大违法公司的强制退市力度，保护投资者合法权益。',
    },
    {
      title: '发改委：加快推进重大项目建设，扩大有效投资',
      time: '8小时前',
      source: '人民日报',
      url: '#',
      important: false,
      content:
        '国家发展改革委今日表示，将加快推进重大项目建设，扩大有效投资。重点支持新型基础设施、新型城镇化、交通水利等重大工程建设，同时优化投资结构，提高投资效益，防范化解地方政府隐性债务风险。',
    },
  ]

  // 随机打乱新闻顺序
  const shuffledNews = [...mockNews].sort(() => Math.random() - 0.5)

  // 返回指定数量的新闻
  return shuffledNews.slice(0, count)
}

// 这里删除重复的函数声明

// 生成模拟股票数据
function generateMockStockData(symbol: string): StockData {
  const today = new Date()
  const dates: string[] = []
  const prices: number[] = []
  const volumes: number[] = []

  // 生成基础价格 (不同股票有不同的基础价格)
  let basePrice = 0
  switch (symbol) {
    case '000001.SZ':
      basePrice = 15
      break
    case '600000.SH':
      basePrice = 10
      break
    case '601318.SH':
      basePrice = 60
      break
    case '000858.SZ':
      basePrice = 150
      break
    case '600519.SH':
      basePrice = 1800
      break
    case '000333.SZ':
      basePrice = 80
      break
    case '600036.SH':
      basePrice = 40
      break
    case '601166.SH':
      basePrice = 20
      break
    case '002415.SZ':
      basePrice = 35
      break
    case '600276.SH':
      basePrice = 50
      break
    default:
      basePrice = 100
  }

  // 生成180天的数据
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])

    // 生成价格 (基于随机波动)
    if (i === 180) {
      // 第一天的价格
      prices.push(basePrice)
    } else {
      // 后续价格基于前一天的价格加上随机波动
      const prevPrice = prices[prices.length - 1]
      const change = prevPrice * (Math.random() * 0.06 - 0.03) // -3% 到 +3% 的随机波动
      const newPrice = Math.max(prevPrice + change, 1) // 确保价格不会低于1
      prices.push(parseFloat(newPrice.toFixed(2)))
    }

    // 生成成交量
    const volume = Math.floor(Math.random() * 10000000) + 1000000
    volumes.push(volume)
  }

  return {
    symbol,
    dates,
    prices,
    volumes,
    high: Math.max(...prices),
    low: Math.min(...prices),
    open: prices[0],
    close: prices[prices.length - 1],
  }
}

// 股票服务
export const stockService = {
  // 获取股票列表
  async getStocks(): Promise<Stock[]> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.getStocks()
      } catch (error) {
        console.error('Tushare 获取股票列表失败，使用模拟数据:', error)
        return mockStocks
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockStocks), 500)
    })
  },

  // 获取单个股票数据
  async getStockData(symbol: string): Promise<StockData> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.getStockData(symbol)
      } catch (error) {
        console.error(`Tushare 获取股票 ${symbol} 数据失败，使用模拟数据:`, error)
        return generateMockStockData(symbol)
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockStockData(symbol)), 800)
    })
  },

  // 搜索股票
  async searchStocks(query: string): Promise<Stock[]> {
    if (USE_TUSHARE) {
      try {
        return await tushareService.searchStocks(query)
      } catch (error) {
        console.error('Tushare 搜索股票失败，使用模拟数据:', error)
        // 使用模拟数据进行过滤
        const results = mockStocks.filter(
          (stock) =>
            stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
            stock.name.toLowerCase().includes(query.toLowerCase())
        )
        return results
      }
    }

    // 使用模拟数据进行过滤
    return new Promise((resolve) => {
      const results = mockStocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
      )
      setTimeout(() => resolve(results), 300)
    })
  },

  // 获取股票实时行情
  async getStockQuote(symbol: string): Promise<StockQuote> {
    if (USE_TUSHARE) {
      try {
        return (await marketDataService.getStockQuote(symbol)) || generateMockStockQuote(symbol)
      } catch (error) {
        console.error(`获取股票 ${symbol} 行情失败，使用模拟数据:`, error)
        return generateMockStockQuote(symbol)
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockStockQuote(symbol)), 300)
    })
  },

  // 获取财经新闻
  async getFinancialNews(count: number = 5): Promise<FinancialNews[]> {
    if (USE_TUSHARE) {
      try {
        return await marketDataService.getFinancialNews(count)
      } catch (error) {
        console.error('获取财经新闻失败，使用模拟数据:', error)
        return generateMockFinancialNews(count)
      }
    }

    // 使用模拟数据
    return new Promise((resolve) => {
      setTimeout(() => resolve(generateMockFinancialNews(count)), 300)
    })
  },
}
