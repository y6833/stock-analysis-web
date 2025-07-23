<template>
  <div class="doji-pattern-alert-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="left"
      size="default"
    >
      <!-- 股票选择 -->
      <el-form-item label="股票" prop="stockCode" required>
        <BaseSearchInput
          v-model:code="formData.stockCode"
          v-model:name="formData.stockName"
          placeholder="请输入股票代码或名称"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 形态类型 -->
      <el-form-item label="形态类型" prop="patternType" required>
        <el-select v-model="formData.patternType" placeholder="请选择形态类型" style="width: 100%">
          <el-option label="任意十字星" value="any" />
          <el-option label="标准十字星" value="standard" />
          <el-option label="蜻蜓十字星" value="dragonfly" />
          <el-option label="墓碑十字星" value="gravestone" />
          <el-option label="长腿十字星" value="longLegged" />
        </el-select>
      </el-form-item>

      <!-- 提醒条件 -->
      <el-form-item label="提醒条件" prop="condition" required>
        <el-select v-model="formData.condition" placeholder="请选择提醒条件" style="width: 100%">
          <el-option label="形态出现时" value="pattern_appears" />
          <el-option label="形态出现且成交量放大" value="pattern_with_volume" />
          <el-option label="形态出现在支撑位附近" value="pattern_near_support" />
          <el-option label="形态出现在阻力位附近" value="pattern_near_resistance" />
        </el-select>
      </el-form-item>

      <!-- 优先级 -->
      <el-form-item label="优先级" prop="priority" required>
        <el-select v-model="formData.priority" placeholder="请选择优先级" style="width: 100%">
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>
      </el-form-item>

      <!-- 提醒消息 -->
      <el-form-item label="提醒消息" prop="message">
        <el-input
          v-model="formData.message"
          type="textarea"
          :rows="2"
          placeholder="自定义提醒消息（可选）"
        />
      </el-form-item>

      <!-- 高级设置 -->
      <el-collapse v-model="activeCollapse">
        <el-collapse-item title="高级设置" name="advanced">
          <!-- 最小显著性 -->
          <el-form-item label="最小显著性" prop="minSignificance">
            <el-slider
              v-model="formData.additionalParams.minSignificance"
              :min="0"
              :max="1"
              :step="0.1"
              :format-tooltip="(value) => `${(value * 100).toFixed(0)}%`"
            />
          </el-form-item>

          <!-- 成交量变化百分比 -->
          <el-form-item
            label="成交量变化"
            prop="volumeChangePercent"
            v-if="formData.condition === 'pattern_with_volume'"
          >
            <el-input-number
              v-model="formData.additionalParams.volumeChangePercent"
              :min="0"
              :max="100"
              :step="5"
              :precision="0"
            >
              <template #suffix>%</template>
            </el-input-number>
          </el-form-item>

          <!-- 检查间隔 -->
          <el-form-item label="检查间隔" prop="checkInterval">
            <el-input-number
              v-model="formData.additionalParams.checkInterval"
              :min="1"
              :max="60"
              :step="1"
              :precision="0"
            >
              <template #suffix>分钟</template>
            </el-input-number>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>

      <!-- 表单操作 -->
      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="isSubmitting">
          {{ isEdit ? '更新提醒' : '创建提醒' }}
        </el-button>
        <el-button @click="resetForm">重置</el-button>
        <el-button v-if="showTestButton" type="info" @click="testAlert" :loading="isTesting">
          测试提醒
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import BaseSearchInput from '@/components/base/BaseSearchInput.vue'
import {
  dojiPatternAlertService,
  type DojiPatternAlert,
  type CreateDojiPatternAlertRequest,
} from '@/services/DojiPatternAlertService'
import { useDojiPatternAlert } from '@/composables/useDojiPatternAlert'
import type { DojiPatternType } from '@/services/alertService'
import type { DojiAlertCondition, DojiAlertPriority } from '@/services/DojiPatternAlertService'

// Props
const props = defineProps<{
  alertId?: number
  stockCode?: string
  stockName?: string
  isEdit?: boolean
  showTestButton?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'submit', alert: DojiPatternAlert): void
  (e: 'cancel'): void
  (e: 'test-result', result: any): void
}>()

// Form reference
const formRef = ref<FormInstance>()

// Form data
const formData = reactive<{
  stockCode: string
  stockName: string
  patternType: DojiPatternType
  condition: DojiAlertCondition
  priority: DojiAlertPriority
  message: string
  additionalParams: {
    minSignificance: number
    volumeChangePercent: number
    checkInterval: number
  }
}>({
  stockCode: props.stockCode || '',
  stockName: props.stockName || '',
  patternType: 'any',
  condition: 'pattern_appears',
  priority: 'medium',
  message: '',
  additionalParams: {
    minSignificance: 0.5,
    volumeChangePercent: 20,
    checkInterval: 5,
  },
})

