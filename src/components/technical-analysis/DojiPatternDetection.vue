<template>
  <div class="doji-pattern-detection">
    <!-- 工具栏 -->
    <div class="doji-toolbar">
      <el-tooltip content="十字星形态设置" placement="bottom">
        <el-button type="primary" circle size="small" @click="showConfig = !showConfig">
          <i class="el-icon-setting"></i>
        </el-button>
      </el-tooltip>

      <el-tooltip :content="showPatterns ? '隐藏十字星标记' : '显示十字星标记'" placement="bottom">
        <el-button
          :type="showPatterns ? 'success' : 'info'"
          circle
          size="small"
          @click="togglePatterns"
        >
          <i :class="showPatterns ? 'el-icon-view' : 'el-icon-hide'"></i>
        </el-button>
      </el-tooltip>
    </div>

    <!-- 配置面板 -->
    <el-drawer
      v-model="showConfig"
      title="十字星形态设置"
      direction="rtl"
      size="350px"
      :with-header="true"
      :destroy-on-close="false"
    >
      <doji-pattern-config
        :initial-config="config"
        @config-change="handleConfigChange"
        @filter-change="handleFilterChange"
      ></doji-pattern-config>
    </el-drawer>

    <!-- 形态详情弹窗 -->
    <doji-pattern-detail-popup
      v-model="detailPopupVisible"
      :pattern="selectedPattern"
      @add-to-watchlist="handleAddToWatchlist"
    ></doji-pattern-detail-popup>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType, watch } from 'vue'
import DojiPatternConfig from './DojiPatternConfig.vue'
import DojiPatternDetailPopup from './DojiPatternDetailPopup.vue'
import { useDojiPatternDetection } from '../../composables/useDojiPatternDetection'
import { formatDate } from '../../utils/dateUtils'
import type { DojiPattern, DojiConfig } from '../../types/technical-analysis/doji'
import type { KLineData } from '../../types/technical-analysis/kline'

export default defineComponent({
  name: 'DojiPatternDetection',

  components: {
    DojiPatternConfig,
    DojiPatternDetailPopup,
  },

  props: {
    chart: {
      type: Object,
      required: true,
    },
    klines: {
      type: Array as PropType<KLineData[]>,
      default: () => [],
    },
    stockId: {
      type: String,
      default: '',
    },
    stockName: {
      type: String,
      default: '',
    },
    timeframe: {
      type: String,
      default: '1d',
    },
    initialConfig: {
      type: Object as PropType<Partial<DojiConfig>>,
      default: () => ({}),
    },
  },

  emits: ['pattern-selected', 'patterns-detected', 'add-to-watchlist'],

  setup(props, { emit }) {
    // 使用十字星形态检测组合式函数
    const {
      patterns,
      selectedPattern,
      showPatterns,
      detailPopupVisible,
      isInitialized,
      initialize,
      analyzeKLines,
      togglePatterns,
      setTimeframe,
      updateConfig,
      getConfig,
      selectPattern,
    } = useDojiPatternDetection(props.initialConfig)

    // 配置面板显示状态
    const showConfig = ref(false)

    // 当前配置
    const config = ref<DojiConfig>(getConfig())

    // 启用的形态类型过滤器
    const enabledPatternTypes = ref<string[]>(['standard', 'dragonfly', 'gravestone', 'longLegged'])

    // 过滤后的形态列表
    const filteredPatterns = computed(() => {
      return patterns.value.filter((pattern) => enabledPatternTypes.value.includes(pattern.type))
    })

    // 监听K线数据变化
    watch(
      () => props.klines,
      (newKlines) => {
        if (newKlines && newKlines.length > 0 && isInitialized.value) {
          const detectedPatterns = analyzeKLines(newKlines, props.stockId, props.stockName)
          emit('patterns-detected', detectedPatterns)
        }
      },
      { deep: true }
    )

    // 监听时间周期变化
    watch(
      () => props.timeframe,
      (newTimeframe) => {
        if (isInitialized.value) {
          setTimeframe(newTimeframe)
        }
      }
    )

    // 初始化
    initialize(props.chart, props.timeframe)

    // 如果有初始K线数据，立即分析
    if (props.klines && props.klines.length > 0) {
      const detectedPatterns = analyzeKLines(props.klines, props.stockId, props.stockName)
      emit('patterns-detected', detectedPatterns)
    }

    // 处理配置变更
    const handleConfigChange = (newConfig: DojiConfig) => {
      config.value = newConfig
      updateConfig(newConfig)

      // 重新分析K线数据
      if (props.klines && props.klines.length > 0) {
        const detectedPatterns = analyzeKLines(props.klines, props.stockId, props.stockName)
        emit('patterns-detected', detectedPatterns)
      }
    }

    // 处理形态过滤器变更
    const handleFilterChange = (types: string[]) => {
      enabledPatternTypes.value = types
    }

    // 处理添加到关注列表
    const handleAddToWatchlist = (pattern: DojiPattern) => {
      emit('add-to-watchlist', pattern)
    }

    return {
      // 状态
      patterns,
      filteredPatterns,
      selectedPattern,
      showPatterns,
      detailPopupVisible,
      showConfig,
      config,

      // 方法
      togglePatterns,
      handleConfigChange,
      handleFilterChange,
      handleAddToWatchlist,
      formatDate,
    }
  },
})
</script>

<style scoped>
.doji-pattern-detection {
  position: relative;
}

.doji-toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}
</style>
