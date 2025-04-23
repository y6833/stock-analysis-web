<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { stockService } from '@/services/stockService'
import type { Stock, StockData } from '@/types/stock'

const route = useRoute()

const chartRef = ref<HTMLElement | null>(null)
const stockSymbol = ref('')
const stockName = ref('')
const stockData = ref<StockData | null>(null)
const analysisResult = ref('')
const isLoading = ref(false)
const error = ref('')
const chart = ref<echarts.ECharts | null>(null)

// 交易信号相关
const isBuySignal = () => {
  if (!stockData.value) return false

  const prices = stockData.value.prices
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)
  const rsi = calculateRSI(prices)

  // 金叉信号
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 < prevSMA20 && lastSMA5 > lastSMA20) {
      return true
    }
  }

  // RSI 超卖信号
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1]
    if (lastRSI < 30) {
      return true
    }
  }

  return false
}

const isSellSignal = () => {
  if (!stockData.value) return false

  const prices = stockData.value.prices
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)
  const rsi = calculateRSI(prices)

  // 死叉信号
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 > prevSMA20 && lastSMA5 < lastSMA20) {
      return true
    }
  }

  // RSI 超买信号
  if (rsi.length > 0) {
    const lastRSI = rsi[rsi.length - 1]
    if (lastRSI > 70) {
      return true
    }
  }

  return false
}

const getSignalText = () => {
  if (isBuySignal()) {
    return '买入信号'
  } else if (isSellSignal()) {
    return '卖出信号'
  } else {
    return '观望信号'
  }
}

// 搜索相关
const searchQuery = ref('')
const searchResults = ref<Stock[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)

// 获取股票数据
const fetchStockData = async () => {
  if (!stockSymbol.value) return

  isLoading.value = true
  error.value = ''

  try {
    stockData.value = await stockService.getStockData(stockSymbol.value)
    initChart()
    analyzeStock()
  } catch (err) {
    console.error('获取股票数据失败:', err)
    error.value = '获取股票数据失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}

// 搜索股票
const searchStocks = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }

  isSearching.value = true

  try {
    searchResults.value = await stockService.searchStocks(searchQuery.value)
    showSearchResults.value = true
  } catch (err) {
    console.error('搜索股票失败:', err)
  } finally {
    isSearching.value = false
  }
}

