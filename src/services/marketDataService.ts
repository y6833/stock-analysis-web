/**
 * 市场数据服务
 * 提供市场概览、指数、行业板块等数据
 */

import { tushareService } from './tushareService'
import type { StockQuote, FinancialNews } from '@/types/stock'
import type { MarketIndex, IndustrySector } from '@/types/dashboard'

// 是否使用模拟数据
const USE_MOCK_DATA = false // 使用真实数据

/**
 * 获取指数信息
 * @param indexCode 指数代码
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 指数信息
 */
export async function getIndexInfo(indexCode: string, forceRefresh = true): Promise<any> {
  try {
    // 直接调用 tushareService 获取真实数据
    return await tushareService.getIndexInfo(indexCode, forceRefresh)
  } catch (error) {
    console.error(`获取指数 ${indexCode} 信息失败:`, error)
    return null
  }
}

/**
 * 获取指数行情
 * @param indexCode 指数代码
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 指数行情
 */
export async function getIndexQuote(indexCode: string, forceRefresh = true): Promise<any> {
  try {
    if (!USE_MOCK_DATA) {
      // 这里应该调用 tushareService 获取真实数据，传递 forceRefresh 参数
      return await tushareService.getIndexQuote(indexCode, forceRefresh)
    }

    // 使用模拟数据
    const baseValues: Record<string, number> = {
      '000001.SH': 3000,
      '399001.SZ': 10000,
      '399006.SZ': 2000,
      '000016.SH': 3000,
      '000300.SH': 4000,
      '000905.SH': 6000,
    }

    const baseValue = baseValues[indexCode] || 3000
    const change = Math.random() * 40 - 20
    const close = baseValue + change
    const pctChg = (change / baseValue) * 100

    return {
      close,
      open: close - Math.random() * 10,
      high: close + Math.random() * 15,
      low: close - Math.random() * 15,
      pre_close: baseValue,
      change,
      pct_chg: pctChg,
      vol: Math.round(Math.random() * 100000000000),
      amount: Math.round(Math.random() * 500000000000),
    }
  } catch (error) {
    console.error(`获取指数 ${indexCode} 行情失败:`, error)
    return null
  }
}

/**
 * 获取行业板块列表
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 行业板块列表
 */
export async function getSectorList(forceRefresh = true): Promise<any[]> {
  try {
    if (!USE_MOCK_DATA) {
      // 这里应该调用 tushareService 获取真实数据，传递 forceRefresh 参数
      return await tushareService.getSectorList(forceRefresh)
    }

    // 使用模拟数据
    return [
      { code: 'BK0475', name: '银行' },
      { code: 'BK0428', name: '保险' },
      { code: 'BK0438', name: '券商' },
      { code: 'BK0477', name: '白酒' },
      { code: 'BK0436', name: '医药' },
      { code: 'BK0448', name: '电子' },
      { code: 'BK0429', name: '汽车' },
      { code: 'BK0437', name: '房地产' },
      { code: 'BK0478', name: '钢铁' },
      { code: 'BK0479', name: '煤炭' },
    ]
  } catch (error) {
    console.error('获取行业板块列表失败:', error)
    return []
  }
}

/**
 * 获取行业板块行情
 * @param sectorCode 行业板块代码
 * @returns 行业板块行情
 */
export async function getSectorQuote(sectorCode: string): Promise<any> {
  try {
    if (!USE_MOCK_DATA) {
      // 这里应该调用 tushareService 获取真实数据
      return await tushareService.getSectorQuote(sectorCode)
    }

    // 使用模拟数据
    return {
      change: Math.random() * 2 - 1,
      pct_chg: Math.random() * 3 - 1.5,
      vol: Math.round(Math.random() * 20000000000),
      amount: Math.round(Math.random() * 100000000000),
    }
  } catch (error) {
    console.error(`获取行业板块 ${sectorCode} 行情失败:`, error)
    return null
  }
}

/**
 * 获取行业内领涨/领跌股票
 * @param sectorCode 行业板块代码
 * @param type 类型：up-领涨，down-领跌
 * @param count 数量
 * @returns 股票列表
 */
