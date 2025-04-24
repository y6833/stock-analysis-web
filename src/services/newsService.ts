/**
 * 新闻聚合服务
 * 提供获取和处理股票相关新闻、公告和研报的功能
 */

import type {
  NewsAggregation,
  NewsItem,
  Announcement,
  ResearchReport,
  NewsFilterOptions,
  NewsSortOption,
  NewsSource,
  NewsSentiment
} from '@/types/news'

/**
 * 获取股票相关的新闻聚合数据
 * @param symbol 股票代码
 * @returns 新闻聚合数据
 */
export async function getNewsAggregation(symbol: string): Promise<NewsAggregation> {
  try {
    // 这里应该调用后端API获取数据
    // 由于目前没有实际的API，我们使用模拟数据
    return generateMockNewsData(symbol)
  } catch (error) {
    console.error('获取新闻数据失败:', error)
    throw error
  }
}

/**
 * 获取股票相关的新闻
 * @param symbol 股票代码
 * @param options 过滤选项
 * @param sort 排序选项
 * @returns 新闻列表
 */
export async function getNews(
  symbol: string,
  options?: NewsFilterOptions,
  sort: NewsSortOption = 'time'
): Promise<NewsItem[]> {
  try {
    const aggregation = await getNewsAggregation(symbol)
    let news = aggregation.news

    // 应用过滤
    if (options) {
      news = filterNews(news, options)
    }

    // 应用排序
    news = sortNews(news, sort)

    return news
  } catch (error) {
    console.error('获取新闻失败:', error)
    throw error
  }
}

/**
 * 获取股票相关的公告
 * @param symbol 股票代码
 * @returns 公告列表
 */
export async function getAnnouncements(symbol: string): Promise<Announcement[]> {
  try {
    const aggregation = await getNewsAggregation(symbol)
    return aggregation.announcements
  } catch (error) {
    console.error('获取公告失败:', error)
    throw error
  }
}

/**
 * 获取股票相关的研究报告
 * @param symbol 股票代码
 * @returns 研究报告列表
 */
export async function getResearchReports(symbol: string): Promise<ResearchReport[]> {
  try {
    const aggregation = await getNewsAggregation(symbol)
    return aggregation.researchReports
  } catch (error) {
    console.error('获取研究报告失败:', error)
    throw error
  }
}

/**
 * 过滤新闻
 * @param news 新闻列表
 * @param options 过滤选项
 * @returns 过滤后的新闻列表
 */
function filterNews(news: NewsItem[], options: NewsFilterOptions): NewsItem[] {
  return news.filter(item => {
    // 过滤来源
    if (options.sources && options.sources.length > 0) {
      if (!options.sources.includes(item.source)) {
        return false
      }
    }

    // 过滤日期范围
    if (options.dateRange) {
      const publishDate = new Date(item.publishTime)
      const startDate = new Date(options.dateRange.start)
      const endDate = new Date(options.dateRange.end)

      if (publishDate < startDate || publishDate > endDate) {
        return false
      }
    }

    // 过滤情感
    if (options.sentiment && options.sentiment.length > 0) {
      if (item.sentiment && !options.sentiment.includes(item.sentiment)) {
        return false
      }
    }

    // 过滤关键词
    if (options.keywords && options.keywords.length > 0) {
      const hasKeyword = options.keywords.some(keyword => 
        item.title.includes(keyword) || 
        item.summary.includes(keyword) || 
        (item.content && item.content.includes(keyword)) ||
        item.keywords.includes(keyword)
      )
      
      if (!hasKeyword) {
        return false
      }
    }

    return true
  })
}

/**
 * 排序新闻
 * @param news 新闻列表
 * @param sort 排序选项
 * @returns 排序后的新闻列表
 */
function sortNews(news: NewsItem[], sort: NewsSortOption): NewsItem[] {
  const sortedNews = [...news]

  switch (sort) {
    case 'time':
      // 按时间排序，最新的在前面
      sortedNews.sort((a, b) => 
        new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime()
      )
      break
    
    case 'relevance':
      // 按相关性排序，这里简化为关键词数量
      sortedNews.sort((a, b) => b.keywords.length - a.keywords.length)
      break
    
    case 'sentiment':
      // 按情感分析结果排序，积极的在前面
      sortedNews.sort((a, b) => {
        const scoreA = a.sentimentScore || 50
        const scoreB = b.sentimentScore || 50
        return scoreB - scoreA
      })
      break
  }

  return sortedNews
}