// 选择股票
const selectStock = (stock: Stock) => {
  stockSymbol.value = stock.symbol
  stockName.value = stock.name
  searchQuery.value = ''
  showSearchResults.value = false
  fetchStockData()
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value || !stockData.value) return

  if (chart.value) {
    chart.value.dispose()
  }

  chart.value = echarts.init(chartRef.value)

  // 计算技术指标
  const prices = stockData.value.prices
  const sma5 = calculateSMA(prices, 5)
  const sma10 = calculateSMA(prices, 10)
  const sma20 = calculateSMA(prices, 20)
  const sma60 = calculateSMA(prices, 60)
  const rsi = calculateRSI(prices)

  // 计算成交量柱状图数据
  const volumeData = stockData.value.volumes.map((volume: number, index: number) => {
    const price = prices[index]
    const prevPrice = index > 0 ? prices[index - 1] : price
    // 价格上涨显示红色，下跌显示绿色
    const color = price >= prevPrice ? '#ef5350' : '#26a69a'
    return {
      value: volume,
      itemStyle: {
        color: color,
      },
    }
  })

  const option = {
    title: {
      text: `${stockName.value} (${stockSymbol.value}) 股票走势`,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: function (params: any) {
        const date = params[0].axisValue
        let tooltipText = `<div style="font-weight:bold;margin-bottom:5px">日期: ${date}</div>`

        params.forEach((param: any) => {
          const color = param.color
          const seriesName = param.seriesName
          const value = param.value

          if (value !== undefined && !isNaN(value)) {
            tooltipText += `<div style="display:flex;justify-content:space-between;align-items:center;margin:3px 0">
              <span style="margin-right:15px">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};margin-right:5px"></span>
                ${seriesName}:
              </span>
              <span style="font-weight:bold">${typeof value === 'object' ? value.value : value}</span>
            </div>`
          }
        })

        return tooltipText
      },
    },
    legend: {
      data: ['价格', '5日均线', '10日均线', '20日均线', '60日均线', 'RSI'],
      top: 30,
    },
    grid: [
      {
        left: '3%',
        right: '4%',
        top: '80px',
        height: '50%',
        containLabel: true,
      },
      {
        left: '3%',
        right: '4%',
        top: '65%',
        height: '15%',
        containLabel: true,
      },
    ],
    xAxis: [
      {
        type: 'category',
        data: stockData.value.dates,
        scale: true,
        boundaryGap: false,
        axisLabel: {
          rotate: 45,
          formatter: function (value: string) {
            return value.substring(5) // 只显示月-日
          },
        },
        axisLine: { onZero: false },
        splitLine: { show: false },
        gridIndex: 0,
      },
      {
        type: 'category',
        data: stockData.value.dates,
        scale: true,
        boundaryGap: false,
        axisLabel: { show: false },
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        gridIndex: 1,
      },
    ],
    yAxis: [
      {
        type: 'value',
        scale: true,
        splitArea: { show: true },
        axisLabel: {
          formatter: '{value} 元',
        },
        gridIndex: 0,
      },
      {
        type: 'value',
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: true },
        axisLine: { show: true },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100,
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: '0%',
        start: 50,
        end: 100,
      },
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        data: stockData.value.prices,
        smooth: true,
        lineStyle: {
          color: '#5470C6',
          width: 2,
        },
        markPoint: {
          data: [
            { type: 'max', name: '最高价' },
            { type: 'min', name: '最低价' },
          ],
        },
        markLine: {
          data: [{ type: 'average', name: '平均值' }],
        },
      },
      {
        name: '5日均线',
        type: 'line',
        data: sma5,
        smooth: true,
        lineStyle: {
          color: '#FF9800',
          width: 1.5,
        },
        symbol: 'none',
      },
      {
        name: '10日均线',
        type: 'line',
        data: sma10,
        smooth: true,
        lineStyle: {
          color: '#4CAF50',
          width: 1.5,
        },
        symbol: 'none',
      },
      {
        name: '20日均线',
        type: 'line',
        data: sma20,
        smooth: true,
        lineStyle: {
          color: '#9C27B0',
          width: 1.5,
        },
        symbol: 'none',
      },
      {
        name: '60日均线',
        type: 'line',
        data: sma60,
        smooth: true,
        lineStyle: {
          color: '#E91E63',
          width: 1.5,
        },
        symbol: 'none',
      },
      {
        name: 'RSI',
        type: 'line',
        yAxisIndex: 1,
        xAxisIndex: 1,
        data: rsi,
        smooth: true,
        lineStyle: {
          color: '#2196F3',
          width: 1.5,
        },
        symbol: 'none',
        markLine: {
          data: [
            { yAxis: 70, lineStyle: { color: '#F44336' } },
            { yAxis: 30, lineStyle: { color: '#4CAF50' } },
          ],
        },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
      },
    ],
  }

  chart.value.setOption(option)

  // 响应窗口大小变化
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

// 分析股票数据
const analyzeStock = () => {
  if (!stockData.value) return

  const prices = stockData.value.prices
  const lastPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const changePercent = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)

  // 计算5日和20日均线
  const sma5 = calculateSMA(prices, 5)
  const sma20 = calculateSMA(prices, 20)

  // 判断金叉死叉
  let signal = ''
  if (sma5.length > 2 && sma20.length > 2) {
    const lastSMA5 = sma5[sma5.length - 1]
    const prevSMA5 = sma5[sma5.length - 2]
    const lastSMA20 = sma20[sma20.length - 1]
    const prevSMA20 = sma20[sma20.length - 2]

    if (prevSMA5 < prevSMA20 && lastSMA5 > lastSMA20) {
      signal = '金叉形成，可能是买入信号'
    } else if (prevSMA5 > prevSMA20 && lastSMA5 < lastSMA20) {
      signal = '死叉形成，可能是卖出信号'
    }
  }

  if (parseFloat(changePercent) > 0) {
    analysisResult.value = `过去${stockData.value.dates.length}天上涨${changePercent}%。${signal}`
  } else {
    analysisResult.value = `过去${stockData.value.dates.length}天下跌${Math.abs(parseFloat(changePercent))}%。${signal}`
  }
}

