import { ElMessageBox } from 'element-plus'
import router from '@/router'

/**
 * 十字星形态功能集成服务
 * 负责管理十字星形态功能的集成、引导和工作流
 */
export class DojiPatternIntegrationService {
    /**
     * 检查用户是否首次使用十字星功能
     */
    public isFirstTimeUser(): boolean {
        return !localStorage.getItem('dojiPatternFirstUse')
    }

    /**
     * 标记用户已使用十字星功能
     */
    public markAsUsed(): void {
        localStorage.setItem('dojiPatternFirstUse', 'true')
    }

    /**
     * 检查用户是否已完成功能导览
     */
    public hasTourCompleted(): boolean {
        return !!localStorage.getItem('dojiPatternTourCompleted')
    }

    /**
     * 检查用户是否已完成功能指南
     */
    public hasGuideCompleted(): boolean {
        return !!localStorage.getItem('dojiPatternGuideCompleted')
    }

    /**
     * 显示功能介绍弹窗
     */
    public showFeatureIntroduction(): Promise<void> {
        return new Promise((resolve) => {
            ElMessageBox.alert(
                '十字星形态分析功能可以帮助您识别股票图表中的十字星形态，并筛选出现十字星后上涨的股票，把握潜在的交易机会。',
                '新功能: 十字星形态分析',
                {
                    confirmButtonText: '立即体验',
                    callback: () => {
                        this.markAsUsed()
                        router.push('/doji-pattern/screener')
                        resolve()
                    }
                }
            )
        })
    }

    /**
     * 获取功能入口点
     * 根据用户当前位置和上下文，返回最合适的功能入口点
     */
    public getEntryPoint(context: string): string {
        switch (context) {
            case 'stock-analysis':
                return '/stock'
            case 'alerts':
                return '/doji-pattern/alerts'
            case 'settings':
                return '/doji-pattern/settings'
            default:
                return '/doji-pattern/screener'
        }
    }

    /**
     * 添加十字星小部件到仪表盘
     */
    public addWidgetToDashboard(): Promise<boolean> {
        // 这里应该调用实际的仪表盘服务来添加小部件
        // 目前只是模拟实现
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.setItem('dojiPatternWidgetAdded', 'true')
                resolve(true)
            }, 500)
        })
    }

    /**
     * 检查小部件是否已添加到仪表盘
     */
    public isWidgetAddedToDashboard(): boolean {
        return !!localStorage.getItem('dojiPatternWidgetAdded')
    }

    /**
     * 提示用户添加小部件到仪表盘
     */
    public promptAddWidgetToDashboard(): Promise<boolean> {
        return new Promise((resolve) => {
            ElMessageBox.confirm(
                '是否将十字星形态分析小部件添加到您的仪表盘，以便快速访问？',
                '添加到仪表盘',
                {
                    confirmButtonText: '添加',
                    cancelButtonText: '取消',
                    type: 'info'
                }
            )
                .then(() => {
                    this.addWidgetToDashboard().then(() => {
                        resolve(true)
                    })
                })
                .catch(() => {
                    resolve(false)
                })
        })
    }
}

// 导出服务实例
export const dojiPatternIntegrationService = new DojiPatternIntegrationService()