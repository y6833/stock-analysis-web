/**
 * 十字星形态提醒插件
 * 用于注册十字星形态提醒系统
 */

import type { App } from 'vue'
import { DojiPatternAlertManager } from '../services/DojiPatternAlertManager'
import { DojiPatternDetectorService } from '../services/DojiPatternDetectorService'
import type { StockDataService } from '../services/StockDataService'

export default {
    /**
     * 安装插件
     * @param app Vue应用实例
     * @param options 插件选项
     */
    install: (app: App, options: { stockDataService: StockDataService }) => {
        const { stockDataService } = options

        // 创建检测服务
        const detectorService = new DojiPatternDetectorService()

        // 创建提醒管理器
        const alertManager = new DojiPatternAlertManager(stockDataService, detectorService)

        // 将服务注册到全局属性
        app.config.globalProperties.$dojiPatternAlertManager = alertManager

        // 提供服务
        app.provide('dojiPatternAlertManager', alertManager)
        app.provide('dojiPatternDetectorService', detectorService)

        // 初始化提醒管理器
        alertManager.initialize().catch(error => {
            console.error('初始化十字星形态提醒管理器失败:', error)
        })

        // 在应用卸载时清理资源
        app.unmount = ((original) => {
            return () => {
                alertManager.destroy()
                original()
            }
        })(app.unmount)
    }
}