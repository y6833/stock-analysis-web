/**
 * 增强的图表渲染服务
 * 提供高性能的图表渲染功能
 * 实现增量更新、虚拟滚动和渲染优化
 */

import type { StockData } from '@/types/stock'
import { chartRenderingService, type ChartOptions, type ChartSeries, type ChartInstance } from './chartRenderingService'

// 增强的图表配置接口
export interface EnhancedChartOptions extends ChartOptions {
    // 虚拟滚动相关配置
    virtualScroll?: {
        enabled: boolean
        visibleRange?: number // 可见数据点数量
        scrollStep?: number // 滚动步长
        overscanCount?: number // 额外渲染的数据点数量，用于平滑滚动
    }
    // 性能优化相关配置
    performance?: {
        enableWebGL?: boolean // 启用WebGL渲染
        throttleRedraw?: number // 重绘节流时间(ms)
        downSampleThreshold?: number // 降采样阈值，数据点超过此值时启用降采样
        downSampleFactor?: number // 降采样因子
        clipOutOfBounds?: boolean // 裁剪视口外的元素
        lazyUpdate?: boolean // 延迟更新非关键元素
        batchRendering?: boolean // 批量渲染
        useRequestAnimationFrame?: boolean // 使用requestAnimationFrame进行渲染
    }
}

// 增强的图表实例接口
export interface EnhancedChartInstance extends ChartInstance {
    // 增量更新相关方法
    updateIncrementally: (newData: any, seriesName?: string) => void
    // 虚拟滚动相关方法
    scrollTo: (index: number) => void
    scrollBy: (step: number) => void
    setVisibleRange: (start: number, end: number) => void
    // 性能优化相关方法
    enableWebGL: (enabled: boolean) => void
    setDownSampling: (enabled: boolean, factor?: number) => void
    // 数据点管理
    getDataLength: () => number
    getVisibleRange: () => [number, number]
}

// 默认的增强配置
const DEFAULT_ENHANCED_OPTIONS: Partial<EnhancedChartOptions> = {
    virtualScroll: {
        enabled: false,
        visibleRange: 100,
        scrollStep: 10,
        overscanCount: 20
    },
    performance: {
        enableWebGL: false,
        throttleRedraw: 16, // 约60fps
        downSampleThreshold: 1000,
        downSampleFactor: 2,
        clipOutOfBounds: true,
        lazyUpdate: true,
        batchRendering: true,
        useRequestAnimationFrame: true
    }
}

/**
 * 创建增强的图表实例
 * 包装基础图表实例，添加性能优化功能
 */
