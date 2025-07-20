import type { DojiPatternSettings } from '@/composables/useDojiPatternSettings'

/**
 * 十字星形态设置服务
 */
export class DojiPatternSettingsService {
    private baseUrl = '/api/v1/patterns/doji'

    /**
     * 获取认证头
     */
    private getAuthHeaders() {
        const token = localStorage.getItem('token')
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }

    /**
     * 获取用户设置
     */
    async getUserSettings(): Promise<DojiPatternSettings | null> {
        try {
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            return result.success ? result.data : null
        } catch (error) {
            console.error('获取用户设置失败:', error)
            return null
        }
    }

    /**
     * 保存用户设置
     */
    async saveUserSettings(settings: DojiPatternSettings): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(settings)
            })

            if (!response.ok) {
                const errorResult = await response.json()
                throw new Error(errorResult.message || `HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            return result.success
        } catch (error) {
            console.error('保存用户设置失败:', error)
            throw error
        }
    }

    /**
     * 重置用户设置
     */
    async resetUserSettings(): Promise<DojiPatternSettings | null> {
        try {
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            return result.success ? result.data : null
        } catch (error) {
            console.error('重置用户设置失败:', error)
            throw error
        }
    }

    /**
     * 获取设置预设
     */
    async getSettingsPresets(): Promise<any[]> {
        try {
            const response = await fetch(`${this.baseUrl}/settings/presets`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            return result.success ? result.data : []
        } catch (error) {
            console.error('获取设置预设失败:', error)
            return []
        }
    }

    /**
     * 获取性能统计
     */
    async getPerformanceStats(): Promise<any | null> {
        try {
            const response = await fetch(`${this.baseUrl}/settings/performance`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const result = await response.json()
            return result.success ? result.data : null
        } catch (error) {
            console.error('获取性能统计失败:', error)
            return null
        }
    }

    /**
     * 测试设置
     */
    async testSettings(settings: DojiPatternSettings): Promise<boolean> {
        try {
            // 这里可以实现设置测试逻辑
            // 暂时返回成功
            await new Promise(resolve => setTimeout(resolve, 2000))
            return true
        } catch (error) {
            console.error('测试设置失败:', error)
            return false
        }
    }
}

// 导出单例实例
export const dojiPatternSettingsService = new DojiPatternSettingsService()