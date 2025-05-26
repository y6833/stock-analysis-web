/**
 * 浏览器标题栏股价显示服务
 * 模仿爱盯盘插件在标题栏显示股价的功能
 */

import { ref, watch } from 'vue'
import { realtimeService } from './realtimeService'

export interface TitleStockConfig {
  symbol: string
  name: string
  showChange: boolean
  showPercent: boolean
  updateInterval: number
}

class TitleStockService {
  private originalTitle = ''
  private isEnabled = ref(false)
  private currentStock = ref<TitleStockConfig | null>(null)
  private updateTimer: number | null = null

  constructor() {
    this.originalTitle = document.title
    this.initializeWatchers()
  }

  /**
   * 初始化监听器
   */
  private initializeWatchers() {
    // 监听启用状态变化
    watch(this.isEnabled, (enabled) => {
      if (enabled && this.currentStock.value) {
        this.startTitleUpdate()
      } else {
        this.stopTitleUpdate()
      }
    })

    // 监听当前股票变化
    watch(this.currentStock, (stock) => {
      if (this.isEnabled.value && stock) {
        this.startTitleUpdate()
      }
    }, { deep: true })
  }

  /**
   * 启用标题栏股价显示
   */
  public enable(stockConfig: TitleStockConfig) {
    this.currentStock.value = stockConfig
    this.isEnabled.value = true
    
    // 订阅实时数据
    realtimeService.subscribe(stockConfig.symbol, this.onStockDataUpdate.bind(this))
    
    console.log(`已启用标题栏显示: ${stockConfig.symbol}`)
  }

  /**
   * 禁用标题栏股价显示
   */
  public disable() {
    this.isEnabled.value = false
    
    if (this.currentStock.value) {
      // 取消订阅
      realtimeService.unsubscribe(this.currentStock.value.symbol, this.onStockDataUpdate.bind(this))
      this.currentStock.value = null
    }
    
    // 恢复原始标题
    document.title = this.originalTitle
    console.log('已禁用标题栏股价显示')
  }

  /**
   * 切换启用状态
   */
  public toggle(stockConfig?: TitleStockConfig) {
    if (this.isEnabled.value) {
      this.disable()
    } else if (stockConfig) {
      this.enable(stockConfig)
    }
  }

  /**
   * 更新监控的股票
   */
  public updateStock(stockConfig: TitleStockConfig) {
    const wasEnabled = this.isEnabled.value
    
    if (wasEnabled) {
      this.disable()
    }
    
    if (wasEnabled) {
      this.enable(stockConfig)
    } else {
      this.currentStock.value = stockConfig
    }
  }

  /**
   * 开始标题更新
   */
  private startTitleUpdate() {
    this.stopTitleUpdate()
    
    if (!this.currentStock.value) return

    const updateInterval = this.currentStock.value.updateInterval || 3000
    
    // 立即更新一次
    this.updateTitle()
    
    // 设置定时更新
    this.updateTimer = setInterval(() => {
      this.updateTitle()
    }, updateInterval) as unknown as number
  }

  /**
   * 停止标题更新
   */
  private stopTitleUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * 更新浏览器标题
   */
  private updateTitle() {
    if (!this.currentStock.value || !this.isEnabled.value) return

    const stock = this.currentStock.value
    const realtimeData = realtimeService.getRealtimeData(stock.symbol)
    
    if (!realtimeData) {
      // 如果没有实时数据，显示基本信息
      document.title = `${stock.symbol} ${stock.name} - ${this.originalTitle}`
      return
    }

    let titleParts = []
    
    // 股票代码和名称
    titleParts.push(stock.symbol)
    
    // 当前价格
    titleParts.push(realtimeData.price.toFixed(2))
    
    // 涨跌额
    if (stock.showChange) {
      const changeStr = realtimeData.change >= 0 
        ? `+${realtimeData.change.toFixed(2)}`
        : realtimeData.change.toFixed(2)
      titleParts.push(changeStr)
    }
    
    // 涨跌幅
    if (stock.showPercent) {
      const percentStr = realtimeData.changePercent >= 0
        ? `+${realtimeData.changePercent.toFixed(2)}%`
        : `${realtimeData.changePercent.toFixed(2)}%`
      titleParts.push(`(${percentStr})`)
    }
    
    // 添加涨跌指示符
    const indicator = realtimeData.change > 0 ? '📈' : realtimeData.change < 0 ? '📉' : '➡️'
    titleParts.unshift(indicator)
    
    // 组合标题
    const stockTitle = titleParts.join(' ')
    document.title = `${stockTitle} - ${this.originalTitle}`
  }

  /**
   * 股票数据更新回调
   */
  private onStockDataUpdate(data: any) {
    if (this.isEnabled.value && this.currentStock.value?.symbol === data.symbol) {
      this.updateTitle()
    }
  }

  /**
   * 获取当前状态
   */
  public getStatus() {
    return {
      isEnabled: this.isEnabled.value,
      currentStock: this.currentStock.value,
      originalTitle: this.originalTitle
    }
  }

  /**
   * 设置更新间隔
   */
  public setUpdateInterval(interval: number) {
    if (this.currentStock.value) {
      this.currentStock.value.updateInterval = interval
      
      if (this.isEnabled.value) {
        this.startTitleUpdate()
      }
    }
  }

  /**
   * 获取预设配置
   */
  public getPresetConfigs(): TitleStockConfig[] {
    return [
      {
        symbol: '000001',
        name: '平安银行',
        showChange: true,
        showPercent: true,
        updateInterval: 3000
      },
      {
        symbol: '600519',
        name: '贵州茅台',
        showChange: true,
        showPercent: true,
        updateInterval: 3000
      },
      {
        symbol: '000858',
        name: '五粮液',
        showChange: true,
        showPercent: false,
        updateInterval: 5000
      },
      {
        symbol: '600036',
        name: '招商银行',
        showChange: false,
        showPercent: true,
        updateInterval: 3000
      }
    ]
  }

  /**
   * 保存配置到本地存储
   */
  public saveConfig(config: TitleStockConfig) {
    try {
      localStorage.setItem('titleStockConfig', JSON.stringify(config))
    } catch (error) {
      console.error('保存标题栏配置失败:', error)
    }
  }

  /**
   * 从本地存储加载配置
   */
  public loadConfig(): TitleStockConfig | null {
    try {
      const saved = localStorage.getItem('titleStockConfig')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('加载标题栏配置失败:', error)
      return null
    }
  }

  /**
   * 自动启动（从本地存储恢复）
   */
  public autoStart() {
    const savedConfig = this.loadConfig()
    if (savedConfig) {
      this.enable(savedConfig)
      console.log('自动启动标题栏股价显示:', savedConfig.symbol)
    }
  }

  /**
   * 页面可见性变化处理
   */
  public handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏时停止更新以节省资源
      this.stopTitleUpdate()
    } else if (this.isEnabled.value) {
      // 页面显示时恢复更新
      this.startTitleUpdate()
    }
  }
}

// 创建单例实例
export const titleStockService = new TitleStockService()

// 监听页面可见性变化
document.addEventListener('visibilitychange', () => {
  titleStockService.handleVisibilityChange()
})

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  titleStockService.disable()
})

// 自动启动
titleStockService.autoStart()
