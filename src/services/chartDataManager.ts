/**
 * 图表数据管理服务
 * 提供高效的数据管理、增量更新和虚拟滚动支持
 */

import type { StockData } from '@/types/stock'

// 数据块接口
interface DataChunk {
    startIndex: number
    endIndex: number
    data: any
    timestamp: number
}

// 数据管理器配置
interface DataManagerConfig {
    chunkSize?: number
    maxChunks?: number
    prefetchThreshold?: number
    expiryTime?: number
}

/**
 * 图表数据管理器
 * 管理大型数据集，支持分块加载、缓存和增量更新
 */
export class ChartDataManager {
    private chunks: Map<number, DataChunk> = new Map()
    private totalLength: number = 0
    private config: Required<DataManagerConfig>
    private symbol: string = ''

    constructor(config?: DataManagerConfig) {
        // 默认配置
        this.config = {
            chunkSize: 500, // 每块数据的大小
            maxChunks: 10, // 最大缓存块数
            prefetchThreshold: 0.2, // 预取阈值（当滚动到距离边缘20%时预取）
            expiryTime: 5 * 60 * 1000, // 数据过期时间（5分钟）
            ...config
        }
    }

    /**
     * 设置数据源标识
     */
    setSymbol(symbol: string): void {
        if (this.symbol !== symbol) {
            // 如果标识变化，清空缓存
            this.clear()
            this.symbol = symbol
        }
    }

    /**
     * 设置总数据长度
     */
    setTotalLength(length: number): void {
        this.totalLength = length
    }

    /**
     * 获取总数据长度
     */
    getTotalLength(): number {
        return this.totalLength
    }

    /**
     * 添加数据块
     */
    addChunk(startIndex: number, data: any): void {
        const chunkIndex = Math.floor(startIndex / this.config.chunkSize)
        const endIndex = startIndex + this.getDataLength(data) - 1

        // 存储数据块
        this.chunks.set(chunkIndex, {
            startIndex,
            endIndex,
            data,
            timestamp: Date.now()
        })

        // 如果缓存块数超过最大值，移除最旧的块
        if (this.chunks.size > this.config.maxChunks) {
            let oldestChunkIndex = -1
            let oldestTimestamp = Infinity

            for (const [index, chunk] of this.chunks.entries()) {
                if (chunk.timestamp < oldestTimestamp) {
                    oldestTimestamp = chunk.timestamp
                    oldestChunkIndex = index
                }
            }

            if (oldestChunkIndex !== -1) {
                this.chunks.delete(oldestChunkIndex)
            }
        }

        // 更新总长度
        this.totalLength = Math.max(this.totalLength, endIndex + 1)
    }

