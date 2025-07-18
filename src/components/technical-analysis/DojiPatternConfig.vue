<template>
  <div class="doji-pattern-config">
    <el-form :model="config" label-position="top" size="small">
      <el-form-item label="开盘收盘价相等容差 (%)">
        <el-slider
          v-model="config.equalPriceThreshold"
          :min="0"
          :max="1"
          :step="0.01"
          :format-tooltip="formatPercentage"
          show-input
        ></el-slider>
        <div class="setting-description">开盘价与收盘价被视为相等的最大差异百分比</div>
      </el-form-item>

      <el-form-item label="实体与影线比例阈值">
        <el-slider
          v-model="config.bodyThreshold"
          :min="0"
          :max="0.5"
          :step="0.01"
          :format-tooltip="formatDecimal"
          show-input
        ></el-slider>
        <div class="setting-description">
          实体大小与影线长度的比例阈值，较小的值会识别出更多的十字星
        </div>
      </el-form-item>

      <el-form-item label="长腿十字星影线阈值">
        <el-slider
          v-model="config.longLegThreshold"
          :min="1"
          :max="5"
          :step="0.1"
          :format-tooltip="formatDecimal"
          show-input
        ></el-slider>
        <div class="setting-description">长腿十字星的影线长度与实体大小的比例阈值</div>
      </el-form-item>
    </el-form>

    <div class="pattern-type-filters">
      <div class="filter-title">形态类型过滤:</div>
      <el-checkbox-group v-model="enabledPatternTypes" @change="updatePatternFilters">
        <el-checkbox label="standard">标准十字星</el-checkbox>
        <el-checkbox label="dragonfly">蜻蜓十字星</el-checkbox>
        <el-checkbox label="gravestone">墓碑十字星</el-checkbox>
        <el-checkbox label="longLegged">长腿十字星</el-checkbox>
      </el-checkbox-group>
    </div>

    <div class="config-actions">
      <el-button type="primary" size="small" @click="applyConfig">应用设置</el-button>
      <el-button size="small" @click="resetConfig">重置默认</el-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, PropType } from 'vue'
import type { DojiConfig } from '../../types/technical-analysis/doji'

export default defineComponent({
  name: 'DojiPatternConfig',

  props: {
    initialConfig: {
      type: Object as PropType<Partial<DojiConfig>>,
      default: () => ({}),
    },
  },

  emits: ['config-change', 'filter-change'],

  setup(props, { emit }) {
    // 默认配置
    const defaultConfig: DojiConfig = {
      bodyThreshold: 0.1,
      equalPriceThreshold: 0.1,
      longLegThreshold: 2.0,
    }

    // 合并初始配置
    const config = reactive<DojiConfig>({
      ...defaultConfig,
      ...props.initialConfig,
    })

    // 启用的形态类型
    const enabledPatternTypes = ref(['standard', 'dragonfly', 'gravestone', 'longLegged'])

    // 监听配置变化
    watch(
      () => props.initialConfig,
      (newConfig) => {
        if (newConfig) {
          Object.assign(config, {
            ...defaultConfig,
            ...newConfig,
          })
        }
      },
      { deep: true }
    )

    // 格式化百分比
    const formatPercentage = (val: number) => {
      return `${(val * 100).toFixed(1)}%`
    }

    // 格式化小数
    const formatDecimal = (val: number) => {
      return val.toFixed(2)
    }

    // 应用配置
    const applyConfig = () => {
      emit('config-change', { ...config })
    }

    // 重置配置
    const resetConfig = () => {
      Object.assign(config, defaultConfig)
      emit('config-change', { ...config })
    }

    // 更新形态过滤器
    const updatePatternFilters = (types: string[]) => {
      emit('filter-change', types)
    }

    return {
      config,
      enabledPatternTypes,
      formatPercentage,
      formatDecimal,
      applyConfig,
      resetConfig,
      updatePatternFilters,
    }
  },
})
</script>

<style scoped>
.doji-pattern-config {
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
}

