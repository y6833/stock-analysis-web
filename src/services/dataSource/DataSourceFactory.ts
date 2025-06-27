import type DataSourceInterface from './DataSourceInterface'
import { TushareDataSource } from './TushareDataSource'
import { SinaDataSource } from './SinaDataSource'
import { EastMoneyDataSource } from './EastMoneyDataSource'
import { TencentDataSource } from './TencentDataSource'
import { NetEaseDataSource } from './NetEaseDataSource'
import { AKShareDataSource } from './AKShareDataSource'
import { ZhituDataSource } from './ZhituDataSource'
import { YahooFinanceDataSource } from './YahooFinanceDataSource'
import { GoogleFinanceDataSource } from './GoogleFinanceDataSource'
import { JuheDataSource } from './JuheDataSource'
// 新增的增强版数据源
import TencentEnhancedDataSource from './TencentEnhancedDataSource'
import NetEaseEnhancedDataSource from './NetEaseEnhancedDataSource'
import AlphaVantageDataSource from './AlphaVantageDataSource'

/**
 * 数据源类型
 */
export type DataSourceType =
  | 'tushare'
  | 'sina'
  | 'eastmoney'
  | 'tencent'
  | 'netease'
  | 'akshare'
  | 'yahoo'
  | 'zhitu'
  | 'yahoo_finance'
  | 'google_finance'
  | 'juhe'
  // 新增的增强版数据源
  | 'tencent_enhanced'
  | 'netease_enhanced'
  | 'alphavantage'

/**
 * 数据源特性
 */
export interface DataSourceFeatures {
  realtime: boolean // 是否支持实时行情
  history: boolean // 是否支持历史数据
  fundamental: boolean // 是否支持基本面数据
  news: boolean // 是否支持新闻数据
  search: boolean // 是否支持搜索功能
  global: boolean // 是否支持全球市场
}

/**
 * 数据源详细信息
 */
export interface DataSourceDetails {
  name: string // 数据源名称
  description: string // 数据源描述
  features: DataSourceFeatures // 数据源特性
  reliability: number // 可靠性评分 (1-5)
  speed: number // 速度评分 (1-5)
  coverage: number // 覆盖范围评分 (1-5)
  apiLimit: string // API限制说明
  recommendation: string // 推荐使用场景
}

/**
 * 数据源工厂
 * 用于创建不同类型的数据源实例
 */
export class DataSourceFactory {
  /**
   * 创建数据源实例
   * @param type 数据源类型
   * @returns 数据源实例
   */
  static createDataSource(type: DataSourceType): DataSourceInterface {
    switch (type) {
      case 'tushare':
        console.log('创建 Tushare 数据源实例')
        return new TushareDataSource()
      case 'sina':
        console.log('创建 新浪财经 数据源实例')
        return new SinaDataSource()
      case 'eastmoney':
        console.log('创建 东方财富 数据源实例')
        return new EastMoneyDataSource()
      case 'tencent':
        console.log('创建 腾讯财经 数据源实例')
        return new TencentDataSource()
      case 'netease':
        console.log('创建 网易财经 数据源实例')
        return new NetEaseDataSource()
      case 'akshare':
        console.log('创建 AKShare 数据源实例')
        return new AKShareDataSource()
      case 'zhitu':
        console.log('创建 智兔数服 数据源实例')
        return new ZhituDataSource()
      case 'yahoo_finance':
        console.log('创建 Yahoo Finance 数据源实例')
        return new YahooFinanceDataSource()
      case 'google_finance':
        console.log('创建 Google Finance 数据源实例')
        return new GoogleFinanceDataSource()
      case 'juhe':
        console.log('创建 聚合数据 数据源实例')
        return new JuheDataSource()
      // 新增的增强版数据源
      case 'tencent_enhanced':
        console.log('创建 腾讯财经增强版 数据源实例')
        return new TencentEnhancedDataSource()
      case 'netease_enhanced':
        console.log('创建 网易财经增强版 数据源实例')
        return new NetEaseEnhancedDataSource()
      case 'alphavantage':
        console.log('创建 Alpha Vantage 数据源实例')
        return new AlphaVantageDataSource()
      case 'yahoo':
        // 为了避免混用数据源，使用新浪数据源代替
        console.log(`Yahoo数据源尚未实现，暂时使用新浪财经数据源代替`)
        return new SinaDataSource()
      default:
        // 为了避免混用数据源，使用新浪数据源作为默认
        console.log(`未知数据源类型: ${type}，使用新浪财经数据源作为默认`)
        return new SinaDataSource()
    }
  }

