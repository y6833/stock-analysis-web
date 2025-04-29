import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'

/**
 * 数据源详细信息
 */
export interface DataSourceDetails {
  // 基本信息
  name: string
  description: string
  
  // 功能支持
  features: {
    realtime: boolean
    historical: boolean
    fundamental: boolean
    news: boolean
    global: boolean
  }
  
  // 性能指标
  performance: {
    speed: number
    reliability: number
    accuracy: number
  }
  
  // 使用限制
  limits: {
    requestsPerMinute: number
    requestsPerDay: number
    requiresToken: boolean
  }
  
  // 推荐场景
  recommendedFor: string[]
  
  // 其他信息
  website?: string
  documentation?: string
  apiVersion?: string
  lastUpdated?: Date
  
  // 数据源类型
  type: DataSourceType
}
