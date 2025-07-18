/**
 * 十字星形态提醒评估器
 * 用于评估十字星形态提醒条件是否满足，并触发相应的提醒
 */

import type { DojiPatternAlert } from './DojiPatternAlertService'
import { DojiPatternDetectorService } from './DojiPatternDetectorService'
import notificationService from './notificationService'
import type { KLineData } from '../types/chart'

/**
 * 十字星形态提醒评估器
 */
export class DojiPatternAlertEvaluator {
    private detectorService: DojiPatternDetectorService

    /**
     * 构造函数
     * @param detectorService 十字星形态检测服务
     */
    constructor(detectorService?: DojiPatternDetectorService) {
        this.detectorService = detectorService || new DojiPatternDetectorService()
    }

    /**
     * 评估提醒
     * @param alert 提醒对象
     * @param klines K线数据
     * @returns 是否触发提醒
     */
    evaluateAlert(alert: DojiPatternAlert, klines: KLineData[]): boolean {
        if (!alert.isActive || !klines || klines.length < 2) {
            return false
        }

        // 检测形态
        const detectionResult = this.detectorService.detectPattern(
            klines,
            alert.patternType === 'any' ? undefined : alert.patternType
        )

        // 评估条件
        const shouldTrigger = this.detectorService.evaluateAlertCondition(
            detectionResult,
            alert.condition,
            {
                minSignificance: alert.additionalParams?.minSignificance,
                volumeChangePercent: alert.additionalParams?.volumeChangePercent
            }
        )

        return shouldTrigger
    }

    /**
     * 处理提醒触发
     * @param alert 提醒对象
     * @param detectionResult 检测结果
     */
    async handleAlertTrigger(
        alert: DojiPatternAlert,
        detectionResult: any
    ): Promise<void> {
        try {
            // 构建通知消息
            const patternTypeName = this.getPatternTypeName(alert.patternType)
            const stockInfo = `${alert.stockName}(${alert.stockCode})`
            const message = alert.message || `检测到${stockInfo}出现${patternTypeName}形态`

            // 根据优先级设置通知类型
            let notificationType = 'info'
            if (alert.priority === 'high') {
                notificationType = 'warning'
            } else if (alert.priority === 'medium') {
                notificationType = 'info'
            }

            // 发送通知
            await this.sendNotification(message, notificationType, {
                alertId: alert.id,
                stockCode: alert.stockCode,
                patternType: alert.patternType,
                detectionResult
            })

            // 记录提醒历史
            await this.recordAlertHistory(alert.id, detectionResult)
        } catch (error) {
            console.error('处理提醒触发失败:', error)
        }
    }

    /**
     * 发送通知
     * @param message 消息内容
     * @param type 通知类型
     * @param data 附加数据
     */
    private async sendNotification(
        message: string,
        type: string,
        data: any
    ): Promise<void> {
        // 这里应该调用实际的通知服务
        console.log(`[${type}] ${message}`, data)

        // 模拟发送通知
        // 实际实现中，这里会调用后端API创建通知
        try {
            // 这里仅作为示例，实际项目中应该调用真实的通知API
            console.log('发送十字星形态提醒通知:', {
                message,
                type,
                data
            })
        } catch (error) {
            console.error('发送通知失败:', error)
        }
    }

    /**
     * 记录提醒历史
     * @param alertId 提醒ID
     * @param detectionResult 检测结果
     */
    private async recordAlertHistory(
        alertId: number,
        detectionResult: any
    ): Promise<void> {
        // 这里应该调用实际的API记录提醒历史
        // 实际实现中，这里会调用后端API记录历史
        try {
            console.log('记录十字星形态提醒历史:', {
                alertId,
                triggeredAt: new Date().toISOString(),
                patternDetails: detectionResult
            })
        } catch (error) {
            console.error('记录提醒历史失败:', error)
        }
    }

    /**
     * 获取形态类型名称
     * @param patternType 形态类型
     * @returns 形态类型名称
     */
    private getPatternTypeName(patternType: string): string {
        const patternTypeMap: Record<string, string> = {
            standard: '标准十字星',
            dragonfly: '蜻蜓十字星',
            gravestone: '墓碑十字星',
            longLegged: '长腿十字星',
            any: '十字星'
        }
        return patternTypeMap[patternType] || '十字星'
    }
}

export default DojiPatternAlertEvaluator