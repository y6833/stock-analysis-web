<template>
  <div class="doji-pattern-settings">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <h3>十字星形态识别设置</h3>
          <p class="description">配置十字星形态识别的参数和偏好设置</p>
        </div>
      </template>

      <el-form
        ref="settingsFormRef"
        :model="settings"
        :rules="rules"
        label-width="140px"
        @submit.prevent="saveSettings"
      >
        <!-- 基础识别参数 -->
        <el-divider content-position="left">基础识别参数</el-divider>

        <el-form-item label="敏感度阈值" prop="bodyThreshold">
          <el-slider
            v-model="settings.bodyThreshold"
            :min="0.1"
            :max="2.0"
            :step="0.1"
            :format-tooltip="formatPercentage"
            show-input
            :input-size="'small'"
          />
          <div class="help-text">实体与影线的比例阈值，值越小识别越严格（默认：0.5%）</div>
        </el-form-item>

        <el-form-item label="价格相等容差" prop="equalPriceThreshold">
          <el-slider
            v-model="settings.equalPriceThreshold"
            :min="0.01"
            :max="1.0"
            :step="0.01"
            :format-tooltip="formatPercentage"
            show-input
            :input-size="'small'"
          />
          <div class="help-text">开盘价与收盘价相等的容差范围（默认：0.1%）</div>
        </el-form-item>

        <el-form-item label="长腿阈值" prop="longLegThreshold">
          <el-slider
            v-model="settings.longLegThreshold"
            :min="1.0"
            :max="5.0"
            :step="0.1"
            :format-tooltip="formatPercentage"
            show-input
            :input-size="'small'"
          />
          <div class="help-text">长腿十字星的影线长度阈值（默认：2.0%）</div>
        </el-form-item>

        <!-- 形态类型选择 -->
        <el-divider content-position="left">启用的形态类型</el-divider>

        <el-form-item label="形态类型" prop="enabledPatternTypes">
          <el-checkbox-group v-model="settings.enabledPatternTypes">
            <el-checkbox label="standard">
              <div class="pattern-option">
                <strong>标准十字星</strong>
                <div class="pattern-description">开盘价与收盘价几乎相等</div>
              </div>
            </el-checkbox>
            <el-checkbox label="dragonfly">
              <div class="pattern-option">
                <strong>蜻蜓十字星</strong>
                <div class="pattern-description">开盘价=收盘价=最高价，有长下影线</div>
              </div>
            </el-checkbox>
            <el-checkbox label="gravestone">
              <div class="pattern-option">
                <strong>墓碑十字星</strong>
                <div class="pattern-description">开盘价=收盘价=最低价，有长上影线</div>
              </div>
            </el-checkbox>
            <el-checkbox label="longLegged">
              <div class="pattern-option">
                <strong>长腿十字星</strong>
                <div class="pattern-description">上下影线都较长的十字星</div>
              </div>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 显示设置 -->
        <el-divider content-position="left">显示设置</el-divider>

        <el-form-item label="最小显著性" prop="minSignificance">
          <el-slider
            v-model="settings.minSignificance"
            :min="0.1"
            :max="1.0"
            :step="0.1"
            :format-tooltip="formatSignificance"
            show-input
            :input-size="'small'"
          />
          <div class="help-text">只显示显著性高于此值的形态（默认：0.5）</div>
        </el-form-item>

        <el-form-item label="标记样式">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="标记大小" prop="markerSize">
                <el-select v-model="settings.markerSize" placeholder="选择标记大小">
                  <el-option label="小" value="small" />
                  <el-option label="中" value="medium" />
                  <el-option label="大" value="large" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="标记透明度" prop="markerOpacity">
                <el-slider
                  v-model="settings.markerOpacity"
                  :min="0.3"
                  :max="1.0"
                  :step="0.1"
                  :format-tooltip="formatOpacity"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item label="显示选项">
          <el-checkbox-group v-model="settings.displayOptions">
            <el-checkbox label="showTooltip">显示悬停提示</el-checkbox>
            <el-checkbox label="showSignificance">显示显著性评分</el-checkbox>
            <el-checkbox label="showPriceMovement">显示后续价格走势</el-checkbox>
            <el-checkbox label="autoHideWeak">自动隐藏弱信号</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 性能设置 -->
        <el-divider content-position="left">性能设置</el-divider>

        <el-form-item label="计算模式">
          <el-radio-group v-model="settings.calculationMode">
            <el-radio label="realtime">
              <div class="option-content">
                <strong>实时计算</strong>
                <div class="option-description">数据更新时立即重新计算</div>
              </div>
            </el-radio>
            <el-radio label="ondemand">
              <div class="option-content">
                <strong>按需计算</strong>
                <div class="option-description">用户请求时才计算</div>
              </div>
            </el-radio>
            <el-radio label="cached">
              <div class="option-content">
                <strong>缓存模式</strong>
                <div class="option-description">使用缓存结果，定期更新</div>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          label="缓存时长"
          prop="cacheTimeout"
          v-if="settings.calculationMode === 'cached'"
        >
          <el-input-number
            v-model="settings.cacheTimeout"
            :min="60"
            :max="3600"
            :step="60"
            controls-position="right"
          />
          <span class="unit">秒</span>
          <div class="help-text">缓存结果的有效时长（默认：300秒）</div>
        </el-form-item>

        <el-form-item label="最大计算数量" prop="maxCalculationCount">
          <el-input-number
            v-model="settings.maxCalculationCount"
            :min="100"
            :max="10000"
            :step="100"
            controls-position="right"
          />
          <span class="unit">条</span>
          <div class="help-text">单次计算的最大K线数量（默认：1000条）</div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving"> 保存设置 </el-button>
          <el-button @click="resetToDefaults"> 恢复默认 </el-button>
          <el-button @click="exportSettings"> 导出配置 </el-button>
          <el-button @click="importSettings"> 导入配置 </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预览区域 -->
    <el-card class="preview-card" v-if="showPreview">
      <template #header>
        <h3>设置预览</h3>
      </template>
      <div class="preview-content">
        <div class="preview-item">
          <span class="label">当前配置：</span>
          <el-tag v-for="type in settings.enabledPatternTypes" :key="type" class="pattern-tag">
            {{ getPatternTypeName(type) }}
          </el-tag>
        </div>
        <div class="preview-item">
          <span class="label">敏感度：</span>
          <el-progress :percentage="settings.bodyThreshold * 50" :show-text="false" />
          <span class="value">{{ settings.bodyThreshold }}%</span>
        </div>
        <div class="preview-item">
          <span class="label">最小显著性：</span>
          <el-progress :percentage="settings.minSignificance * 100" :show-text="false" />
          <span class="value">{{ settings.minSignificance }}</span>
        </div>
      </div>
    </el-card>

    <!-- 导入配置对话框 -->
    <el-dialog v-model="importDialogVisible" title="导入配置" width="500px">
      <el-input
        v-model="importConfigText"
        type="textarea"
        :rows="10"
        placeholder="请粘贴配置JSON..."
      />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

