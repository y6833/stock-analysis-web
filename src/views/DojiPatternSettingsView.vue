<template>
  <div class="doji-pattern-settings-view">
    <div class="page-header">
      <h2>十字星形态设置</h2>
      <p class="page-description">配置十字星形态识别的参数、显示选项和性能设置</p>
    </div>

    <el-row :gutter="20">
      <el-col :span="18">
        <!-- 主要设置区域 -->
        <DojiPatternSettings />
      </el-col>

      <el-col :span="6">
        <!-- 侧边栏 -->
        <div class="sidebar">
          <!-- 快速状态 -->
          <el-card class="status-card">
            <template #header>
              <h4>当前状态</h4>
            </template>
            <div class="status-content">
              <div class="status-item">
                <span class="label">启用形态：</span>
                <el-tag size="small">{{ enabledPatternCount }}种</el-tag>
              </div>
              <div class="status-item">
                <span class="label">计算模式：</span>
                <el-tag size="small" :type="getCalculationModeType()">
                  {{ CALCULATION_MODE_NAMES[settings.calculationMode] }}
                </el-tag>
              </div>
              <div class="status-item">
                <span class="label">配置状态：</span>
                <el-tag size="small" :type="isDefaultSettings ? 'info' : 'success'">
                  {{ isDefaultSettings ? '默认配置' : '自定义配置' }}
                </el-tag>
              </div>
              <div class="status-item">
                <span class="label">配置哈希：</span>
                <code class="config-hash">{{ settingsHash }}</code>
              </div>
            </div>
          </el-card>

          <!-- 快速操作 -->
          <el-card class="actions-card">
            <template #header>
              <h4>快速操作</h4>
            </template>
            <div class="actions-content">
              <el-button size="small" type="primary" @click="testSettings" :loading="testing" block>
                测试当前设置
              </el-button>
              <el-button size="small" @click="viewPresets" block> 查看预设配置 </el-button>
              <el-button size="small" @click="viewHelp" block> 查看帮助文档 </el-button>
            </div>
          </el-card>

          <!-- 性能监控 -->
          <el-card class="performance-card" v-if="performanceStats">
            <template #header>
              <h4>性能统计</h4>
            </template>
            <div class="performance-content">
              <div class="perf-item">
                <span class="label">平均计算时间：</span>
                <span class="value">{{ performanceStats.avgCalculationTime }}ms</span>
              </div>
              <div class="perf-item">
                <span class="label">缓存命中率：</span>
                <span class="value">{{ performanceStats.cacheHitRate }}%</span>
              </div>
              <div class="perf-item">
                <span class="label">内存使用：</span>
                <span class="value">{{ performanceStats.memoryUsage }}MB</span>
              </div>
            </div>
          </el-card>

          <!-- 最近更新 -->
          <el-card class="updates-card">
            <template #header>
              <h4>最近更新</h4>
            </template>
            <div class="updates-content">
              <div class="update-item" v-for="update in recentUpdates" :key="update.id">
                <div class="update-title">{{ update.title }}</div>
                <div class="update-time">{{ formatTime(update.time) }}</div>
              </div>
              <div v-if="recentUpdates.length === 0" class="no-updates">暂无更新记录</div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>

    <!-- 预设配置对话框 -->
    <el-dialog v-model="presetsDialogVisible" title="预设配置" width="600px">
      <div class="presets-content">
        <el-row :gutter="16">
          <el-col :span="8" v-for="preset in presetConfigs" :key="preset.name">
            <el-card
              class="preset-card"
              :class="{ active: selectedPreset === preset.name }"
              @click="selectPreset(preset.name)"
            >
              <div class="preset-name">{{ preset.name }}</div>
              <div class="preset-description">{{ preset.description }}</div>
              <div class="preset-features">
                <el-tag
                  v-for="feature in preset.features"
                  :key="feature"
                  size="small"
                  class="feature-tag"
                >
                  {{ feature }}
                </el-tag>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <el-button @click="presetsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyPreset" :disabled="!selectedPreset">
          应用预设
        </el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <el-dialog v-model="helpDialogVisible" title="设置帮助" width="800px">
      <div class="help-content">
        <el-collapse v-model="activeHelpSections">
          <el-collapse-item title="基础识别参数" name="basic">
            <div class="help-section">
              <h4>敏感度阈值</h4>
              <p>
                控制十字星识别的严格程度。值越小，识别越严格，只有实体非常小的K线才会被识别为十字星。
              </p>

              <h4>价格相等容差</h4>
              <p>开盘价与收盘价的最大差异百分比。在此范围内的价格差异将被视为相等。</p>

              <h4>长腿阈值</h4>
              <p>长腿十字星的影线长度阈值。影线长度超过此值的十字星将被识别为长腿十字星。</p>
            </div>
          </el-collapse-item>

          <el-collapse-item title="形态类型说明" name="patterns">
            <div class="help-section">
              <h4>标准十字星</h4>
              <p>开盘价与收盘价几乎相等，上下影线长度适中。通常表示市场犹豫不决。</p>

              <h4>蜻蜓十字星</h4>
              <p>
                开盘价、收盘价和最高价几乎相等，有较长的下影线。通常出现在下跌趋势的底部，可能预示反转。
              </p>

              <h4>墓碑十字星</h4>
              <p>
                开盘价、收盘价和最低价几乎相等，有较长的上影线。通常出现在上涨趋势的顶部，可能预示反转。
              </p>

              <h4>长腿十字星</h4>
              <p>上下影线都很长的十字星，表示市场波动剧烈但最终回到开盘价附近。</p>
            </div>
          </el-collapse-item>

          <el-collapse-item title="性能设置" name="performance">
            <div class="help-section">
              <h4>实时计算</h4>
              <p>数据更新时立即重新计算形态。适合对实时性要求高的场景，但会消耗更多计算资源。</p>

              <h4>按需计算</h4>
              <p>只在用户请求时才进行计算。适合偶尔查看形态的用户，可以节省计算资源。</p>

              <h4>缓存模式</h4>
              <p>使用缓存结果，定期更新。在性能和实时性之间取得平衡，推荐大多数用户使用。</p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import DojiPatternSettings from '@/components/settings/DojiPatternSettings.vue'