// Form validation rules
const rules = {
  stockCode: [{ required: true, message: '请选择股票', trigger: 'change' }],
  patternType: [{ required: true, message: '请选择形态类型', trigger: 'change' }],
  condition: [{ required: true, message: '请选择提醒条件', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}

// UI state
const activeCollapse = ref<string[]>([])
const isSubmitting = ref(false)
const isTesting = ref(false)

// Composables
const { testDojiPatternAlert } = useDojiPatternAlert()

// Load alert data if in edit mode
onMounted(async () => {
  if (props.isEdit && props.alertId) {
    try {
      // 获取提醒详情
      const alerts = await dojiPatternAlertService.getDojiPatternAlerts()
      const alert = alerts.find((a) => a.id === props.alertId)

      if (alert) {
        // 填充表单数据
        formData.stockCode = alert.stockCode
        formData.stockName = alert.stockName
        formData.patternType = alert.patternType
        formData.condition = alert.condition
        formData.priority = alert.priority
        formData.message = alert.message || ''

        // 填充高级设置
        if (alert.additionalParams) {
          formData.additionalParams.minSignificance = alert.additionalParams.minSignificance || 0.5
          formData.additionalParams.volumeChangePercent =
            alert.additionalParams.volumeChangePercent || 20
          formData.additionalParams.checkInterval = alert.additionalParams.checkInterval || 5
        }
      }
    } catch (error) {
      console.error('加载提醒数据失败:', error)
      ElMessage.error('加载提醒数据失败')
    }
  }
})

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.warning('请完善表单信息')
      return
    }

    isSubmitting.value = true

    try {
      // 准备提交数据
      const alertData: CreateDojiPatternAlertRequest = {
        stockCode: formData.stockCode,
        stockName: formData.stockName,
        patternType: formData.patternType,
        condition: formData.condition,
        priority: formData.priority,
        message: formData.message || undefined,
        additionalParams: {
          minSignificance: formData.additionalParams.minSignificance,
          volumeChangePercent: formData.additionalParams.volumeChangePercent,
          checkInterval: formData.additionalParams.checkInterval,
        },
      }

      let result: DojiPatternAlert

      if (props.isEdit && props.alertId) {
        // 更新提醒
        result = await dojiPatternAlertService.updateDojiPatternAlert(props.alertId, alertData)
        ElMessage.success('提醒已更新')
      } else {
        // 创建提醒
        result = await dojiPatternAlertService.createDojiPatternAlert(alertData)
        ElMessage.success('提醒已创建')
      }

      // 触发提交事件
      emit('submit', result)
    } catch (error: any) {
      console.error('提交提醒失败:', error)
      ElMessage.error(`提交失败: ${error.message || '未知错误'}`)
    } finally {
      isSubmitting.value = false
    }
  })
}

// 重置表单
const resetForm = () => {
  if (!formRef.value) return

  formRef.value.resetFields()

  // 重置高级设置
  formData.additionalParams = {
    minSignificance: 0.5,
    volumeChangePercent: 20,
    checkInterval: 5,
  }

  // 如果是编辑模式，询问是否取消
  if (props.isEdit) {
    ElMessageBox.confirm('确定要取消编辑吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '继续编辑',
      type: 'warning',
    })
      .then(() => {
        emit('cancel')
      })
      .catch(() => {
        // 用户选择继续编辑，不做任何操作
      })
  }
}

// 测试提醒
const testAlert = async () => {
  if (!formData.stockCode) {
    ElMessage.warning('请先选择股票')
    return
  }

  isTesting.value = true

  try {
    // 准备测试数据
    const alertData: CreateDojiPatternAlertRequest = {
      stockCode: formData.stockCode,
      stockName: formData.stockName,
      patternType: formData.patternType,
      condition: formData.condition,
      priority: formData.priority,
      message: formData.message || undefined,
      additionalParams: {
        minSignificance: formData.additionalParams.minSignificance,
        volumeChangePercent: formData.additionalParams.volumeChangePercent,
        checkInterval: formData.additionalParams.checkInterval,
      },
    }

    // 测试提醒
    const result = await dojiPatternAlertService.testDojiPatternAlert(alertData)

    // 显示测试结果
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.info(result.message)
    }

    // 触发测试结果事件
    emit('test-result', result)
  } catch (error: any) {
    console.error('测试提醒失败:', error)
    ElMessage.error(`测试失败: ${error.message || '未知错误'}`)
  } finally {
    isTesting.value = false
  }
}
</script>

<style scoped>
.doji-pattern-alert-form {
  max-width: 600px;
  margin: 0 auto;
}

.el-collapse {
  margin-bottom: 20px;
  border: none;
}

.el-collapse-item :deep(.el-collapse-item__header) {
  font-size: 14px;
  color: var(--el-color-primary);
  border: none;
}

.el-collapse-item :deep(.el-collapse-item__content) {
  padding: 10px 0;
}
</style>
