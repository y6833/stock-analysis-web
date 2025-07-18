<template>
  <el-dialog
    v-model="visible"
    :title="patternTitle"
    width="600px"
    :close-on-click-modal="false"
    :show-close="true"
    class="doji-pattern-detail-popup"
    @closed="handleClose"
  >
    <div class="pattern-detail-container">
      <!-- 形态基本信息 -->
      <div class="pattern-info-section">
        <div class="pattern-header" :style="{ borderColor: patternColor }">
          <div class="pattern-icon" :style="{ backgroundColor: patternColor }">
            <i class="el-icon-data-analysis"></i>
          </div>
          <div class="pattern-title-container">
            <h3>{{ patternName }}</h3>
            <div class="pattern-date">{{ formattedDate }}</div>
          </div>
        </div>

        <div class="pattern-description">
          <p>{{ patternDescription }}</p>
        </div>

        <!-- K线数据 -->
        <div class="candle-data">
          <div class="data-grid">
            <div class="data-item">
              <div class="data-label">开盘价</div>
              <div class="data-value">{{ formatPrice(pattern?.candle?.open) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">收盘价</div>
              <div class="data-value">{{ formatPrice(pattern?.candle?.close) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">最高价</div>
              <div class="data-value">{{ formatPrice(pattern?.candle?.high) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">最低价</div>
              <div class="data-value">{{ formatPrice(pattern?.candle?.low) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">成交量</div>
              <div class="data-value">{{ formatVolume(pattern?.candle?.volume) }}</div>
            </div>
            <div class="data-item">
              <div class="data-label">成交量变化</div>
              <div class="data-value" :class="volumeChangeClass">
                {{ formatPercentage(pattern?.context?.volumeChange) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" @click="handleAddToWatchlist"> 添加到关注列表 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, PropType } from 'vue'
import { formatDate } from '../../utils/dateUtils'
import { DojiPatternMarkerStyles } from '../../modules/technical-analysis/patterns/doji/DojiPatternMarkerStyles'
import type { DojiPattern } from '../../types/technical-analysis/doji'

export default defineComponent({
  name: 'DojiPatternDetailPopup',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    pattern: {
      type: Object as PropType<DojiPattern | null>,
      default: () => null,
    },
  },

  emits: ['update:modelValue', 'add-to-watchlist'],

  setup(props, { emit }) {
    const visible = ref(props.modelValue)

    // 计算属性
    const patternName = computed(() => {
      if (!props.pattern) return '十字星形态'
      return DojiPatternMarkerStyles.getPatternName(props.pattern.type)
    })

    const patternColor = computed(() => {
      if (!props.pattern) return '#1890ff'
      return DojiPatternMarkerStyles.getMarkerColor(props.pattern.type)
    })

    const patternTitle = computed(() => {
      return `${patternName.value} - ${props.pattern?.stockName || ''}(${
        props.pattern?.stockId || ''
      })`
    })

    const formattedDate = computed(() => {
      if (!props.pattern) return ''
      return formatDate(props.pattern.timestamp, 'yyyy-MM-dd')
    })

    const patternDescription = computed(() => {
      if (!props.pattern) return ''

      switch (props.pattern.type) {
        case 'standard':
          return '标准十字星形态表示市场处于犹豫不决的状态，买卖双方力量均衡。开盘价和收盘价几乎相等，上下影线长度适中。这通常是潜在反转信号，特别是在趋势末端出现时。'
        case 'dragonfly':
          return '蜻蜓十字星形态特点是开盘价和收盘价接近最高价，有较长下影线。这表明市场在低位受到支撑，卖方压力被买方吸收。在下跌趋势末端出现时，通常是看涨反转信号。'
        case 'gravestone':
          return '墓碑十字星形态特点是开盘价和收盘价接近最低价，有较长上影线。这表明市场在高位遇到阻力，买方力量被卖方压制。在上升趋势末端出现时，通常是看跌反转信号。'
        case 'longLegged':
          return '长腿十字星形态特点是开盘价和收盘价接近，但上下影线都很长。这表明市场波动剧烈，买卖双方争夺激烈但最终势均力敌。这通常表示市场不确定性增加，可能预示趋势变化。'
        default:
          return '十字星是一种重要的K线形态，其开盘价和收盘价几乎相同，形成一个十字形状。在技术分析中，十字星通常被视为市场犹豫或潜在反转的信号。'
      }
    })

    const volumeChangeClass = computed(() => {
      if (!props.pattern) return ''
      return props.pattern.context.volumeChange > 0 ? 'positive-change' : 'negative-change'
    })

    // 方法
    const formatPrice = (price?: number) => {
      if (price === undefined || price === null) return '-'
      return price.toFixed(2)
    }

    const formatVolume = (volume?: number) => {
      if (volume === undefined || volume === null) return '-'
      if (volume >= 100000000) {
        return (volume / 100000000).toFixed(2) + '亿'
      } else if (volume >= 10000) {
        return (volume / 10000).toFixed(2) + '万'
      } else {
        return volume.toString()
      }
    }

    const formatPercentage = (value?: number) => {
      if (value === undefined || value === null) return '-'
      const sign = value > 0 ? '+' : ''
      return `${sign}${(value * 100).toFixed(2)}%`
    }

    const handleClose = () => {
      // 关闭弹窗
    }

    const handleAddToWatchlist = () => {
      emit('add-to-watchlist', props.pattern)
      visible.value = false
    }

    // 监听属性变化
    watch(
      () => props.modelValue,
      (newVal) => {
        visible.value = newVal
      }
    )

    watch(
      () => visible.value,
      (newVal) => {
        emit('update:modelValue', newVal)
      }
    )

    return {
      visible,
      patternName,
      patternColor,
      patternTitle,
      formattedDate,
      patternDescription,
      volumeChangeClass,
      formatPrice,
      formatVolume,
      formatPercentage,
      handleClose,
      handleAddToWatchlist,
    }
  },
})
</script>

<style scoped>
.doji-pattern-detail-popup {
  --primary-color: v-bind(patternColor);
}

.pattern-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pattern-header {
  display: flex;
  align-items: center;
  padding-bottom: 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid var(--primary-color);
}

.pattern-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 20px;
}

.pattern-title-container h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #303133;
}

.pattern-date {
  font-size: 14px;
  color: #909399;
}

.pattern-description {
  margin-bottom: 20px;
  line-height: 1.6;
  color: #606266;
}

.candle-data {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.data-item {
  display: flex;
  flex-direction: column;
}

.data-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 5px;
}

.data-value {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.positive-change {
  color: #52c41a;
}

.negative-change {
  color: #f5222d;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
