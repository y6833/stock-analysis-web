import { dojiPatternIntegrationService } from './DojiPatternIntegrationService'
import { useUserStore } from '@/stores/userStore'

/**
 * 十字星形态系统服务
 * 负责协调十字星形态功能的各个组件，优化性能，管理缓存和配置
 */
export class DojiPatternSystemService {
    private static instance: DojiPatternSystemService
    private cacheEnabled: boolean = true
    private cacheExpiryTime: number = 30 * 60 * 1000 // 30分钟
    private calculationThrottleTime: number = 500 // 500毫秒

    /**
     * 获取单例实例
     */
    public static getInstance(): DojiPatternSystemService {
        if (!DojiPatternSystemService.instance) {
            DojiPatternSystemService.instance = new DojiPatternSystemService()
        }
        return DojiPatternSystemService.instance
    }

    /**
     * 初始化系统
     */
    public async initialize(): Promise<void> {
        console.log('初始化十字星形态系统...')

        // 加载用户配置
        await this.loadUserConfig()

        // 预热缓存
        this.preloadCache()

        // 检查是否需要显示功能介绍
        this.checkFirstTimeUser()

        console.log('十字星形态系统初始化完成')
    }

    /**
     * 加载用户配置
     */
    private async loadUserConfig(): Promise<void> {
        try {
            // 从本地存储加载配置
            const configStr = localStorage.getItem('dojiPatternConfig')
            if (configStr) {
                const config = JSON.parse(configStr)
                this.cacheEnabled = config.cacheEnabled ?? true
                this.cacheExpiryTime = config.cacheExpiryTime ?? 30 * 60 * 1000
                this.calculationThrottleTime = config.calculationThrottleTime ?? 500
            }

            // 如果用户已登录，从服务器加载配置
            const userStore = useUserStore()
            if (userStore.isAuthenticated) {
                // 这里应该调用API获取用户配置
                // 目前使用模拟数据
                setTimeout(() => {
                    console.log('从服务器加载十字星形态配置')
                }, 100)
            }
        } catch (error) {
            console.error('加载十字星形态配置失败:', error)
        }
    }

    /**
     * 保存用户配置
     */
    public saveUserConfig(config: {
        cacheEnabled?: boolean
        cacheExpiryTime?: number
        calculationThrottleTime?: number
    }): void {
        // 更新本地配置
        if (config.cacheEnabled !== undefined) {
            this.cacheEnabled = config.cacheEnabled
        }
        if (config.cacheExpiryTime !== undefined) {
            this.cacheExpiryTime = config.cacheExpiryTime
        }
        if (config.calculationThrottleTime !== undefined) {
            this.calculationThrottleTime = config.calculationThrottleTime
        }

        // 保存到本地存储
        const configToSave = {
            cacheEnabled: this.cacheEnabled,
            cacheExpiryTime: this.cacheExpiryTime,
            calculationThrottleTime: this.calculationThrottleTime
        }
        localStorage.setItem('dojiPatternConfig', JSON.stringify(configToSave))

        // 如果用户已登录，保存到服务器
        const userStore = useUserStore()
        if (userStore.isAuthenticated) {
            // 这里应该调用API保存用户配置
            // 目前使用模拟数据
            setTimeout(() => {
                console.log('保存十字星形态配置到服务器')
            }, 100)
        }
    }

    /**
     * 预热缓存
     */
    private preloadCache(): void {
        if (!this.cacheEnabled) {
            return
        }

        // 预加载常用股票的十字星形态数据
        setTimeout(() => {
            console.log('预加载十字星形态数据缓存')
        }, 200)
    }

