<template>
  <el-dialog
    v-model="visible"
    title="设置价格提醒"
    width="500px"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="股票信息">
        <div class="stock-info">
          <span class="stock-name">{{ stock?.name }}</span>
          <span class="stock-symbol">{{ stock?.symbol }}</span>
          <span class="current-price">
            当前价格: ¥{{ formatPrice(stock?.currentPrice) }}
          </span>
        </div>
      </el-form-item>

      <el-form-item label="提醒类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio value="above">价格上涨到</el-radio>
          <el-radio value="below">价格下跌到</el-radio>
          <el-radio value="change_percent">涨跌幅达到</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item 
        :label="form.type === 'change_percent' ? '涨跌幅' : '目标价格'" 
        prop="targetValue"
      >
        <el-input-number
          v-model="form.targetValue"
          :precision="form.type === 'change_percent' ? 2 : 2"
          :step="form.type === 'change_percent' ? 0.1 : 0.01"
          :min="form.type === 'change_percent' ? -50 : 0.01"
          :max="form.type === 'change_percent' ? 50 : 9999"
          style="width: 200px"
        />
        <span class="unit">
          {{ form.type === 'change_percent' ? '%' : '元' }}
        </span>
      </el-form-item>

      <el-form-item label="提醒方式" prop="notificationMethods">
        <el-checkbox-group v-model="form.notificationMethods">
          <el-checkbox value="browser">浏览器通知</el-checkbox>
          <el-checkbox value="email">邮件通知</el-checkbox>
          <el-checkbox value="sms">短信通知</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="有效期" prop="expiryType">
        <el-radio-group v-model="form.expiryType">
          <el-radio value="1day">1天</el-radio>
          <el-radio value="1week">1周</el-radio>
          <el-radio value="1month">1个月</el-radio>
          <el-radio value="custom">自定义</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item 
        v-if="form.expiryType === 'custom'" 
        label="到期时间" 
        prop="customExpiry"
      >
        <el-date-picker
          v-model="form.customExpiry"
          type="datetime"
          placeholder="选择到期时间"
          :disabled-date="disabledDate"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="3"
          placeholder="可选的备注信息"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 预览区域 -->
      <el-form-item label="提醒预览">
        <div class="alert-preview">
          <el-alert
            :title="getPreviewTitle()"
            :description="getPreviewDescription()"
            type="info"
            show-icon
            :closable="false"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
        >
          确认设置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { formatPriceSafe } from '@/utils/formatters'

interface StockData {
  symbol: string
  name: string
  currentPrice: number
}

interface AlertForm {
  type: 'above' | 'below' | 'change_percent'
  targetValue: number | null
  notificationMethods: string[]
  expiryType: '1day' | '1week' | '1month' | 'custom'
  customExpiry: string | null
  note: string
}

interface PriceAlertDialogProps {
  modelValue: boolean
  stock: StockData | null
}

const props = defineProps<PriceAlertDialogProps>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [alertData: any]
}>()

