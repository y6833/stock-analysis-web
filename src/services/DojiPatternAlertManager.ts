/**
 * 十字星形态提醒管理器
 * 用于管理十字星形态提醒的检测、触发和处理
 */

import { DojiPatternDetectorService } from './DojiPatternDetectorService'
import { DojiPatternAlertEvaluator } from './DojiPatternAlertEvaluator'
import { dojiPatternAlertService, type DojiPatternAlert } from './DojiPatternAlertService'
import type { StockDataService } from './StockDataService'

/**
 * 十字星形态提醒管理器
 */
export class DojiPatternAlertManager {
    private detectorService: DojiPatternDetectorService
    private evaluator: DojiPatternAlertEvaluator
    private stockDataService: StockDataService
    private activeAlerts: DojiPatternAlert[] = []
    private checkIntervalId: number | null = null
    private isInitialized = false

    /**
     * 构造函数
     * @param stockDataService 股票数据服务
     * @param detectorService 十字星形态检测服务
     */
    constructor(
        stockDataService: StockDataService,
        detectorService?: DojiPatternDetectorService
    ) {
        this.stockDataService = stockDataService
        this.detectorService = detectorService || new DojiPatternDetectorService()
        this.evaluator = new DojiPatternAlertEvaluator(this.detectorService)
    }

    /**
     * 初始化提醒管理器
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return
        }

        try {
            // 加载所有活跃的提醒
            await this.loadActiveAlerts()

            // 启动定期检查
            this.startPeriodicCheck()

            this.isInitialized = true
            console.log('十字星形态提醒管理器初始化完成')
        } catch (error) {
            console.error('初始化十字星形态提醒管理器失败:', error)
            // 不抛出错误，允许应用继续运行
            this.isInitialized = true
        }
    }

    /**
     * 加载所有活跃的提醒
     */
    async loadActiveAlerts(): Promise<void> {
        try {
            const alerts = await dojiPatternAlertService.getDojiPatternAlerts()

            // 确保 alerts 是数组
            if (!Array.isArray(alerts)) {
                console.warn('获取的提醒数据不是数组格式:', alerts)
                this.activeAlerts = []
                return
            }

            this.activeAlerts = alerts.filter(alert => alert.isActive)
            console.log(`已加载 ${this.activeAlerts.length} 个活跃的十字星形态提醒`)
        } catch (error) {
            console.error('加载活跃提醒失败:', error)
            // 设置为空数组而不是抛出错误，避免阻塞应用启动
            this.activeAlerts = []
        }
    }

    /**
     * 添加提醒
     * @param alert 提醒对象
     */
    async addAlert(alert: DojiPatternAlert): Promise<void> {
        if (alert.isActive) {
            this.activeAlerts.push(alert)
        }
    }

    /**
     * 更新提醒
     * @param updatedAlert 更新后的提醒对象
     */
    async updateAlert(updatedAlert: DojiPatternAlert): Promise<void> {
        const index = this.activeAlerts.findIndex(a => a.id === updatedAlert.id)

        if (updatedAlert.isActive) {
            if (index >= 0) {
                // 更新现有提醒
                this.activeAlerts[index] = updatedAlert
            } else {
                // 添加到活跃提醒列表
                this.activeAlerts.push(updatedAlert)
            }
        } else if (index >= 0) {
            // 从活跃提醒列表中移除
            this.activeAlerts.splice(index, 1)
        }
    }

    /**
     * 删除提醒
     * @param alertId 提醒ID
     */
    async removeAlert(alertId: number): Promise<void> {
        const index = this.activeAlerts.findIndex(a => a.id === alertId)
        if (index >= 0) {
            this.activeAlerts.splice(index, 1)
        }
    }

    /**
     * 启动定期检查
     */
    startPeriodicCheck(): void {
        if (this.checkIntervalId !== null) {
            return
        }

        // 默认每分钟检查一次
        const checkInterval = 60 * 1000

        this.checkIntervalId = window.setInterval(() => {
            this.checkAllAlerts()
        }, checkInterval)

        console.log(`已启动十字星形态提醒定期检查，间隔: ${checkInterval / 1000} 秒`)
    }

    /**
     * 停止定期检查
     */
    stopPeriodicCheck(): void {
        if (this.checkIntervalId !== null) {
            window.clearInterval(this.checkIntervalId)
            this.checkIntervalId = null
            console.log('已停止十字星形态提醒定期检查')
        }
    }

    /**
     * 检查所有提醒
     */
    async checkAllAlerts(): Promise<void> {
        if (this.activeAlerts.length === 0) {
            return
        }

        console.log(`开始检查 ${this.activeAlerts.length} 个十字星形态提醒`)

        // 按股票代码分组提醒，减少数据请求
        const alertsByStock = this.groupAlertsByStock()

        // 对每只股票的提醒进行检查
        for (const [stockCode, alerts] of Object.entries(alertsByStock)) {
            try {
                // 获取股票K线数据
                const klines = await this.stockDataService.getKLineData(stockCode)

                if (!klines || klines.length < 10) {
                    console.warn(`股票 ${stockCode} 的K线数据不足，跳过检查`)
                    continue
                }

                // 检查该股票的所有提醒
                for (const alert of alerts) {
                    this.checkSingleAlert(alert, klines)
                }
            } catch (error) {
                console.error(`检查股票 ${stockCode} 的提醒失败:`, error)
            }
        }
    }

    /**
     * 检查单个提醒
     * @param alert 提醒对象
     * @param klines K线数据
     */
    async checkSingleAlert(
        alert: DojiPatternAlert,
        klines: any[]
    ): Promise<void> {
        try {
            // 评估提醒条件
            const shouldTrigger = this.evaluator.evaluateAlert(alert, klines)

            if (shouldTrigger) {
                console.log(`触发提醒: ${alert.stockName}(${alert.stockCode}) - ${alert.patternType}`)

                // 获取最新的检测结果
                const detectionResult = this.detectorService.detectPattern(
                    klines,
                    alert.patternType === 'any' ? undefined : alert.patternType
                )

                // 处理提醒触发
                await this.evaluator.handleAlertTrigger(alert, detectionResult)

                // 更新提醒状态
                await dojiPatternAlertService.updateDojiPatternAlert(alert.id, {
                    isTriggered: true
                })
            }
        } catch (error) {
            console.error(`检查提醒 ${alert.id} 失败:`, error)
        }
    }

    /**
     * 按股票代码分组提醒
     */
    private groupAlertsByStock(): Record<string, DojiPatternAlert[]> {
        const result: Record<string, DojiPatternAlert[]> = {}

        for (const alert of this.activeAlerts) {
            if (!result[alert.stockCode]) {
                result[alert.stockCode] = []
            }
            result[alert.stockCode].push(alert)
        }

        return result
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.stopPeriodicCheck()
        this.activeAlerts = []
        this.isInitialized = false
    }
}

export default DojiPatternAlertManager