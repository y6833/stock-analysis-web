/**
 * 新闻聚合服务
 * 提供获取和处理股票相关新闻、公告和研报的功能
 */

import type { NewsItem, NewsAggregation, Announcement, ResearchReport, NewsFilterOptions, NewsSortOption } from '@/types/news'

/**
 * 获取新闻聚合数据
 * @param symbol 股票代码
 * @returns 新闻聚合数据
 */
export async function getNewsAggregation(symbol: string): Promise<NewsAggregation> {
  try {
    // 调用后端API获取真实新闻数据
    const response = await fetch(`/api/news/aggregation?symbol=${symbol}`)

    if (!response.ok) {
      throw new Error(`获取新闻数据失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取新闻数据失败:', error)
    throw new Error(`获取新闻数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
      if (!item.sentiment || !options.sentiment.includes(item.sentiment)) {
        return false
      }
    }

    // 过滤关键词
    if (options.keywords && options.keywords.length > 0) {
      const hasKeyword = options.keywords.some(keyword =>
        item.title.includes(keyword) || item.summary.includes(keyword)
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
      sortedNews.sort((a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime())
      break
    case 'relevance':
      sortedNews.sort((a, b) => (b.sentimentScore || 0) - (a.sentimentScore || 0))
      break
    case 'sentiment':
      sortedNews.sort((a, b) => {
        const scoreA = a.sentimentScore || 50
        const scoreB = b.sentimentScore || 50
        return scoreB - scoreA
      })
      break
  }

  return sortedNews
}
