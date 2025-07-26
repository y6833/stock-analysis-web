/**
 * Tushare 数据处理工具
 * 提供数据转换、验证、格式化等功能
 */

import type {
  TushareResponse,
  TushareExtendedResponse,
  TushareApiResponse,
  TushareCode,
  TushareDate,
  StockBasicItem,
  DailyItem,
  TushareValidators,
  TushareConverters,
  DataQuality,
  DataSourceType
} from '@/types/tushare'

// 数据处理器接口
export interface DataProcessor<T> {
  validate(data: any): boolean
  transform(rawData: any[][]): T[]
  format(data: T): T
  enrich(data: T): T
}

// 通用数据处理器
export class TushareDataProcessor<T> implements DataProcessor<T> {
  private fieldMapping: Record<string, string>
  private validators: Record<string, (value: any) => boolean>
  private transformers: Record<string, (value: any) => any>

  constructor(
    fieldMapping: Record<string, string> = {},
    validators: Record<string, (value: any) => boolean> = {},
    transformers: Record<string, (value: any) => any> = {}
  ) {
    this.fieldMapping = fieldMapping
    this.validators = validators
    this.transformers = transformers
  }

  // 验证数据
  validate(data: any): boolean {
    if (!data || !Array.isArray(data)) {
      return false
    }

    for (const item of data) {
      for (const [field, validator] of Object.entries(this.validators)) {
        if (item[field] !== undefined && !validator(item[field])) {
          console.warn(`数据验证失败: 字段 ${field} 值 ${item[field]} 不符合要求`)
          return false
        }
      }
    }

    return true
  }

  // 转换原始数据
  transform(rawData: any[][]): T[] {
    return rawData.map(row => {
      const item: any = {}
      
      // 应用字段映射和转换
      for (const [index, value] of row.entries()) {
        const fieldName = Object.keys(this.fieldMapping)[index] || `field_${index}`
        const mappedName = this.fieldMapping[fieldName] || fieldName
        
        // 应用转换器
        const transformer = this.transformers[mappedName]
        item[mappedName] = transformer ? transformer(value) : value
      }

      return item as T
    })
  }

  // 格式化数据
  format(data: T): T {
    // 默认实现，子类可以重写
    return data
  }

  // 丰富数据（添加计算字段等）
  enrich(data: T): T {
    // 默认实现，子类可以重写
    return data
  }
}

// 股票基础信息处理器
export class StockBasicProcessor extends TushareDataProcessor<StockBasicItem> {
  constructor() {
    super(
      {
        // 字段映射
        ts_code: 'ts_code',
        symbol: 'symbol',
        name: 'name',
        area: 'area',
        industry: 'industry',
        market: 'market',
        exchange: 'exchange',
        list_status: 'list_status',
        list_date: 'list_date'
      },
      {
        // 验证器
        ts_code: TushareValidators.isValidTsCode,
        list_date: TushareValidators.isValidDate,
        exchange: TushareValidators.isValidExchange,
        list_status: TushareValidators.isValidListStatus
      },
      {
        // 转换器
        list_date: (value: string) => value || '',
        delist_date: (value: string) => value || ''
      }
    )
  }

  // 丰富股票基础信息
  enrich(data: StockBasicItem): StockBasicItem {
    const enriched = { ...data }
    
    // 添加计算字段
    enriched.is_listed = data.list_status === 'L'
    enriched.exchange_name = this.getExchangeName(data.exchange)
    enriched.market_type = this.getMarketType(data.market)
    
    return enriched
  }

  private getExchangeName(exchange: string): string {
    const names = {
      'SSE': '上海证券交易所',
      'SZSE': '深圳证券交易所',
      'BSE': '北京证券交易所'
    }
    return names[exchange as keyof typeof names] || exchange
  }

  private getMarketType(market: string): string {
    const types = {
      '主板': 'main',
      '中小板': 'sme',
      '创业板': 'gem',
      '科创板': 'star',
      'CDR': 'cdr',
      '北交所': 'bse'
    }
    return types[market as keyof typeof types] || market
  }
}

