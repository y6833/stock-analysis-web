<template>
  <div class="doji-pattern-visualizer-demo">
    <div class="chart-container" ref="chartContainer"></div>
    <div class="controls">
      <div class="control-group">
        <el-select v-model="timeframe" placeholder="选择时间周期" @change="handleTimeframeChange">
          <el-option label="1分钟" value="1m" />
          <el-option label="5分钟" value="5m" />
          <el-option label="15分钟" value="15m" />
          <el-option label="30分钟" value="30m" />
          <el-option label="1小时" value="1h" />
          <el-option label="4小时" value="4h" />
          <el-option label="日线" value="1d" />
        </el-select>
      </div>
      <div class="control-group">
        <el-switch
          v-model="showMarkers"
          active-text="显示十字星标记"
          inactive-text="隐藏十字星标记"
          @change="toggleMarkers"
        />
      </div>
    </div>

    <!-- 形态详情弹窗 -->
    <el-dialog
      v-model="showPatternDetail"
      :title="selectedPatternName"
      width="500px"
      :close-on-click-modal="true"
      :show-close="true"
      destroy-on-close
    >
      <div v-if="selectedPattern" class="pattern-detail">
        <div class="pattern-info">
          <div
            class="pattern-header"
            :style="{ backgroundColor: getPatternColor(selectedPattern.type) }"
          >
            <div
              class="pattern-symbol"
              :style="{ backgroundColor: getPatternColor(selectedPattern.type) }"
            ></div>
            <div class="pattern-title">{{ getPatternName(selectedPattern.type) }}</div>
          </div>

          <div class="pattern-data">
            <div class="data-row">
              <div class="data-label">股票:</div>
              <div class="data-value">
                {{ selectedPattern.stockName }} ({{ selectedPattern.stockId }})
              </div>
            </div>
            <div class="data-row">
              <div class="data-label">日期:</div>
              <div class="data-value">{{ formatPatternDate(selectedPattern.timestamp) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">开盘价:</div>
              <div class="data-value">{{ selectedPattern.candle.open.toFixed(2) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">最高价:</div>
              <div class="data-value">{{ selectedPattern.candle.high.toFixed(2) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">最低价:</div>
              <div class="data-value">{{ selectedPattern.candle.low.toFixed(2) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">收盘价:</div>
              <div class="data-value">{{ selectedPattern.candle.close.toFixed(2) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">显著性:</div>
              <div class="data-value">
                <div class="significance-bar">
                  <div
                    class="significance-value"
                    :style="{
                      width: `${Math.round(selectedPattern.significance * 100)}%`,
                      backgroundColor: getPatternColor(selectedPattern.type),
                    }"
                  ></div>
                </div>
                <span>{{ Math.round(selectedPattern.significance * 100) }}%</span>
              </div>
            </div>
            <div class="data-row">
              <div class="data-label">趋势:</div>
              <div class="data-value">{{ getTrendText(selectedPattern.context.trend) }}</div>
            </div>
            <div class="data-row">
              <div class="data-label">成交量变化:</div>
              <div
                class="data-value"
                :class="{
                  positive: selectedPattern.context.volumeChange > 0,
                  negative: selectedPattern.context.volumeChange < 0,
                }"
              >
                {{ formatVolumeChange(selectedPattern.context.volumeChange) }}
              </div>
            </div>
          </div>

          <div class="pattern-description">
            <h4>形态说明</h4>
            <p>{{ getPatternDescription(selectedPattern.type) }}</p>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import {
  DojiPatternDetector,
  DojiPatternVisualizer,
} from '@/modules/technical-analysis/patterns/doji'
import { DojiPatternMarkerStyles } from '@/modules/technical-analysis/patterns/doji/DojiPatternMarkerStyles'
import type { KLineData } from '@/types/technical-analysis/kline'
import type { DojiPattern, DojiType } from '@/types/technical-analysis/doji'
import type { TrendType } from '@/types/technical-analysis/trend'
import { formatDate } from '@/utils/dateUtils'

// Props
const props = defineProps({
  klineData: {
    type: Array as () => KLineData[],
    required: true,
  },
  stockId: {
    type: String,
    required: true,
  },
  stockName: {
    type: String,
    required: true,
  },
  defaultTimeframe: {
    type: String,
    default: '1d',
  },
})

// 事件
const emit = defineEmits(['patternClick', 'patternHover'])

// 响应式数据
const chartContainer = ref<HTMLElement | null>(null)
const chart = ref<echarts.ECharts | null>(null)
const visualizer = ref<DojiPatternVisualizer | null>(null)
const dojiPatterns = ref<DojiPattern[]>([])
const showMarkers = ref(true)
const timeframe = ref(props.defaultTimeframe)
const showPatternDetail = ref(false)
const selectedPattern = ref<DojiPattern | null>(null)
const selectedPatternName = ref('')

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return

  // 创建 ECharts 实例
  chart.value = echarts.init(chartContainer.value)

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
      data: props.klineData.map((item) => new Date(item.timestamp).toLocaleDateString('zh-CN')),
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      splitNumber: 20,
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
        name: 'K线',
        type: 'candlestick',
        data: props.klineData.map((item) => [item.open, item.close, item.low, item.high]),
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143',
        },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 1,
        data: props.klineData.map((item) => item.volume),
      },
    ],
  }

  chart.value.setOption(option)

  // 初始化十字星可视化器
  visualizer.value = new DojiPatternVisualizer(chart.value, timeframe.value)

  // 检测十字星形态
  detectDojiPatterns()

  // 设置自定义事件监听
  setupCustomEventListeners()
}

// 设置自定义事件监听
const setupCustomEventListeners = () => {
  // 监听十字星形态点击事件
  document.addEventListener('doji-pattern-click', ((event: CustomEvent) => {
    const { pattern } = event.detail
    if (pattern) {
      selectedPattern.value = pattern
      selectedPatternName.value = getPatternName(pattern.type)
      showPatternDetail.value = true
      emit('patternClick', pattern)
    }
  }) as EventListener)

  // 监听十字星形态悬停事件
  document.addEventListener('doji-pattern-hover', ((event: CustomEvent) => {
    const { pattern } = event.detail
    if (pattern) {
      emit('patternHover', pattern)
    }
  }) as EventListener)
}

// 检测十字星形态
const detectDojiPatterns = async () => {
  const detector = new DojiPatternDetector()

  try {
    // 使用异步方法检测形态，并传入股票信息
    const patterns = await detector.detectPatterns(props.klineData, props.stockId, props.stockName)

    dojiPatterns.value = patterns

    // 更新可视化
    if (visualizer.value) {
      visualizer.value.setPatterns(patterns)
      if (showMarkers.value) {
        visualizer.value.showMarkers()
      } else {
        visualizer.value.hideMarkers()
      }
    }
  } catch (error) {
    console.error('检测十字星形态失败:', error)
  }
}

// 切换标记显示状态
const toggleMarkers = () => {
  if (visualizer.value) {
    if (showMarkers.value) {
      visualizer.value.showMarkers()
    } else {
      visualizer.value.hideMarkers()
    }
  }
}

// 处理时间周期变化
const handleTimeframeChange = () => {
  if (visualizer.value) {
    visualizer.value.setTimeframe(timeframe.value)
  }
}

// 获取形态颜色
const getPatternColor = (type: DojiType): string => {
  return DojiPatternMarkerStyles.getMarkerColor(type)
}

// 获取形态名称
const getPatternName = (type: DojiType): string => {
  return DojiPatternMarkerStyles.getPatternName(type)
}

// 获取趋势文本
const getTrendText = (trend: TrendType): string => {
  switch (trend) {
    case 'uptrend':
      return '上升趋势'
    case 'downtrend':
      return '下降趋势'
    case 'sideways':
      return '盘整趋势'
    default:
      return '未知趋势'
  }
}

// 格式化成交量变化
const formatVolumeChange = (change: number): string => {
  const percent = Math.round(change * 100)
  return percent > 0 ? `+${percent}%` : `${percent}%`
}

// 格式化日期
const formatPatternDate = (timestamp: number): string => {
  return formatDate(new Date(timestamp), 'yyyy-MM-dd HH:mm')
}

// 获取形态描述
const getPatternDescription = (type: DojiType): string => {
  switch (type) {
    case 'standard':
      return '标准十字星是一种K线形态，其开盘价和收盘价几乎相等，上下影线长度相近。这表明市场处于犹豫不决状态，买卖双方力量均衡，可能预示着当前趋势即将反转。'
    case 'dragonfly':
      return '蜻蜓十字星是一种特殊的十字星形态，其开盘价和收盘价接近当日最高价，有较长的下影线。这表明市场在低位受到强力支撑，买盘力量增强，通常在下跌趋势中出现是看涨信号。'
    case 'gravestone':
      return '墓碑十字星是一种特殊的十字星形态，其开盘价和收盘价接近当日最低价，有较长的上影线。这表明市场在高位遇到强力阻力，卖盘力量增强，通常在上升趋势中出现是看跌信号。'
    case 'longLegged':
      return '长腿十字星是一种特殊的十字星形态，其开盘价和收盘价接近，但上下影线都很长。这表明市场波动剧烈，买卖双方争夺激烈，通常预示着市场不稳定性增加，可能出现大幅波动。'
    default:
      return '十字星是一种重要的K线形态，其开盘价和收盘价几乎相同，形成一个十字形状。在技术分析中，十字星通常被视为市场犹豫或潜在反转的信号。'
  }
}

// 监听 K 线数据变化
watch(
  () => props.klineData,
  async () => {
    if (chart.value) {
      // 更新 X 轴数据
      chart.value.setOption({
        xAxis: {
          data: props.klineData.map((item) => new Date(item.timestamp).toLocaleDateString('zh-CN')),
        },
        series: [
          {
            data: props.klineData.map((item) => [item.open, item.close, item.low, item.high]),
          },
          {
            data: props.klineData.map((item) => item.volume),
          },
        ],
      })

      // 重新检测十字星形态 (异步)
      await detectDojiPatterns()
    }
  },
  { deep: true }
)

// 生命周期钩子
onMounted(() => {
  initChart()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('doji-pattern-click', (() => {}) as EventListener)
  document.removeEventListener('doji-pattern-hover', (() => {}) as EventListener)

  // 销毁图表实例
  if (chart.value) {
    chart.value.dispose()
  }

  // 销毁可视化器
  if (visualizer.value) {
    visualizer.value.dispose()
  }
})

// 处理窗口大小变化
const handleResize = () => {
  if (chart.value) {
    chart.value.resize()
  }
}

// 暴露方法
defineExpose({
  highlightPattern: (patternId: string) => {
    if (visualizer.value) {
      visualizer.value.highlightPattern(patternId)
    }
  },
  setTimeframe: (newTimeframe: string) => {
    timeframe.value = newTimeframe
    if (visualizer.value) {
      visualizer.value.setTimeframe(newTimeframe)
    }
  },
})
</script>

<style scoped>
.doji-pattern-visualizer-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-container {
  flex: 1;
  min-height: 400px;
}

.controls {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
}

.control-group {
  display: flex;
  align-items: center;
  margin-right: 15px;
}

.pattern-detail {
  padding: 0;
}

.pattern-info {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pattern-header {
  display: flex;
  align-items: center;
  padding: 12px;
  color: white;
}

.pattern-symbol {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 10px;
}

.pattern-title {
  font-size: 16px;
  font-weight: bold;
}

.pattern-data {
  padding: 15px;
  background-color: white;
}

.data-row {
  display: flex;
  margin-bottom: 8px;
}

.data-label {
  width: 100px;
  font-weight: bold;
  color: #606266;
}

.data-value {
  flex: 1;
}

.significance-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 5px;
  overflow: hidden;
}

.significance-value {
  height: 100%;
  border-radius: 4px;
}

.pattern-description {
  padding: 15px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

.pattern-description h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #303133;
}

.pattern-description p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.positive {
  color: #52c41a;
}

.negative {
  color: #f5222d;
}
</style>
