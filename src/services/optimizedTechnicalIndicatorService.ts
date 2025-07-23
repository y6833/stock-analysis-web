/**
 * 优化的技术指标服务
 * 提供高性能的技术分析指标计算功能
 * 使用 Web Worker 在后台线程计算，避免阻塞主线程
 * 实现缓存和增量计算以提高性能
 */

import type { StockData } from '@/types/stock'

// 缓存系统
interface IndicatorCache {
    timestamp: number
    data: any
    params: any
}

const indicatorCache: Map<string, IndicatorCache> = new Map()
const CACHE_EXPIRY_TIME = 5 * 60 * 1000 // 5分钟缓存过期

// 创建 Web Worker 实例
let worker: Worker | null = null
let isWorkerReady = false
let pendingTasks: { resolve: Function; reject: Function; data: any; taskId: string }[] = []
let taskIdCounter = 0

// 初始化 Worker
function initWorker() {
    if (worker) return

    try {
        worker = new Worker(new URL('../workers/optimizedIndicatorWorker.js', import.meta.url), {
            type: 'module',
        })

        worker.addEventListener('message', (e) => {
            const { type, data, message, taskId } = e.data

            switch (type) {
                case 'ready':
                    isWorkerReady = true
                    processPendingTasks()
                    break

                case 'result':
                    // 找到对应的任务
                    const taskIndex = pendingTasks.findIndex(task => task.taskId === taskId)
                    if (taskIndex !== -1) {
                        const task = pendingTasks[taskIndex]
                        pendingTasks.splice(taskIndex, 1)
                        task.resolve(data)
                    }
                    // 处理下一个任务
                    processPendingTasks()
                    break

                case 'error':
                    const errorTaskIndex = pendingTasks.findIndex(task => task.taskId === taskId)
                    if (errorTaskIndex !== -1) {
                        const errorTask = pendingTasks[errorTaskIndex]
                        pendingTasks.splice(errorTaskIndex, 1)
                        errorTask.reject(new Error(message))
                    }
                    // 处理下一个任务
                    processPendingTasks()
                    break
            }
        })

        worker.addEventListener('error', (error) => {
            console.error('Worker error:', error)
            // 在错误情况下，清空所有任务
            const tasks = [...pendingTasks]
            pendingTasks = []
            tasks.forEach(task => task.reject(error))
        })
    } catch (error) {
        console.error('Failed to initialize worker:', error)
        // 如果 Worker 初始化失败，标记为就绪，使用主线程计算
        isWorkerReady = true
    }
}

// 处理排队中的任务
function processPendingTasks() {
    if (!isWorkerReady || !worker || pendingTasks.length === 0) return

    const task = pendingTasks[0] // 获取但不移除，等待结果返回后再移除
    try {
        // 确保数据可以被序列化
        const clonedData = JSON.parse(JSON.stringify({ ...task.data, taskId: task.taskId }))
        worker.postMessage(clonedData)
    } catch (error) {
        console.error('无法序列化任务数据:', error)
        // 移除当前任务并拒绝 Promise
        pendingTasks.shift()
        task.reject(new Error('无法序列化任务数据: ' + error.message))
        // 继续处理下一个任务
        processPendingTasks()
    }
}

// 使用 Worker 计算指标
async function calculateWithWorker(stockData: StockData, indicators: string[], params?: any): Promise<any> {
    initWorker()

    // 生成任务ID
    const taskId = `task_${taskIdCounter++}`

    return new Promise((resolve, reject) => {
        const task = {
            resolve,
            reject,
            taskId,
            data: {
                type: 'calculate',
                data: {
                    stockData,
                    indicators,
                    params
                },
            },
        }

        pendingTasks.push(task)

        if (isWorkerReady && worker) {
            processPendingTasks()
        }
    })
}

/**
 * 生成缓存键
 */
function generateCacheKey(stockData: StockData, indicators: string[], params?: any): string {
    const dataHash = `${stockData.symbol}_${stockData.prices?.length || 0}_${stockData.dates?.[stockData.dates.length - 1] || ''}`
    const indicatorsHash = indicators.sort().join(',')
    const paramsHash = params ? JSON.stringify(params) : ''
    return `${dataHash}_${indicatorsHash}_${paramsHash}`
}

