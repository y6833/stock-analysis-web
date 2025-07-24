/**
 * 基础Store类
 * 提供统一的状态管理模式和通用功能
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export interface BaseStoreState {
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface StoreConfig {
  persistKey?: string
  enablePersist?: boolean
  enableLoading?: boolean
  enableError?: boolean
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface SearchState {
  query: string
  filters: Record<string, any>
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

/**
 * 创建基础Store状态
 */
export function createBaseState(): BaseStoreState {
  return {
    loading: false,
    error: null,
    lastUpdated: null
  }
}

/**
 * 创建分页状态
 */
export function createPaginationState(pageSize: number = 20): PaginationState {
  return {
    page: 1,
    pageSize,
    total: 0,
    hasMore: false
  }
}

/**
 * 创建搜索状态
 */
export function createSearchState(): SearchState {
  return {
    query: '',
    filters: {},
    sortBy: '',
    sortOrder: 'asc'
  }
}

/**
 * 基础Store工厂函数
 */
export function createBaseStore<T>(
  storeId: string,
  initialData: T,
  config: StoreConfig = {}
) {
  const {
    persistKey,
    enablePersist = false,
    enableLoading = true,
    enableError = true
  } = config

  return defineStore(storeId, () => {
    // 基础状态
    const loading = ref(false)
    const error = ref<string | null>(null)
    const lastUpdated = ref<Date | null>(null)
    
    // 数据状态
    const data = ref<T>(initialData)

    // 计算属性
    const hasData = computed(() => {
      if (Array.isArray(data.value)) {
        return data.value.length > 0
      }
      return data.value !== null && data.value !== undefined
    })

    const isReady = computed(() => !loading.value && !error.value)

    // 基础操作
    const setLoading = (value: boolean) => {
      if (enableLoading) {
        loading.value = value
      }
    }

    const setError = (errorMessage: string | null) => {
      if (enableError) {
        error.value = errorMessage
      }
    }

    const clearError = () => {
      error.value = null
    }

    const setData = (newData: T) => {
      data.value = newData
      lastUpdated.value = new Date()
      clearError()
    }

    const updateData = (updater: (current: T) => T) => {
      data.value = updater(data.value)
      lastUpdated.value = new Date()
    }

    const reset = () => {
      data.value = initialData
      loading.value = false
      error.value = null
      lastUpdated.value = null
    }

    // 异步操作包装器
    const withAsyncOperation = async <R>(
      operation: () => Promise<R>,
      errorMessage: string = '操作失败'
    ): Promise<R | null> => {
      try {
        setLoading(true)
        clearError()
        const result = await operation()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    }

    // 持久化功能
    if (enablePersist && persistKey) {
      // 从localStorage恢复数据
      const savedData = localStorage.getItem(persistKey)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          data.value = parsed.data || initialData
          lastUpdated.value = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null
        } catch (err) {
          console.warn(`Failed to restore data for ${storeId}:`, err)
        }
      }

      // 监听数据变化并保存
      watch(
        [data, lastUpdated],
        ([newData, newLastUpdated]) => {
          try {
            localStorage.setItem(persistKey, JSON.stringify({
              data: newData,
              lastUpdated: newLastUpdated?.toISOString()
            }))
          } catch (err) {
            console.warn(`Failed to persist data for ${storeId}:`, err)
          }
        },
        { deep: true }
      )
    }

    return {
      // 状态
      loading: enableLoading ? loading : ref(false),
      error: enableError ? error : ref(null),
      lastUpdated,
      data,
      
      // 计算属性
      hasData,
      isReady,
      
      // 操作方法
      setLoading,
      setError,
      clearError,
      setData,
      updateData,
      reset,
      withAsyncOperation
    }
  })
}

/**
 * 创建列表Store
 */
