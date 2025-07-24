/**
 * BaseComponent 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { 
  useLoadingState, 
  useErrorState, 
  useValidationState, 
  useBaseComponent,
  useFormComponent,
  useListComponent
} from '@/core/BaseComponent'

// Mock composables
vi.mock('@/composables/useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn()
  })
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}))

describe('BaseComponent', () => {
  describe('useLoadingState', () => {
    it('should initialize with default state', () => {
      const { loading } = useLoadingState()
      expect(loading.value).toBe(false)
    })

    it('should update loading state', () => {
      const { loading, setLoading } = useLoadingState()
      
      setLoading(true)
      expect(loading.value).toBe(true)
      
      setLoading(false)
      expect(loading.value).toBe(false)
    })

    it('should emit loading event when provided', () => {
      const emit = vi.fn()
      const { setLoading } = useLoadingState(emit)
      
      setLoading(true)
      expect(emit).toHaveBeenCalledWith('loading', true)
    })

    it('should handle async operations with loading state', async () => {
      const { loading, withLoading } = useLoadingState()
      
      const mockOperation = vi.fn().mockResolvedValue('success')
      const result = await withLoading(mockOperation)
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalled()
      expect(loading.value).toBe(false)
    })

    it('should handle errors in async operations', async () => {
      const { loading, withLoading } = useLoadingState()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'))
      const result = await withLoading(mockOperation)
      
      expect(result).toBe(null)
      expect(loading.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('useErrorState', () => {
    it('should initialize with default state', () => {
      const { error, hasError } = useErrorState()
      
      expect(error.value).toBe(null)
      expect(hasError.value).toBe(false)
    })

    it('should set error message', () => {
      const { error, hasError, setError } = useErrorState()
      
      setError('Test error')
      expect(error.value).toBe('Test error')
      expect(hasError.value).toBe(true)
    })

    it('should set error from Error object', () => {
      const emit = vi.fn()
      const { error, setError } = useErrorState(emit)
      
      const errorObj = new Error('Test error')
      setError(errorObj)
      
      expect(error.value).toBe('Test error')
      expect(emit).toHaveBeenCalledWith('error', errorObj)
    })

    it('should clear error', () => {
      const { error, hasError, setError, clearError } = useErrorState()
      
      setError('Test error')
      expect(hasError.value).toBe(true)
      
      clearError()
      expect(error.value).toBe(null)
      expect(hasError.value).toBe(false)
    })
  })

  describe('useValidationState', () => {
    it('should initialize with empty errors', () => {
      const { errors, hasErrors } = useValidationState()
      
      expect(errors.value).toEqual({})
      expect(hasErrors.value).toBe(false)
    })

    it('should set field error', () => {
      const { errors, hasErrors, setFieldError } = useValidationState()
      
      setFieldError('name', 'Name is required')
      expect(errors.value.name).toBe('Name is required')
      expect(hasErrors.value).toBe(true)
    })

    it('should clear field error', () => {
      const { errors, setFieldError, clearFieldError } = useValidationState()
      
      setFieldError('name', 'Name is required')
      setFieldError('email', 'Email is invalid')
      
      clearFieldError('name')
      expect(errors.value.name).toBeUndefined()
      expect(errors.value.email).toBe('Email is invalid')
    })

    it('should clear all errors', () => {
      const { errors, hasErrors, setFieldError, clearAllErrors } = useValidationState()
      
      setFieldError('name', 'Name is required')
      setFieldError('email', 'Email is invalid')
      expect(hasErrors.value).toBe(true)
      
      clearAllErrors()
      expect(errors.value).toEqual({})
      expect(hasErrors.value).toBe(false)
    })

    describe('validateField', () => {
      it('should validate required fields', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('name', '', [{ required: true }])
        expect(result).toBe(false)
        expect(errors.value.name).toContain('必填项')
      })

      it('should validate minLength', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('password', '123', [{ minLength: 6 }])
        expect(result).toBe(false)
        expect(errors.value.password).toContain('最少需要 6 个字符')
      })

      it('should validate maxLength', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('description', '123456789012345', [{ maxLength: 10 }])
        expect(result).toBe(false)
        expect(errors.value.description).toContain('最多允许 10 个字符')
      })

      it('should validate pattern', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('email', 'invalid-email', [{ 
          pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        }])
        expect(result).toBe(false)
        expect(errors.value.email).toContain('格式不正确')
      })

      it('should validate with custom validator', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('age', 15, [{ 
          custom: (value) => value >= 18 ? true : '年龄必须大于等于18岁'
        }])
        expect(result).toBe(false)
        expect(errors.value.age).toBe('年龄必须大于等于18岁')
      })

      it('should pass validation when all rules are satisfied', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('email', 'test@example.com', [
          { required: true },
          { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ }
        ])
        expect(result).toBe(true)
        expect(errors.value.email).toBeUndefined()
      })

      it('should use custom error message', () => {
        const { validateField, errors } = useValidationState()
        
        const result = validateField('name', '', [{ 
          required: true,
          message: '请输入您的姓名'
        }])
        expect(result).toBe(false)
        expect(errors.value.name).toBe('请输入您的姓名')
      })
    })
  })

  describe('useBaseComponent', () => {
    it('should combine loading and error states', () => {
      const { loading, error, setLoading, setError } = useBaseComponent()
      
      expect(loading.value).toBe(false)
      expect(error.value).toBe(null)
      
      setLoading(true)
      expect(loading.value).toBe(true)
      
      setError('Test error')
      expect(error.value).toBe('Test error')
    })

    it('should handle async operations', async () => {
      const emit = vi.fn()
      const { withAsyncOperation } = useBaseComponent(emit)
      const { showToast } = useToast()
      
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const result = await withAsyncOperation(mockOperation, {
        successMessage: 'Operation successful'
      })
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith('Operation successful', 'success')
      expect(emit).toHaveBeenCalledWith('success', 'Operation successful')
    })

    it('should handle errors in async operations', async () => {
      const { withAsyncOperation, error } = useBaseComponent()
      const { showToast } = useToast()
      const { handleError } = useErrorHandling()
      
      const mockError = new Error('Operation failed')
      const mockOperation = vi.fn().mockRejectedValue(mockError)
      
      const result = await withAsyncOperation(mockOperation, {
        errorMessage: 'Custom error message'
      })
      
      expect(result).toBe(null)
      expect(error.value).toBe('Operation failed')
      expect(showToast).toHaveBeenCalledWith('Operation failed', 'error')
      expect(handleError).toHaveBeenCalledWith(mockError)
    })

    it('should use custom error message when error has no message', async () => {
      const { withAsyncOperation, error } = useBaseComponent()
      
      const mockOperation = vi.fn().mockRejectedValue({})
      
      await withAsyncOperation(mockOperation, {
        errorMessage: 'Custom error message'
      })
      
      expect(error.value).toBe('Custom error message')
    })

    it('should not show toast when disabled', async () => {
      const { withAsyncOperation } = useBaseComponent()
      const { showToast } = useToast()
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'))
      
      await withAsyncOperation(mockOperation, {
        showToast: false
      })
      
      expect(showToast).not.toHaveBeenCalled()
    })
  })

  describe('useFormComponent', () => {
    it('should initialize with empty form data', () => {
      const { formData, isDirty, isValid } = useFormComponent()
      
      expect(formData.value).toEqual({})
      expect(isDirty.value).toBe(false)
      expect(isValid.value).toBe(true)
    })

    it('should set form data', () => {
      const { formData, isDirty, setFormData } = useFormComponent()
      
      const data = { name: 'Test', email: 'test@example.com' }
      setFormData(data)
      
      expect(formData.value).toEqual(data)
      expect(isDirty.value).toBe(false)
    })

    it('should update field and track dirty state', () => {
      const emit = vi.fn()
      const { formData, isDirty, setFormData, updateField } = useFormComponent(emit)
      
      setFormData({ name: 'Initial', email: 'test@example.com' })
      expect(isDirty.value).toBe(false)
      
      updateField('name', 'Updated')
      expect(formData.value.name).toBe('Updated')
      expect(isDirty.value).toBe(true)
      expect(emit).toHaveBeenCalledWith('change', 'name', 'Updated')
    })

    it('should reset form to original data', () => {
      const emit = vi.fn()
      const { formData, isDirty, setFormData, updateField, resetForm } = useFormComponent(emit)
      
      setFormData({ name: 'Initial', email: 'test@example.com' })
      updateField('name', 'Updated')
      expect(isDirty.value).toBe(true)
      
      resetForm()
      expect(formData.value).toEqual({ name: 'Initial', email: 'test@example.com' })
      expect(isDirty.value).toBe(false)
      expect(emit).toHaveBeenCalledWith('reset')
    })

    it('should validate form', () => {
      const { validateForm, errors } = useFormComponent()
      
      const formData = ref({ name: '', email: 'invalid' })
      
      const rules = {
        name: [{ required: true }],
        email: [{ pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ }]
      }
      
      const isValid = validateForm(rules)
      
      expect(isValid).toBe(false)
      expect(errors.value.name).toBeDefined()
      expect(errors.value.email).toBeDefined()
    })

    it('should submit form when valid', async () => {
      const emit = vi.fn()
      const { formData, setFormData, submitForm } = useFormComponent(emit)
      
      setFormData({ name: 'Test', email: 'test@example.com' })
      
      const mockSubmitHandler = vi.fn().mockResolvedValue({ success: true })
      const result = await submitForm(mockSubmitHandler)
      
      expect(mockSubmitHandler).toHaveBeenCalledWith({ name: 'Test', email: 'test@example.com' })
      expect(result).toEqual({ success: true })
    })

    it('should not submit form when invalid', async () => {
      const { formData, setFormData, submitForm } = useFormComponent()
      
      setFormData({ name: '', email: 'invalid' })
      
      const mockSubmitHandler = vi.fn().mockResolvedValue({ success: true })
      const rules = {
        name: [{ required: true }],
        email: [{ pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ }]
      }
      
      const result = await submitForm(mockSubmitHandler, rules)
      
      expect(mockSubmitHandler).not.toHaveBeenCalled()
      expect(result).toBe(null)
    })

    it('should compute canSubmit based on validation and loading', () => {
      const { canSubmit, setLoading, setFieldError } = useFormComponent()
      
      expect(canSubmit.value).toBe(true)
      
      setLoading(true)
      expect(canSubmit.value).toBe(false)
      
      setLoading(false)
      setFieldError('name', 'Name is required')
      expect(canSubmit.value).toBe(false)
    })
  })

  describe('useListComponent', () => {
    it('should initialize with empty items', () => {
      const { items, selectedItems, isEmpty } = useListComponent()
      
      expect(items.value).toEqual([])
      expect(selectedItems.value).toEqual([])
      expect(isEmpty.value).toBe(true)
    })

    it('should set items and track total', () => {
      const { items, total, isEmpty, setItems } = useListComponent()
      
      const testItems = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }]
      setItems(testItems, 10)
      
      expect(items.value).toEqual(testItems)
      expect(total.value).toBe(10)
      expect(isEmpty.value).toBe(false)
    })

    it('should add item', () => {
      const { items, total, addItem } = useListComponent()
      
      addItem({ id: 1, name: 'Item 1' })
      expect(items.value).toHaveLength(1)
      expect(total.value).toBe(1)
      
      addItem({ id: 2, name: 'Item 2' })
      expect(items.value).toHaveLength(2)
      expect(total.value).toBe(2)
    })

    it('should remove item', () => {
      const { items, total, setItems, removeItem } = useListComponent()
      
      setItems([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ], 2)
      
      removeItem(item => item.id === 1)
      expect(items.value).toHaveLength(1)
      expect(items.value[0].id).toBe(2)
      expect(total.value).toBe(1)
    })

    it('should update item', () => {
      const { items, setItems, updateItem } = useListComponent()
      
      setItems([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ])
      
      updateItem(
        item => item.id === 1,
        item => ({ ...item, name: 'Updated Item' })
      )
      
      expect(items.value[0].name).toBe('Updated Item')
      expect(items.value[1].name).toBe('Item 2')
    })

    it('should handle item selection', () => {
      const emit = vi.fn()
      const { items, selectedItems, hasSelection, setItems, selectItem, deselectItem } = useListComponent(emit)
      
      const testItems = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
      setItems(testItems)
      
      selectItem(testItems[0])
      expect(selectedItems.value).toContain(testItems[0])
      expect(hasSelection.value).toBe(true)
      expect(emit).toHaveBeenCalledWith('select', testItems[0])
      
      deselectItem(testItems[0])
      expect(selectedItems.value).not.toContain(testItems[0])
      expect(hasSelection.value).toBe(false)
    })

    it('should toggle item selection', () => {
      const { items, selectedItems, setItems, toggleSelection } = useListComponent()
      
      const testItems = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
      setItems(testItems)
      
      toggleSelection(testItems[0])
      expect(selectedItems.value).toContain(testItems[0])
      
      toggleSelection(testItems[0])
      expect(selectedItems.value).not.toContain(testItems[0])
    })

    it('should select and deselect all items', () => {
      const { items, selectedItems, setItems, selectAll, clearSelection } = useListComponent()
      
      const testItems = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
      setItems(testItems)
      
      selectAll()
      expect(selectedItems.value).toHaveLength(2)
      
      clearSelection()
      expect(selectedItems.value).toHaveLength(0)
    })

    it('should handle pagination', () => {
      const { page, pageSize, hasMore, setPage, nextPage, prevPage } = useListComponent()
      
      expect(page.value).toBe(1)
      expect(pageSize.value).toBe(20)
      
      setPage(2)
      expect(page.value).toBe(2)
      
      prevPage()
      expect(page.value).toBe(1)
      
      // Should not go below 1
      prevPage()
      expect(page.value).toBe(1)
      
      // Set total to enable hasMore
      const total = ref(100)
      expect(hasMore.value).toBe(true)
      
      nextPage()
      expect(page.value).toBe(2)
    })

    it('should handle search and filters', () => {
      const { page, searchQuery, filters, sortBy, sortOrder, setSearch, setFilters, setSorting } = useListComponent()
      
      setSearch('test query')
      expect(searchQuery.value).toBe('test query')
      expect(page.value).toBe(1) // Should reset page
      
      setFilters({ category: 'test', status: 'active' })
      expect(filters.value).toEqual({ category: 'test', status: 'active' })
      expect(page.value).toBe(1)
      
      setSorting('name', 'desc')
      expect(sortBy.value).toBe('name')
      expect(sortOrder.value).toBe('desc')
      expect(page.value).toBe(1)
    })

    it('should emit refresh event', () => {
      const emit = vi.fn()
      const { refresh } = useListComponent(emit)
      
      refresh()
      expect(emit).toHaveBeenCalledWith('refresh')
    })
  })
})