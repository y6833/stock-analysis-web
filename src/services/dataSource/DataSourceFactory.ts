import type DataSourceInterface from './DataSourceInterface'
import { TushareDataSource } from './TushareDataSource'
import { SinaDataSource } from './SinaDataSource'
import { EastMoneyDataSource } from './EastMoneyDataSource'
import { TencentDataSource } from './TencentDataSource'
import { NetEaseDataSource } from './NetEaseDataSource'

/**
 * 数据源类型
 */
export type DataSourceType = 'tushare' | 'sina' | 'eastmoney' | 'tencent' | 'netease' | 'yahoo'

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
    return ['tushare', 'sina', 'eastmoney', 'tencent', 'netease', 'yahoo']
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
}