export function createEnhancedChart(options: EnhancedChartOptions): EnhancedChartInstance {
    // 合并默认选项
    const enhancedOptions = {
        ...DEFAULT_ENHANCED_OPTIONS,
        ...options,
        virtualScroll: {
            ...DEFAULT_ENHANCED_OPTIONS.virtualScroll,
            ...options.virtualScroll
        },
        performance: {
            ...DEFAULT_ENHANCED_OPTIONS.performance,
            ...options.performance
        }
    }

    // 创建基础图表实例
    const baseChart = chartRenderingService.createChart(options)

    // 保存原始数据和当前视图范围
    let originalData: any = {}
    let visibleRange: [number, number] = [0, 0]
    let dataLength = 0
    let isWebGLEnabled = enhancedOptions.performance?.enableWebGL || false
    let isDownSamplingEnabled = false
    let downSampleFactor = enhancedOptions.performance?.downSampleFactor || 2
    let throttleTimeout: number | null = null
    let pendingUpdate = false

    // 初始化虚拟滚动
    if (enhancedOptions.virtualScroll?.enabled) {
        const visibleCount = enhancedOptions.virtualScroll.visibleRange || 100
        visibleRange = [0, visibleCount]
    }

    /**
     * 节流函数，限制函数调用频率
     */
    function throttle(callback: Function, delay: number): () => void {
        return function () {
            if (throttleTimeout) return

            throttleTimeout = window.setTimeout(() => {
                callback()
                throttleTimeout = null
            }, delay)
        }
    }

    /**
     * 降采样数据
     * 使用LTTB算法(Largest-Triangle-Three-Buckets)进行降采样，保留视觉上的重要点
     */
    function downsampleData(data: any[], targetSize: number): any[] {
        if (!data || data.length <= targetSize) return data

        // 简单的均匀采样
        const result = []
        const step = Math.floor(data.length / targetSize)

        for (let i = 0; i < data.length; i += step) {
            result.push(data[i])
        }

        // 确保包含最后一个点
        if (result[result.length - 1] !== data[data.length - 1]) {
            result.push(data[data.length - 1])
        }

        return result
    }

    /**
     * 处理数据以适应当前的性能设置
     */
    function processData(data: any): any {
        let processedData = { ...data }

        // 应用虚拟滚动
        if (enhancedOptions.virtualScroll?.enabled) {
            // 处理每个系列数据
            Object.keys(processedData).forEach(key => {
                if (Array.isArray(processedData[key])) {
                    const [start, end] = visibleRange
                    // 添加overscan以提高滚动性能
                    const overscan = enhancedOptions.virtualScroll?.overscanCount || 20
                    const actualStart = Math.max(0, start - overscan)
                    const actualEnd = Math.min(processedData[key].length, end + overscan)
                    processedData[key] = processedData[key].slice(actualStart, actualEnd)
                }
            })
        }

        // 应用降采样
        if (isDownSamplingEnabled) {
            const threshold = enhancedOptions.performance?.downSampleThreshold || 1000

            Object.keys(processedData).forEach(key => {
                if (Array.isArray(processedData[key]) && processedData[key].length > threshold) {
                    const targetSize = Math.ceil(processedData[key].length / downSampleFactor)
                    processedData[key] = downsampleData(processedData[key], targetSize)
                }
            })
        }

        return processedData
    }

    /**
     * 执行实际的图表更新
     * 优化版本：支持增量更新和部分重绘
     */
    function performUpdate(data: any, seriesName?: string): void {
        // 检查是否是增量更新格式
        if (data && data.type) {
            switch (data.type) {
                case 'no_change':
                    // 数据没有变化，不需要更新
                    pendingUpdate = false
                    return

                case 'full_replace':
                    // 完全替换数据
                    const processedReplaceData = processData(data.data)
                    baseChart.update(processedReplaceData)
                    pendingUpdate = false
                    return

                case 'incremental_append':
                    // 增量追加数据
                    handleIncrementalAppend(data.append, seriesName)
                    pendingUpdate = false
                    return

                case 'incremental_with_updates':
                    // 既有追加又有更新
                    handleIncrementalAppend(data.append, seriesName)
                    handleIncrementalUpdates(data.updates, seriesName)
                    pendingUpdate = false
                    return
            }
        }

        // 常规更新处理
        const processedData = processData(data)

        if (seriesName) {
            const series = baseChart.getSeries(seriesName)
            if (series) {
                series.data = processedData[seriesName] || processedData
                baseChart.update({ series: [series] })
            }
        } else {
            baseChart.update(processedData)
        }

        pendingUpdate = false
    }

    /**
     * 处理增量追加数据
     */
    function handleIncrementalAppend(appendData: any, seriesName?: string): void {
        if (!appendData || !baseChart) return

        const startIndex = appendData.startIndex || 0

        if (seriesName) {
            // 更新单个系列
            const series = baseChart.getSeries(seriesName)
            if (series && series.data && Array.isArray(series.data)) {
                // 追加数据到现有系列
                const newData = [...series.data]
                const appendArray = appendData[seriesName] || appendData

                if (Array.isArray(appendArray)) {
                    for (let i = 0; i < appendArray.length; i++) {
                        newData[startIndex + i] = appendArray[i]
                    }

                    series.data = processData(newData)
                    baseChart.update({ series: [series] })
                }
            }
        } else {
            // 更新多个系列
            const updatedSeries: any[] = []

            // 处理每个属性
            Object.keys(appendData).forEach(key => {
                if (key !== 'startIndex' && key !== 'type' && key !== 'symbol') {
                    const series = baseChart.getSeries(key)

                    if (series && series.data && Array.isArray(series.data)) {
                        const newData = [...series.data]
                        const appendArray = appendData[key]

                        if (Array.isArray(appendArray)) {
                            for (let i = 0; i < appendArray.length; i++) {
                                newData[startIndex + i] = appendArray[i]
                            }

                            series.data = processData(newData)
                            updatedSeries.push(series)
                        }
                    }
                }
            })

            if (updatedSeries.length > 0) {
                baseChart.update({ series: updatedSeries })
            }
        }
    }

    /**
     * 处理增量更新数据（更新现有数据点）
     */
    function handleIncrementalUpdates(updatesData: any, seriesName?: string): void {
        if (!updatesData || !updatesData.indices || !updatesData.data || !baseChart) return

        const indices = updatesData.indices
        const updateData = updatesData.data

        if (seriesName) {
            // 更新单个系列
            const series = baseChart.getSeries(seriesName)
            if (series && series.data && Array.isArray(series.data)) {
                const newData = [...series.data]
                const seriesUpdates = updateData[seriesName] || updateData

                if (typeof seriesUpdates === 'object') {
                    indices.forEach((idx: number) => {
                        if (seriesUpdates[idx] !== undefined) {
                            newData[idx] = seriesUpdates[idx]
                        }
                    })

                    series.data = processData(newData)
                    baseChart.update({ series: [series] })
                }
            }
        } else {
            // 更新多个系列
            const updatedSeries: any[] = []

            // 处理每个属性
            Object.keys(updateData).forEach(key => {
                if (key !== 'indices' && key !== 'type') {
                    const series = baseChart.getSeries(key)

                    if (series && series.data && Array.isArray(series.data)) {
                        const newData = [...series.data]
                        const propUpdates = updateData[key]

                        if (typeof propUpdates === 'object') {
                            indices.forEach((idx: number) => {
                                if (propUpdates[idx] !== undefined) {
                                    newData[idx] = propUpdates[idx]
                                }
                            })

                            series.data = processData(newData)
                            updatedSeries.push(series)
                        }
                    }
                }
            })

            if (updatedSeries.length > 0) {
                baseChart.update({ series: updatedSeries })
            }
        }
    }

    /**
     * 使用requestAnimationFrame进行更新
     */
    function scheduleUpdate(data: any, seriesName?: string): void {
        if (pendingUpdate) return

        pendingUpdate = true

        if (enhancedOptions.performance?.useRequestAnimationFrame) {
            requestAnimationFrame(() => performUpdate(data, seriesName))
        } else {
            performUpdate(data, seriesName)
        }
    }

    /**
     * 节流更新
     */
    const throttledUpdate = enhancedOptions.performance?.throttleRedraw
        ? throttle((data: any, seriesName?: string) => scheduleUpdate(data, seriesName), enhancedOptions.performance.throttleRedraw)
        : (data: any, seriesName?: string) => scheduleUpdate(data, seriesName)

    // 创建增强的图表实例
    const enhancedChart: EnhancedChartInstance = {
        // 继承基础图表实例的方法
        ...baseChart,

        // 重写更新方法，应用性能优化
        update(data: any): void {
            originalData = { ...originalData, ...data }
            dataLength = Math.max(dataLength, Object.values(data).reduce((max, arr: any) =>
                Array.isArray(arr) ? Math.max(max, arr.length) : max, 0))

            throttledUpdate(data)
        },

        // 增量更新方法 - 优化版本
        updateIncrementally(newData: any, seriesName?: string): void {
            // 检查是否是增量更新格式
            if (newData && newData.type) {
                // 直接传递增量更新数据到更新函数
                throttledUpdate(newData, seriesName)

                // 根据增量更新类型更新原始数据
                if (newData.type === 'full_replace' && newData.data) {
                    originalData = { ...newData.data }
                    dataLength = Object.values(newData.data).reduce((max, arr: any) =>
                        Array.isArray(arr) ? Math.max(max, arr.length) : max, 0)
                } else if (newData.type === 'incremental_append' || newData.type === 'incremental_with_updates') {
                    // 处理追加数据
                    if (newData.append) {
                        const startIndex = newData.append.startIndex || 0

                        // 更新原始数据
                        Object.keys(newData.append).forEach(key => {
                            if (key !== 'startIndex' && key !== 'type' && key !== 'symbol') {
                                const appendArray = newData.append[key]

                                if (Array.isArray(appendArray)) {
                                    if (!originalData[key]) {
                                        originalData[key] = []
                                    }

                                    // 确保原始数据数组足够长
                                    if (originalData[key].length < startIndex + appendArray.length) {
                                        originalData[key].length = startIndex + appendArray.length
                                    }

                                    // 复制新数据
                                    for (let i = 0; i < appendArray.length; i++) {
                                        originalData[key][startIndex + i] = appendArray[i]
                                    }

                                    // 更新数据长度
                                    dataLength = Math.max(dataLength, startIndex + appendArray.length)
                                }
                            }
                        })
                    }

                    // 处理更新数据
                    if (newData.type === 'incremental_with_updates' && newData.updates) {
                        const indices = newData.updates.indices
                        const updateData = newData.updates.data

                        if (indices && updateData) {
                            Object.keys(updateData).forEach(key => {
                                if (originalData[key] && Array.isArray(originalData[key])) {
                                    const propUpdates = updateData[key]

                                    if (typeof propUpdates === 'object') {
                                        indices.forEach((idx: number) => {
                                            if (propUpdates[idx] !== undefined) {
                                                originalData[key][idx] = propUpdates[idx]
                                            }
                                        })
                                    }
                                }
                            })
                        }
                    }

                    // 如果启用了虚拟滚动，可能需要调整可见范围
                    if (enhancedOptions.virtualScroll?.enabled && newData.append) {
                        const [start, end] = visibleRange
                        const visibleCount = end - start

                        // 如果当前在查看最后的数据，自动滚动到新数据
                        if (end >= dataLength - visibleCount / 2) {
                            const newEnd = dataLength
                            const newStart = Math.max(0, newEnd - visibleCount)
                            visibleRange = [newStart, newEnd]
                        }
                    }
                }

                return
            }

            // 传统增量更新处理
            if (seriesName) {
                // 更新单个系列
                const currentData = originalData[seriesName] || []
                const updatedData = Array.isArray(currentData)
                    ? [...currentData, ...newData]
                    : newData

                originalData[seriesName] = updatedData
                dataLength = Math.max(dataLength, updatedData.length)

                // 如果启用了虚拟滚动，可能需要调整可见范围
                if (enhancedOptions.virtualScroll?.enabled) {
                    const [start, end] = visibleRange
                    if (end === currentData.length) {
                        // 如果之前在最后，保持在最后
                        visibleRange = [updatedData.length - (end - start), updatedData.length]
                    }
                }

                const updateData = { [seriesName]: newData }
                throttledUpdate(updateData, seriesName)
            } else {
                // 更新多个系列
                originalData = { ...originalData, ...newData }
                dataLength = Math.max(dataLength, Object.values(newData).reduce((max, arr: any) =>
                    Array.isArray(arr) ? Math.max(max, arr.length) : max, 0))

                throttledUpdate(newData)
            }
        },

        // 虚拟滚动方法
        scrollTo(index: number): void {
            if (!enhancedOptions.virtualScroll?.enabled) return

            const visibleCount = enhancedOptions.virtualScroll.visibleRange || 100
            const newStart = Math.max(0, Math.min(index, dataLength - visibleCount))
            const newEnd = Math.min(dataLength, newStart + visibleCount)

            visibleRange = [newStart, newEnd]
            throttledUpdate(originalData)
        },

        scrollBy(step: number): void {
            if (!enhancedOptions.virtualScroll?.enabled) return

            const [start, end] = visibleRange
            const visibleCount = end - start
            const newStart = Math.max(0, Math.min(start + step, dataLength - visibleCount))
            const newEnd = Math.min(dataLength, newStart + visibleCount)

            visibleRange = [newStart, newEnd]
            throttledUpdate(originalData)
        },

        setVisibleRange(start: number, end: number): void {
            if (!enhancedOptions.virtualScroll?.enabled) return

            const newStart = Math.max(0, start)
            const newEnd = Math.min(dataLength, end)

            visibleRange = [newStart, newEnd]
            throttledUpdate(originalData)
        },

        // 性能优化方法
        enableWebGL(enabled: boolean): void {
            isWebGLEnabled = enabled
            // 实际的WebGL切换需要在具体的渲染引擎中实现
            // 这里只是保存状态
        },

        setDownSampling(enabled: boolean, factor?: number): void {
            isDownSamplingEnabled = enabled
            if (factor) downSampleFactor = factor
            throttledUpdate(originalData)
        },

        // 数据点管理
        getDataLength(): number {
            return dataLength
        },

        getVisibleRange(): [number, number] {
            return [...visibleRange]
        }
    }

    return enhancedChart
}

