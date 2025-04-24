/**
 * 新闻聚合相关类型定义
 */

// 新闻来源类型
export type NewsSource = 'official' | 'media' | 'research' | 'social'

// 新闻情感分析结果
export type NewsSentiment = 'positive' | 'negative' | 'neutral'

// 新闻项
export interface NewsItem {
  id: string
  title: string
  summary: string
  content?: string
  url: string
  source: NewsSource
  sourceName: string
  publishTime: string
  sentiment?: NewsSentiment
  sentimentScore?: number // 0-100，越高越积极
  keywords: string[]
  relatedStocks?: {
    symbol: string
    name: string
  }[]
  imageUrl?: string
}

// 公司公告
export interface Announcement {
  id: string
  title: string
  type: string // 财报、分红、重大事项等
  publishTime: string
  url: string
  summary?: string
  importance: 'high' | 'medium' | 'low'
}

// 研究报告
export interface ResearchReport {
  id: string
  title: string
  institution: string // 发布机构
  analyst: string // 分析师
  publishTime: string
  rating: 'buy' | 'hold' | 'sell' | 'outperform' | 'underperform'
  targetPrice?: number
  previousRating?: string
  previousTargetPrice?: number
  summary: string
  url: string
}

// 新闻聚合结果
export interface NewsAggregation {
  symbol: string
  name: string
  news: NewsItem[]
  announcements: Announcement[]
  researchReports: ResearchReport[]
  lastUpdated: string
}

// 新闻过滤选项
export interface NewsFilterOptions {
  sources?: NewsSource[]
  dateRange?: {
    start: string
    end: string
  }
  sentiment?: NewsSentiment[]
  keywords?: string[]
}

// 新闻排序选项
export type NewsSortOption = 'time' | 'relevance' | 'sentiment'
