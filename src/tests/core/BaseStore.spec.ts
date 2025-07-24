/**
 * BaseStore 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { 
  createBaseStore, 
  createListStore, 
  createDetailStore,
  createBaseState,
  createPaginationState,
  createSearchState
} from '@/core/BaseStore'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('BaseStore utilities', () => {
  describe('createBaseState', () => {
    it('should create base state with default values', () => {
      const state = createBaseState()
      
      expect(state).toEqual({
        loading: false,
        error: null,
        lastUpdated: null
      })
    })
  })

  describe('createPaginationState', () => {
    it('should create pagination state with default page size', () => {
      const state = createPaginationState()
      
      expect(state).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        hasMore: false
      })
    })

    it('should create pagination state with custom page size', () => {
      const state = createPaginationState(50)
      
      expect(state.pageSize).toBe(50)
    })
  })

  describe('createSearchState', () => {
    it('should create search state with default values', () => {
      const state = createSearchState()
      
      expect(state).toEqual({
        query: '',
        filters: {},
        sortBy: '',
        sortOrder: 'asc'
      })
    })
  })
})

describe('createBaseStore', () => {
  let pinia: any

  beforeEach(() => {
    const app = createApp({})
    pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create store with initial data', () => {
    const initialData = { name: 'test', value: 123 }
    const useTestStore = createBaseStore('test', initialData)
    const store = useTestStore()

    expect(store.data).toEqual(initialData)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    expect(store.hasData).toBe(true)
    expect(store.isReady).toBe(true)
  })

  it('should handle loading state', () => {
    const useTestStore = createBaseStore('test', null)
    const store = useTestStore()

    store.setLoading(true)
    expect(store.loading).toBe(true)
    expect(store.isReady).toBe(false)

    store.setLoading(false)
    expect(store.loading).toBe(false)
  })

  it('should handle error state', () => {
    const useTestStore = createBaseStore('test', null)
    const store = useTestStore()

    store.setError('Test error')
    expect(store.error).toBe('Test error')
    expect(store.isReady).toBe(false)

    store.clearError()
    expect(store.error).toBe(null)
    expect(store.isReady).toBe(true)
  })

  it('should update data and timestamp', () => {
    const useTestStore = createBaseStore('test', { count: 0 })
    const store = useTestStore()

    const newData = { count: 1 }
    store.setData(newData)

    expect(store.data).toEqual(newData)
    expect(store.lastUpdated).toBeInstanceOf(Date)
    expect(store.error).toBe(null)
  })

  it('should update data with updater function', () => {
    const useTestStore = createBaseStore('test', { count: 0 })
    const store = useTestStore()

    store.updateData(current => ({ count: current.count + 1 }))

    expect(store.data.count).toBe(1)
    expect(store.lastUpdated).toBeInstanceOf(Date)
  })

  it('should reset to initial state', () => {
    const initialData = { count: 0 }
    const useTestStore = createBaseStore('test', initialData)
    const store = useTestStore()

    store.setData({ count: 5 })
    store.setError('Test error')
    store.setLoading(true)

    store.reset()

    expect(store.data).toEqual(initialData)
    expect(store.error).toBe(null)
    expect(store.loading).toBe(false)
    expect(store.lastUpdated).toBe(null)
  })

  it('should handle async operations', async () => {
    const useTestStore = createBaseStore('test', null)
    const store = useTestStore()

    const mockOperation = vi.fn().mockResolvedValue('success')
    
    const result = await store.withAsyncOperation(mockOperation)

    expect(result).toBe('success')
    expect(mockOperation).toHaveBeenCalled()
  })

  it('should handle async operation errors', async () => {
    const useTestStore = createBaseStore('test', null)
    const store = useTestStore()

    const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'))
    
    const result = await store.withAsyncOperation(mockOperation)

    expect(result).toBe(null)
    expect(store.error).toBe('Test error')
  })

  it('should persist data when enabled', () => {
    const initialData = { name: 'test' }
    const persistKey = 'test-store'
    
    // Mock localStorage to return saved data
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      data: { name: 'persisted' },
      lastUpdated: '2023-01-01T00:00:00.000Z'
    }))

    const useTestStore = createBaseStore('test', initialData, {
      enablePersist: true,
      persistKey
    })
    const store = useTestStore()

    expect(store.data).toEqual({ name: 'persisted' })
    expect(localStorageMock.getItem).toHaveBeenCalledWith(persistKey)
  })

  it('should save data to localStorage when persistence is enabled', async () => {
    const useTestStore = createBaseStore('test', { count: 0 }, {
      enablePersist: true,
      persistKey: 'test-store'
    })
    const store = useTestStore()

    store.setData({ count: 1 })

    // Wait for the watcher to trigger
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})

describe('createListStore', () => {
  let pinia: any

  beforeEach(() => {
    const app = createApp({})
    pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  it('should create list store with pagination and search', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    expect(store.data).toEqual([])
    expect(store.isEmpty).toBe(true)
    expect(store.pagination.page).toBe(1)
    expect(store.pagination.pageSize).toBe(20)
    expect(store.search.query).toBe('')
  })

  it('should handle pagination operations', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    store.setPage(2)
    expect(store.pagination.page).toBe(2)

    store.setPageSize(50)
    expect(store.pagination.pageSize).toBe(50)
    expect(store.pagination.page).toBe(1) // Should reset to first page

    store.updatePagination(100, true)
    expect(store.pagination.total).toBe(100)
    expect(store.pagination.hasMore).toBe(true)
  })

  it('should handle search operations', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    store.setQuery('test query')
    expect(store.search.query).toBe('test query')
    expect(store.pagination.page).toBe(1) // Should reset to first page

    store.setFilters({ category: 'test' })
    expect(store.search.filters).toEqual({ category: 'test' })

    store.setSorting('name', 'desc')
    expect(store.search.sortBy).toBe('name')
    expect(store.search.sortOrder).toBe('desc')

    store.clearSearch()
    expect(store.search.query).toBe('')
    expect(store.search.filters).toEqual({})
  })

  it('should handle list operations', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    const items = [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }]
    
    store.replaceItems(items, 10)
    expect(store.data).toEqual(items)
    expect(store.pagination.total).toBe(10)
    expect(store.isEmpty).toBe(false)

    store.addItem({ id: 3, name: 'item3' })
    expect(store.data).toHaveLength(3)
    expect(store.pagination.total).toBe(11)

    store.removeItem(item => item.id === 2)
    expect(store.data).toHaveLength(2)
    expect(store.data.find(item => item.id === 2)).toBeUndefined()

    store.updateItem(item => item.id === 1, item => ({ ...item, name: 'updated' }))
    expect(store.data.find(item => item.id === 1)?.name).toBe('updated')
  })

  it('should calculate total pages correctly', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    store.setPageSize(10)
    store.updatePagination(25)

    expect(store.totalPages).toBe(3)
  })

  it('should handle next and previous page navigation', () => {
    const useListStore = createListStore('testList')
    const store = useListStore()

    store.setPageSize(10)
    store.updatePagination(25, true)

    // Test next page
    store.nextPage()
    expect(store.pagination.page).toBe(2)

    // Test previous page
    store.prevPage()
    expect(store.pagination.page).toBe(1)

    // Test previous page at first page (should not change)
    store.prevPage()
    expect(store.pagination.page).toBe(1)
  })
})

describe('createDetailStore', () => {
  let pinia: any

  beforeEach(() => {
    const app = createApp({})
    pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
  })

  it('should create detail store with editing capabilities', () => {
    const initialData = { id: 1, name: 'test' }
    const useDetailStore = createDetailStore('testDetail', initialData)
    const store = useDetailStore()

    expect(store.data).toEqual(initialData)
    expect(store.isEditing).toBe(false)
    expect(store.isDirty).toBe(false)
  })

  it('should handle editing operations', () => {
    const initialData = { id: 1, name: 'test' }
    const useDetailStore = createDetailStore('testDetail', initialData)
    const store = useDetailStore()

    store.startEdit()
    expect(store.isEditing).toBe(true)

    store.updateField('name', 'updated')
    expect(store.data.name).toBe('updated')
    expect(store.isDirty).toBe(true)

    store.cancelEdit()
    expect(store.data.name).toBe('test') // Should revert
    expect(store.isEditing).toBe(false)
    expect(store.isDirty).toBe(false)
  })

  it('should save edits', () => {
    const initialData = { id: 1, name: 'test' }
    const useDetailStore = createDetailStore('testDetail', initialData)
    const store = useDetailStore()

    store.startEdit()
    store.updateField('name', 'updated')
    store.saveEdit()

    expect(store.data.name).toBe('updated')
    expect(store.isEditing).toBe(false)
    expect(store.isDirty).toBe(false)
  })
})