/**
 * 生成模拟的新闻数据
 * @param symbol 股票代码
 * @returns 模拟的新闻聚合数据
 */
function generateMockNewsData(symbol: string): NewsAggregation {
  // 根据股票代码生成一些随机但合理的数据
  const isFinancial = symbol.startsWith('6') // 假设6开头的是金融股
  const isTech = symbol.startsWith('3') // 假设3开头的是科技股
  const isIndustrial = symbol.startsWith('0') // 假设0开头的是工业股
  
  let industry = '制造业'
  let name = '示例公司'
  
  if (isFinancial) {
    industry = '金融业'
    name = '某银行'
  } else if (isTech) {
    industry = '信息技术'
    name = '某科技'
  } else if (isIndustrial) {
    industry = '工业'
    name = '某工业'
  }

  // 生成新闻
  const news: NewsItem[] = [
    {
      id: '1',
      title: `${name}发布2023年度业绩报告，净利润同比增长15%`,
      summary: `${name}今日发布2023年度业绩报告，公司净利润同比增长15%，营业收入同比增长12%，超出市场预期。公司表示，业绩增长主要得益于产品结构优化和市场份额扩大。`,
      url: 'https://example.com/news/1',
      source: 'official',
      sourceName: '公司公告',
      publishTime: '2024-03-25T10:00:00',
      sentiment: 'positive',
      sentimentScore: 85,
      keywords: ['业绩', '增长', '净利润', '财报'],
      relatedStocks: [{ symbol, name }],
      imageUrl: 'https://via.placeholder.com/300x200'
    },
    {
      id: '2',
      title: `分析师看好${name}未来发展前景，上调目标价`,
      summary: `多家券商发布研报，看好${name}的未来发展前景。分析师认为，公司在${industry}领域的技术优势和市场地位将持续巩固，预计未来3年复合增长率将保持在15%以上。`,
      url: 'https://example.com/news/2',
      source: 'research',
      sourceName: '某证券研究所',
      publishTime: '2024-03-23T14:30:00',
      sentiment: 'positive',
      sentimentScore: 78,
      keywords: ['研报', '目标价', '增长', '前景'],
      relatedStocks: [{ symbol, name }]
    },
    {
      id: '3',
      title: `${industry}政策利好，${name}有望受益`,
      summary: `国家发改委近日发布${industry}支持政策，提出将加大对行业的扶持力度。作为行业龙头，${name}有望从中受益，市场分析人士预计政策将为公司带来新的增长点。`,
      url: 'https://example.com/news/3',
      source: 'media',
      sourceName: '财经日报',
      publishTime: '2024-03-20T09:15:00',
      sentiment: 'positive',
      sentimentScore: 72,
      keywords: ['政策', '利好', '行业', '受益'],
      relatedStocks: [{ symbol, name }],
      imageUrl: 'https://via.placeholder.com/300x200'
    },
    {
      id: '4',
      title: `${name}宣布新一轮股票回购计划`,
      summary: `${name}今日宣布启动新一轮股票回购计划，总金额不超过10亿元，回购价格不超过每股50元。公司表示，此举旨在提振投资者信心，彰显对公司长期发展的信心。`,
      url: 'https://example.com/news/4',
      source: 'official',
      sourceName: '公司公告',
      publishTime: '2024-03-18T16:45:00',
      sentiment: 'positive',
      sentimentScore: 80,
      keywords: ['回购', '股票', '信心'],
      relatedStocks: [{ symbol, name }]
    },
    {
      id: '5',
      title: `市场担忧${industry}竞争加剧，${name}股价承压`,
      summary: `近期${industry}竞争日趋激烈，多家企业纷纷加大投入，市场担忧行业利润率可能下滑。作为行业主要参与者，${name}股价近期承受一定压力，较年内高点回调约8%。`,
      url: 'https://example.com/news/5',
      source: 'media',
      sourceName: '市场观察',
      publishTime: '2024-03-15T11:20:00',
      sentiment: 'negative',
      sentimentScore: 35,
      keywords: ['竞争', '压力', '回调', '担忧'],
      relatedStocks: [{ symbol, name }],
      imageUrl: 'https://via.placeholder.com/300x200'
    },
    {
      id: '6',
      title: `${name}与行业巨头达成战略合作`,
      summary: `${name}今日宣布与行业巨头达成战略合作，双方将在技术研发、市场拓展等方面展开深度合作。分析人士认为，此次合作将有助于公司提升核心竞争力，拓展新的业务增长点。`,
      url: 'https://example.com/news/6',
      source: 'official',
      sourceName: '公司公告',
      publishTime: '2024-03-12T09:30:00',
      sentiment: 'positive',
      sentimentScore: 82,
      keywords: ['合作', '战略', '增长', '竞争力'],
      relatedStocks: [{ symbol, name }]
    },
    {
      id: '7',
      title: `${name}高管增持公司股份，彰显信心`,
      summary: `${name}多位高管近期增持公司股份，合计增持金额超过5000万元。高管表示，增持是基于对公司未来发展前景的信心，以及对当前股价投资价值的认可。`,
      url: 'https://example.com/news/7',
      source: 'official',
      sourceName: '公司公告',
      publishTime: '2024-03-10T15:40:00',
      sentiment: 'positive',
      sentimentScore: 75,
      keywords: ['增持', '高管', '信心', '股价'],
      relatedStocks: [{ symbol, name }]
    },
    {
      id: '8',
      title: `行业专家解读${name}最新技术突破`,
      summary: `行业专家近日解读了${name}在技术领域的最新突破，认为公司在关键技术上取得的进展将有助于巩固其市场地位，并可能带来新的商业机会。`,
      url: 'https://example.com/news/8',
      source: 'research',
      sourceName: '技术评论',
      publishTime: '2024-03-08T13:15:00',
      sentiment: 'positive',
      sentimentScore: 70,
      keywords: ['技术', '突破', '创新', '机会'],
      relatedStocks: [{ symbol, name }],
      imageUrl: 'https://via.placeholder.com/300x200'
    },
    {
      id: '9',
      title: `${name}面临监管调查，股价波动`,
      summary: `据报道，${name}因涉嫌违反行业规定，正面临监管部门调查。公司回应称，将积极配合调查，并强调公司一直严格遵守相关法律法规。消息公布后，公司股价出现波动。`,
      url: 'https://example.com/news/9',
      source: 'media',
      sourceName: '财经快报',
      publishTime: '2024-03-05T10:10:00',
      sentiment: 'negative',
      sentimentScore: 30,
      keywords: ['调查', '监管', '违规', '风险'],
      relatedStocks: [{ symbol, name }]
    },
    {
      id: '10',
      title: `${name}发布新产品，市场反应积极`,
      summary: `${name}近日发布新产品，获得市场积极反应。分析师预计，新产品将成为公司新的增长点，有望在未来2-3年为公司带来可观的收入增长。`,
      url: 'https://example.com/news/10',
      source: 'media',
      sourceName: '产业观察',
      publishTime: '2024-03-02T16:20:00',
      sentiment: 'positive',
      sentimentScore: 76,
      keywords: ['新产品', '增长', '市场', '创新'],
      relatedStocks: [{ symbol, name }],
      imageUrl: 'https://via.placeholder.com/300x200'
    }
  ]

  // 生成公告
  const announcements: Announcement[] = [
    {
      id: 'a1',
      title: `${name}2023年年度报告`,
      type: '财报',
      publishTime: '2024-03-25T10:00:00',
      url: 'https://example.com/announcement/a1',
      summary: `${name}发布2023年年度报告，公司实现营业收入XX亿元，同比增长12%；净利润XX亿元，同比增长15%。`,
      importance: 'high'
    },
    {
      id: 'a2',
      title: `${name}关于回购公司股份的公告`,
      type: '回购',
      publishTime: '2024-03-18T16:45:00',
      url: 'https://example.com/announcement/a2',
      summary: `${name}宣布启动股份回购计划，回购总金额不超过10亿元，回购价格不超过每股50元。`,
      importance: 'medium'
    },
    {
      id: 'a3',
      title: `${name}关于签订战略合作协议的公告`,
      type: '重大事项',
      publishTime: '2024-03-12T09:30:00',
      url: 'https://example.com/announcement/a3',
      summary: `${name}与行业巨头签订战略合作协议，双方将在技术研发、市场拓展等方面展开深度合作。`,
      importance: 'medium'
    },
    {
      id: 'a4',
      title: `${name}董事、高级管理人员增持股份计划公告`,
      type: '增持',
      publishTime: '2024-03-10T15:40:00',
      url: 'https://example.com/announcement/a4',
      summary: `${name}董事、高级管理人员计划自本公告披露之日起6个月内，通过集中竞价交易方式增持公司股份，增持金额不低于5000万元。`,
      importance: 'medium'
    },
    {
      id: 'a5',
      title: `${name}2023年度利润分配预案`,
      type: '分红',
      publishTime: '2024-03-25T10:30:00',
      url: 'https://example.com/announcement/a5',
      summary: `${name}2023年度利润分配预案：以公司总股本为基数，向全体股东每10股派发现金红利X元（含税），送红股X股（含税），不以公积金转增股本。`,
      importance: 'high'
    }
  ]

  // 生成研究报告
  const researchReports: ResearchReport[] = [
    {
      id: 'r1',
      title: `${name}2023年报点评：业绩超预期，维持"买入"评级`,
      institution: '某证券研究所',
      analyst: '张三',
      publishTime: '2024-03-26T14:00:00',
      rating: 'buy',
      targetPrice: 55.8,
      previousRating: 'buy',
      previousTargetPrice: 52.5,
      summary: `${name}2023年业绩超预期，净利润同比增长15%，主要得益于产品结构优化和市场份额扩大。我们看好公司未来发展前景，维持"买入"评级，目标价上调至55.8元。`,
      url: 'https://example.com/report/r1'
    },
    {
      id: 'r2',
      title: `${industry}行业深度报告：${name}有望持续受益行业增长`,
      institution: '某投资研究院',
      analyst: '李四',
      publishTime: '2024-03-22T09:15:00',
      rating: 'outperform',
      targetPrice: 58.2,
      previousRating: 'hold',
      previousTargetPrice: 50.0,
      summary: `我们发布${industry}行业深度报告，看好行业未来3-5年的发展前景。作为行业龙头，${name}有望持续受益于行业增长，上调评级至"跑赢大市"，目标价58.2元。`,
      url: 'https://example.com/report/r2'
    },
    {
      id: 'r3',
      title: `${name}新产品分析：有望成为新增长点`,
      institution: '某资产管理公司',
      analyst: '王五',
      publishTime: '2024-03-05T11:30:00',
      rating: 'buy',
      targetPrice: 56.5,
      summary: `${name}近期发布的新产品有望成为公司新的增长点，我们预计该产品将在未来2-3年为公司带来可观的收入增长。维持"买入"评级，目标价56.5元。`,
      url: 'https://example.com/report/r3'
    },
    {
      id: 'r4',
      title: `${name}投资价值分析：长期看好，短期谨慎`,
      institution: '某基金研究中心',
      analyst: '赵六',
      publishTime: '2024-02-28T15:45:00',
      rating: 'hold',
      targetPrice: 52.0,
      previousRating: 'buy',
      previousTargetPrice: 54.0,
      summary: `我们长期看好${name}的投资价值，但考虑到近期${industry}竞争加剧，短期内公司业绩增长可能面临压力。下调评级至"持有"，目标价52.0元。`,
      url: 'https://example.com/report/r4'
    },
    {
      id: 'r5',
      title: `${name}技术创新分析：引领行业发展`,
      institution: '某科技研究院',
      analyst: '钱七',
      publishTime: '2024-02-20T10:20:00',
      rating: 'buy',
      targetPrice: 57.0,
      summary: `${name}在技术创新方面持续投入，多项核心技术处于行业领先水平。我们认为，技术优势将为公司带来持续的竞争力，维持"买入"评级，目标价57.0元。`,
      url: 'https://example.com/report/r5'
    }
  ]

  return {
    symbol,
    name,
    news,
    announcements,
    researchReports,
    lastUpdated: new Date().toISOString()
  }
}

// 导出服务
export const newsService = {
  getNewsAggregation,
  getNews,
  getAnnouncements,
  getResearchReports
}

export default newsService