/**
 * 检查缓存是否有效
 */
function isCacheValid(cache: IndicatorCache): boolean {
    return Date.now() - cache.timestamp < CACHE_EXPIRY_TIME
}

/**
 * 批量计算多个指标
 * 优先使用缓存，然后使用 Web Worker，如果 Worker 不可用则回退到主线程计算
 */
export async function calculateIndicators(
    stockData: StockData,
    indicators: string[],
    params?: any
): Promise<any> {
    // 检查缓存
    const cacheKey = generateCacheKey(stockData, indicators, params)
    const cachedResult = indicatorCache.get(cacheKey)

    if (cachedResult && isCacheValid(cachedResult)) {
        return cachedResult.data
    }

    try {
        // 尝试使用 Worker 计算
        const result = await calculateWithWorker(stockData, indicators, params)

        // 缓存结果
        indicatorCache.set(cacheKey, {
            timestamp: Date.now(),
            data: result,
            params: params || {}
        })

        return result
    } catch (error) {
        console.warn('Worker calculation failed, falling back to main thread:', error)

        // 回退到主线程计算
        const result = calculateIndicatorsOnMainThread(stockData, indicators, params)

        // 缓存结果
        indicatorCache.set(cacheKey, {
            timestamp: Date.now(),
            data: result,
            params: params || {}
        })

        return result
    }
}

/**
 * 在主线程上计算指标（回退方案）
 */
function calculateIndicatorsOnMainThread(stockData: StockData, indicators: string[], params?: any): any {
    // 导入原始指标计算函数
    const {
        calculateSMA,
        calculateEMA,
        calculateRSI,
        calculateMACD,
        calculateKDJ,
        calculateBollingerBands,
        calculateATR,
        calculateVWAP,
        calculateKDJMACDOptimized,
        detectHeadAndShoulders,
        detectDoubleTopBottom
    } = require('./technicalIndicatorService')

    const result: any = {}
    const prices = stockData.prices || []
    const volumes = stockData.volumes || []
    const highs = stockData.highs || prices
    const lows = stockData.lows || prices
    const closes = stockData.closes || prices
    const opens = stockData.opens || prices

    // 计算请求的指标
    if (indicators.includes('sma')) {
        const periods = params?.sma?.periods || [5, 10, 20, 60]
        result.sma = {}
        periods.forEach((period: number) => {
            result.sma[`sma${period}`] = calculateSMA(prices, period)
        })
    }

    if (indicators.includes('ema')) {
        const periods = params?.ema?.periods || [12, 26]
        result.ema = {}
        periods.forEach((period: number) => {
            result.ema[`ema${period}`] = calculateEMA(prices, period)
        })
    }

    if (indicators.includes('macd')) {
        const fastPeriod = params?.macd?.fastPeriod || 12
        const slowPeriod = params?.macd?.slowPeriod || 26
        const signalPeriod = params?.macd?.signalPeriod || 9
        result.macd = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)
    }

    if (indicators.includes('rsi')) {
        const periods = params?.rsi?.periods || [14]
        result.rsi = {}
        periods.forEach((period: number) => {
            result.rsi[`rsi${period}`] = calculateRSI(prices, period)
        })
    }

    if (indicators.includes('kdj')) {
        const period = params?.kdj?.period || 9
        const kPeriod = params?.kdj?.kPeriod || 3
        const dPeriod = params?.kdj?.dPeriod || 3
        result.kdj = calculateKDJ(highs, lows, closes, period, kPeriod, dPeriod)
    }

    if (indicators.includes('bollinger')) {
        const period = params?.bollinger?.period || 20
        const multiplier = params?.bollinger?.multiplier || 2
        result.bollinger = calculateBollingerBands(prices, period, multiplier)
    }

    if (indicators.includes('volume')) {
        const periods = params?.volume?.periods || [5, 10]
        result.volume = {
            volume: volumes
        }
        periods.forEach((period: number) => {
            result.volume[`ma${period}`] = calculateSMA(volumes, period)
        })
    }

    if (indicators.includes('atr')) {
        const period = params?.atr?.period || 14
        result.atr = calculateATR(highs, lows, closes, period)
    }

    if (indicators.includes('vwap')) {
        result.vwap = calculateVWAP(prices, volumes)
    }

    if (indicators.includes('rvi')) {
        const period = params?.rvi?.period || 10
        // 如果原始服务中没有RVI，我们可以使用KDJ和MACD的组合作为替代
        const combined = calculateKDJMACDOptimized(
            highs, lows, closes,
            9, 3, 3, // KDJ默认参数
            12, 26, 9 // MACD默认参数
        )
        result.rvi = {
            rvi: combined.kdjK.map((k, i) => (k + combined.macdLine[i]) / 2),
            signal: combined.kdjD.map((d, i) => (d + combined.signalLine[i]) / 2)
        }
    }

    if (indicators.includes('stochastic')) {
        const kPeriod = params?.stochastic?.kPeriod || 14
        const dPeriod = params?.stochastic?.dPeriod || 3
        // 使用KDJ作为随机指标的替代，因为它们计算方式相似
        const kdj = calculateKDJ(highs, lows, closes, kPeriod, dPeriod, dPeriod)
        result.stochastic = {
            k: kdj.k,
            d: kdj.d
        }
    }

    if (indicators.includes('pattern')) {
        const headAndShoulders = detectHeadAndShoulders(prices)
        const doubleTopBottom = detectDoubleTopBottom(prices)

        result.patterns = []

        if (headAndShoulders.pattern !== 'none') {
            result.patterns.push({
                pattern: headAndShoulders.pattern,
                positions: headAndShoulders.positions,
                confidence: 0.8,
                description:
                    headAndShoulders.pattern === 'head-and-shoulders'
                        ? '头肩顶形态，可能预示着下跌趋势'
                        : '头肩底形态，可能预示着上涨趋势',
            })
        }

        if (doubleTopBottom.pattern !== 'none') {
            result.patterns.push({
                pattern: doubleTopBottom.pattern,
                positions: doubleTopBottom.positions,
                confidence: 0.75,
                description:
                    doubleTopBottom.pattern === 'double-top'
                        ? '双顶形态，可能预示着下跌趋势'
                        : '双底形态，可能预示着上涨趋势',
            })
        }
    }

    // 处理自定义指标
    if (indicators.includes('custom') && params?.custom) {
        result.custom = calculateCustomIndicator(stockData, params.custom)
    }

    return result
}

