<template>
  <div class="doji-pattern-example">
    <div class="chart-container" ref="chartContainer"></div>
    <doji-pattern-detection
      v-if="chartInstance"
      :chart="chartInstance"
      :klines="klineData"
      :stock-id="stockId"
      :stock-name="stockName"
      :timeframe="timeframe"
      @pattern-selected="handlePatternSelected"
      @add-to-watchlist="handleAddToWatchlist"
    ></doji-pattern-detection>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import DojiPatternDetection from '../technical-analysis/DojiPatternDetection.vue'
import type { DojiPattern } from '../../types/technical-analysis/doji'
import type { KLineData } from '../../types/technical-analysis/kline'

export default defineComponent({
  name: 'DojiPatternExample',

  components: {
    DojiPatternDetection,
  },

  props: {
    stockId: {
      type: String,
      default: '000001',
    },
    stockName: {
      type: String,
      default: '上证指数',
    },
    timeframe: {
      type: String,
      default: '1d',
    },
  },

  setup(props) {
    // 图表容器引用
    const chartContainer = ref<HTMLElement | null>(null)

    // 图表实例
    const chartInstance = ref<echarts.ECharts | null>(null)

    // K线数据
    const klineData = ref<KLineData[]>([])

    // 模拟加载K线数据
    const loadKlineData = async () => {
      try {
        // 这里应该是从API获取数据，这里使用模拟数据
        const mockData = generateMockKlineData(100)
        klineData.value = mockData

        // 更新图表
        updateChart()
      } catch (error) {
        console.error('Failed to load kline data:', error)
      }
    }

    // 更新图表
    const updateChart = () => {
      if (!chartInstance.value || klineData.value.length === 0) {
        return
      }

      // 准备数据
      const dates = klineData.value.map((item) => new Date(item.timestamp))
      const data = klineData.value.map((item) => [item.open, item.close, item.low, item.high])

      // 设置图表选项
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%',
        },
        xAxis: {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          axisLabel: {
            formatter: function (value: any) {
              const date = new Date(value)
              return `${date.getMonth() + 1}/${date.getDate()}`
            },
          },
        },
        yAxis: {
          scale: true,
          splitArea: {
            show: true,
          },
        },
        dataZoom: [
          {
            type: 'inside',
            start: 50,
            end: 100,
          },
          {
            show: true,
            type: 'slider',
            bottom: '5%',
            start: 50,
            end: 100,
          },
        ],
        series: [
          {
            name: props.stockName,
            type: 'candlestick',
            data: data,
            itemStyle: {
              color: '#ef232a',
              color0: '#14b143',
              borderColor: '#ef232a',
              borderColor0: '#14b143',
            },
          },
        ],
      }

      // 设置图表选项
      chartInstance.value.setOption(option)
    }

    // 生成模拟K线数据
    const generateMockKlineData = (count: number): KLineData[] => {
      const data: KLineData[] = []
      let basePrice = 3000
      let baseVolume = 100000000

      const now = new Date()
      now.setHours(0, 0, 0, 0)

      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        // 随机价格波动
        const change = (Math.random() - 0.5) * 50
        const open = basePrice + Math.random() * 20 - 10
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 20
        const low = Math.min(open, close) - Math.random() * 20

        // 随机成交量
        const volume = baseVolume + Math.random() * baseVolume * 0.5

        // 更新基础价格
        basePrice = close

        // 创建一些十字星形态
        let finalOpen = open
        let finalClose = close
        let finalHigh = high
        let finalLow = low

        // 随机生成一些十字星形态
        if (Math.random() < 0.1) {
          // 标准十字星
          finalOpen = basePrice
          finalClose = basePrice + (Math.random() - 0.5) * 2 // 几乎相等
          finalHigh = basePrice + Math.random() * 30
          finalLow = basePrice - Math.random() * 30
        } else if (Math.random() < 0.05) {
          // 蜻蜓十字星
          finalOpen = basePrice
          finalClose = basePrice + (Math.random() - 0.5) * 2 // 几乎相等
          finalHigh = basePrice + Math.random() * 5 // 短上影线
          finalLow = basePrice - Math.random() * 40 // 长下影线
        } else if (Math.random() < 0.05) {
          // 墓碑十字星
          finalOpen = basePrice
          finalClose = basePrice + (Math.random() - 0.5) * 2 // 几乎相等
          finalHigh = basePrice + Math.random() * 40 // 长上影线
          finalLow = basePrice - Math.random() * 5 // 短下影线
        }

        data.push({
          timestamp: date.getTime(),
          open: finalOpen,
          high: finalHigh,
          low: finalLow,
          close: finalClose,
          volume: volume,
        })
      }

      return data
    }

    // 处理形态选中
    const handlePatternSelected = (pattern: DojiPattern) => {
      console.log('Pattern selected:', pattern)
    }

    // 处理添加到关注列表
    const handleAddToWatchlist = (pattern: DojiPattern) => {
      console.log('Add to watchlist:', pattern)
    }

    // 初始化图表
    const initChart = () => {
      if (chartContainer.value) {
        // 创建图表实例
        chartInstance.value = echarts.init(chartContainer.value)

        // 加载数据
        loadKlineData()

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize)
      }
    }

    // 处理窗口大小变化
    const handleResize = () => {
      chartInstance.value?.resize()
    }

    // 组件挂载时初始化图表
    onMounted(() => {
      initChart()
    })

    // 组件卸载时清理资源
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      chartInstance.value?.dispose()
    })

    return {
      chartContainer,
      chartInstance,
      klineData,
      handlePatternSelected,
      handleAddToWatchlist,
    }
  },
})
</script>

<style scoped>
.doji-pattern-example {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
