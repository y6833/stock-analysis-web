import type DataSourceInterface from './DataSourceInterface'
import { TushareDataSource } from './TushareDataSource'
import { SinaDataSource } from './SinaDataSource'
import { EastMoneyDataSource } from './EastMoneyDataSource'
import { TencentDataSource } from './TencentDataSource'
import { NetEaseDataSource } from './NetEaseDataSource'
import { AKShareDataSource } from './AKShareDataSource'

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
        return new TushareDataSource()
      case 'sina':
        return new SinaDataSource()
      case 'eastmoney':
        return new EastMoneyDataSource()
      case 'tencent':
        return new TencentDataSource()
      case 'netease':
        return new NetEaseDataSource()
      case 'akshare':
        return new AKShareDataSource()
      case 'yahoo':
        // Yahoo数据源暂未实现，使用Tushare数据源代替
        console.log(`Yahoo数据源尚未实现，暂时使用Tushare数据源代替`)
        return new TushareDataSource()
      default:
        console.log('未知数据源类型，使用默认的Tushare数据源')
        return new TushareDataSource()
    }
  }

  /**
   * 获取所有可用的数据源类型
   * @returns 数据源类型数组
   */
  static getAvailableDataSources(): DataSourceType[] {
    return ['tushare', 'sina', 'eastmoney', 'tencent', 'netease', 'akshare', 'yahoo']
  }

  /**
   * 获取推荐的数据源类型
   * @returns 推荐的数据源类型数组
   */
  static getRecommendedDataSources(): DataSourceType[] {
    return ['eastmoney', 'akshare', 'sina']
  }

  /**
   * 获取数据源信息
   * @param type 数据源类型
   * @returns 数据源名称和描述
   */
  static getDataSourceInfo(type: DataSourceType): { name: string; description: string } {
    const dataSource = this.createDataSource(type)
    return {
      name: dataSource.getName(),
      description: dataSource.getDescription(),
    }
  }

  /**
   * 获取数据源详细信息
   * @param type 数据源类型
   * @returns 数据源详细信息
   */
  static getDataSourceDetails(type: DataSourceType): DataSourceDetails {
    const dataSource = this.createDataSource(type)

    // 基本信息
    const name = dataSource.getName()
    const description = dataSource.getDescription()

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
   * @returns 是否可用
   */
  static async getDataSourceStatus(type: DataSourceType): Promise<boolean> {
    try {
      const dataSource = this.createDataSource(type)
      return await dataSource.testConnection()
    } catch (error) {
      console.error(`获取数据源${type}状态失败:`, error)
      return false
    }
  }
}