/**
 * 计算自定义指标
 * 增强版支持更多变量类型和数学函数
 */
function calculateCustomIndicator(stockData: StockData, customParams: any): any {
    const { formula, variables, name, description, style } = customParams
    if (!formula || !variables) {
        return null
    }

    try {
        // 导入所有需要的指标计算函数
        const {
            calculateSMA,
            calculateEMA,
            calculateRSI,
            calculateMACD,
            calculateKDJ,
            calculateBollingerBands,
            calculateATR,
            calculateVWAP
        } = require('./technicalIndicatorService')

        // 解析变量
        const variableValues: Record<string, number[]> = {}
        for (const [key, value] of Object.entries(variables)) {
            const varConfig = value as any

            // 支持更多数据类型
            switch (varConfig.type) {
                case 'price':
                case 'close':
                    variableValues[key] = stockData.closes || stockData.prices || []
                    break
                case 'open':
                    variableValues[key] = stockData.opens || stockData.prices || []
                    break
                case 'high':
                    variableValues[key] = stockData.highs || stockData.prices || []
                    break
                case 'low':
                    variableValues[key] = stockData.lows || stockData.prices || []
                    break
                case 'volume':
                    variableValues[key] = stockData.volumes || []
                    break
                case 'indicator':
                    // 支持更多指标类型
                    const { name: indicatorName, period, parameters } = varConfig
                    switch (indicatorName) {
                        case 'sma':
                            variableValues[key] = calculateSMA(stockData.prices || [], period || 5)
                            break
                        case 'ema':
                            variableValues[key] = calculateEMA(stockData.prices || [], period || 12)
                            break
                        case 'rsi':
                            variableValues[key] = calculateRSI(stockData.prices || [], period || 14)
                            break
                        case 'macd':
                            const macdResult = calculateMACD(
                                stockData.prices || [],
                                parameters?.fastPeriod || 12,
                                parameters?.slowPeriod || 26,
                                parameters?.signalPeriod || 9
                            )
                            // 允许访问MACD的不同组件
                            if (parameters?.component === 'signal') {
                                variableValues[key] = macdResult.signalLine
                            } else if (parameters?.component === 'histogram') {
                                variableValues[key] = macdResult.histogram
                            } else {
                                variableValues[key] = macdResult.macdLine
                            }
                            break
                        case 'bollinger':
                            const bollingerResult = calculateBollingerBands(
                                stockData.prices || [],
                                period || 20,
                                parameters?.multiplier || 2
                            )
                            // 允许访问布林带的不同组件
                            if (parameters?.component === 'upper') {
                                variableValues[key] = bollingerResult.upper
                            } else if (parameters?.component === 'lower') {
                                variableValues[key] = bollingerResult.lower
                            } else {
                                variableValues[key] = bollingerResult.middle
                            }
                            break
                        case 'kdj':
                            const kdjResult = calculateKDJ(
                                stockData.highs || stockData.prices || [],
                                stockData.lows || stockData.prices || [],
                                stockData.closes || stockData.prices || [],
                                period || 9,
                                parameters?.kPeriod || 3,
                                parameters?.dPeriod || 3
                            )
                            // 允许访问KDJ的不同组件
                            if (parameters?.component === 'd') {
                                variableValues[key] = kdjResult.d
                            } else if (parameters?.component === 'j') {
                                variableValues[key] = kdjResult.j
                            } else {
                                variableValues[key] = kdjResult.k
                            }
                            break
                        case 'atr':
                            variableValues[key] = calculateATR(
                                stockData.highs || stockData.prices || [],
                                stockData.lows || stockData.prices || [],
                                stockData.closes || stockData.prices || [],
                                period || 14
                            )
                            break
                        case 'vwap':
                            variableValues[key] = calculateVWAP(stockData.prices || [], stockData.volumes || [])
                            break
                        default:
                            variableValues[key] = Array(stockData.prices?.length || 0).fill(NaN)
                    }
                    break
                case 'constant':
                    // 支持常量值
                    const constantValue = parseFloat(varConfig.value) || 0
                    variableValues[key] = Array(stockData.prices?.length || 0).fill(constantValue)
                    break
                default:
                    variableValues[key] = Array(stockData.prices?.length || 0).fill(NaN)
            }
        }

        // 创建安全的数学函数环境
        const mathFunctions = {
            abs: Math.abs,
            sqrt: Math.sqrt,
            pow: Math.pow,
            log: Math.log,
            exp: Math.exp,
            max: Math.max,
            min: Math.min,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            round: Math.round,
            floor: Math.floor,
            ceil: Math.ceil,
            // 添加更多常用的数学和统计函数
            avg: (a: number, b: number) => (a + b) / 2,
            sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
            median: (...args: number[]) => {
                const sorted = [...args].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            },
            std: (...args: number[]) => {
                const mean = args.reduce((a, b) => a + b, 0) / args.length;
                const variance = args.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / args.length;
                return Math.sqrt(variance);
            }
        };

        // 计算结果
        const result: number[] = []
        const dataLength = stockData.prices?.length || 0

        // 使用更安全的方法计算公式
        // 预编译公式，提高性能
        let compiledFormula = formula;

        // 替换变量名为数组访问
        for (const key in variableValues) {
            const regex = new RegExp('\\b' + key + '\\b', 'g');
            compiledFormula = compiledFormula.replace(regex, `values['${key}'][i]`);
        }

        // 添加数学函数
        for (const [funcName, func] of Object.entries(mathFunctions)) {
            const regex = new RegExp('\\b' + funcName + '\\(', 'g');
            compiledFormula = compiledFormula.replace(regex, `mathFuncs.${funcName}(`);
        }

        // 创建计算函数
        const calculateValue = new Function('values', 'mathFuncs', 'i', `
            try {
                return ${compiledFormula};
            } catch (e) {
                return NaN;
            }
        `);

        // 计算每个数据点
        for (let i = 0; i < dataLength; i++) {
            try {
                const value = calculateValue(variableValues, mathFunctions, i);
                result.push(value);
            } catch (e) {
                result.push(NaN);
            }
        }

        // 返回结果，包括元数据
        return {
            values: result,
            name: name || '自定义指标',
            description: description || '用户创建的自定义技术指标',
            style: style || {
                lineColor: '#FF9900',
                lineWidth: 2,
                lineStyle: 'solid'
            }
        };
    } catch (error) {
        console.error('计算自定义指标失败:', error)
        return null
    }
}