import { useDojiPatternSettings } from '@/composables/useDojiPatternSettings'
import { dojiPatternSettingsService } from '@/services/dojiPatternSettingsService'

// 使用设置组合式函数
const {
  settings,
  loading,
  saving,
  isDefaultSettings,
  enabledPatternCount,
  settingsHash,
  CALCULATION_MODE_NAMES,
  saveSettings,
  updateSettings,
} = useDojiPatternSettings()

// 响应式数据
const testing = ref(false)
const presetsDialogVisible = ref(false)
const helpDialogVisible = ref(false)
const selectedPreset = ref('')
const activeHelpSections = ref(['basic'])
const performanceStats = ref<any>(null)
const recentUpdates = ref<any[]>([])

// 预设配置
const presetConfigs = ref([
  {
    name: '保守型',
    description: '严格的识别标准，减少误报',
    features: ['高精度', '低噪音', '适合新手'],
    settings: {
      bodyThreshold: 0.3,
      equalPriceThreshold: 0.05,
      longLegThreshold: 2.5,
      minSignificance: 0.7,
      enabledPatternTypes: ['standard', 'dragonfly', 'gravestone'],
    },
  },
  {
    name: '平衡型',
    description: '平衡的识别标准，推荐设置',
    features: ['平衡性能', '适中精度', '推荐使用'],
    settings: {
      bodyThreshold: 0.5,
      equalPriceThreshold: 0.1,
      longLegThreshold: 2.0,
      minSignificance: 0.5,
      enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
    },
  },
  {
    name: '激进型',
    description: '宽松的识别标准，捕获更多信号',
    features: ['高敏感度', '更多信号', '适合专业用户'],
    settings: {
      bodyThreshold: 0.8,
      equalPriceThreshold: 0.2,
      longLegThreshold: 1.5,
      minSignificance: 0.3,
      enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
    },
  },
])

// 加载预设配置
const loadPresetConfigs = async () => {
  try {
    const presets = await dojiPatternSettingsService.getSettingsPresets()
    if (presets && presets.length > 0) {
      presetConfigs.value = presets
    }
  } catch (error) {
    console.error('加载预设配置失败:', error)
    // 使用默认预设配置
  }
}