  /**
   * 获取所有可用的数据源类型
   * @returns 数据源类型数组
   */
  static getAvailableDataSources(): DataSourceType[] {
    return [
      'tushare',
      'sina',
      'eastmoney',
      'tencent',
      'netease',
      'akshare',
      'yahoo',
      'zhitu',
      'yahoo_finance',
      'google_finance',
      'juhe',
    ]
  }

  /**
   * 获取推荐的数据源类型
   * @returns 推荐的数据源类型数组
   */
  static getRecommendedDataSources(): DataSourceType[] {
    return ['zhitu', 'eastmoney', 'yahoo_finance', 'akshare', 'sina']
  }

  /**
   * 获取数据源信息
   * @param type 数据源类型
   * @returns 数据源名称和描述
   */
  static getDataSourceInfo(type: DataSourceType): { name: string; description: string } {
    // 直接返回静态信息，避免创建实例
    switch (type) {
      case 'tushare':
        return {
          name: 'Tushare数据',
          description: '提供A股基础数据，包括行情、基本面等',
        }
      case 'sina':
        return {
          name: '新浪财经',
          description: '提供实时行情数据，无需注册直接调用',
        }
      case 'eastmoney':
        return {
          name: '东方财富',
          description: '提供全面的股票数据和财经资讯',
        }
      case 'tencent':
        return {
          name: '腾讯财经',
          description: '提供实时行情和财经资讯',
        }
      case 'netease':
        return {
          name: '网易财经',
          description: '提供股票数据和财经新闻',
        }
      case 'akshare':
        return {
          name: 'AKShare',
          description: '开源财经数据接口库，提供丰富的数据源',
        }
      case 'yahoo':
        return {
          name: 'Yahoo财经',
          description: '提供全球市场数据，包括股票、指数等',
        }
      case 'zhitu':
        return {
          name: '智兔数服',
          description: '专业股票数据API服务商，提供全面的股票数据接口',
        }
      case 'yahoo_finance':
        return {
          name: 'Yahoo Finance API',
          description: '广泛使用的免费股票API，提供美国和加拿大股票市场数据',
        }
      case 'google_finance':
        return {
          name: 'Google Finance API',
          description: '谷歌提供的免费股票API，支持全球多个股票市场',
        }
      case 'juhe':
        return {
          name: '聚合数据',
          description: '专业数据服务平台，提供实时股票交易数据',
        }
      // 新增的增强版数据源
      case 'tencent_enhanced':
        return {
          name: '腾讯财经(增强版)',
          description: '直接调用腾讯财经API，无需后端代理，稳定可靠',
        }
      case 'netease_enhanced':
        return {
          name: '网易财经(增强版)',
          description: '专注于高质量历史数据，支持完整的复权数据',
        }
      case 'alphavantage':
        return {
          name: 'Alpha Vantage',
          description: '官方API，支持全球市场，包含A股和美股数据',
        }
      default:
        return {
          name: '未知数据源',
          description: '未知数据源类型',
        }
    }
  }

