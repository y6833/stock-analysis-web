import { ref } from 'vue'

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// 日志条目接口
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  module: string
  message: string
  data?: any
}

// 全局日志设置
const globalLogLevel = ref<LogLevel>(
  process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
)

// 是否启用控制台输出
const enableConsoleOutput = ref(true)

// 是否启用远程日志
const enableRemoteLogging = ref(false)

// 远程日志URL
const remoteLoggingUrl = ref('')

// 日志历史
const logHistory = ref<LogEntry[]>([])

// 最大日志历史条数
const maxLogHistorySize = ref(1000)

// 模块日志级别覆盖
const moduleLogLevels = ref<Record<string, LogLevel>>({})

/**
 * 设置全局日志级别
 * @param level 日志级别
 */
export function setGlobalLogLevel(level: LogLevel) {
  globalLogLevel.value = level
}

/**
 * 设置模块日志级别
 * @param module 模块名称
 * @param level 日志级别
 */
export function setModuleLogLevel(module: string, level: LogLevel) {
  moduleLogLevels.value[module] = level
}

/**
 * 启用或禁用控制台输出
 * @param enable 是否启用
 */
export function setConsoleOutput(enable: boolean) {
  enableConsoleOutput.value = enable
}

/**
 * 配置远程日志
 * @param enable 是否启用
 * @param url 远程日志URL
 */
export function configureRemoteLogging(enable: boolean, url: string = '') {
  enableRemoteLogging.value = enable
  if (enable && url) {
    remoteLoggingUrl.value = url
  }
}

/**
 * 清除日志历史
 */
export function clearLogHistory() {
  logHistory.value = []
}

/**
 * 获取日志历史
 * @returns 日志历史
 */
export function getLogHistory() {
  return logHistory.value
}

/**
 * 设置最大日志历史条数
 * @param size 最大条数
 */
export function setMaxLogHistorySize(size: number) {
  maxLogHistorySize.value = size
}

/**
 * 添加日志条目
 * @param entry 日志条目
 */
function addLogEntry(entry: LogEntry) {
  // 添加到历史
  logHistory.value.push(entry)
  
  // 如果超过最大条数，删除最旧的
  if (logHistory.value.length > maxLogHistorySize.value) {
    logHistory.value.shift()
  }
  
  // 控制台输出
  if (enableConsoleOutput.value) {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [${entry.module}]`
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data !== undefined ? entry.data : '')
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data !== undefined ? entry.data : '')
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data !== undefined ? entry.data : '')
        break
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data !== undefined ? entry.data : '')
        break
    }
  }
  
  // 远程日志
  if (enableRemoteLogging.value && remoteLoggingUrl.value) {
    sendRemoteLog(entry).catch(error => {
      console.error('Failed to send remote log:', error)
    })
  }
}

/**
 * 发送远程日志
 * @param entry 日志条目
 */
async function sendRemoteLog(entry: LogEntry) {
  try {
    await fetch(remoteLoggingUrl.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        module: entry.module,
        message: entry.message,
        data: entry.data
      })
    })
  } catch (error) {
    // 静默失败，避免无限循环
  }
}

/**
 * 创建日志记录器
 * @param module 模块名称
 * @returns 日志记录器
 */
export function useLogger(module: string) {
  /**
   * 检查是否应该记录此级别的日志
   * @param level 日志级别
   * @returns 是否应该记录
   */
  function shouldLog(level: LogLevel): boolean {
    // 检查模块级别覆盖
    if (moduleLogLevels.value[module] !== undefined) {
      return level >= moduleLogLevels.value[module]
    }
    
    // 使用全局级别
    return level >= globalLogLevel.value
  }
  
  /**
   * 记录调试日志
   * @param message 日志消息
   * @param data 附加数据
   */
  function debug(message: string, data?: any) {
    if (shouldLog(LogLevel.DEBUG)) {
      addLogEntry({
        timestamp: new Date(),
        level: LogLevel.DEBUG,
        module,
        message,
        data
      })
    }
  }
  
  /**
   * 记录信息日志
   * @param message 日志消息
   * @param data 附加数据
   */
  function info(message: string, data?: any) {
    if (shouldLog(LogLevel.INFO)) {
      addLogEntry({
        timestamp: new Date(),
        level: LogLevel.INFO,
        module,
        message,
        data
      })
    }
  }
  
  /**
   * 记录警告日志
   * @param message 日志消息
   * @param data 附加数据
   */
  function warn(message: string, data?: any) {
    if (shouldLog(LogLevel.WARN)) {
      addLogEntry({
        timestamp: new Date(),
        level: LogLevel.WARN,
        module,
        message,
        data
      })
    }
  }
  
  /**
   * 记录错误日志
   * @param message 日志消息
   * @param data 附加数据
   */
  function error(message: string, data?: any) {
    if (shouldLog(LogLevel.ERROR)) {
      addLogEntry({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        module,
        message,
        data
      })
    }
  }
  
  return {
    debug,
    info,
    warn,
    error
  }
}