    /**
     * 获取指定范围的数据
     */
    getDataRange(startIndex: number, endIndex: number): any {
        // 确保索引在有效范围内
        startIndex = Math.max(0, startIndex)
        endIndex = Math.min(this.totalLength - 1, endIndex)

        if (startIndex > endIndex) {
            return null
        }

        // 计算需要的块索引
        const startChunkIndex = Math.floor(startIndex / this.config.chunkSize)
        const endChunkIndex = Math.floor(endIndex / this.config.chunkSize)

        // 检查是否有所有需要的块
        const neededChunks: number[] = []
        for (let i = startChunkIndex; i <= endChunkIndex; i++) {
            if (!this.chunks.has(i)) {
                neededChunks.push(i)
            }
        }

        if (neededChunks.length > 0) {
            // 如果缺少块，返回null表示需要加载
            return {
                data: null,
                missingChunks: neededChunks.map(i => ({
                    chunkIndex: i,
                    startIndex: i * this.config.chunkSize,
                    endIndex: Math.min(this.totalLength - 1, (i + 1) * this.config.chunkSize - 1)
                }))
            }
        }

        // 合并所有需要的块
        const result: any = {}

        // 遍历所有需要的块
        for (let i = startChunkIndex; i <= endChunkIndex; i++) {
            const chunk = this.chunks.get(i)!

            // 计算块内的起始和结束索引
            const chunkStartIndex = Math.max(startIndex, chunk.startIndex)
            const chunkEndIndex = Math.min(endIndex, chunk.endIndex)
            const offsetInChunk = chunkStartIndex - chunk.startIndex

            // 合并数据
            this.mergeData(result, chunk.data, chunkStartIndex - startIndex, offsetInChunk, chunkEndIndex - chunkStartIndex + 1)
        }

        // 检查是否需要预取
        const prefetchThreshold = this.config.prefetchThreshold * (endIndex - startIndex)

        // 如果接近开始边缘，预取前面的块
        if (startIndex < prefetchThreshold) {
            const prefetchStartChunkIndex = Math.max(0, startChunkIndex - 1)
            if (prefetchStartChunkIndex < startChunkIndex && !this.chunks.has(prefetchStartChunkIndex)) {
                result.prefetchBefore = {
                    chunkIndex: prefetchStartChunkIndex,
                    startIndex: prefetchStartChunkIndex * this.config.chunkSize,
                    endIndex: Math.min(this.totalLength - 1, (prefetchStartChunkIndex + 1) * this.config.chunkSize - 1)
                }
            }
        }

        // 如果接近结束边缘，预取后面的块
        if (this.totalLength - endIndex < prefetchThreshold) {
            const prefetchEndChunkIndex = Math.min(Math.ceil(this.totalLength / this.config.chunkSize) - 1, endChunkIndex + 1)
            if (prefetchEndChunkIndex > endChunkIndex && !this.chunks.has(prefetchEndChunkIndex)) {
                result.prefetchAfter = {
                    chunkIndex: prefetchEndChunkIndex,
                    startIndex: prefetchEndChunkIndex * this.config.chunkSize,
                    endIndex: Math.min(this.totalLength - 1, (prefetchEndChunkIndex + 1) * this.config.chunkSize - 1)
                }
            }
        }

        return result
    }

    /**
     * 检查是否有指定范围的数据
     */
    hasDataRange(startIndex: number, endIndex: number): boolean {
        // 确保索引在有效范围内
        startIndex = Math.max(0, startIndex)
        endIndex = Math.min(this.totalLength - 1, endIndex)

        if (startIndex > endIndex) {
            return false
        }

        // 计算需要的块索引
        const startChunkIndex = Math.floor(startIndex / this.config.chunkSize)
        const endChunkIndex = Math.floor(endIndex / this.config.chunkSize)

        // 检查是否有所有需要的块
        for (let i = startChunkIndex; i <= endChunkIndex; i++) {
            if (!this.chunks.has(i)) {
                return false
            }
        }

        return true
    }

    /**
     * 清除过期数据
     */
    clearExpiredData(): void {
        const now = Date.now()

        for (const [index, chunk] of this.chunks.entries()) {
            if (now - chunk.timestamp > this.config.expiryTime) {
                this.chunks.delete(index)
            }
        }
    }

    /**
     * 清除所有数据
     */
    clear(): void {
        this.chunks.clear()
        this.totalLength = 0
    }

    /**
     * 获取数据长度
     */
    private getDataLength(data: any): number {
        if (!data) return 0

        if (Array.isArray(data)) {
            return data.length
        }

        if (typeof data === 'object') {
            // 如果是对象，查找最长的数组属性
            return Object.values(data).reduce((max, value) => {
                if (Array.isArray(value)) {
                    return Math.max(max, value.length)
                }
                return max
            }, 0)
        }

        return 0
    }

    /**
     * 合并数据
     */
    private mergeData(target: any, source: any, targetOffset: number, sourceOffset: number, length: number): void {
        if (!source || !target) return

        if (Array.isArray(source)) {
            // 如果源是数组，目标也应该是数组
            if (!Array.isArray(target)) {
                target = []
            }

            // 复制数据
            for (let i = 0; i < length; i++) {
                target[targetOffset + i] = source[sourceOffset + i]
            }
        } else if (typeof source === 'object') {
            // 如果源是对象，遍历所有属性
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    if (Array.isArray(source[key])) {
                        // 如果属性是数组
                        if (!target[key]) {
                            target[key] = []
                        }

                        // 复制数据
                        for (let i = 0; i < length; i++) {
                            target[key][targetOffset + i] = source[key][sourceOffset + i]
                        }
                    } else if (typeof source[key] === 'object' && source[key] !== null) {
                        // 如果属性是对象，递归合并
                        if (!target[key]) {
                            target[key] = {}
                        }

                        this.mergeData(target[key], source[key], targetOffset, sourceOffset, length)
                    }
                }
            }
        }
    }
}