// 接口定义
interface DojiPatternSettings {
  // 基础识别参数
  bodyThreshold: number
  equalPriceThreshold: number
  longLegThreshold: number

  // 形态类型
  enabledPatternTypes: string[]

  // 显示设置
  minSignificance: number
  markerSize: string
  markerOpacity: number
  displayOptions: string[]

  // 性能设置
  calculationMode: string
  cacheTimeout: number
  maxCalculationCount: number
}

// 响应式数据
const settingsFormRef = ref<FormInstance>()
const saving = ref(false)
const showPreview = ref(true)
const importDialogVisible = ref(false)
const importConfigText = ref('')

// 默认设置
const defaultSettings: DojiPatternSettings = {
  bodyThreshold: 0.5,
  equalPriceThreshold: 0.1,
  longLegThreshold: 2.0,
  enabledPatternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
  minSignificance: 0.5,
  markerSize: 'medium',
  markerOpacity: 0.8,
  displayOptions: ['showTooltip', 'showSignificance', 'showPriceMovement'],
  calculationMode: 'cached',
  cacheTimeout: 300,
  maxCalculationCount: 1000,
}

// 当前设置
const settings = reactive<DojiPatternSettings>({ ...defaultSettings })

// 表单验证规则
const rules: FormRules = {
  bodyThreshold: [
    { required: true, message: '请设置敏感度阈值', trigger: 'blur' },
    { type: 'number', min: 0.1, max: 2.0, message: '阈值必须在0.1-2.0之间', trigger: 'blur' },
  ],
  equalPriceThreshold: [
    { required: true, message: '请设置价格相等容差', trigger: 'blur' },
    { type: 'number', min: 0.01, max: 1.0, message: '容差必须在0.01-1.0之间', trigger: 'blur' },
  ],
  longLegThreshold: [
    { required: true, message: '请设置长腿阈值', trigger: 'blur' },
    { type: 'number', min: 1.0, max: 5.0, message: '阈值必须在1.0-5.0之间', trigger: 'blur' },
  ],
  enabledPatternTypes: [{ required: true, message: '请至少选择一种形态类型', trigger: 'change' }],
  minSignificance: [
    { required: true, message: '请设置最小显著性', trigger: 'blur' },
    { type: 'number', min: 0.1, max: 1.0, message: '显著性必须在0.1-1.0之间', trigger: 'blur' },
  ],
}

