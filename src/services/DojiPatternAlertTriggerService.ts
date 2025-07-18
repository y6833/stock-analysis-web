/**
 * 十字星形态提醒触发服务
 * 用于管理十字星形态提醒的触发条件评估和优先级处理
 */

import type { DojiPatternAlert } from './DojiPatternAlertService'
import { DojiPatternDetectorService } from './DojiPatternDetectorService'
import type { KLineData } from '../types/chart'
import notificationService from './notificationService'

/**
 * 提醒触发结果
 */
export interface AlertTriggerResult {
    triggered: boolean
    alert: DojiPatternAlert
    patternDetails?: any
    priority: number // 数值化的优先级，用于排序
    timestamp: number
}

/**
 * 十字星形态提醒触发服务
 */
export class DojiPatternAlertTriggerService {
    private detectorService: DojiPatternDetectorService

    /**
     * 构造函数
     * @param detectorService 十字星形态检测服务
     */
    constructor(detectorService?: DojiPatt