    /**
     * 清除缓存
     */
    public clearCache(): void {
        console.log('清除十字星形态数据缓存')
        // 清除本地缓存
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('dojiPattern_cache_'))
        cacheKeys.forEach(key => localStorage.removeItem(key))
    }

    /**
     * 检查是否是首次使用
     */
    private checkFirstTimeUser(): void {
        if (dojiPatternIntegrationService.isFirstTimeUser()) {
            // 显示功能介绍
            setTimeout(() => {
                dojiPatternIntegrationService.showFeatureIntroduction()
            }, 1000)
        }
    }

    /**
     * 获取系统状态
     */
    public getSystemStatus(): {
        cacheEnabled: boolean
        cacheSize: number
        cacheItems: number
        lastUpdate: Date | null
    } {
        // 计算缓存大小
        let cacheSize = 0
        let cacheItems = 0
        let lastUpdate: Date | null = null

        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('dojiPattern_cache_'))
        cacheItems = cacheKeys.length

        cacheKeys.forEach(key => {
            const item = localStorage.getItem(key)
            if (item) {
                cacheSize += item.length

                try {
                    const parsed = JSON.parse(item)
                    if (parsed.timestamp && (!lastUpdate || new Date(parsed.timestamp) > lastUpdate)) {
                        lastUpdate = new Date(parsed.timestamp)
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        })

        return {
            cacheEnabled: this.cacheEnabled,
            cacheSize: Math.round(cacheSize / 1024), // KB
            cacheItems,
            lastUpdate
        }
    }

    /**
     * 优化计算性能
     * 根据数据量和设备性能动态调整计算策略
     */
    public optimizeCalculationStrategy(dataPoints: number): {
        useWorker: boolean
        batchSize: number
        throttleTime: number
    } {
        // 根据数据量和设备性能动态调整计算策略
        const isLowEndDevice = this.isLowEndDevice()

        // 默认策略
        let strategy = {
            useWorker: true,
            batchSize: 1000,
            throttleTime: this.calculationThrottleTime
        }

        // 根据数据量调整
        if (dataPoints > 10000) {
            strategy.batchSize = isLowEndDevice ? 500 : 2000
            strategy.throttleTime = isLowEndDevice ? 1000 : 300
        } else if (dataPoints > 5000) {
            strategy.batchSize = isLowEndDevice ? 800 : 1500
            strategy.throttleTime = isLowEndDevice ? 800 : 200
        } else if (dataPoints < 1000) {
            strategy.useWorker = dataPoints > 500 // 小数据量不使用Worker
            strategy.batchSize = 500
            strategy.throttleTime = 100
        }

        return strategy
    }

    /**
     * 检测是否是低端设备
     */
    private isLowEndDevice(): boolean {
        // 简单的设备性能检测
        const memory = (navigator as any).deviceMemory || 4 // 默认4GB
        const cores = navigator.hardwareConcurrency || 4 // 默认4核

        return memory < 4 || cores < 4
    }

    /**
     * 获取缓存键
     */
    public getCacheKey(type: string, params: any): string {
        return `dojiPattern_cache_${type}_${JSON.stringify(params)}`
    }

    /**
     * 从缓存获取数据
     */
    public getFromCache<T>(cacheKey: string): T | null {
        if (!this.cacheEnabled) {
            return null
        }

        try {
            const cachedData = localStorage.getItem(cacheKey)
            if (!cachedData) {
                return null
            }

            const { data, timestamp } = JSON.parse(cachedData)

            // 检查缓存是否过期
            if (Date.now() - timestamp > this.cacheExpiryTime) {
                localStorage.removeItem(cacheKey)
                return null
            }

            return data as T
        } catch (error) {
            console.error('从缓存获取数据失败:', error)
            return null
        }
    }

    /**
     * 保存数据到缓存
     */
    public saveToCache<T>(cacheKey: string, data: T): void {
        if (!this.cacheEnabled) {
            return
        }

        try {
            const cacheData = {
                data,
                timestamp: Date.now()
            }

            localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        } catch (error) {
            console.error('保存数据到缓存失败:', error)
        }
    }
}

// 导出服务实例
export const dojiPatternSystemService = DojiPatternSystemService.getInstance()