// 响应式数据
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<AlertForm>({
  type: 'above',
  targetValue: null,
  notificationMethods: ['browser'],
  expiryType: '1week',
  customExpiry: null,
  note: ''
})

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单验证规则
const rules: FormRules = {
  type: [
    { required: true, message: '请选择提醒类型', trigger: 'change' }
  ],
  targetValue: [
    { required: true, message: '请输入目标值', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value === null || value === undefined) {
          callback(new Error('请输入目标值'))
          return
        }
        
        if (form.type === 'change_percent') {
          if (value < -50 || value > 50) {
            callback(new Error('涨跌幅应在-50%到50%之间'))
            return
          }
        } else {
          if (value <= 0) {
            callback(new Error('价格应大于0'))
            return
          }
          
          if (props.stock) {
            const currentPrice = props.stock.currentPrice
            if (form.type === 'above' && value <= currentPrice) {
              callback(new Error('目标价格应高于当前价格'))
              return
            }
            if (form.type === 'below' && value >= currentPrice) {
              callback(new Error('目标价格应低于当前价格'))
              return
            }
          }
        }
        
        callback()
      },
      trigger: 'blur'
    }
  ],
  notificationMethods: [
    { 
      type: 'array', 
      required: true, 
      message: '请选择至少一种提醒方式', 
      trigger: 'change' 
    }
  ],
  expiryType: [
    { required: true, message: '请选择有效期', trigger: 'change' }
  ],
  customExpiry: [
    {
      validator: (rule, value, callback) => {
        if (form.expiryType === 'custom' && !value) {
          callback(new Error('请选择到期时间'))
          return
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

// 方法
const formatPrice = (price: number | undefined | null) => {
  return formatPriceSafe(price, 2)
}

const disabledDate = (time: Date) => {
  return time.getTime() < Date.now()
}

const getPreviewTitle = () => {
  if (!props.stock || form.targetValue === null) return '提醒预览'
  
  const stockName = props.stock.name
  const targetValue = form.targetValue
  
  switch (form.type) {
    case 'above':
      return `${stockName} 价格上涨提醒`
    case 'below':
      return `${stockName} 价格下跌提醒`
    case 'change_percent':
      return `${stockName} 涨跌幅提醒`
    default:
      return '提醒预览'
  }
}

const getPreviewDescription = () => {
  if (!props.stock || form.targetValue === null) return '请完善提醒设置'
  
  const stockName = props.stock.name
  const currentPrice = formatPrice(props.stock.currentPrice)
  const targetValue = form.targetValue
  
  let description = ''
  
  switch (form.type) {
    case 'above':
      description = `当 ${stockName} 价格从当前的 ¥${currentPrice} 上涨到 ¥${targetValue} 时，将通过${getNotificationMethodsText()}向您发送提醒。`
      break
    case 'below':
      description = `当 ${stockName} 价格从当前的 ¥${currentPrice} 下跌到 ¥${targetValue} 时，将通过${getNotificationMethodsText()}向您发送提醒。`
      break
    case 'change_percent':
      const direction = targetValue > 0 ? '上涨' : '下跌'
      description = `当 ${stockName} 涨跌幅${direction}达到 ${Math.abs(targetValue)}% 时，将通过${getNotificationMethodsText()}向您发送提醒。`
      break
  }
  
  return description
}

const getNotificationMethodsText = () => {
  const methods = form.notificationMethods.map(method => {
    switch (method) {
      case 'browser': return '浏览器通知'
      case 'email': return '邮件'
      case 'sms': return '短信'
      default: return method
    }
  })
  
  return methods.join('、')
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    // 构建提醒数据
    const alertData = {
      symbol: props.stock?.symbol,
      type: form.type,
      targetValue: form.targetValue,
      notificationMethods: form.notificationMethods,
      expiryType: form.expiryType,
      customExpiry: form.customExpiry,
      note: form.note,
      createdAt: new Date().toISOString()
    }
    
    // 发送确认事件
    emit('confirm', alertData)
    
    ElMessage.success('价格提醒设置成功')
    visible.value = false
    resetForm()
    
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  form.type = 'above'
  form.targetValue = null
  form.notificationMethods = ['browser']
  form.expiryType = '1week'
  form.customExpiry = null
  form.note = ''
}

// 监听股票变化，重置表单
watch(() => props.stock, () => {
  resetForm()
})

// 监听对话框打开，设置默认值
watch(visible, (newValue) => {
  if (newValue && props.stock) {
    // 设置默认目标价格
    const currentPrice = props.stock.currentPrice
    if (form.type === 'above') {
      form.targetValue = Number((currentPrice * 1.1).toFixed(2))
    } else if (form.type === 'below') {
      form.targetValue = Number((currentPrice * 0.9).toFixed(2))
    }
  }
})

// 监听提醒类型变化，调整默认值
watch(() => form.type, (newType) => {
  if (props.stock) {
    const currentPrice = props.stock.currentPrice
    
    switch (newType) {
      case 'above':
        form.targetValue = Number((currentPrice * 1.1).toFixed(2))
        break
      case 'below':
        form.targetValue = Number((currentPrice * 0.9).toFixed(2))
        break
      case 'change_percent':
        form.targetValue = 5
        break
    }
  }
})
</script>

<style scoped>
.stock-info {
  display: flex;
  align-items: center;
  gap: var(--el-spacing-md);
  padding: var(--el-spacing-md);
  background: var(--el-bg-color-page);
  border-radius: var(--el-border-radius-base);
}

.stock-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stock-symbol {
  padding: 2px 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: var(--el-border-radius-small);
  font-size: 0.75rem;
}

.current-price {
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
}

.unit {
  margin-left: var(--el-spacing-sm);
  color: var(--el-text-color-secondary);
}

.alert-preview {
  margin-top: var(--el-spacing-md);
}

.dialog-footer {
  text-align: right;
}
</style>