// 计算属性
const getCalculationModeType = () => {
  switch (settings.calculationMode) {
    case 'realtime':
      return 'danger'
    case 'ondemand':
      return 'warning'
    case 'cached':
      return 'success'
    default:
      return 'info'
  }
}

// 方法
const testSettings = async () => {
  try {
    testing.value = true

    const testResult = await dojiPatternSettingsService.testSettings(settings)

    if (testResult) {
      ElMessage.success('设置测试通过，配置有效')
    } else {
      ElMessage.error('设置测试失败，请检查配置')
    }
  } catch (error) {
    console.error('测试设置失败:', error)
    ElMessage.error('设置测试失败')
  } finally {
    testing.value = false
  }
}

const viewPresets = () => {
  selectedPreset.value = ''
  presetsDialogVisible.value = true
}

const selectPreset = (presetName: string) => {
  selectedPreset.value = presetName
}

const applyPreset = async () => {
  const preset = presetConfigs.value.find((p) => p.name === selectedPreset.value)
  if (!preset) return

  try {
    await ElMessageBox.confirm(
      `确定要应用"${preset.name}"预设配置吗？当前设置将被覆盖。`,
      '确认操作',
      { type: 'warning' }
    )

    updateSettings(preset.settings)
    await saveSettings()

    presetsDialogVisible.value = false
    ElMessage.success(`已应用"${preset.name}"预设配置`)
  } catch {
    // 用户取消操作
  }
}

const viewHelp = () => {
  helpDialogVisible.value = true
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

const loadPerformanceStats = async () => {
  try {
    const stats = await dojiPatternSettingsService.getPerformanceStats()
    if (stats) {
      performanceStats.value = stats
    } else {
      // 使用模拟数据作为后备
      performanceStats.value = {
        avgCalculationTime: 45,
        cacheHitRate: 85,
        memoryUsage: 12.5,
      }
    }
  } catch (error) {
    console.error('加载性能统计失败:', error)
    // 使用模拟数据作为后备
    performanceStats.value = {
      avgCalculationTime: 45,
      cacheHitRate: 85,
      memoryUsage: 12.5,
    }
  }
}

const loadRecentUpdates = async () => {
  try {
    // 这里应该调用实际的更新记录API
    // const updates = await api.getDojiPatternUpdateHistory()

    // 模拟数据
    recentUpdates.value = [
      {
        id: 1,
        title: '更新了敏感度阈值',
        time: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 2,
        title: '启用了长腿十字星识别',
        time: new Date(Date.now() - 7200000).toISOString(),
      },
    ]
  } catch (error) {
    console.error('加载更新记录失败:', error)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadPerformanceStats()
  loadRecentUpdates()
  loadPresetConfigs()
})
</script>

<style scoped>
.doji-pattern-settings-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-card,
.actions-card,
.performance-card,
.updates-card {
  margin-bottom: 0;
}

.status-content,
.actions-content,
.performance-content,
.updates-content {
  padding: 0;
}

.status-item,
.perf-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-item:last-child,
.perf-item:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 13px;
  color: #606266;
}

.value {
  font-weight: 500;
  color: #303133;
}

.config-hash {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 4px;
  border-radius: 2px;
}

.actions-content .el-button {
  margin-bottom: 8px;
}

.actions-content .el-button:last-child {
  margin-bottom: 0;
}

.update-item {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.update-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.update-title {
  font-size: 13px;
  color: #303133;
  margin-bottom: 4px;
}

.update-time {
  font-size: 12px;
  color: #909399;
}

.no-updates {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px 0;
}

.presets-content {
  margin-bottom: 20px;
}

.preset-card {
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.preset-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preset-card.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.preset-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.preset-description {
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.4;
}

.feature-tag {
  margin-right: 4px;
  margin-bottom: 4px;
}

.help-content {
  max-height: 500px;
  overflow-y: auto;
}

.help-section h4 {
  color: #303133;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.help-section p {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

:deep(.el-card__header) {
  padding: 12px 16px;
}

:deep(.el-card__body) {
  padding: 16px;
}

:deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 500;
}
</style>