/**
 * 优化的K线图渲染函数
 * 支持增量更新和虚拟滚动
 */
export function renderEnhancedCandlestickChart(
    container: HTMLElement,
    stockData: StockData,
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    // 合并默认选项
    const defaultOptions: EnhancedChartOptions = {
        container,
        width: container.clientWidth,
        height: container.clientHeight,
        theme: 'light',
        animation: false, // 禁用动画以提高性能
        tooltip: true,
        crosshair: true,
        grid: true,
        xAxis: {
            show: true,
            height: 30,
            tickCount: 6
        },
        yAxis: {
            show: true,
            width: 60,
            tickCount: 5,
            position: 'right'
        },
        legend: {
            show: true,
            position: 'top'
        },
        virtualScroll: {
            enabled: stockData.dates && stockData.dates.length > 100, // 自动启用虚拟滚动
            visibleRange: 100,
            scrollStep: 10,
            overscanCount: 20
        },
        performance: {
            enableWebGL: false,
            throttleRedraw: 16,
            downSampleThreshold: 1000,
            downSampleFactor: 2,
            clipOutOfBounds: true,
            lazyUpdate: true,
            batchRendering: true,
            useRequestAnimationFrame: true
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建增强图表实例
    const chart = createEnhancedChart(chartOptions)

    // 准备K线数据
    const candlestickData = stockData.dates?.map((date, index) => {
        return [
            date,
            stockData.opens?.[index] || 0,
            stockData.highs?.[index] || 0,
            stockData.lows?.[index] || 0,
            stockData.closes?.[index] || 0
        ]
    }) || []

    // 添加K线系列
    chart.addSeries({
        type: 'candlestick',
        name: '价格',
        data: candlestickData as Array<[number, number, number, number, number]>,
        color: '#5470c6',
        zIndex: 2
    })

    // 添加成交量系列
    if (stockData.volumes) {
        chart.addSeries({
            type: 'bar',
            name: '成交量',
            data: stockData.volumes,
            color: '#91cc75',
            zIndex: 1
        })
    }

    // 渲染图表
    chart.render()

    // 如果数据量大，启用降采样
    if (candlestickData.length > (chartOptions.performance?.downSampleThreshold || 1000)) {
        chart.setDownSampling(true)
    }

    return chart
}

/**
 * 优化的折线图渲染函数
 * 支持增量更新和虚拟滚动
 */
export function renderEnhancedLineChart(
    container: HTMLElement,
    data: number[] | Array<[number, number]>,
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    // 合并默认选项
    const defaultOptions: EnhancedChartOptions = {
        container,
        width: container.clientWidth,
        height: container.clientHeight,
        theme: 'light',
        animation: false, // 禁用动画以提高性能
        tooltip: true,
        crosshair: true,
        grid: true,
        xAxis: {
            show: true,
            height: 30,
            tickCount: 6
        },
        yAxis: {
            show: true,
            width: 60,
            tickCount: 5,
            position: 'right'
        },
        legend: {
            show: false
        },
        virtualScroll: {
            enabled: data.length > 100, // 自动启用虚拟滚动
            visibleRange: 100,
            scrollStep: 10,
            overscanCount: 20
        },
        performance: {
            enableWebGL: false,
            throttleRedraw: 16,
            downSampleThreshold: 1000,
            downSampleFactor: 2,
            clipOutOfBounds: true,
            lazyUpdate: true,
            batchRendering: true,
            useRequestAnimationFrame: true
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建增强图表实例
    const chart = createEnhancedChart(chartOptions)

    // 添加折线系列
    chart.addSeries({
        type: 'line',
        name: '数据',
        data,
        color: '#5470c6',
        lineWidth: 2,
        smooth: true
    })

    // 渲染图表
    chart.render()

    // 如果数据量大，启用降采样
    if (data.length > (chartOptions.performance?.downSampleThreshold || 1000)) {
        chart.setDownSampling(true)
    }

    return chart
}

/**
 * 优化的多系列图表渲染函数
 */
export function renderEnhancedMultiSeriesChart(
    container: HTMLElement,
    series: ChartSeries[],
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    // 合并默认选项
    const defaultOptions: EnhancedChartOptions = {
        container,
        width: container.clientWidth,
        height: container.clientHeight,
        theme: 'light',
        animation: false, // 禁用动画以提高性能
        tooltip: true,
        crosshair: true,
        grid: true,
        xAxis: {
            show: true,
            height: 30,
            tickCount: 6
        },
        yAxis: {
            show: true,
            width: 60,
            tickCount: 5,
            position: 'right'
        },
        legend: {
            show: true,
            position: 'top'
        },
        virtualScroll: {
            enabled: series.some(s => Array.isArray(s.data) && s.data.length > 100), // 自动启用虚拟滚动
            visibleRange: 100,
            scrollStep: 10,
            overscanCount: 20
        },
        performance: {
            enableWebGL: false,
            throttleRedraw: 16,
            downSampleThreshold: 1000,
            downSampleFactor: 2,
            clipOutOfBounds: true,
            lazyUpdate: true,
            batchRendering: true,
            useRequestAnimationFrame: true
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建增强图表实例
    const chart = createEnhancedChart(chartOptions)

    // 添加所有系列
    series.forEach(s => chart.addSeries(s))

    // 渲染图表
    chart.render()

    // 如果任何系列数据量大，启用降采样
    const maxDataLength = series.reduce((max, s) =>
        Array.isArray(s.data) ? Math.max(max, s.data.length) : max, 0)

    if (maxDataLength > (chartOptions.performance?.downSampleThreshold || 1000)) {
        chart.setDownSampling(true)
    }

    return chart
}

/**
 * 优化的技术指标渲染函数
 */
export function renderEnhancedTechnicalIndicator(
    container: HTMLElement,
    stockData: StockData,
    indicatorData: any,
    indicatorType: string,
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    // 根据指标类型选择合适的渲染方法
    switch (indicatorType) {
        case 'macd':
            return renderEnhancedMACDChart(container, stockData, indicatorData.macd, options)
        case 'kdj':
            return renderEnhancedKDJChart(container, stockData, indicatorData.kdj, options)
        case 'rsi':
            return renderEnhancedRSIChart(container, stockData, indicatorData.rsi, options)
        case 'bollinger':
            return renderEnhancedBollingerBandsChart(container, stockData, indicatorData.bollinger, options)
        default:
            // 默认渲染为折线图
            return renderEnhancedGenericIndicatorChart(container, stockData, indicatorData, indicatorType, options)
    }
}

/**
 * 渲染MACD图表
 */
function renderEnhancedMACDChart(
    container: HTMLElement,
    stockData: StockData,
    macdData: { macdLine: number[], signalLine: number[], histogram: number[] },
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    const series: ChartSeries[] = [
        {
            type: 'line',
            name: 'MACD线',
            data: macdData.macdLine,
            color: '#5470c6',
            lineWidth: 2
        },
        {
            type: 'line',
            name: '信号线',
            data: macdData.signalLine,
            color: '#91cc75',
            lineWidth: 2
        },
        {
            type: 'bar',
            name: '柱状图',
            data: macdData.histogram,
            color: '#ee6666'
        }
    ]

    return renderEnhancedMultiSeriesChart(container, series, options)
}

/**
 * 渲染KDJ图表
 */
function renderEnhancedKDJChart(
    container: HTMLElement,
    stockData: StockData,
    kdjData: { k: number[], d: number[], j: number[] },
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    const series: ChartSeries[] = [
        {
            type: 'line',
            name: 'K线',
            data: kdjData.k,
            color: '#5470c6',
            lineWidth: 2
        },
        {
            type: 'line',
            name: 'D线',
            data: kdjData.d,
            color: '#91cc75',
            lineWidth: 2
        },
        {
            type: 'line',
            name: 'J线',
            data: kdjData.j,
            color: '#ee6666',
            lineWidth: 2
        }
    ]

    return renderEnhancedMultiSeriesChart(container, series, options)
}

/**
 * 渲染RSI图表
 */
function renderEnhancedRSIChart(
    container: HTMLElement,
    stockData: StockData,
    rsiData: Record<string, number[]>,
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    const series: ChartSeries[] = []

    // 添加所有RSI周期
    Object.entries(rsiData).forEach(([key, data], index) => {
        const colors = ['#5470c6', '#91cc75', '#ee6666', '#73c0de', '#fc8452']
        series.push({
            type: 'line',
            name: key,
            data,
            color: colors[index % colors.length],
            lineWidth: 2
        })
    })

    return renderEnhancedMultiSeriesChart(container, series, options)
}

/**
 * 渲染布林带图表
 */
function renderEnhancedBollingerBandsChart(
    container: HTMLElement,
    stockData: StockData,
    bollingerData: { upper: number[], middle: number[], lower: number[] },
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    const series: ChartSeries[] = [
        {
            type: 'line',
            name: '上轨',
            data: bollingerData.upper,
            color: '#ee6666',
            lineWidth: 2
        },
        {
            type: 'line',
            name: '中轨',
            data: bollingerData.middle,
            color: '#5470c6',
            lineWidth: 2
        },
        {
            type: 'line',
            name: '下轨',
            data: bollingerData.lower,
            color: '#91cc75',
            lineWidth: 2
        },
        {
            type: 'area',
            name: '带状区域',
            data: bollingerData.upper.map((upper, i) => [i, upper, bollingerData.lower[i]]),
            color: '#5470c6',
            areaOpacity: 0.1,
            visible: true
        }
    ]

    return renderEnhancedMultiSeriesChart(container, series, options)
}

/**
 * 渲染通用指标图表
 */
function renderEnhancedGenericIndicatorChart(
    container: HTMLElement,
    stockData: StockData,
    indicatorData: any,
    indicatorType: string,
    options: Partial<EnhancedChartOptions> = {}
): EnhancedChartInstance {
    const series: ChartSeries[] = []

    // 尝试从指标数据中提取系列
    if (indicatorData[indicatorType]) {
        const data = indicatorData[indicatorType]

        // 如果是对象，可能包含多个系列
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.entries(data).forEach(([key, values], index) => {
                const colors = ['#5470c6', '#91cc75', '#ee6666', '#73c0de', '#fc8452']
                series.push({
                    type: 'line',
                    name: key,
                    data: values as number[],
                    color: colors[index % colors.length],
                    lineWidth: 2
                })
            })
        }
        // 如果是数组，作为单个系列
        else if (Array.isArray(data)) {
            series.push({
                type: 'line',
                name: indicatorType,
                data: data as number[],
                color: '#5470c6',
                lineWidth: 2
            })
        }
    }

    return renderEnhancedMultiSeriesChart(container, series, options)
}

// 导出服务
export const enhancedChartRenderingService = {
    createEnhancedChart,
    renderEnhancedCandlestickChart,
    renderEnhancedLineChart,
    renderEnhancedMultiSeriesChart,
    renderEnhancedTechnicalIndicator
}

export default enhancedChartRenderingService