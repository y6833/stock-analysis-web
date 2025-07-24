/**
 * 基础组件类型定义和工具函数
 * 提供统一的组件接口和通用功能
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useErrorHandling } from '@/composables/useErrorHandling'
import { useToast } from '@/composables/useToast'

export interface BaseComponentProps {
  loading?: boolean
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

export interface BaseComponentEmits {
  (e: 'loading', value: boolean): void
  (e: 'error', error: Error): void
  (e: 'success', message: string): void
}

export interface LoadingState {
  loading: Ref<boolean>
  setLoading: (value: boolean) => void
  withLoading: <T>(operation: () => Promise<T>) => Promise<T | null>
}

export interface ErrorState {
  error: Ref<string | null>
  hasError: ComputedRef<boolean>
  setError: (error: string | Error | null) => void
  clearError: () => void
}

export interface ValidationState {
  errors: Ref<Record<string, string>>
  hasErrors: ComputedRef<boolean>
  setFieldError: (field: string, error: string) => void
  clearFieldError: (field: string) => void
  clearAllErrors: () => void
  validateField: (field: string, value: any, rules: ValidationRule[]) => boolean
}

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  message?: string
}

/**
 * 创建加载状态管理
 */
export function useLoadingState(emit?: (event: 'loading', value: boolean) => void): LoadingState {
  const loading = ref(false)

  const setLoading = (value: boolean) => {
    loading.value = value
    emit?.('loading', value)
  }

  const withLoading = async <T>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true)
      return await operation()
    } catch (error) {
      console.error('Operation failed:', error)
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    setLoading,
    withLoading
  }
}

/**
 * 创建错误状态管理
 */
export function useErrorState(emit?: (event: 'error', error: Error) => void): ErrorState {
  const error = ref<string | null>(null)
  const hasError = computed(() => error.value !== null)

  const setError = (errorValue: string | Error | null) => {
    if (errorValue === null) {
      error.value = null
    } else if (typeof errorValue === 'string') {
      error.value = errorValue
    } else {
      error.value = errorValue.message
      emit?.('error', errorValue)
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    error,
    hasError,
    setError,
    clearError
  }
}

/**
 * 创建表单验证状态管理
 */
export function useValidationState(): ValidationState {
  const errors = ref<Record<string, string>>({})
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)

  const setFieldError = (field: string, error: string) => {
    errors.value = { ...errors.value, [field]: error }
  }

  const clearFieldError = (field: string) => {
    const newErrors = { ...errors.value }
    delete newErrors[field]
    errors.value = newErrors
  }

  const clearAllErrors = () => {
    errors.value = {}
  }

  const validateField = (field: string, value: any, rules: ValidationRule[]): boolean => {
    clearFieldError(field)

    for (const rule of rules) {
      let isValid = true
      let errorMessage = rule.message || `${field} 验证失败`

      // 必填验证
      if (rule.required && (value === null || value === undefined || value === '')) {
        isValid = false
        errorMessage = rule.message || `${field} 是必填项`
      }

      // 最小长度验证
      if (isValid && rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        isValid = false
        errorMessage = rule.message || `${field} 最少需要 ${rule.minLength} 个字符`
      }

      // 最大长度验证
      if (isValid && rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        isValid = false
        errorMessage = rule.message || `${field} 最多允许 ${rule.maxLength} 个字符`
      }

      // 正则表达式验证
      if (isValid && rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        isValid = false
        errorMessage = rule.message || `${field} 格式不正确`
      }

      // 自定义验证
      if (isValid && rule.custom) {
        const customResult = rule.custom(value)
        if (typeof customResult === 'string') {
          isValid = false
          errorMessage = customResult
        } else if (customResult === false) {
          isValid = false
        }
      }

      if (!isValid) {
        setFieldError(field, errorMessage)
        return false
      }
    }

    return true
  }

  return {
    errors,
    hasErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    validateField
  }
}

/**
 * 创建基础组件状态
 */