// 计算简单移动平均线
function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }

    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += prices[i - j]
    }

    result.push(sum / period)
  }

  return result
}

// 计算相对强弱指标 (RSI)
function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = []
  const gains: number[] = []
  const losses: number[] = []

  // 计算价格变化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // 填充前面的空值
  for (let i = 0; i < period; i++) {
    result.push(NaN)
  }

  // 计算第一个 RSI 值
  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period

  // 计算第一个 RSI
  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  // 计算剩余的 RSI 值
  for (let i = period; i < gains.length; i++) {
    // 使用平滑 RSI 公式
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period

    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }

  return result
}

// 监听股票代码变化
watch(stockSymbol, () => {
  fetchStockData()
})

// 初始化
onMounted(() => {
  // 检查URL参数中是否有股票代码
  const symbolParam = route.query.symbol
  if (symbolParam && typeof symbolParam === 'string') {
    stockSymbol.value = symbolParam
  }
  // 不再自动加载数据，等待用户手动查询
})
</script>

<template>
  <div class="stock-analysis">
    <h1>股票分析系统</h1>

    <div class="search-box">
      <div class="search-input-container">
        <input
          v-model="searchQuery"
          @input="searchStocks"
          @focus="showSearchResults = !!searchQuery"
          placeholder="搜索股票代码或名称"
          class="search-input"
        />
        <div v-if="showSearchResults" class="search-results">
          <div v-if="isSearching" class="searching">搜索中...</div>
          <div v-else-if="searchResults.length === 0" class="no-results">未找到相关股票</div>
          <div
            v-else
            v-for="stock in searchResults"
            :key="stock.symbol"
            class="search-result-item"
            @click="selectStock(stock)"
          >
            <span class="stock-symbol">{{ stock.symbol }}</span>
            <span class="stock-name">{{ stock.name }}</span>
            <span class="stock-market">{{ stock.market }}</span>
          </div>
        </div>
      </div>
      <button class="search-btn" @click="fetchStockData" :disabled="isLoading">
        {{ isLoading ? '加载中...' : '查询' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载股票数据...</p>
    </div>

    <div v-else>
      <div ref="chartRef" class="chart-container"></div>

      <div class="stock-info" v-if="stockData">
        <div class="info-card">
          <h3>股票信息</h3>
          <div class="info-item">
            <span class="label">代码:</span>
            <span class="value">{{ stockSymbol }}</span>
          </div>
          <div class="info-item">
            <span class="label">名称:</span>
            <span class="value">{{ stockName }}</span>
          </div>
          <div class="info-item">
            <span class="label">最新价:</span>
            <span class="value"
              >{{ stockData?.prices[stockData.prices.length - 1].toFixed(2) }} 元</span
            >
          </div>
          <div class="info-item">
            <span class="label">最高价:</span>
            <span class="value">{{ stockData?.high.toFixed(2) }} 元</span>
          </div>
          <div class="info-item">
            <span class="label">最低价:</span>
            <span class="value">{{ stockData?.low.toFixed(2) }} 元</span>
          </div>
          <div class="info-item">
            <span class="label">涨跌幅:</span>
            <span
              class="value"
              :class="{
                profit: stockData.prices[stockData.prices.length - 1] > stockData.prices[0],
                loss: stockData.prices[stockData.prices.length - 1] < stockData.prices[0],
              }"
            >
              {{
                (
                  ((stockData.prices[stockData.prices.length - 1] - stockData.prices[0]) /
                    stockData.prices[0]) *
                  100
                ).toFixed(2)
              }}%
            </span>
          </div>
        </div>

        <div class="analysis-result">
          <h3>分析建议</h3>
          <p>{{ analysisResult }}</p>

          <div class="technical-indicators">
            <h4>技术指标</h4>
            <div class="indicator-grid">
              <div class="indicator">
                <span class="indicator-name">5日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 5)[
                    calculateSMA(stockData.prices, 5).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">10日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 10)[
                    calculateSMA(stockData.prices, 10).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">20日均线</span>
                <span class="indicator-value">{{
                  calculateSMA(stockData.prices, 20)[
                    calculateSMA(stockData.prices, 20).length - 1
                  ].toFixed(2)
                }}</span>
              </div>
              <div class="indicator">
                <span class="indicator-name">RSI(14)</span>
                <span
                  class="indicator-value"
                  :class="{
                    overbought:
                      calculateRSI(stockData.prices)[calculateRSI(stockData.prices).length - 1] >
                      70,
                    oversold:
                      calculateRSI(stockData.prices)[calculateRSI(stockData.prices).length - 1] <
                      30,
                  }"
                >
                  {{
                    calculateRSI(stockData.prices)[
                      calculateRSI(stockData.prices).length - 1
                    ].toFixed(2)
                  }}
                </span>
              </div>
            </div>
          </div>

          <div class="trading-signals">
            <h4>交易信号</h4>
            <div
              class="signal-box"
              :class="{
                'buy-signal': isBuySignal(),
                'sell-signal': isSellSignal(),
                'neutral-signal': !isBuySignal() && !isSellSignal(),
              }"
            >
              <div class="signal-icon">
                <span v-if="isBuySignal()">⬆️</span>
                <span v-else-if="isSellSignal()">⬇️</span>
                <span v-else>↔️</span>
              </div>
              <div class="signal-text">
                <strong>{{ getSignalText() }}</strong>
                <p>{{ analysisResult }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stock-analysis {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-box {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.search-input-container {
  position: relative;
  flex: 1;
}

.search-input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  font-size: 16px;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background-color: #f5f5f5;
}

.search-result-item:last-child {
  border-bottom: none;
}

.stock-symbol {
  font-weight: bold;
  color: #333;
  margin-right: 10px;
}

.stock-name {
  flex: 1;
  color: #666;
}

.stock-market {
  color: #999;
  font-size: 0.9em;
}

.searching,
.no-results {
  padding: 12px 16px;
  color: #666;
  text-align: center;
}

.search-btn {
  padding: 12px 24px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.search-btn:hover {
  background-color: #3aa876;
}

.search-btn:disabled {
  background-color: #a8d5c3;
  cursor: not-allowed;
}

.chart-container {
  width: 100%;
  height: 500px;
  margin: 20px 0;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.stock-info {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-top: 20px;
}

.info-card {
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.info-item {
  margin: 10px 0;
  display: flex;
  justify-content: space-between;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  font-weight: bold;
  color: #333;
}

.analysis-result {
  padding: 20px;
  background-color: #f8f8f8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.analysis-result h3,
.analysis-result h4 {
  margin-top: 0;
  color: #42b983;
  border-bottom: 2px solid #42b983;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.analysis-result h4 {
  margin-top: 25px;
  font-size: 1.1rem;
}

.technical-indicators {
  margin-top: 20px;
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.indicator {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.indicator-name {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
}

.indicator-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
}

.overbought {
  color: #f44336;
}

.oversold {
  color: #4caf50;
}

.trading-signals {
  margin-top: 20px;
}

.signal-box {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.buy-signal {
  background-color: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.sell-signal {
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.neutral-signal {
  background-color: rgba(158, 158, 158, 0.1);
  border: 1px solid rgba(158, 158, 158, 0.3);
}

.signal-icon {
  font-size: 2rem;
  margin-right: 15px;
}

.signal-text {
  flex: 1;
}

.signal-text strong {
  display: block;
  margin-bottom: 5px;
  font-size: 1.1rem;
}

.signal-text p {
  margin: 0;
  color: #666;
}

.error-message {
  padding: 15px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #42b983;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .stock-info {
    grid-template-columns: 1fr;
  }

  .search-box {
    flex-direction: column;
  }

  .search-btn {
    width: 100%;
  }
}
</style>