// 格式化函数
const formatPercentage = (value: number) => `${value}%`
const formatSignificance = (value: number) => `${(value * 100).toFixed(0)}%`
const formatOpacity = (value: number) => `${(value * 100).toFixed(0)}%`

// 获取形态类型名称
const getPatternTypeName = (type: string) => {
  const names: Record<string, string> = {
    standard: '标准十字星',
    dragonfly: '蜻蜓十字星',
    gravestone: '墓碑十字星',
    longLegged: '长腿十字星',
  }
  return names[type] || type
}

// 加载设置
const loadSettings = async () => {
  try {
    const savedSettings = localStorage.getItem('dojiPatternSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      Object.assign(settings, { ...defaultSettings, ...parsed })
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.warning('加载设置失败，使用默认设置')
  }
}

// 保存设置
const saveSettings = async () => {
  if (!settingsFormRef.value) return

  try {
    await settingsFormRef.value.validate()
    saving.value = true

    // 保存到本地存储
    localStorage.setItem('dojiPatternSettings', JSON.stringify(settings))

    // 这里可以添加保存到服务器的逻辑
    // await api.saveDojiPatternSettings(settings)

    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  } finally {
    saving.value = false
  }
}

// 恢复默认设置
const resetToDefaults = async () => {
  try {
    await ElMessageBox.confirm('确定要恢复默认设置吗？当前设置将被覆盖。', '确认操作', {
      type: 'warning',
    })

    Object.assign(settings, defaultSettings)
    ElMessage.success('已恢复默认设置')
  } catch {
    // 用户取消操作
  }
}

// 导出设置
const exportSettings = () => {
  const configJson = JSON.stringify(settings, null, 2)
  const blob = new Blob([configJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'doji-pattern-settings.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

// 导入设置
const importSettings = () => {
  importConfigText.value = ''
  importDialogVisible.value = true
}

// 确认导入
const confirmImport = () => {
  try {
    const importedSettings = JSON.parse(importConfigText.value)
    Object.assign(settings, { ...defaultSettings, ...importedSettings })
    importDialogVisible.value = false
    ElMessage.success('配置导入成功')
  } catch (error) {
    ElMessage.error('配置格式错误，请检查JSON格式')
  }
}

// 监听设置变化
watch(
  settings,
  () => {
    // 这里可以添加实时预览逻辑
  },
  { deep: true }
)

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.doji-pattern-settings {
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.pattern-option {
  margin-left: 8px;
}

.pattern-description {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.option-content {
  margin-left: 8px;
}

.option-description {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}

.preview-card {
  margin-top: 20px;
}

.preview-content {
  space-y: 12px;
}

.preview-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.preview-item .label {
  min-width: 100px;
  color: #606266;
  font-size: 14px;
}

.pattern-tag {
  margin-right: 8px;
}

.preview-item .el-progress {
  flex: 1;
  margin: 0 12px;
}

.preview-item .value {
  min-width: 60px;
  text-align: right;
  color: #303133;
  font-weight: 500;
}

:deep(.el-divider__text) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-checkbox) {
  display: block;
  margin-bottom: 12px;
}

:deep(.el-radio) {
  display: block;
  margin-bottom: 12px;
}

:deep(.el-slider) {
  margin-right: 12px;
}
</style>
