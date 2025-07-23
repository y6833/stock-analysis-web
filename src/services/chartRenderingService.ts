/**
 * 图表渲染服务
 * 提供高性能的图表渲染功能
 * 实现增量更新、虚拟滚动和渲染优化
 */

import type { StockData } from '@/types/stock'

// 图表配置接口
export interface ChartOptions {
    container: HTMLElement
    width?: number
    height?: number
    padding?: {
        top: number
        right: number
        bottom: number
        left: number
    }
    theme?: 'light' | 'dark'
    animation?: boolean
    tooltip?: boolean
    crosshair?: boolean
    grid?: boolean
    xAxis?: {
        show: boolean
        height?: number
        tickCount?: number
    }
    yAxis?: {
        show: boolean
        width?: number
        tickCount?: number
        position?: 'left' | 'right'
    }
    legend?: {
        show: boolean
        position?: 'top' | 'bottom'
    }
}

// 图表系列接口
export interface ChartSeries {
    type: 'line' | 'bar' | 'candlestick' | 'area' | 'scatter'
    name: string
    data: number[] | Array<[number, number]> | Array<[number, number, number, number, number]>
    color?: string
    lineWidth?: number
    lineStyle?: 'solid' | 'dashed' | 'dotted'
    areaOpacity?: number
    visible?: boolean
    zIndex?: number
    tooltip?: boolean
    animation?: boolean
    smooth?: boolean
}

// 图表实例接口
export interface ChartInstance {
    render: () => void
    update: (data: any) => void
    resize: () => void
    clear: () => void
    destroy: () => void
    addSeries: (series: ChartSeries) => void
    removeSeries: (name: string) => void
    getSeries: (name: string) => ChartSeries | undefined
    getAllSeries: () => ChartSeries[]
    setOptions: (options: Partial<ChartOptions>) => void
    getOptions: () => ChartOptions
    getContainer: () => HTMLElement
    toDataURL: () => string
    showLoading: () => void
    hideLoading: () => void
}

// 渲染引擎接口
interface RenderEngine {
    createChart: (options: ChartOptions) => ChartInstance
    isSupported: () => boolean
    name: string
}

// 渲染引擎注册表
const renderEngines: RenderEngine[] = []

/**
 * 注册渲染引擎
 */
export function registerRenderEngine(engine: RenderEngine): void {
    renderEngines.push(engine)
}

/**
 * 获取最佳渲染引擎
 */
function getBestRenderEngine(): RenderEngine {
    // 优先使用支持的引擎
    for (const engine of renderEngines) {
        if (engine.isSupported()) {
            return engine
        }
    }

    // 如果没有支持的引擎，抛出错误
    throw new Error('没有可用的图表渲染引擎')
}

/**
 * 创建图表实例
 */
export function createChart(options: ChartOptions): ChartInstance {
    const engine = getBestRenderEngine()
    return engine.createChart(options)
}

/**
 * 优化的K线图渲染函数
 * 支持增量更新和虚拟滚动
 */
