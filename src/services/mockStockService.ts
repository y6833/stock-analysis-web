// 模拟股票数据服务，用于演示
export class MockStockService {
  // 模拟延迟
  private delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 生成随机价格
  private generateRandomPrice(base: number, volatility: number = 0.05) {
    const change = (Math.random() - 0.5) * 2 * volatility
    return Number((base * (1 + change)).toFixed(2))
  }

  // 生成随机成交量
  private generateRandomVolume(base: number = 1000000) {
    return Math.floor(base * (0.5 + Math.random()))
  }

  // 搜索股票
  async searchStocks(query: string) {
    await this.delay(300)
    
    const mockStocks = [
      { symbol: '000001.SZ', name: '平安银行' },
      { symbol: '000002.SZ', name: '万科A' },
      { symbol: '000858.SZ', name: '五粮液' },
      { symbol: '600000.SH', name: '浦发银行' },
      { symbol: '600036.SH', name: '招商银行' },
      { symbol: '600519.SH', name: '贵州茅台' },
      { symbol: '600887.SH', name: '伊利股份' },
      { symbol: '000858.SZ', name: '五粮液' }
    ]
    
    return mockStocks.filter(stock => 
      stock.symbol.includes(query.toUpperCase()) || 
      stock.name.includes(query)
    )
  }

  // 获取股票基本信息
  async getStockBasicInfo(symbol: string) {
    await this.delay()
    
    const basePrice = 50 + Math.random() * 100
    const change = (Math.random() - 0.5) * 10
    const changePercent = (change / basePrice) * 100
    
    return {
      symbol,
      name: this.getStockName(symbol),
      current_price: this.generateRandomPrice(basePrice),
      change,
      change_percent: changePercent,
      open: this.generateRandomPrice(basePrice, 0.02),
      previous_close: basePrice,
      high: this.generateRandomPrice(basePrice, 0.03),
      low: this.generateRandomPrice(basePrice, 0.03),
      volume: this.generateRandomVolume(),
      turnover: this.generateRandomVolume() * basePrice,
      market_cap: this.generateRandomVolume() * basePrice * 100,
      float_market_cap: this.generateRandomVolume() * basePrice * 80,
      update_time: new Date().toISOString()
    }
  }

  // 获取技术指标
  async getTechnicalIndicators(symbol: string) {
    await this.delay()
    
    const currentPrice = 50 + Math.random() * 100
    
    return {
      current_price: currentPrice,
      ma5: this.generateRandomPrice(currentPrice, 0.02),
      ma10: this.generateRandomPrice(currentPrice, 0.03),
      ma20: this.generateRandomPrice(currentPrice, 0.05),
      macd: (Math.random() - 0.5) * 2,
      rsi: 30 + Math.random() * 40,
      kdj_k: Math.random() * 100,
      kdj_d: Math.random() * 100,
      kdj_j: Math.random() * 100
    }
  }

  // 获取财务数据
  async getFinancialData(symbol: string) {
    await this.delay()
    
    return {
      pe_ratio: 10 + Math.random() * 30,
      pb_ratio: 1 + Math.random() * 5,
      roe: Math.random() * 20,
      revenue: 1000000000 + Math.random() * 5000000000,
      net_profit: 100000000 + Math.random() * 500000000,
      total_assets: 5000000000 + Math.random() * 10000000000,
      net_assets: 2000000000 + Math.random() * 5000000000,
      eps: Math.random() * 5
    }
  }

  // 获取K线数据
  async getKlineData(symbol: string, period: string) {
    await this.delay()
    
    const data = []
    const basePrice = 50 + Math.random() * 100
    let currentPrice = basePrice
    
    for (let i = 0; i < 100; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (100 - i))
      
      const open = currentPrice
      const change = (Math.random() - 0.5) * 0.1
      const close = open * (1 + change)
      const high = Math.max(open, close) * (1 + Math.random() * 0.05)
      const low = Math.min(open, close) * (1 - Math.random() * 0.05)
      const volume = this.generateRandomVolume()
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: Number(open.toFixed(2)),
        close: Number(close.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        volume
      })
      
      currentPrice = close
    }
    
    return data
  }

  // 获取分时数据
  async getTimeData(symbol: string) {
    await this.delay()
    
    const data = []
    const basePrice = 50 + Math.random() * 100
    let currentPrice = basePrice
    
    for (let i = 0; i < 240; i++) { // 4小时，每分钟一个点
      const time = new Date()
      time.setHours(9, 30 + i, 0, 0)
      
      const change = (Math.random() - 0.5) * 0.02
      currentPrice = currentPrice * (1 + change)
      
      data.push({
        time: time.toTimeString().slice(0, 5),
        price: Number(currentPrice.toFixed(2))
      })
    }
    
    return data
  }

  // 获取成交明细
  async getTransactionDetails(symbol: string) {
    await this.delay()
    
    const data = []
    const basePrice = 50 + Math.random() * 100
    
    for (let i = 0; i < 50; i++) {
      const time = new Date()
      time.setSeconds(time.getSeconds() - i * 10)
      
      data.push({
        id: `tx_${i}`,
        time: time.toISOString(),
        price: this.generateRandomPrice(basePrice, 0.01),
        volume: Math.floor(Math.random() * 1000) + 100,
        direction: Math.random() > 0.5 ? 'buy' : 'sell'
      })
    }
    
    return data
  }

  // 获取资金流向
  async getMoneyFlow(symbol: string) {
    await this.delay()
    
    return {
      main_inflow: Math.random() * 100000000,
      main_outflow: Math.random() * 100000000,
      retail_inflow: Math.random() * 50000000,
      retail_outflow: Math.random() * 50000000
    }
  }

  // 获取买卖盘
  async getOrderBook(symbol: string) {
    await this.delay()
    
    const basePrice = 50 + Math.random() * 100
    
    const buy = []
    const sell = []
    
    for (let i = 0; i < 5; i++) {
      buy.push({
        price: this.generateRandomPrice(basePrice * (1 - (i + 1) * 0.001)),
        volume: this.generateRandomVolume(10000)
      })
      
      sell.push({
        price: this.generateRandomPrice(basePrice * (1 + (i + 1) * 0.001)),
        volume: this.generateRandomVolume(10000)
      })
    }
    
    return { buy, sell }
  }

  // 获取股票名称
  private getStockName(symbol: string): string {
    const names: Record<string, string> = {
      '000001.SZ': '平安银行',
      '000002.SZ': '万科A',
      '000858.SZ': '五粮液',
      '600000.SH': '浦发银行',
      '600036.SH': '招商银行',
      '600519.SH': '贵州茅台',
      '600887.SH': '伊利股份'
    }
    
    return names[symbol] || '测试股票'
  }
}

// 创建单例实例
export const mockStockService = new MockStockService()

// 在开发环境中替换真实的股票服务
if (import.meta.env.DEV) {
  // 可以在这里设置开发环境的模拟数据
  console.log('使用模拟股票数据服务')
}