.setting-description {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.pattern-type-filters {
  margin-top: 20px;
  margin-bottom: 20px;
}

.filter-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  gap: 10px;
}
</style>
<template>
  <div class="doji-pattern-config">
    <el-collapse v-model="activeNames">
      <el-collapse-item title="十字星形态设置" name="settings">
        <div class="config-form">
          <el-form :model="config" label-position="top" size="small">
            <el-form-item label="开盘收盘价相等容差 (%)">
              <el-slider
                v-model="config.equalPriceThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                :format-tooltip="formatPercentage"
                show-input
              ></el-slider>
              <div class="setting-description">开盘价与收盘价被视为相等的最大差异百分比</div>
            </el-form-item>

            <el-form-item label="实体与影线比例阈值">
              <el-slider
                v-model="config.bodyThreshold"
                :min="0"
                :max="0.5"
                :step="0.01"
                :format-tooltip="formatDecimal"
                show-input
              ></el-slider>
              <div class="setting-description">
                实体大小与影线长度的比例阈值，较小的值会识别出更多的十字星
              </div>
            </el-form-item>

            <el-form-item label="长腿十字星影线阈值">
              <el-slider
                v-model="config.longLegThreshold"
                :min="1"
                :max="5"
                :step="0.1"
                :format-tooltip="formatDecimal"
                show-input
              ></el-slider>
              <div class="setting-description">长腿十字星的影线长度与实体大小的比例阈值</div>
            </el-form-item>
          </el-form>

          <div class="config-actions">
            <el-button type="primary" size="small" @click="applyConfig">应用设置</el-button>
            <el-button size="small" @click="resetConfig">重置默认</el-button>
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="显示设置" name="display">
        <div class="display-settings">
          <el-switch
            v-model="showPatterns"
            active-text="显示十字星标记"
            inactive-text="隐藏十字星标记"
            @change="togglePatterns"
          ></el-switch>

          <div class="pattern-type-filters">
            <div class="filter-title">形态类型过滤:</div>
            <el-checkbox-group v-model="enabledPatternTypes" @change="updatePatternFilters">
              <el-checkbox label="standard">标准十字星</el-checkbox>
              <el-checkbox label="dragonfly">蜻蜓十字星</el-checkbox>
              <el-checkbox label="gravestone">墓碑十字星</el-checkbox>
              <el-checkbox label="longLegged">长腿十字星</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, PropType } from 'vue'
import type { DojiConfig } from '../../types/technical-analysis/doji'

export default defineComponent({
  name: 'DojiPatternConfig',

  props: {
    initialConfig: {
      type: Object as PropType<Partial<DojiConfig>>,
      default: () => ({}),
    },
  },

  emits: ['config-change', 'toggle-patterns', 'filter-change'],

  setup(props, { emit }) {
    // 默认配置
    const defaultConfig: DojiConfig = {
      bodyThreshold: 0.1,
      equalPriceThreshold: 0.1,
      longLegThreshold: 2.0,
    }

    // 合并初始配置
    const config = reactive<DojiConfig>({
      ...defaultConfig,
      ...props.initialConfig,
    })

    // 折叠面板激活项
    const activeNames = ref(['settings'])

    // 显示十字星标记
    const showPatterns = ref(true)

    // 启用的形态类型
    const enabledPatternTypes = ref(['standard', 'dragonfly', 'gravestone', 'longLegged'])

    // 监听配置变化
    watch(
      () => props.initialConfig,
      (newConfig) => {
        if (newConfig) {
          Object.assign(config, {
            ...defaultConfig,
            ...newConfig,
          })
        }
      },
      { deep: true }
    )

    // 格式化百分比
    const formatPercentage = (val: number) => {
      return `${(val * 100).toFixed(1)}%`
    }

    // 格式化小数
    const formatDecimal = (val: number) => {
      return val.toFixed(2)
    }

    // 应用配置
    const applyConfig = () => {
      emit('config-change', { ...config })
    }

    // 重置配置
    const resetConfig = () => {
      Object.assign(config, defaultConfig)
      emit('config-change', { ...config })
    }

    // 切换十字星标记显示
    const togglePatterns = (show: boolean) => {
      emit('toggle-patterns', show)
    }

    // 更新形态过滤器
    const updatePatternFilters = (types: string[]) => {
      emit('filter-change', types)
    }

    return {
      config,
      activeNames,
      showPatterns,
      enabledPatternTypes,
      formatPercentage,
      formatDecimal,
      applyConfig,
      resetConfig,
      togglePatterns,
      updatePatternFilters,
    }
  },
})
</script>

<style scoped>
.doji-pattern-config {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Open Sans', 'Helvetica Neue', sans-serif;
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.config-form {
  padding: 10px 0;
}

.setting-description {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
  gap: 10px;
}

.display-settings {
  padding: 10px 0;
}

.pattern-type-filters {
  margin-top: 15px;
}

.filter-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
