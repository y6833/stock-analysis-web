/**
 * 敏感数据处理工具
 * 提供安全处理敏感数据的功能
 */

/**
 * 掩码敏感数据（如电话号码、邮箱等）
 * @param data 敏感数据
 * @param visibleStartChars 开头可见字符数
 * @param visibleEndChars 结尾可见字符数
 * @returns 掩码后的数据
 */
export function maskSensitiveData(
  data: string,
  visibleStartChars: number = 3,
  visibleEndChars: number = 4
): string {
  if (!data) return '';
  
  // 如果数据长度小于等于可见字符总数，则全部掩码
  if (data.length <= visibleStartChars + visibleEndChars) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleStartChars);
  const end = data.substring(data.length - visibleEndChars);
  const masked = '*'.repeat(data.length - visibleStartChars - visibleEndChars);
  
  return `${start}${masked}${end}`;
}

/**
 * 掩码电子邮件地址
 * @param email 电子邮件地址
 * @returns 掩码后的电子邮件
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  const maskedUsername = maskSensitiveData(username, 2, 1);
  
  return `${maskedUsername}@${domain}`;
}

/**
 * 掩码手机号码
 * @param phone 手机号码
 * @returns 掩码后的手机号码
 */
export function maskPhone(phone: string): string {
  return maskSensitiveData(phone, 3, 4);
}

/**
 * 掩码身份证号
 * @param idCard 身份证号
 * @returns 掩码后的身份证号
 */
export function maskIdCard(idCard: string): string {
  return maskSensitiveData(idCard, 4, 4);
}

/**
 * 掩码银行卡号
 * @param cardNumber 银行卡号
 * @returns 掩码后的银行卡号
 */
export function maskBankCard(cardNumber: string): string {
  return maskSensitiveData(cardNumber, 4, 4);
}

/**
 * 掩码姓名
 * @param name 姓名
 * @returns 掩码后的姓名
 */
export function maskName(name: string): string {
  if (!name || name.length <= 1) return name;
  
  // 中文姓名处理
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.substring(0, 1) + '*'.repeat(name.length - 1);
  }
  
  // 英文姓名处理
  const nameParts = name.split(' ');
  if (nameParts.length > 1) {
    // 有姓和名
    const firstName = nameParts[0].substring(0, 1) + '*'.repeat(nameParts[0].length - 1);
    const lastName = nameParts[nameParts.length - 1].substring(0, 1) + '*'.repeat(nameParts[nameParts.length - 1].length - 1);
    return `${firstName} ${lastName}`;
  }
  
  // 单个名字
  return name.substring(0, 1) + '*'.repeat(name.length - 1);
}

/**
 * 安全地存储敏感数据到localStorage
 * @param key 存储键
 * @param data 敏感数据
 */
export function secureStore(key: string, data: any): void {
  try {
    // 简单加密（生产环境应使用更强的加密）
    const serialized = JSON.stringify(data);
    const encoded = btoa(serialized);
    localStorage.setItem(`secure_${key}`, encoded);
  } catch (error) {
    console.error('安全存储失败:', error);
  }
}

/**
 * 安全地从localStorage获取敏感数据
 * @param key 存储键
 * @returns 解密后的数据
 */
export function secureRetrieve(key: string): any {
  try {
    const encoded = localStorage.getItem(`secure_${key}`);
    if (!encoded) return null;
    
    const serialized = atob(encoded);
    return JSON.parse(serialized);
  } catch (error) {
    console.error('安全检索失败:', error);
    return null;
  }
}

/**
 * 安全地从localStorage删除敏感数据
 * @param key 存储键
 */
export function secureRemove(key: string): void {
  localStorage.removeItem(`secure_${key}`);
}

/**
 * 检测并清理对象中的敏感数据
 * @param obj 要清理的对象
 * @param sensitiveFields 敏感字段列表
 * @returns 清理后的对象
 */
export function sanitizeSensitiveData(
  obj: Record<string, any>,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'credential', 'ssn', 'creditCard']
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // 检查是否是敏感字段
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        // 掩码敏感数据
        result[key] = typeof value === 'string' ? '******' : null;
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        result[key] = Array.isArray(value)
          ? value.map(item => typeof item === 'object' ? sanitizeSensitiveData(item, sensitiveFields) : item)
          : sanitizeSensitiveData(value, sensitiveFields);
      } else {
        // 保留非敏感数据
        result[key] = value;
      }
    }
  }
  
  return result;
}