export function createListStore<T>(
  storeId: string,
  config: StoreConfig & { pageSize?: number } = {}
) {
  const { pageSize = 20, ...baseConfig } = config

  return defineStore(storeId, () => {
    // 基础Store
    const baseStore = createBaseStore<T[]>(storeId + '_base', [], baseConfig)()
    
    // 分页状态
    const pagination = ref(createPaginationState(pageSize))
    
    // 搜索状态
    const search = ref(createSearchState())

    // 计算属性
    const isEmpty = computed(() => baseStore.data.length === 0)
    const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize))

    // 分页操作
    const setPage = (page: number) => {
      pagination.value.page = Math.max(1, page)
    }

    const nextPage = () => {
      if (pagination.value.hasMore) {
        setPage(pagination.value.page + 1)
      }
    }

    const prevPage = () => {
      if (pagination.value.page > 1) {
        setPage(pagination.value.page - 1)
      }
    }

    const setPageSize = (size: number) => {
      pagination.value.pageSize = Math.max(1, size)
      pagination.value.page = 1 // 重置到第一页
    }

    const updatePagination = (total: number, hasMore?: boolean) => {
      pagination.value.total = total
      pagination.value.hasMore = hasMore ?? (pagination.value.page * pagination.value.pageSize < total)
    }

    // 搜索操作
    const setQuery = (query: string) => {
      search.value.query = query
      pagination.value.page = 1 // 重置到第一页
    }

    const setFilters = (filters: Record<string, any>) => {
      search.value.filters = { ...filters }
      pagination.value.page = 1 // 重置到第一页
    }

    const setSorting = (sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
      search.value.sortBy = sortBy
      search.value.sortOrder = sortOrder
      pagination.value.page = 1 // 重置到第一页
    }

    const clearSearch = () => {
      search.value = createSearchState()
      pagination.value.page = 1
    }

    // 列表操作
    const addItem = (item: T) => {
      baseStore.updateData(current => [...current, item])
      pagination.value.total += 1
    }

    const removeItem = (predicate: (item: T) => boolean) => {
      baseStore.updateData(current => current.filter(item => !predicate(item)))
      pagination.value.total = Math.max(0, pagination.value.total - 1)
    }

    const updateItem = (predicate: (item: T) => boolean, updater: (item: T) => T) => {
      baseStore.updateData(current => 
        current.map(item => predicate(item) ? updater(item) : item)
      )
    }

    const replaceItems = (items: T[], total?: number) => {
      baseStore.setData(items)
      if (total !== undefined) {
        updatePagination(total)
      }
    }

    const appendItems = (items: T[]) => {
      baseStore.updateData(current => [...current, ...items])
    }

    // 重置
    const resetList = () => {
      baseStore.reset()
      pagination.value = createPaginationState(pageSize)
      search.value = createSearchState()
    }

    return {
      // 继承基础Store的所有功能
      ...baseStore,
      
      // 分页状态
      pagination,
      search,
      
      // 计算属性
      isEmpty,
      totalPages,
      
      // 分页操作
      setPage,
      nextPage,
      prevPage,
      setPageSize,
      updatePagination,
      
      // 搜索操作
      setQuery,
      setFilters,
      setSorting,
      clearSearch,
      
      // 列表操作
      addItem,
      removeItem,
      updateItem,
      replaceItems,
      appendItems,
      resetList
    }
  })
}

/**
 * 创建详情Store
 */
export function createDetailStore<T>(
  storeId: string,
  initialData: T,
  config: StoreConfig = {}
) {
  return defineStore(storeId, () => {
    const baseStore = createBaseStore<T>(storeId + '_base', initialData, config)()
    
    // 详情特有的状态
    const isEditing = ref(false)
    const originalData = ref<T>(initialData)
    const isDirty = computed(() => 
      JSON.stringify(baseStore.data) !== JSON.stringify(originalData.value)
    )

    // 编辑操作
    const startEdit = () => {
      originalData.value = JSON.parse(JSON.stringify(baseStore.data))
      isEditing.value = true
    }

    const cancelEdit = () => {
      baseStore.setData(originalData.value)
      isEditing.value = false
    }

    const saveEdit = () => {
      originalData.value = JSON.parse(JSON.stringify(baseStore.data))
      isEditing.value = false
    }

    const updateField = <K extends keyof T>(field: K, value: T[K]) => {
      baseStore.updateData(current => ({
        ...current,
        [field]: value
      }))
    }

    return {
      ...baseStore,
      
      // 编辑状态
      isEditing,
      isDirty,
      
      // 编辑操作
      startEdit,
      cancelEdit,
      saveEdit,
      updateField
    }
  })
}

export default {
  createBaseStore,
  createListStore,
  createDetailStore,
  createBaseState,
  createPaginationState,
  createSearchState
}