export async function getSectorLeadingStocks(
  sectorCode: string,
  type: 'up' | 'down',
  count: number = 5
): Promise<any[]> {
  try {
    if (!USE_MOCK_DATA) {
      // 这里应该调用 tushareService 获取真实数据
      return await tushareService.getSectorLeadingStocks(sectorCode, type, count)
    }

    // 使用模拟数据
    const sectorStocks: Record<string, any[]> = {
      BK0475: [
        // 银行
        { symbol: '600036.SH', name: '招商银行', changePercent: Math.random() * 5 },
        { symbol: '601166.SH', name: '兴业银行', changePercent: Math.random() * 4.5 },
        { symbol: '601398.SH', name: '工商银行', changePercent: Math.random() * -3 },
        { symbol: '601288.SH', name: '农业银行', changePercent: Math.random() * -2.5 },
      ],
      BK0428: [
        // 保险
        { symbol: '601318.SH', name: '中国平安', changePercent: Math.random() * 4 },
        { symbol: '601628.SH', name: '中国人寿', changePercent: Math.random() * 3.5 },
        { symbol: '601336.SH', name: '新华保险', changePercent: Math.random() * -2 },
        { symbol: '601601.SH', name: '中国太保', changePercent: Math.random() * -1.5 },
      ],
      BK0477: [
        // 白酒
        { symbol: '600519.SH', name: '贵州茅台', changePercent: Math.random() * 5 },
        { symbol: '000858.SZ', name: '五粮液', changePercent: Math.random() * 4.5 },
        { symbol: '000568.SZ', name: '泸州老窖', changePercent: Math.random() * -2 },
        { symbol: '600779.SH', name: '水井坊', changePercent: Math.random() * -1.5 },
      ],
    }

    // 如果没有特定行业的数据，使用通用数据
    const stocks = sectorStocks[sectorCode] || [
      { symbol: '600519.SH', name: '贵州茅台', changePercent: Math.random() * 5 },
      { symbol: '000858.SZ', name: '五粮液', changePercent: Math.random() * 4.5 },
      { symbol: '601318.SH', name: '中国平安', changePercent: Math.random() * 4 },
      { symbol: '600036.SH', name: '招商银行', changePercent: Math.random() * 3.5 },
      { symbol: '000333.SZ', name: '美的集团', changePercent: Math.random() * 3 },
      { symbol: '601398.SH', name: '工商银行', changePercent: Math.random() * -3 },
      { symbol: '601288.SH', name: '农业银行', changePercent: Math.random() * -2.5 },
      { symbol: '600887.SH', name: '伊利股份', changePercent: Math.random() * -2 },
      { symbol: '000568.SZ', name: '泸州老窖', changePercent: Math.random() * -1.5 },
      { symbol: '600276.SH', name: '恒瑞医药', changePercent: Math.random() * -1 },
    ]

    // 根据涨跌幅排序
    const sortedStocks = [...stocks].sort((a, b) => {
      return type === 'up' ? b.changePercent - a.changePercent : a.changePercent - b.changePercent
    })

    return sortedStocks.slice(0, count)
  } catch (error) {
    console.error(`获取行业 ${sectorCode} ${type === 'up' ? '领涨' : '领跌'}股票失败:`, error)
    return []
  }
}

/**
 * 获取市场宽度数据
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 市场宽度数据
 */
export async function getMarketBreadth(forceRefresh = true): Promise<any> {
  try {
    if (!USE_MOCK_DATA) {
      // 这里应该调用 tushareService 获取真实数据，传递 forceRefresh 参数
      return await tushareService.getMarketBreadth(forceRefresh)
    }

    // 使用模拟数据
    const totalStocks = 4000
    const upCount = Math.round(Math.random() * totalStocks * 0.6)
    const downCount = Math.round(Math.random() * totalStocks * 0.4)
    const unchangedCount = totalStocks - upCount - downCount

    const totalVolume = Math.round(Math.random() * 500000000000)
    const upVolume = Math.round(totalVolume * (upCount / totalStocks) * (1 + Math.random() * 0.3))
    const downVolume = totalVolume - upVolume

    return {
      up_count: upCount,
      down_count: downCount,
      unchanged_count: unchangedCount,
      new_high: Math.round(Math.random() * 100),
      new_low: Math.round(Math.random() * 50),
      up_vol: upVolume,
      down_vol: downVolume,
    }
  } catch (error) {
    console.error('获取市场宽度数据失败:', error)
    return null
  }
}

/**
 * 获取财经新闻
 * @param count 数量
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 财经新闻列表
 */
export async function getFinancialNews(
  count: number = 5,
  forceRefresh = true
): Promise<FinancialNews[]> {
  try {
    if (!USE_MOCK_DATA) {
      try {
        // 尝试获取真实数据，传递 forceRefresh 参数
        const news = await tushareService.getFinancialNews(count, forceRefresh)
        if (news && news.length > 0) {
          console.log(`成功获取 ${news.length} 条财经新闻`)
          return news
        } else {
          throw new Error('获取到的财经新闻为空')
        }
      } catch (error) {
        console.error('获取财经新闻失败:', error)
        console.warn('将使用模拟数据显示财经新闻')
        // 如果获取真实数据失败，回退到模拟数据
        throw error
      }
    }

    // 使用模拟数据
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
  } catch (error) {
    console.error('获取财经新闻失败:', error)
    return []
  }
}

/**
 * 获取股票实时行情
 * @param symbol 股票代码
 * @param forceRefresh 是否强制刷新（从外部数据源获取）
 * @returns 股票行情
 */
export async function getStockQuote(
  symbol: string,
  forceRefresh = true
): Promise<StockQuote | null> {
  try {
    if (!USE_MOCK_DATA) {
      try {
        // 尝试获取真实数据，传递 forceRefresh 参数
        const quote = await tushareService.getStockQuote(symbol, forceRefresh)
        if (quote) {
          console.log(`成功获取 ${symbol} 的实时行情数据`)
          return quote
        } else {
          throw new Error('获取到的股票行情数据为空')
        }
      } catch (error) {
        console.error(`获取股票 ${symbol} 真实行情失败:`, error)
        // 不使用模拟数据，直接抛出错误
        throw error
      }
    }

    // 不使用模拟数据，如果真实数据获取失败就返回null
    return null
  } catch (error) {
    console.error(`获取股票 ${symbol} 行情失败:`, error)
    return null
  }
}

// 导出服务
export const marketDataService = {
  getIndexInfo,
  getIndexQuote,
  getSectorList,
  getSectorQuote,
  getSectorLeadingStocks,
  getMarketBreadth,
  getFinancialNews,
  getStockQuote,
}

export default marketDataService