// 日线行情处理器
export class DailyProcessor extends TushareDataProcessor<DailyItem> {
  constructor() {
    super(
      {
        ts_code: 'ts_code',
        trade_date: 'trade_date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        pre_close: 'pre_close',
        change: 'change',
        pct_chg: 'pct_chg',
        vol: 'vol',
        amount: 'amount'
      },
      {
        ts_code: TushareValidators.isValidTsCode,
        trade_date: TushareValidators.isValidDate
      },
      {
        open: (value: any) => parseFloat(value) || 0,
        high: (value: any) => parseFloat(value) || 0,
        low: (value: any) => parseFloat(value) || 0,
        close: (value: any) => parseFloat(value) || 0,
        pre_close: (value: any) => parseFloat(value) || 0,
        change: (value: any) => parseFloat(value) || 0,
        pct_chg: (value: any) => parseFloat(value) || 0,
        vol: (value: any) => parseFloat(value) || 0,
        amount: (value: any) => parseFloat(value) || 0
      }
    )
  }

  // 丰富日线数据
  enrich(data: DailyItem): DailyItem {
    const enriched = { ...data }
    
    // 添加技术指标
    enriched.amplitude = this.calculateAmplitude(data.high, data.low, data.pre_close)
    enriched.turnover_rate = this.calculateTurnoverRate(data.vol, data.amount)
    enriched.is_up = data.change > 0
    enriched.is_down = data.change < 0
    enriched.is_limit_up = Math.abs(data.pct_chg - 10) < 0.01
    enriched.is_limit_down = Math.abs(data.pct_chg + 10) < 0.01
    
    return enriched
  }

  private calculateAmplitude(high: number, low: number, preClose: number): number {
    if (preClose === 0) return 0
    return ((high - low) / preClose) * 100
  }

  private calculateTurnoverRate(vol: number, amount: number): number {
    if (amount === 0) return 0
    return (vol * 100) / (amount / 1000) // 简化计算
  }
}

// 响应数据处理器
export class ResponseProcessor {
  // 处理 Tushare 响应数据
  static processResponse<T>(
    response: TushareResponse<T>,
    processor: DataProcessor<T>
  ): TushareExtendedResponse<T> {
    const { fields, items } = response.data
    
    // 验证数据
    if (!processor.validate(items)) {
      console.warn('数据验证失败，可能存在数据质量问题')
    }
    
    // 转换数据
    const transformedItems = processor.transform(items)
    
    // 格式化和丰富数据
    const processedItems = transformedItems
      .map(item => processor.format(item))
      .map(item => processor.enrich(item))
    
    // 评估数据质量
    const quality = this.assessDataQuality(processedItems, fields)
    
    return {
      ...response,
      data: {
        fields,
        items: processedItems as any[][]
      },
      quality,
      source_type: DataSourceType.HISTORICAL,
      timestamp: Date.now()
    }
  }

  // 评估数据质量
  private static assessDataQuality<T>(items: T[], fields: string[]): DataQuality {
    if (items.length === 0) {
      return DataQuality.LOW
    }

    let qualityScore = 0
    const totalFields = fields.length

    for (const item of items) {
      let validFields = 0
      for (const field of fields) {
        const value = (item as any)[field]
        if (value !== null && value !== undefined && value !== '') {
          validFields++
        }
      }
      qualityScore += validFields / totalFields
    }

    const averageQuality = qualityScore / items.length

    if (averageQuality >= 0.9) {
      return DataQuality.HIGH
    } else if (averageQuality >= 0.7) {
      return DataQuality.MEDIUM
    } else {
      return DataQuality.LOW
    }
  }

  // 合并多个响应
  static mergeResponses<T>(responses: TushareExtendedResponse<T>[]): TushareExtendedResponse<T> {
    if (responses.length === 0) {
      throw new Error('无法合并空响应列表')
    }

    const firstResponse = responses[0]
    const allItems: any[][] = []

    for (const response of responses) {
      allItems.push(...response.data.items)
    }

    return {
      ...firstResponse,
      data: {
        ...firstResponse.data,
        items: allItems
      },
      timestamp: Date.now()
    }
  }
}

// 导出处理器实例
export const stockBasicProcessor = new StockBasicProcessor()
export const dailyProcessor = new DailyProcessor()

// 导出工具函数
export { TushareValidators, TushareConverters } from '@/types/tushare'