export function useBaseComponent(
  emit?: BaseComponentEmits
) {
  const loadingState = useLoadingState(emit)
  const errorState = useErrorState(emit)
  const { handleError } = useErrorHandling()
  const { showToast } = useToast()

  // 统一的异步操作处理
  const withAsyncOperation = async <T>(
    operation: () => Promise<T>,
    options: {
      loadingText?: string
      successMessage?: string
      errorMessage?: string
      showToast?: boolean
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage,
      errorMessage = '操作失败',
      showToast: shouldShowToast = true
    } = options

    try {
      loadingState.setLoading(true)
      errorState.clearError()

      const result = await operation()

      if (successMessage && shouldShowToast) {
        showToast(successMessage, 'success')
        emit?.('success', successMessage)
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage
      errorState.setError(message)
      
      if (shouldShowToast) {
        showToast(message, 'error')
      }

      handleError(error)
      return null
    } finally {
      loadingState.setLoading(false)
    }
  }

  return {
    ...loadingState,
    ...errorState,
    withAsyncOperation
  }
}

/**
 * 创建表单组件状态
 */
export function useFormComponent(
  emit?: BaseComponentEmits & {
    (e: 'submit', data: any): void
    (e: 'reset'): void
    (e: 'change', field: string, value: any): void
  }
) {
  const baseComponent = useBaseComponent(emit)
  const validationState = useValidationState()

  // 表单数据
  const formData = ref<Record<string, any>>({})
  const originalData = ref<Record<string, any>>({})
  
  // 表单状态
  const isDirty = computed(() => 
    JSON.stringify(formData.value) !== JSON.stringify(originalData.value)
  )
  const isValid = computed(() => !validationState.hasErrors.value)
  const canSubmit = computed(() => isValid.value && !baseComponent.loading.value)

  // 表单操作
  const setFormData = (data: Record<string, any>) => {
    formData.value = { ...data }
    originalData.value = { ...data }
    validationState.clearAllErrors()
  }

  const updateField = (field: string, value: any) => {
    formData.value = { ...formData.value, [field]: value }
    emit?.('change', field, value)
  }

  const resetForm = () => {
    formData.value = { ...originalData.value }
    validationState.clearAllErrors()
    baseComponent.clearError()
    emit?.('reset')
  }

  const validateForm = (rules: Record<string, ValidationRule[]>): boolean => {
    let isFormValid = true

    for (const [field, fieldRules] of Object.entries(rules)) {
      const fieldValue = formData.value[field]
      const isFieldValid = validationState.validateField(field, fieldValue, fieldRules)
      if (!isFieldValid) {
        isFormValid = false
      }
    }

    return isFormValid
  }

  const submitForm = async (
    submitHandler: (data: Record<string, any>) => Promise<any>,
    rules?: Record<string, ValidationRule[]>
  ) => {
    // 验证表单
    if (rules && !validateForm(rules)) {
      return null
    }

    return await baseComponent.withAsyncOperation(
      () => submitHandler(formData.value),
      { successMessage: '提交成功' }
    )
  }

  return {
    ...baseComponent,
    ...validationState,
    
    // 表单数据
    formData,
    isDirty,
    isValid,
    canSubmit,
    
    // 表单操作
    setFormData,
    updateField,
    resetForm,
    validateForm,
    submitForm
  }
}

/**
 * 创建列表组件状态
 */
export function useListComponent<T>(
  emit?: BaseComponentEmits & {
    (e: 'select', item: T): void
    (e: 'delete', item: T): void
    (e: 'refresh'): void
  }
) {
  const baseComponent = useBaseComponent(emit)
  
  // 列表数据
  const items = ref<T[]>([])
  const selectedItems = ref<T[]>([])
  const total = ref(0)
  
  // 分页状态
  const page = ref(1)
  const pageSize = ref(20)
  const hasMore = computed(() => page.value * pageSize.value < total.value)
  
  // 搜索状态
  const searchQuery = ref('')
  const filters = ref<Record<string, any>>({})
  const sortBy = ref('')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // 计算属性
  const isEmpty = computed(() => items.value.length === 0)
  const hasSelection = computed(() => selectedItems.value.length > 0)

  // 列表操作
  const setItems = (newItems: T[], newTotal?: number) => {
    items.value = [...newItems]
    if (newTotal !== undefined) {
      total.value = newTotal
    }
  }

  const addItem = (item: T) => {
    items.value.push(item)
    total.value += 1
  }

  const removeItem = (predicate: (item: T) => boolean) => {
    const index = items.value.findIndex(predicate)
    if (index !== -1) {
      items.value.splice(index, 1)
      total.value = Math.max(0, total.value - 1)
    }
  }

  const updateItem = (predicate: (item: T) => boolean, updater: (item: T) => T) => {
    const index = items.value.findIndex(predicate)
    if (index !== -1) {
      items.value[index] = updater(items.value[index])
    }
  }

  // 选择操作
  const selectItem = (item: T) => {
    if (!selectedItems.value.includes(item)) {
      selectedItems.value.push(item)
      emit?.('select', item)
    }
  }

  const deselectItem = (item: T) => {
    const index = selectedItems.value.indexOf(item)
    if (index !== -1) {
      selectedItems.value.splice(index, 1)
    }
  }

  const toggleSelection = (item: T) => {
    if (selectedItems.value.includes(item)) {
      deselectItem(item)
    } else {
      selectItem(item)
    }
  }

  const selectAll = () => {
    selectedItems.value = [...items.value]
  }

  const clearSelection = () => {
    selectedItems.value = []
  }

  // 分页操作
  const setPage = (newPage: number) => {
    page.value = Math.max(1, newPage)
  }

  const nextPage = () => {
    if (hasMore.value) {
      setPage(page.value + 1)
    }
  }

  const prevPage = () => {
    if (page.value > 1) {
      setPage(page.value - 1)
    }
  }

  // 搜索操作
  const setSearch = (query: string) => {
    searchQuery.value = query
    page.value = 1
  }

  const setFilters = (newFilters: Record<string, any>) => {
    filters.value = { ...newFilters }
    page.value = 1
  }

  const setSorting = (field: string, order: 'asc' | 'desc' = 'asc') => {
    sortBy.value = field
    sortOrder.value = order
    page.value = 1
  }

  // 刷新操作
  const refresh = () => {
    emit?.('refresh')
  }

  return {
    ...baseComponent,
    
    // 列表数据
    items,
    selectedItems,
    total,
    
    // 分页状态
    page,
    pageSize,
    hasMore,
    
    // 搜索状态
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    
    // 计算属性
    isEmpty,
    hasSelection,
    
    // 列表操作
    setItems,
    addItem,
    removeItem,
    updateItem,
    
    // 选择操作
    selectItem,
    deselectItem,
    toggleSelection,
    selectAll,
    clearSelection,
    
    // 分页操作
    setPage,
    nextPage,
    prevPage,
    
    // 搜索操作
    setSearch,
    setFilters,
    setSorting,
    
    // 其他操作
    refresh
  }
}

export default {
  useLoadingState,
  useErrorState,
  useValidationState,
  useBaseComponent,
  useFormComponent,
  useListComponent
}