/**
 * 创建股票数据管理器
 */
export function createStockDataManager(config?: DataManagerConfig): ChartDataManager {
    return new ChartDataManager(config)
}

/**
 * 将普通股票数据转换为增量更新格式
 * 优化版本：支持更高效的增量更新和差异检测
 */
export function convertToIncrementalData(stockData: StockData, previousData?: StockData): any {
    if (!previousData || !previousData.dates || !stockData.dates) {
        return stockData
    }

    // 找到新数据的起始点
    const lastPreviousDate = previousData.dates[previousData.dates.length - 1]
    const newDataStartIndex = stockData.dates.findIndex(date => date > lastPreviousDate)

    if (newDataStartIndex === -1) {
        // 没有新数据
        return { type: 'no_change' }
    }

    if (newDataStartIndex === 0) {
        // 数据完全不同，可能是切换了股票或时间范围
        return {
            type: 'full_replace',
            data: stockData
        }
    }

    // 检查是否有数据更新（相同日期但值不同）
    let hasUpdates = false
    const updatedIndices: number[] = []

    // 查找重叠部分中有更新的数据点
    for (let i = 0; i < newDataStartIndex; i++) {
        const dateInNew = stockData.dates[i]
        const indexInPrevious = previousData.dates.findIndex(d => d === dateInNew)

        if (indexInPrevious !== -1) {
            // 检查该日期的数据是否有变化
            const hasChanged = ['opens', 'highs', 'lows', 'closes', 'volumes', 'prices'].some(prop => {
                const propKey = prop as keyof StockData
                const newArray = stockData[propKey] as any[]
                const prevArray = previousData[propKey] as any[]

                return newArray && prevArray && newArray[i] !== prevArray[indexInPrevious]
            })

            if (hasChanged) {
                hasUpdates = true
                updatedIndices.push(i)
            }
        }
    }

    // 提取增量数据
    const incrementalData: any = {
        type: hasUpdates ? 'incremental_with_updates' : 'incremental_append',
        symbol: stockData.symbol,
        // 新增的数据
        append: {
            startIndex: newDataStartIndex,
            dates: stockData.dates.slice(newDataStartIndex)
        }
    }

    // 复制新增数据的其他数组属性
    const arrayProps = ['opens', 'highs', 'lows', 'closes', 'volumes', 'prices']
    arrayProps.forEach(prop => {
        if (stockData[prop as keyof StockData]) {
            const array = stockData[prop as keyof StockData] as any[]
            incrementalData.append[prop] = array.slice(newDataStartIndex)
        }
    })

    // 如果有数据更新，添加更新部分
    if (hasUpdates) {
        incrementalData.updates = {
            indices: updatedIndices,
            data: {}
        }

        // 为每个更新的索引添加完整数据
        updatedIndices.forEach(idx => {
            arrayProps.forEach(prop => {
                if (stockData[prop as keyof StockData]) {
                    if (!incrementalData.updates.data[prop]) {
                        incrementalData.updates.data[prop] = {}
                    }
                    const array = stockData[prop as keyof StockData] as any[]
                    incrementalData.updates.data[prop][idx] = array[idx]
                }
            })

            // 添加日期
            if (!incrementalData.updates.data.dates) {
                incrementalData.updates.data.dates = {}
            }
            incrementalData.updates.data.dates[idx] = stockData.dates[idx]
        })
    }

    return incrementalData
}

// 导出服务
export const chartDataManager = {
    createStockDataManager,
    convertToIncrementalData
}

export default chartDataManager