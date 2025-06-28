/**
 * 统一的数据源状态管理器
 * 解决多个组件和服务之间的数据源状态同步问题
 */

import { ref, computed } from 'vue'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import eventBus from '@/utils/eventBus'

// 全局状态
const currentDataSource = ref<DataSourceType>('eastmoney')
const isInitialized = ref(false)
const lastSwitchTime = ref<number>(0)

// 获取localStorage中的数据源
const getStoredDataSource = (): DataSourceType | null => {
  try {
    const stored = localStorage.getItem('preferredDataSource')
    if (stored) {
      const availableSources = DataSourceFactory.getAvailableDataSources()
      if (availableSources.includes(stored as DataSourceType)) {
        return stored as DataSourceType
      }
    }
  } catch (error) {
    console.error('[DataSourceStateManager] 读取localStorage失败:', error)
  }
  return null
}

// 保存数据源到localStorage
const saveDataSourceToStorage = (source: DataSourceType): boolean => {
  try {
    localStorage.setItem('preferredDataSource', source)
    localStorage.setItem('last_source_switch_time', Date.now().toString())

    // 验证保存结果
    const stored = localStorage.getItem('preferredDataSource')
    if (stored !== source) {
      console.error(`[DataSourceStateManager] localStorage保存失败: 期望 ${source}, 实际 ${stored}`)
      return false
    }

    console.log(`[DataSourceStateManager] 数据源已保存到localStorage: ${source}`)
    return true
  } catch (error) {
    console.error('[DataSourceStateManager] 保存到localStorage失败:', error)
    return false
  }
}

// 初始化数据源状态
const initializeDataSource = (): DataSourceType => {
  if (isInitialized.value) {
    return currentDataSource.value
  }

  console.log('[DataSourceStateManager] 初始化数据源状态')

  // 从localStorage获取保存的数据源
  const storedSource = getStoredDataSource()

  if (storedSource) {
    console.log(`[DataSourceStateManager] 从localStorage恢复数据源: ${storedSource}`)
    currentDataSource.value = storedSource
  } else {
    // 使用默认数据源
    const defaultSource = 'eastmoney'
    console.log(`[DataSourceStateManager] 使用默认数据源: ${defaultSource}`)
    currentDataSource.value = defaultSource
    saveDataSourceToStorage(defaultSource)
  }

  // 获取上次切换时间
  try {
    const lastSwitch = localStorage.getItem('last_source_switch_time')
    if (lastSwitch) {
      lastSwitchTime.value = parseInt(lastSwitch)
    }
  } catch (error) {
    console.error('[DataSourceStateManager] 读取切换时间失败:', error)
  }

  isInitialized.value = true
  console.log(`[DataSourceStateManager] 数据源状态初始化完成: ${currentDataSource.value}`)

  return currentDataSource.value
}

// 切换数据源
const switchDataSource = (newSource: DataSourceType): boolean => {
  try {
    console.log(`[DataSourceStateManager] 切换数据源: ${currentDataSource.value} -> ${newSource}`)

    // 验证数据源是否有效
    const availableSources = DataSourceFactory.getAvailableDataSources()
    if (!availableSources.includes(newSource)) {
      console.error(`[DataSourceStateManager] 无效的数据源: ${newSource}`)
      return false
    }

    // 检查是否是当前数据源
    if (newSource === currentDataSource.value) {
      console.log(`[DataSourceStateManager] 已经是当前数据源: ${newSource}`)
      return true
    }

    // 保存到localStorage
    if (!saveDataSourceToStorage(newSource)) {
      return false
    }

    // 更新状态
    const oldSource = currentDataSource.value
    currentDataSource.value = newSource
    lastSwitchTime.value = Date.now()

    // 发出事件
    console.log(`[DataSourceStateManager] 发出数据源切换事件: ${newSource}`)
    eventBus.emit('data-source-changed', newSource)

    console.log(`[DataSourceStateManager] 数据源切换成功: ${oldSource} -> ${newSource}`)
    return true
  } catch (error) {
    console.error('[DataSourceStateManager] 切换数据源失败:', error)
    return false
  }
}

// 获取当前数据源
const getCurrentDataSource = (): DataSourceType => {
  if (!isInitialized.value) {
    return initializeDataSource()
  }
  return currentDataSource.value
}

// 获取数据源信息
const getDataSourceInfo = (source?: DataSourceType) => {
  const targetSource = source || getCurrentDataSource()
  return DataSourceFactory.getDataSourceInfo(targetSource)
}

// 计算属性
const currentDataSourceName = computed(() => {
  return getDataSourceInfo().name
})

const currentDataSourceDescription = computed(() => {
  return getDataSourceInfo().description
})

// 监听localStorage变化（处理其他标签页的变化）
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'preferredDataSource' && e.newValue) {
    const newSource = e.newValue as DataSourceType
    const availableSources = DataSourceFactory.getAvailableDataSources()

    if (availableSources.includes(newSource) && newSource !== currentDataSource.value) {
      console.log(`[DataSourceStateManager] 检测到其他标签页的数据源变化: ${currentDataSource.value} -> ${newSource}`)
      currentDataSource.value = newSource
      eventBus.emit('data-source-changed', newSource)
    }
  }
}

// 添加storage事件监听器
if (typeof window !== 'undefined') {
  window.addEventListener('storage', handleStorageChange)
}

// 导出数据源状态管理器
export const dataSourceStateManager = {
  // 状态
  currentDataSource: computed(() => currentDataSource.value),
  currentDataSourceName,
  currentDataSourceDescription,
  lastSwitchTime: computed(() => lastSwitchTime.value),
  isInitialized: computed(() => isInitialized.value),

  // 方法
  initializeDataSource,
  switchDataSource,
  getCurrentDataSource,
  getDataSourceInfo,

  // 工具方法
  getAvailableDataSources: () => DataSourceFactory.getAvailableDataSources(),

  // 清理方法
  cleanup: () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange)
    }
  }
}

// 自动初始化
initializeDataSource()

export default dataSourceStateManager
