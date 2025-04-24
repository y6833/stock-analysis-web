/**
 * 格式化工具函数
 */

/**
 * 格式化日期
 * @param date 日期对象
 * @param format 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, format: string = 'yyyy-MM-dd'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  if (format === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`
  }
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  if (format === 'yyyy-MM-dd HH:mm') {
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
  
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  if (format === 'yyyy-MM-dd HH:mm:ss') {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  return `${year}-${month}-${day}`
}

/**
 * 格式化数字
 * @param num 数字
 * @param options 格式化选项
 * @returns 格式化后的数字字符串
 */
export function formatNumber(num: number, options: Intl.NumberFormatOptions = {}): string {
  const defaultOptions: Intl.NumberFormatOptions = { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return new Intl.NumberFormat('zh-CN', mergedOptions).format(num)
}

/**
 * 格式化百分比
 * @param num 数字（小数形式，如0.1表示10%）
 * @param options 格式化选项
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(num: number, options: Intl.NumberFormatOptions = {}): string {
  const defaultOptions: Intl.NumberFormatOptions = { 
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return new Intl.NumberFormat('zh-CN', mergedOptions).format(num)
}

/**
 * 格式化货币
 * @param num 数字
 * @param currency 货币代码，默认为CNY（人民币）
 * @param options 格式化选项
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(num: number, currency: string = 'CNY', options: Intl.NumberFormatOptions = {}): string {
  const defaultOptions: Intl.NumberFormatOptions = { 
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  return new Intl.NumberFormat('zh-CN', mergedOptions).format(num)
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 格式化时间间隔
 * @param seconds 秒数
 * @returns 格式化后的时间间隔字符串
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  
  if (hours > 0) {
    parts.push(`${hours}小时`)
  }
  
  if (minutes > 0) {
    parts.push(`${minutes}分钟`)
  }
  
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}秒`)
  }
  
  return parts.join(' ')
}

/**
 * 格式化手机号码
 * @param phone 手机号码
 * @returns 格式化后的手机号码字符串
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  
  return `${phone.substring(0, 3)}-${phone.substring(3, 7)}-${phone.substring(7)}`
}

/**
 * 格式化身份证号码
 * @param idCard 身份证号码
 * @returns 格式化后的身份证号码字符串
 */
export function formatIdCard(idCard: string): string {
  if (!idCard) return idCard
  
  // 隐藏中间部分
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)}********${idCard.substring(14)}`
  }
  
  return idCard
}

/**
 * 格式化银行卡号
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号字符串
 */
export function formatBankCard(cardNumber: string): string {
  if (!cardNumber) return cardNumber
  
  // 每4位添加一个空格
  return cardNumber.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
}

/**
 * 格式化股票代码（添加市场后缀）
 * @param code 股票代码
 * @returns 格式化后的股票代码
 */
export function formatStockCode(code: string): string {
  if (!code) return code
  
  // 如果已经包含市场后缀，则直接返回
  if (code.includes('.')) return code
  
  // 根据股票代码规则添加市场后缀
  if (code.startsWith('6')) {
    return `${code}.SH` // 上海证券交易所
  } else if (code.startsWith('0') || code.startsWith('3')) {
    return `${code}.SZ` // 深圳证券交易所
  } else if (code.startsWith('4') || code.startsWith('8')) {
    return `${code}.BJ` // 北京证券交易所
  }
  
  return code
}