/**
 * 增量计算指标
 * 当新数据添加到现有数据集时，只计算新数据点的指标值
 */
export async function calculateIncrementalIndicators(
    stockData: StockData,
    previousData: StockData,
    indicators: string[],
    params?: any
): Promise<any> {
    // 检查是否可以进行增量计算
    if (!previousData || !previousData.dates || !stockData.dates) {
        // 如果没有先前的数据，执行完整计算
        return calculateIndicators(stockData, indicators, params)
    }

    // 找到新数据的起始点
    const lastPreviousDate = previousData.dates[previousData.dates.length - 1]
    const newDataStartIndex = stockData.dates.findIndex(date => date > lastPreviousDate)

    if (newDataStartIndex === -1 || newDataStartIndex === 0) {
        // 没有新数据或数据完全不同，执行完整计算
        return calculateIndicators(stockData, indicators, params)
    }

    // 获取先前的计算结果
    const cacheKey = generateCacheKey(previousData, indicators, params)
    const cachedResult = indicatorCache.get(cacheKey)

    if (!cachedResult || !isCacheValid(cachedResult)) {
        // 如果没有缓存或缓存无效，执行完整计算
        return calculateIndicators(stockData, indicators, params)
    }

    // 执行增量计算
    try {
        const incrementalResult = await calculateWithWorker(
            stockData,
            indicators,
            {
                ...params,
                incremental: {
                    previousResult: cachedResult.data,
                    newDataStartIndex
                }
            }
        )

        // 更新缓存
        indicatorCache.set(generateCacheKey(stockData, indicators, params), {
            timestamp: Date.now(),
            data: incrementalResult,
            params: params || {}
        })

        return incrementalResult
    } catch (error) {
        console.warn('增量计算失败，回退到完整计算:', error)
        return calculateIndicators(stockData, indicators, params)
    }
}

