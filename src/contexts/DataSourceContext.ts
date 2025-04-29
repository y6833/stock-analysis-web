import { createContext, reactive, ref, provide, inject, computed, watch } from 'vue'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'

// 默认数据源
const DEFAULT_DATA_SOURCE: DataSourceType = 'tushare'

// 数据源上下文接口
export interface DataSourceContextInterface {
  // 当前数据源类型
  currentDataSource: DataSourceType
  // 切换数据源
  switchDataSource: (type: DataSourceType) => Promise<boolean>
  // 获取数据源信息
  getDataSourceInfo: (type: DataSourceType) => { name: string; description: string }
  // 测试数据源连接
  testDataSource: (type: DataSourceType) => Promise<boolean>
  // 清除数据源缓存
  clearDataSourceCache: (type: DataSourceType) => Promise<boolean>
  // 获取所有可用数据源
  availableDataSources: DataSourceType[]
  // 获取当前数据源名称
  currentDataSourceName: string
}

// 创建上下文
export const DataSourceContext = createContext<DataSourceContextInterface>()

// 数据源提供者
export function useDataSourceProvider() {
  const { showToast } = useToast()
  
  // 从本地存储获取当前数据源类型
  const getCurrentDataSourceType = (): DataSourceType => {
    const savedSource = localStorage.getItem('preferredDataSource')
    return (savedSource as DataSourceType) || DEFAULT_DATA_SOURCE
  }
  
  // 当前数据源类型
  const currentDataSource = ref<DataSourceType>(getCurrentDataSourceType())
  
  // 可用数据源
  const availableDataSources = DataSourceFactory.getAvailableDataSources()
  
  // 当前数据源名称
  const currentDataSourceName = computed(() => {
    return DataSourceFactory.getDataSourceInfo(currentDataSource.value).name
  })
  
  // 切换数据源
  const switchDataSource = async (type: DataSourceType): Promise<boolean> => {
    try {
      // 检查是否是当前数据源
      if (type === currentDataSource.value) {
        showToast(`已经是${DataSourceFactory.getDataSourceInfo(type).name}，无需切换`, 'info')
        return true
      }
      
      // 更新当前数据源
      currentDataSource.value = type
      localStorage.setItem('preferredDataSource', type)
      
      // 记录切换时间
      localStorage.setItem('last_source_switch_time', Date.now().toString())
      
      // 发出数据源切换事件
      eventBus.emit('data-source-changed', type)
      
      showToast(`已切换到${DataSourceFactory.getDataSourceInfo(type).name}`, 'success')
      return true
    } catch (error) {
      console.error('切换数据源失败:', error)
      showToast('切换数据源失败', 'error')
      return false
    }
  }
  
  // 获取数据源信息
  const getDataSourceInfo = (type: DataSourceType) => {
    return DataSourceFactory.getDataSourceInfo(type)
  }
  
  // 测试数据源连接
  const testDataSource = async (type: DataSourceType): Promise<boolean> => {
    try {
      // 创建一个临时的数据源实例
      const testDataSource = DataSourceFactory.createDataSource(type)
      
      // 调用测试连接方法
      const result = await testDataSource.testConnection()
      
      if (result) {
        showToast(`${testDataSource.getName()}连接测试成功`, 'success')
      } else {
        showToast(`${testDataSource.getName()}连接测试失败`, 'error')
      }
      
      return result
    } catch (error) {
      console.error(`${type}数据源连接测试失败:`, error)
      showToast(
        `数据源连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'error'
      )
      return false
    }
  }
  
  // 清除数据源缓存
  const clearDataSourceCache = async (type: DataSourceType): Promise<boolean> => {
    try {
      // 清除本地存储中的缓存
      const cacheKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith(`${type}_`) || key.includes(`_${type}_`) || key.endsWith(`_${type}`)
      )
      
      if (cacheKeys.length > 0) {
        cacheKeys.forEach((key) => localStorage.removeItem(key))
        console.log(`已清除${type}数据源的${cacheKeys.length}项本地缓存`)
      }
      
      // 清除Redis缓存（通过API）
      try {
        const response = await fetch(`/api/cache/${type}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        const data = await response.json()
        
        if (data && data.success) {
          console.log(`已清除${type}数据源的Redis缓存: ${data.message}`)
        }
      } catch (redisError) {
        console.warn(`清除${type}数据源的Redis缓存失败:`, redisError)
        // 继续执行，不影响本地缓存的清除
      }
      
      showToast(`已清除${DataSourceFactory.getDataSourceInfo(type).name}的缓存数据`, 'success')
      
      // 发出缓存清除事件
      eventBus.emit('data-source-cache-cleared', type)
      
      return true
    } catch (error) {
      console.error(`清除${type}数据源缓存失败:`, error)
      showToast(`清除缓存失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
      return false
    }
  }
  
  // 提供上下文
  provide(DataSourceContext, {
    currentDataSource: currentDataSource.value,
    switchDataSource,
    getDataSourceInfo,
    testDataSource,
    clearDataSourceCache,
    availableDataSources,
    currentDataSourceName: currentDataSourceName.value,
  })
  
  // 监听数据源变化
  watch(currentDataSource, (newValue) => {
    console.log(`数据源已切换到: ${newValue}`)
    // 可以在这里添加其他数据源变化时的逻辑
  })
  
  return {
    currentDataSource,
    switchDataSource,
    getDataSourceInfo,
    testDataSource,
    clearDataSourceCache,
    availableDataSources,
    currentDataSourceName,
  }
}

// 使用数据源上下文的钩子
export function useDataSource(): DataSourceContextInterface {
  const context = inject(DataSourceContext)
  
  if (!context) {
    throw new Error('useDataSource must be used within a DataSourceProvider')
  }
  
  return context
}