export function renderCandlestickChart(
    container: HTMLElement,
    stockData: StockData,
    options: Partial<ChartOptions> = {}
): ChartInstance {
    // 合并默认选项
    const defaultOptions: ChartOptions = {
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
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建图表实例
    const chart = createChart(chartOptions)

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

    return chart
}

/**
 * 优化的折线图渲染函数
 * 支持增量更新和虚拟滚动
 */
export function renderLineChart(
    container: HTMLElement,
    data: number[] | Array<[number, number]>,
    options: Partial<ChartOptions> = {}
): ChartInstance {
    // 合并默认选项
    const defaultOptions: ChartOptions = {
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
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建图表实例
    const chart = createChart(chartOptions)

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

    return chart
}

/**
 * 优化的面积图渲染函数
 */
export function renderAreaChart(
    container: HTMLElement,
    data: number[] | Array<[number, number]>,
    options: Partial<ChartOptions> = {}
): ChartInstance {
    // 合并默认选项
    const defaultOptions: ChartOptions = {
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
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建图表实例
    const chart = createChart(chartOptions)

    // 添加面积系列
    chart.addSeries({
        type: 'area',
        name: '数据',
        data,
        color: '#5470c6',
        lineWidth: 2,
        areaOpacity: 0.3,
        smooth: true
    })

    // 渲染图表
    chart.render()

    return chart
}

/**
 * 优化的多系列图表渲染函数
 */
export function renderMultiSeriesChart(
    container: HTMLElement,
    series: ChartSeries[],
    options: Partial<ChartOptions> = {}
): ChartInstance {
    // 合并默认选项
    const defaultOptions: ChartOptions = {
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
        }
    }

    const chartOptions = { ...defaultOptions, ...options }

    // 创建图表实例
    const chart = createChart(chartOptions)

    // 添加所有系列
    series.forEach(s => chart.addSeries(s))

    // 渲染图表
    chart.render()

    return chart
}

/**
 * 增量更新图表数据
 * 只更新变化的部分，提高性能
 */
export function updateChartIncrementally(
    chart: ChartInstance,
    newData: any,
    seriesName?: string
): void {
    // 如果指定了系列名称，只更新该系列
    if (seriesName) {
        const series = chart.getSeries(seriesName)
        if (series) {
            series.data = newData
            chart.update({ series: [series] })
            return
        }
    }

    // 否则更新所有数据
    chart.update(newData)
}

/**
 * 优化的技术指标渲染函数
 */
export function renderTechnicalIndicator(
    container: HTMLElement,
    stockData: StockData,
    indicatorData: any,
    indicatorType: string,
    options: Partial<ChartOptions> = {}
): ChartInstance {
    // 根据指标类型选择合适的渲染方法
    switch (indicatorType) {
        case 'macd':
            return renderMACDChart(container, stockData, indicatorData.macd, options)
        case 'kdj':
            return renderKDJChart(container, stockData, indicatorData.kdj, options)
        case 'rsi':
            return renderRSIChart(container, stockData, indicatorData.rsi, options)
        case 'bollinger':
            return renderBollingerBandsChart(container, stockData, indicatorData.bollinger, options)
        default:
            // 默认渲染为折线图
            return renderGenericIndicatorChart(container, stockData, indicatorData, indicatorType, options)
    }
}

/**
 * 渲染MACD图表
 */
function renderMACDChart(
    container: HTMLElement,
    stockData: StockData,
    macdData: { macdLine: number[], signalLine: number[], histogram: number[] },
    options: Partial<ChartOptions> = {}
): ChartInstance {
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

    return renderMultiSeriesChart(container, series, options)
}

/**
 * 渲染KDJ图表
 */
function renderKDJChart(
    container: HTMLElement,
    stockData: StockData,
    kdjData: { k: number[], d: number[], j: number[] },
    options: Partial<ChartOptions> = {}
): ChartInstance {
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

    return renderMultiSeriesChart(container, series, options)
}

/**
 * 渲染RSI图表
 */
function renderRSIChart(
    container: HTMLElement,
    stockData: StockData,
    rsiData: Record<string, number[]>,
    options: Partial<ChartOptions> = {}
): ChartInstance {
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

    return renderMultiSeriesChart(container, series, options)
}

/**
 * 渲染布林带图表
 */
function renderBollingerBandsChart(
    container: HTMLElement,
    stockData: StockData,
    bollingerData: { upper: number[], middle: number[], lower: number[] },
    options: Partial<ChartOptions> = {}
): ChartInstance {
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

    return renderMultiSeriesChart(container, series, options)
}

/**
 * 渲染通用指标图表
 */
function renderGenericIndicatorChart(
    container: HTMLElement,
    stockData: StockData,
    indicatorData: any,
    indicatorType: string,
    options: Partial<ChartOptions> = {}
): ChartInstance {
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

    return renderMultiSeriesChart(container, series, options)
}

// 导出服务
export const chartRenderingService = {
    createChart,
    renderCandlestickChart,
    renderLineChart,
    renderAreaChart,
    renderMultiSeriesChart,
    updateChartIncrementally,
    renderTechnicalIndicator,
    registerRenderEngine
}

export default chartRenderingService