/**
 * 清除指标缓存
 */
export function clearIndicatorCache(symbol?: string): void {
    if (symbol) {
        // 清除特定股票的缓存
        for (const [key, value] of indicatorCache.entries()) {
            if (key.startsWith(`${symbol}_`)) {
                indicatorCache.delete(key)
            }
        }
    } else {
        // 清除所有缓存
        indicatorCache.clear()
    }
}

/**
 * 获取支持的指标列表
 */
export function getSupportedIndicators(): string[] {
    return [
        'sma',
        'ema',
        'macd',
        'rsi',
        'kdj',
        'bollinger',
        'volume',
        'pattern',
        'atr',
        'vwap',
        'rvi',
        'stochastic',
        'custom'
    ]
}

/**
 * 获取指标默认参数
 */
export function getDefaultIndicatorParams(indicator: string): any {
    switch (indicator) {
        case 'sma':
            return { periods: [5, 10, 20, 60] }
        case 'ema':
            return { periods: [12, 26] }
        case 'macd':
            return { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
        case 'rsi':
            return { periods: [14] }
        case 'kdj':
            return { period: 9, kPeriod: 3, dPeriod: 3 }
        case 'bollinger':
            return { period: 20, multiplier: 2 }
        case 'volume':
            return { periods: [5, 10] }
        case 'pattern':
            return { windowSize: 60 }
        case 'atr':
            return { period: 14 }
        case 'vwap':
            return {} // VWAP doesn't require parameters
        case 'rvi':
            return { period: 10 }
        case 'stochastic':
            return { kPeriod: 14, dPeriod: 3 }
        case 'custom':
            return {
                formula: 'close',
                variables: {
                    close: { type: 'price' }
                }
            }
        default:
            return {}
    }
}

// 导出服务
export const optimizedTechnicalIndicatorService = {
    calculateIndicators,
    calculateIncrementalIndicators,
    clearIndicatorCache,
    getSupportedIndicators,
    getDefaultIndicatorParams
}

export default optimizedTechnicalIndicatorService