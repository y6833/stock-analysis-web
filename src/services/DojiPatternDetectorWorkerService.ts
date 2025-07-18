/**
 * 十字星形态检测 Worker 服务
 * 使用 Web Worker 在后台线程计算十字星形态，避免阻塞主线程
 */

import type { DojiConfig, DojiPattern } from '../types/technical-analysis/doji'
import type { KLineData } from '../types/technical-analysis/kline'

/**
 * 十字星形态检测 Worker 服务
 */
export class DojiPatternDetectorWorkerService {
    private worker: Worker | null = null
    private isReady = false
    private pendingRequests: Map<string, { resolve: Function, reject: Function }> = new Map()
    private requestId = 0
    private cacheEnabled = true
    private workerUrl: string

    /**
     * 构造函数
     * @param workerUrl Worker URL，默认为 '../workers/dojiPatternDetectorWorker'
     */
    constructor(workerUrl: string = '../workers/dojiPatternDetectorWorker') {
        this.workerUrl = workerUrl
        this.initWorker()
    }

    /**
     * 初始化 Worker
     */
    private initWorker() {
        try {
            // 创建 Worker
            this.worker = new Worker(new URL(this.workerUrl, import.meta.url), {
                type: 'module',
            })

            // 监听 Worker 消息
            this.worker.addEventListener('message', this.handleWorkerMessage.bind(this))

            // 监听 Worker 错误
            this.worker.addEventListener('error', (error) => {
                console.error('十字星形态检测 Worker 错误:', error)
                this.handleWorkerError(error)
            })
        } catch (error) {
            console.error('创建十字星形态检测 Worker 失败:', error)
            // 如果创建 Worker 失败，标记为就绪，以便后续操作可以继续
            this.isReady = true
        }
    }

    /**
     * 处理 Worker 消息
     * @param event 消息事件
     */
    private handleWorkerMessage(event: MessageEvent) {
        const { type, data, requestId, message } = event.data

        switch (type) {
            case 'ready':
                // Worker 已准备就绪
                this.isReady = true
                break

            case 'result':
                // 处理检测结果
                if (requestId && this.pendingRequests.has(requestId.toString())) {
                    const { resolve } = this.pendingRequests.get(requestId.toString())!
                    this.pendingRequests.delete(requestId.toString())
                    resolve(data)
                }
                break

            case 'error':
                // 处理错误
                if (requestId && this.pendingRequests.has(requestId.toString())) {
                    const { reject } = this.pendingRequests.get(requestId.toString())!
                    this.pendingRequests.delete(requestId.toString())
                    reject(new Error(message || '十字星形态检测失败'))
                } else {
                    console.error('十字星形态检测 Worker 错误:', message)
                }
                break

            case 'configUpdated':
            case 'cacheCleared':
                // 配置更新或缓存清除完成
                if (requestId && this.pendingRequests.has(requestId.toString())) {
                    const { resolve } = this.pendingRequests.get(requestId.toString())!
                    this.pendingRequests.delete(requestId.toString())
                    resolve(true)
                }
                break

            default:
                console.warn('未知的 Worker 消息类型:', type)
        }
    }

    /**
     * 处理 Worker 错误
     * @param error 错误对象
     */
    private handleWorkerError(error: ErrorEvent) {
        // 拒绝所有待处理的请求
        this.pendingRequests.forEach(({ reject }) => {
            reject(new Error('十字星形态检测 Worker 错误: ' + (error.message || '未知错误')))
        })
        this.pendingRequests.clear()

        // 尝试重新初始化 Worker
        this.terminateWorker()
        this.initWorker()
    }

    /**
     * 终止 Worker
     */
    public terminateWorker() {
        if (this.worker) {
            this.worker.terminate()
            this.worker = null
            this.isReady = false
        }
    }

    /**
     * 等待 Worker 就绪
     * @returns Promise
     */
    private waitForReady(): Promise<void> {
        if (this.isReady) {
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.isReady) {
                    resolve()
                } else {
                    setTimeout(checkReady, 50)
                }
            }
            checkReady()
        })
    }

    /**
     * 发送消息到 Worker
     * @param type 消息类型
     * @param data 消息数据
     * @returns Promise
     */
    private sendToWorker<T>(type: string, data: any): Promise<T> {
        return new Promise(async (resolve, reject) => {
            if (!this.worker) {
                reject(new Error('十字星形态检测 Worker 未初始化'))
                return
            }

            try {
                // 等待 Worker 就绪
                await this.waitForReady()

                // 生成请求 ID
                const requestId = (++this.requestId).toString()

                // 保存 Promise 回调
                this.pendingRequests.set(requestId, { resolve, reject })

                // 发送消息到 Worker
                this.worker.postMessage({ type, data, requestId })

                // 设置超时
                setTimeout(() => {
                    if (this.pendingRequests.has(requestId)) {
                        this.pendingRequests.delete(requestId)
                        reject(new Error('十字星形态检测超时'))
                    }
                }, 10000) // 10秒超时
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * 检测K线数据中的十字星形态
     * @param klines K线数据数组
     * @param stockId 股票ID
     * @param stockName 股票名称
     * @param config 配置参数
     * @param useCache 是否使用缓存
     * @returns Promise<DojiPattern[]>
     */
    public async detectPatterns(
        klines: KLineData[],
        stockId?: string,
        stockName?: string,
        config?: Partial<DojiConfig>,
        useCache: boolean = true
    ): Promise<DojiPattern[]> {
        // 如果 Worker 不可用，返回空数组
        if (!this.worker && !this.isReady) {
            console.warn('十字星形态检测 Worker 不可用，无法检测形态')
            return []
        }

        try {
            // 使用 Worker 检测形态
            return await this.sendToWorker<DojiPattern[]>('detect', {
                klines,
                stockId,
                stockName,
                config,
                useCache: useCache && this.cacheEnabled
            })
        } catch (error) {
            console.error('十字星形态检测失败:', error)
            return []
        }
    }

    /**
     * 更新配置
     * @param config 新的配置参数
     * @returns Promise<boolean>
     */
    public async updateConfig(config: Partial<DojiConfig>): Promise<boolean> {
        try {
            return await this.sendToWorker<boolean>('updateConfig', { config })
        } catch (error) {
            console.error('更新十字星形态检测配置失败:', error)
            return false
        }
    }

    /**
     * 清除缓存
     * @param stockId 股票ID，不指定则清除所有缓存
     * @returns Promise<boolean>
     */
    public async clearCache(stockId?: string): Promise<boolean> {
        try {
            return await this.sendToWorker<boolean>('clearCache', { stockId })
        } catch (error) {
            console.error('清除十字星形态检测缓存失败:', error)
            return false
        }
    }

    /**
     * 启用缓存
     */
    public enableCache() {
        this.cacheEnabled = true
    }

    /**
     * 禁用缓存
     */
    public disableCache() {
        this.cacheEnabled = false
    }

    /**
     * 是否启用缓存
     * @returns 是否启用缓存
     */
    public isCacheEnabled(): boolean {
        return this.cacheEnabled
    }
}

// 导出单例
export default new DojiPatternDetectorWorkerService()