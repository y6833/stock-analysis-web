import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DataSourceType } from '@/services/dataSource/DataSourceFactory'
import { DataSourceFactory } from '@/services/dataSource/DataSourceFactory'
import axios from 'axios'
import { useToast } from '@/composables/useToast'
import eventBus from '@/utils/eventBus'
import { useLogger } from '@/composables/useLogger'
import { useUserStore } from '@/stores/userStore'

// 禁用的数据源列表
const DISABLED_SOURCES: DataSourceType[] = ['tushare']

// 默认数据源
const DEFAULT_DATA_SOURCE: DataSourceType = 'eastmoney'

// 数据源状态类型
export interface DataSourceStatus {
  isOnline: boolean
  lastChecked: string
  responseTime: string
  error?: string
}

// 数据源配置类型
export interface DataSourceConfig {
  apiKey?: string
  apiUrl?: string
  requestLimit?: number
  timeout?: number
  proxyEnabled?: boolean
  cacheDuration?: number
  customHeaders?: Record<string, string>
  [key: string]: any
}

export const useDataSourceStore = defineStore('dataSource', () => {
  const { showToast } = useToast()
  const logger = useLogger('DataSourceStore')

  // 所有可用的数据源
  const availableSources = ref<DataSourceType[]>(
    DataSourceFactory.getAvailableDataSources().filter(
      (source) => !DISABLED_SOURCES.includes(source)
    )
  )

  // 当前数据源
  const currentSource = ref<DataSourceType>(getInitialDataSource())

  // 数据源实例
  const dataSourceInstance = ref(DataSourceFactory.createDataSource(currentSource.value))

  // 数据源状态
  const sourcesStatus = ref<Record<DataSourceType, DataSourceStatus>>(
    {} as Record<DataSourceType, DataSourceStatus>
  )

  // 数据源配置
  const sourcesConfig = ref<Record<DataSourceType, DataSourceConfig>>(
    {} as Record<DataSourceType, DataSourceConfig>
  )

  // 上次数据源切换时间
  const lastSwitchTime = ref<number>(
    parseInt(localStorage.getItem('last_source_switch_time') || '0')
  )

  // 是否正在加载数据
  const isLoading = ref(false)

  // 是否有错误
  const hasError = ref(false)

  // 错误消息
  const errorMessage = ref('')

  // 缓存统计信息
  const cacheStatsMap = ref<
    Record<
      DataSourceType,
      {
        redisCacheCount: number
        localCacheCount: number
        lastCleared: string
      }
    >
  >(
    {} as Record<
      DataSourceType,
      {
        redisCacheCount: number
        localCacheCount: number
        lastCleared: string
      }
    >
  )

  // 计算属性：当前数据源名称
  const currentSourceName = computed(() => {
    return DataSourceFactory.getDataSourceInfo(currentSource.value).name
  })

  // 计算属性：当前数据源描述
  const currentSourceDescription = computed(() => {
    return DataSourceFactory.getDataSourceInfo(currentSource.value).description
  })

  // 计算属性：当前数据源状态
  const currentSourceStatus = computed(() => {
    return (
      sourcesStatus.value[currentSource.value] || {
        isOnline: false,
        lastChecked: '未检查',
        responseTime: '未知',
      }
    )
  })

  // 计算属性：当前数据源配置
  const currentSourceConfig = computed(() => {
    return sourcesConfig.value[currentSource.value] || {}
  })

  // 计算属性：是否可以切换数据源（冷却时间检查）
  const canSwitchSource = computed(() => {
    const now = Date.now()
    const elapsed = now - lastSwitchTime.value
    const cooldownPeriod = 60 * 60 * 1000 // 1小时
    return elapsed >= cooldownPeriod
  })

  // 计算属性：剩余冷却时间（分钟）
  const remainingCooldown = computed(() => {
    const now = Date.now()
    const elapsed = now - lastSwitchTime.value
    const cooldownPeriod = 60 * 60 * 1000 // 1小时
    const remainingMs = Math.max(0, cooldownPeriod - elapsed)
    return Math.ceil(remainingMs / (60 * 1000))
  })

  // 计算属性：当前数据源缓存统计
  const currentSourceCacheStats = computed(() => {
    return (
      cacheStatsMap.value[currentSource.value] || {
        redisCacheCount: 0,
        localCacheCount: 0,
        lastCleared: '未清除',
      }
    )
  })

  // 获取初始数据源
  function getInitialDataSource(): DataSourceType {
    const savedSource = localStorage.getItem('preferredDataSource') as DataSourceType

    // 如果localStorage中有值，且不是禁用的数据源，使用该值
    if (
      savedSource &&
      !DISABLED_SOURCES.includes(savedSource) &&
      availableSources.value.includes(savedSource)
    ) {
      logger.info(`从localStorage获取数据源类型: ${savedSource}`)
      return savedSource
    }

    // 如果localStorage中的值是禁用的数据源，使用默认数据源
    if (savedSource && DISABLED_SOURCES.includes(savedSource)) {
      logger.warn(
        `检测到禁用的数据源: ${savedSource}，自动切换到默认数据源: ${DEFAULT_DATA_SOURCE}`
      )
      localStorage.setItem('preferredDataSource', DEFAULT_DATA_SOURCE)
      return DEFAULT_DATA_SOURCE
    }

    // 如果localStorage中没有值或值无效，设置默认值并保存
    logger.info(`localStorage中没有有效的数据源类型，使用默认值: ${DEFAULT_DATA_SOURCE}`)
    localStorage.setItem('preferredDataSource', DEFAULT_DATA_SOURCE)
    return DEFAULT_DATA_SOURCE
  }

  // 初始化数据源状态
  async function initializeStore() {
    logger.info('初始化数据源Store')

    try {
      isLoading.value = true
      hasError.value = false
      errorMessage.value = ''

      // 加载数据源配置
      await loadSourcesConfig()

      // 检查当前数据源状态
      await checkCurrentSourceStatus()

      // 加载缓存统计信息
      await loadCacheStats()

      logger.info('数据源Store初始化完成')
    } catch (error) {
      hasError.value = true
      errorMessage.value = error instanceof Error ? error.message : '初始化数据源Store失败'
      logger.error('初始化数据源Store失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 切换数据源
  async function switchDataSource(source: DataSourceType): Promise<boolean> {
    try {
      // 获取用户存储
      const userStore = useUserStore()
      const isAdmin = userStore.userRole === 'admin'

      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`尝试切换到禁用的数据源: ${source}`)
        showToast(`数据源 ${source} 已被禁用，请选择其他数据源`, 'warning')
        return false
      }

      // 检查是否是当前数据源
      if (source === currentSource.value) {
        logger.info(`已经是${DataSourceFactory.getDataSourceInfo(source).name}，无需切换`)
        showToast(`已经是${DataSourceFactory.getDataSourceInfo(source).name}，无需切换`, 'info')
        return true
      }

      // 检查冷却时间（管理员不受限制）
      if (!canSwitchSource.value && !isAdmin) {
        logger.warn(`数据源切换过于频繁，请在 ${remainingCooldown.value} 分钟后再试`)
        showToast(`数据源切换过于频繁，请在 ${remainingCooldown.value} 分钟后再试`, 'warning')
        return false
      }

      // 管理员日志记录
      if (isAdmin && !canSwitchSource.value) {
        logger.info('管理员用户，跳过数据源切换冷却时间检查')
      }

      logger.info(`切换数据源: 从 ${currentSource.value} 到 ${source}`)

      // 更新数据源实例
      dataSourceInstance.value = DataSourceFactory.createDataSource(source)

      // 更新当前数据源
      currentSource.value = source

      // 保存到本地存储
      localStorage.setItem('preferredDataSource', source)
      logger.info(`已保存数据源设置到localStorage: ${source}`)

      // 记录切换时间
      lastSwitchTime.value = Date.now()
      localStorage.setItem('last_source_switch_time', lastSwitchTime.value.toString())

      // 确认localStorage中的值已正确设置
      const storedValue = localStorage.getItem('preferredDataSource')
      logger.info(`确认localStorage中的数据源设置: ${storedValue}`)

      // 如果localStorage中的值与期望的不一致，尝试再次设置
      if (storedValue !== source) {
        logger.warn(`localStorage中的数据源设置不一致，再次尝试设置: ${storedValue} != ${source}`)
        localStorage.setItem('preferredDataSource', source)
        // 再次确认
        const recheck = localStorage.getItem('preferredDataSource')
        logger.info(`再次确认localStorage中的数据源设置: ${recheck}`)
      }

      // 发出数据源切换事件
      eventBus.emit('data-source-changed', source)

      // 检查新数据源状态
      await checkSourceStatus(source)

      showToast(`已切换到${DataSourceFactory.getDataSourceInfo(source).name}`, 'success')

      return true
    } catch (error) {
      logger.error('切换数据源失败:', error)
      showToast('切换数据源失败', 'error')
      return false
    }
  }

  // 测试数据源连接
  async function testDataSource(source: DataSourceType): Promise<boolean> {
    try {
      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`尝试测试禁用的数据源: ${source}`)
        showToast(`数据源 ${source} 已被禁用，无法测试`, 'warning')
        return false
      }

      // 如果要测试的数据源不是当前选择的数据源，则跳过测试
      if (source !== currentSource.value) {
        logger.info(`跳过测试非当前数据源: ${source}，当前数据源是: ${currentSource.value}`)
        showToast(`为避免不必要的API调用，只测试当前数据源: ${currentSourceName.value}`, 'info')
        return true
      }

      logger.info(`测试数据源连接: ${source}`)

      const startTime = Date.now()

      // 使用新的API路径，传递source参数
      const response = await axios.get('/api/data-source/test', {
        params: {
          source,
          currentSource: currentSource.value,
        },
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      // 更新数据源状态
      sourcesStatus.value[source] = {
        isOnline: response.data && response.data.success,
        lastChecked: new Date().toLocaleTimeString(),
        responseTime: `${responseTime}ms`,
        error: response.data && !response.data.success ? response.data.message : undefined,
      }

      if (response.data && response.data.success) {
        logger.info(`${DataSourceFactory.getDataSourceInfo(source).name}连接测试成功`)
        showToast(`${DataSourceFactory.getDataSourceInfo(source).name}连接测试成功`, 'success')
        return true
      } else {
        logger.error(
          `${DataSourceFactory.getDataSourceInfo(source).name}连接测试失败: ${
            response.data.message
          }`
        )
        showToast(`${DataSourceFactory.getDataSourceInfo(source).name}连接测试失败`, 'error')
        return false
      }
    } catch (error) {
      logger.error(`${source}数据源连接测试失败:`, error)

      // 更新数据源状态
      sourcesStatus.value[source] = {
        isOnline: false,
        lastChecked: new Date().toLocaleTimeString(),
        responseTime: '失败',
        error: error instanceof Error ? error.message : '未知错误',
      }

      showToast(
        `数据源连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'error'
      )
      return false
    }
  }

  // 检查数据源状态
  async function checkSourceStatus(source: DataSourceType) {
    try {
      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`跳过检查禁用的数据源状态: ${source}`)

        // 更新为未知状态
        sourcesStatus.value[source] = {
          isOnline: false,
          lastChecked: '已禁用',
          responseTime: '已禁用',
          error: '此数据源已被禁用',
        }

        return false
      }

      logger.info(`检查数据源状态: ${source}`)

      return await testDataSource(source)
    } catch (error) {
      logger.error(`检查数据源状态失败: ${source}`, error)
      return false
    }
  }

  // 检查当前数据源状态
  async function checkCurrentSourceStatus() {
    return await checkSourceStatus(currentSource.value)
  }

  // 加载数据源配置
  async function loadSourcesConfig() {
    try {
      logger.info('加载数据源配置')

      // 从localStorage加载配置
      const savedConfig = localStorage.getItem('dataSourcesConfig')
      if (savedConfig) {
        sourcesConfig.value = JSON.parse(savedConfig)
        logger.info('从localStorage加载数据源配置成功')
      } else {
        // 初始化默认配置
        availableSources.value.forEach((source) => {
          sourcesConfig.value[source] = getDefaultConfig(source)
        })

        // 保存到localStorage
        saveSourcesConfig()
        logger.info('初始化默认数据源配置')
      }
    } catch (error) {
      logger.error('加载数据源配置失败:', error)
      throw error
    }
  }

  // 保存数据源配置
  function saveSourcesConfig() {
    try {
      localStorage.setItem('dataSourcesConfig', JSON.stringify(sourcesConfig.value))
      logger.info('保存数据源配置到localStorage成功')
      return true
    } catch (error) {
      logger.error('保存数据源配置失败:', error)
      return false
    }
  }

  // 更新数据源配置
  function updateSourceConfig(source: DataSourceType, config: Partial<DataSourceConfig>) {
    try {
      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`尝试更新禁用的数据源配置: ${source}`)
        showToast(`数据源 ${source} 已被禁用，无法更新配置`, 'warning')
        return false
      }

      logger.info(`更新数据源配置: ${source}`, config)

      // 更新配置
      sourcesConfig.value[source] = {
        ...sourcesConfig.value[source],
        ...config,
      }

      // 保存到localStorage
      saveSourcesConfig()

      // 如果更新的是当前数据源，可能需要重新创建实例
      if (source === currentSource.value) {
        dataSourceInstance.value = DataSourceFactory.createDataSource(
          source,
          sourcesConfig.value[source]
        )
      }

      showToast(`${DataSourceFactory.getDataSourceInfo(source).name}配置已更新`, 'success')
      return true
    } catch (error) {
      logger.error(`更新数据源配置失败: ${source}`, error)
      showToast('更新数据源配置失败', 'error')
      return false
    }
  }

  // 重置数据源配置
  function resetSourceConfig(source: DataSourceType) {
    try {
      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`尝试重置禁用的数据源配置: ${source}`)
        showToast(`数据源 ${source} 已被禁用，无法重置配置`, 'warning')
        return false
      }

      logger.info(`重置数据源配置: ${source}`)

      // 重置为默认配置
      sourcesConfig.value[source] = getDefaultConfig(source)

      // 保存到localStorage
      saveSourcesConfig()

      // 如果重置的是当前数据源，可能需要重新创建实例
      if (source === currentSource.value) {
        dataSourceInstance.value = DataSourceFactory.createDataSource(
          source,
          sourcesConfig.value[source]
        )
      }

      showToast(`${DataSourceFactory.getDataSourceInfo(source).name}配置已重置`, 'success')
      return true
    } catch (error) {
      logger.error(`重置数据源配置失败: ${source}`, error)
      showToast('重置数据源配置失败', 'error')
      return false
    }
  }

  // 获取默认配置
  function getDefaultConfig(source: DataSourceType): DataSourceConfig {
    switch (source) {
      case 'sina':
        return {
          timeout: 10000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: false,
        }
      case 'eastmoney':
        return {
          timeout: 15000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: false,
        }
      case 'akshare':
        return {
          timeout: 20000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: true,
        }
      case 'netease':
        return {
          timeout: 10000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: false,
        }
      case 'tencent':
        return {
          timeout: 10000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: false,
        }
      case 'yahoo':
        return {
          timeout: 15000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: true,
        }
      default:
        return {
          timeout: 10000,
          cacheDuration: 60 * 60 * 1000, // 1小时
          proxyEnabled: false,
        }
    }
  }

  // 清除数据源缓存
  async function clearSourceCache(source: DataSourceType): Promise<boolean> {
    try {
      // 检查是否是禁用的数据源
      if (DISABLED_SOURCES.includes(source)) {
        logger.warn(`尝试清除禁用的数据源缓存: ${source}`)
        showToast(`数据源 ${source} 已被禁用，无法清除缓存`, 'warning')
        return false
      }

      logger.info(`清除数据源缓存: ${source}`)

      // 清除本地存储中的缓存
      const cacheKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith(`${source}_`) || key.includes(`_${source}_`) || key.endsWith(`_${source}`)
      )

      if (cacheKeys.length > 0) {
        cacheKeys.forEach((key) => localStorage.removeItem(key))
        logger.info(`已清除${source}数据源的${cacheKeys.length}项本地缓存`)
      }

      // 清除Redis缓存（通过API）
      try {
        const response = await axios.delete(`/api/cache/source/${source}`)
        if (response.data && response.data.success) {
          logger.info(`已清除${source}数据源的Redis缓存: ${response.data.message}`)
          if (response.data.count) {
            logger.info(`清除了${response.data.count}个缓存键`)
          }
        }
      } catch (redisError) {
        logger.warn(`清除${source}数据源的Redis缓存失败:`, redisError)
        // 继续执行，不影响本地缓存的清除
      }

      showToast(`已清除${DataSourceFactory.getDataSourceInfo(source).name}的缓存数据`, 'success')

      // 发出缓存清除事件
      eventBus.emit('data-source-cache-cleared', source)

      return true
    } catch (error) {
      logger.error(`清除${source}数据源缓存失败:`, error)
      showToast(`清除缓存失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
      return false
    }
  }

  // 加载缓存统计信息
  async function loadCacheStats() {
    try {
      logger.info('加载缓存统计信息')

      // 获取当前数据源的缓存统计信息
      try {
        // 获取本地缓存统计
        const localCacheKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith(`${currentSource.value}_`) ||
            key.includes(`_${currentSource.value}_`) ||
            key.endsWith(`_${currentSource.value}`)
        )

        // 获取Redis缓存统计
        const response = await axios.get(`/api/cache/stats/${currentSource.value}`)

        if (response.data && response.data.success) {
          logger.info(`获取${currentSource.value}数据源的缓存统计成功:`, response.data)

          // 更新缓存统计信息
          const cacheStats = {
            redisCacheCount: response.data.count || 0,
            localCacheCount: localCacheKeys.length,
            lastCleared: response.data.lastCleared
              ? new Date(response.data.lastCleared).toLocaleString()
              : '未清除',
          }

          // 将缓存统计信息保存到状态中
          cacheStatsMap.value[currentSource.value] = cacheStats

          logger.info(`缓存统计信息已更新: ${JSON.stringify(cacheStats)}`)

          return true
        }
      } catch (error) {
        logger.warn(`获取${currentSource.value}数据源的缓存统计失败:`, error)
        // 继续执行，不影响其他功能
      }

      return true
    } catch (error) {
      logger.error('加载缓存统计信息失败:', error)
      return false
    }
  }

  // 获取数据源实例
  function getDataSourceInstance() {
    return dataSourceInstance.value
  }

  return {
    // 状态
    currentSource,
    availableSources,
    sourcesStatus,
    sourcesConfig,
    lastSwitchTime,
    isLoading,
    hasError,
    errorMessage,
    cacheStatsMap,

    // 计算属性
    currentSourceName,
    currentSourceDescription,
    currentSourceStatus,
    currentSourceConfig,
    canSwitchSource,
    remainingCooldown,
    currentSourceCacheStats,

    // 方法
    initializeStore,
    switchDataSource,
    testDataSource,
    checkSourceStatus,
    checkCurrentSourceStatus,
    loadSourcesConfig,
    saveSourcesConfig,
    updateSourceConfig,
    resetSourceConfig,
    clearSourceCache,
    loadCacheStats,
    getDataSourceInstance,
  }
})
