import type DataSourceInterface from './DataSourceInterface'
import type { Stock, StockData, StockQuote, FinancialNews } from '@/types/stock'
import { zhituConfig, validateApiConfig } from '@/config/apiConfig'
import { createApiClient, ApiError } from '@/utils/apiRequest'

/**
 * 智兔数服数据源实现
 * 专业的股票数据API服务商，提供全面的股票数据接口
 */
export class ZhituDataSource implements DataSourceInterface {
  private readonly apiClient = createApiClient(zhituConfig)

  /**
   * 验证API配置
   */
  private validateConfig(): void {
    const validation = validateApiConfig('zhitu')
    if (!validation.isValid) {
      throw new ApiError(
        `智兔数服API配置无效: 缺少 ${validation.missingFields.join(', ')}。请检查环境变量配置。`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 获取股票列表
   */
  async getStocks(): Promise<Stock[]> {
    try {
      this.validateConfig()
      console.log('从智兔数服获取股票列表数据')

      // 调用智兔数服API获取股票列表
      const response = await this.apiClient.get('/api/v1/stock/list', {
        market: 'all', // 获取所有市场
        status: 'active', // 只获取活跃股票
        page: 1,
        limit: 5000, // 获取足够多的股票
      })

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || '智兔数服API返回数据格式错误',
          undefined,
          response,
          'zhitu'
        )
      }

      // 转换数据格式
      const stocks: Stock[] = response.data.map((item: any) => ({
        symbol: item.symbol || item.code || item.ts_code,
        name: item.name || item.stock_name || item.short_name,
        market: this.parseMarket(item.market || item.exchange || item.symbol),
        industry: item.industry || item.sector || item.concept || '未知',
      }))

      console.log(`智兔数服获取股票列表成功: ${stocks.length} 只股票`)
      return stocks
    } catch (error) {
      console.error('智兔数服获取股票列表失败:', error)

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        `智兔数服获取股票列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 解析市场信息
   */
  private parseMarket(marketOrSymbol: string): string {
    if (!marketOrSymbol) return '未知'

    const upper = marketOrSymbol.toUpperCase()
    if (upper.includes('SH') || upper.includes('SHANGHAI') || upper.includes('SSE')) return '上海'
    if (upper.includes('SZ') || upper.includes('SHENZHEN') || upper.includes('SZSE')) return '深圳'
    if (upper.includes('BJ') || upper.includes('BEIJING') || upper.includes('BSE')) return '北京'

    return marketOrSymbol
  }

  /**
   * 获取单个股票数据
   * @param symbol 股票代码
   */
  async getStockData(symbol: string): Promise<StockData> {
    try {
      this.validateConfig()
      console.log(`从智兔数服获取股票${symbol}数据`)

      // 调用智兔数服API获取股票详细数据
      const response = await this.apiClient.get('/api/v1/stock/detail', {
        symbol: symbol,
        fields: 'basic,quote,financial', // 获取基本信息、行情和财务数据
      })

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || `智兔数服无法获取股票${symbol}的数据`,
          undefined,
          response,
          'zhitu'
        )
      }

      const data = response.data

      const stockData: StockData = {
        symbol: data.symbol || symbol,
        name: data.name || data.stock_name || '未知',
        price: parseFloat(data.current_price || data.price || data.close) || 0,
        change: parseFloat(data.change || data.price_change) || 0,
        changePercent: parseFloat(data.change_percent || data.pct_change) || 0,
        volume: parseInt(data.volume || data.vol) || 0,
        turnover: parseFloat(data.turnover || data.amount) || 0,
        high: parseFloat(data.high || data.day_high) || 0,
        low: parseFloat(data.low || data.day_low) || 0,
        open: parseFloat(data.open || data.open_price) || 0,
        close: parseFloat(data.close || data.pre_close) || 0,
        marketCap: parseFloat(data.market_cap || data.total_mv) || 0,
        pe: parseFloat(data.pe || data.pe_ratio) || 0,
        pb: parseFloat(data.pb || data.pb_ratio) || 0,
        timestamp: data.timestamp || Date.now(),
      }

      console.log(`智兔数服获取股票${symbol}数据成功`)
      return stockData
    } catch (error) {
      console.error(`智兔数服获取股票${symbol}数据失败:`, error)

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        `智兔数服获取股票${symbol}数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 搜索股票
   * @param query 搜索关键词
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      this.validateConfig()
      console.log(`智兔数服搜索股票: ${query}`)

      // 调用智兔数服API搜索股票
      const response = await this.apiClient.get('/api/v1/stock/search', {
        keyword: query,
        limit: 50, // 限制搜索结果数量
      })

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || `智兔数服搜索股票"${query}"失败`,
          undefined,
          response,
          'zhitu'
        )
      }

      // 转换数据格式
      const stocks: Stock[] = response.data.map((item: any) => ({
        symbol: item.symbol || item.code || item.ts_code,
        name: item.name || item.stock_name || item.short_name,
        market: this.parseMarket(item.market || item.exchange || item.symbol),
        industry: item.industry || item.sector || item.concept || '未知',
      }))

      console.log(`智兔数服搜索"${query}"成功: ${stocks.length}条结果`)
      return stocks
    } catch (error) {
      console.error(`智兔数服搜索股票失败:`, error)

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        `智兔数服搜索股票失败: ${error instanceof Error ? error.message : '未知错误'}`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 获取股票实时行情
   * @param symbol 股票代码
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      this.validateConfig()
      console.log(`从智兔数服获取股票${symbol}实时行情`)

      // 调用智兔数服API获取实时行情
      const response = await this.apiClient.get('/api/v1/stock/quote', {
        symbol: symbol,
      })

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || `智兔数服无法获取股票${symbol}的实时行情`,
          undefined,
          response,
          'zhitu'
        )
      }

      const data = response.data

      const quote: StockQuote = {
        symbol: data.symbol || symbol,
        name: data.name || data.stock_name || '未知',
        price: parseFloat(data.current_price || data.price || data.close) || 0,
        change: parseFloat(data.change || data.price_change) || 0,
        changePercent: parseFloat(data.change_percent || data.pct_change) || 0,
        volume: parseInt(data.volume || data.vol) || 0,
        timestamp: data.timestamp || Date.now(),
      }

      console.log(`智兔数服获取股票${symbol}实时行情成功`)
      return quote
    } catch (error) {
      console.error(`智兔数服获取股票${symbol}实时行情失败:`, error)

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        `智兔数服获取股票${symbol}实时行情失败: ${
          error instanceof Error ? error.message : '未知错误'
        }`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 获取财经新闻
   * @param limit 新闻数量限制
   */
  async getFinancialNews(limit: number = 10): Promise<FinancialNews[]> {
    try {
      this.validateConfig()
      console.log(`从智兔数服获取财经新闻，限制${limit}条`)

      // 调用智兔数服API获取财经新闻
      const response = await this.apiClient.get('/api/v1/news/financial', {
        limit: limit,
        category: 'stock', // 股票相关新闻
      })

      if (!response.success || !response.data) {
        throw new ApiError(
          response.error || '智兔数服暂不提供新闻服务',
          undefined,
          response,
          'zhitu'
        )
      }

      // 转换数据格式
      const news: FinancialNews[] = response.data.map((item: any) => ({
        id: item.id || item.news_id || Math.random().toString(),
        title: item.title || item.headline,
        summary: item.summary || item.content || item.description || '',
        url: item.url || item.link || '#',
        publishTime: item.publish_time || item.timestamp || Date.now(),
        source: item.source || '智兔数服',
      }))

      console.log(`智兔数服获取财经新闻成功: ${news.length}条`)
      return news
    } catch (error) {
      console.error('智兔数服获取财经新闻失败:', error)

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError(
        `智兔数服获取财经新闻失败: ${error instanceof Error ? error.message : '未知错误'}`,
        undefined,
        undefined,
        'zhitu'
      )
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('测试智兔数服连接')

      // 验证配置
      const validation = validateApiConfig('zhitu')
      if (!validation.isValid) {
        console.error('智兔数服配置无效:', validation.missingFields)
        return false
      }

      // 调用API测试连接
      const response = await this.apiClient.get(
        '/api/v1/ping',
        {},
        {
          timeout: 5000,
          retryCount: 1,
        }
      )

      if (response.success) {
        console.log('智兔数服连接测试成功')
        return true
      }

      console.error('智兔数服连接测试失败:', response.error)
      return false
    } catch (error) {
      console.error('智兔数服连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取数据源名称
   */
  getName(): string {
    return '智兔数服'
  }

  /**
   * 获取数据源描述
   */
  getDescription(): string {
    return '专业股票数据API服务商，提供全面的股票数据接口'
  }
}