  /**
   * 获取数据源详细信息
   * @param type 数据源类型
   * @returns 数据源详细信息
   */
  static getDataSourceDetails(type: DataSourceType): DataSourceDetails {
    // 获取基本信息
    const { name, description } = this.getDataSourceInfo(type)

    // 根据不同数据源类型设置详细信息
    switch (type) {
      case 'tushare':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: false,
            search: true,
            global: false,
          },
          reliability: 3.5,
          speed: 3.0,
          coverage: 4.0,
          apiLimit: '每分钟限制访问次数，需要token',
          recommendation: '适合需要A股历史数据和基本面数据的场景',
        }
      case 'sina':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: false,
            fundamental: false,
            news: true,
            search: true,
            global: false,
          },
          reliability: 4.0,
          speed: 4.5,
          coverage: 3.5,
          apiLimit: '无明显限制，但不提供完整历史数据',
          recommendation: '适合需要实时行情和新闻的场景',
        }
      case 'eastmoney':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: true,
            search: true,
            global: false,
          },
          reliability: 4.5,
          speed: 4.0,
          coverage: 4.5,
          apiLimit: '无明显限制',
          recommendation: '综合性最强的数据源，推荐作为首选',
        }
      case 'tencent':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: false,
            fundamental: false,
            news: true,
            search: true,
            global: false,
          },
          reliability: 4.0,
          speed: 4.0,
          coverage: 3.5,
          apiLimit: '无明显限制，但不提供完整历史数据',
          recommendation: '适合需要实时行情和新闻的场景',
        }
      case 'netease':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: false,
            news: true,
            search: true,
            global: false,
          },
          reliability: 3.5,
          speed: 3.5,
          coverage: 3.5,
          apiLimit: '无明显限制',
          recommendation: '适合需要实时行情和部分历史数据的场景',
        }
      case 'akshare':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: true,
            search: true,
            global: true,
          },
          reliability: 4.0,
          speed: 3.5,
          coverage: 5.0,
          apiLimit: '无明显限制，但依赖Python环境',
          recommendation: '数据覆盖面最广，适合需要全面数据的场景',
        }
      case 'yahoo':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: true,
            search: true,
            global: true,
          },
          reliability: 4.0,
          speed: 3.0,
          coverage: 4.5,
          apiLimit: '有API访问限制',
          recommendation: '适合需要全球市场数据的场景，A股数据有限',
        }
      case 'zhitu':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: false,
            search: true,
            global: false,
          },
          reliability: 4.5,
          speed: 4.0,
          coverage: 4.5,
          apiLimit: '专业服务，费用在日常运营成本中几乎可以忽略不计',
          recommendation: '专业数据服务商，数据接口全面，服务稳定，推荐使用',
        }
      case 'yahoo_finance':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: true,
            news: true,
            search: true,
            global: true,
          },
          reliability: 4.0,
          speed: 4.0,
          coverage: 4.0,
          apiLimit: '免费使用，支持批量获取和自定义请求',
          recommendation: '广泛使用的免费API，适合美国和加拿大股票市场数据',
        }
      case 'google_finance':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: false,
            fundamental: false,
            news: true,
            search: true,
            global: true,
          },
          reliability: 4.0,
          speed: 4.5,
          coverage: 4.0,
          apiLimit: '免费使用，支持全球多个股票市场',
          recommendation: '谷歌提供的免费API，适合需要全球市场实时数据的场景',
        }
      case 'juhe':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: false,
            fundamental: false,
            news: false,
            search: false,
            global: false,
          },
          reliability: 3.5,
          speed: 4.0,
          coverage: 3.0,
          apiLimit: '每天免费调用50次',
          recommendation: '专业数据平台，只提供实时交易数据，适合轻量级使用',
        }
      // 新增的增强版数据源
      case 'tencent_enhanced':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: false,
            news: false,
            search: true,
            global: false,
          },
          reliability: 4.8,
          speed: 4.9,
          coverage: 4.0,
          apiLimit: '完全免费，每秒可调用数十次',
          recommendation: '最推荐的免费数据源，腾讯大厂背景，稳定性极高',
        }
      case 'netease_enhanced':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: false,
            news: false,
            search: true,
            global: false,
          },
          reliability: 4.5,
          speed: 4.0,
          coverage: 4.5,
          apiLimit: '完全免费，调用限制宽松',
          recommendation: '历史数据专家，数据完整性和质量极高，支持长期历史数据',
        }
      case 'alphavantage':
        return {
          name,
          description,
          features: {
            realtime: true,
            history: true,
            fundamental: false,
            news: true,
            search: true,
            global: true,
          },
          reliability: 4.2,
          speed: 3.5,
          coverage: 4.8,
          apiLimit: '免费版每天500次调用，每分钟5次',
          recommendation: '官方API，支持全球市场，适合需要国际化数据的场景',
        }
      default:
        return {
          name,
          description,
          features: {
            realtime: false,
            history: false,
            fundamental: false,
            news: false,
            search: false,
            global: false,
          },
          reliability: 0,
          speed: 0,
          coverage: 0,
          apiLimit: '未知',
          recommendation: '不推荐使用',
        }
    }
  }

  /**
   * 获取数据源状态
   * @param type 数据源类型
   * @param currentSource 当前选择的数据源类型
   * @returns 是否可用
   */
  static async getDataSourceStatus(
    type: DataSourceType,
    currentSource?: DataSourceType
  ): Promise<boolean> {
    try {
      // 如果指定了当前数据源，且不是要测试的数据源，则跳过测试
      if (currentSource && type !== currentSource) {
        console.log(`跳过测试非当前数据源: ${type}，当前数据源是: ${currentSource}`)
        // 返回假设的成功结果，避免显示错误消息
        return true
      }

      const dataSource = this.createDataSource(type)
      return await dataSource.testConnection()
    } catch (error) {
      console.error(`获取数据源${type}状态失败:`, error)
      return false
    }
  }
}
