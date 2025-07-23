/**
 * 安全功能组合式API
 * 提供组件级别的安全功能
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { securityService } from '@/services/securityService';

/**
 * 安全功能组合式API
 */
export function useSecurity() {
  // 密码强度
  const passwordStrength = ref(0);
  
  // 输入验证状态
  const inputValidationState = ref<Record<string, boolean>>({});
  
  // 速率限制状态
  const rateLimitState = ref<Record<string, boolean>>({});
  
  /**
   * 验证输入是否安全
   * @param input 用户输入
   * @param fieldName 字段名称
   * @returns 是否安全
   */
  function validateInput(input: string, fieldName: string): boolean {
    const isSafe = !securityService.detectMaliciousInput(input);
    inputValidationState.value[fieldName] = isSafe;
    return isSafe;
  }
  
  /**
   * 清理用户输入
   * @param input 用户输入
   * @returns 清理后的输入
   */
  function sanitizeInput(input: string): string {
    return securityService.sanitizeInput(input);
  }
  
  /**
   * 清理HTML内容
   * @param html HTML内容
   * @returns 清理后的HTML
   */
  function sanitizeHtml(html: string): string {
    return securityService.sanitizeHtml(html);
  }
  
  /**
   * 检查密码强度
   * @param password 密码
   * @returns 密码强度（0-100）
   */
  function checkPasswordStrength(password: string): number {
    const strength = securityService.getPasswordStrength(password);
    passwordStrength.value = strength;
    return strength;
  }
  
  /**
   * 应用速率限制
   * @param key 限制键
   * @param limit 限制次数
   * @param windowMs 时间窗口（毫秒）
   * @returns 是否允许操作
   */
  function applyRateLimit(key: string, limit: number, windowMs: number): boolean {
    const allowed = securityService.rateLimit(key, limit, windowMs);
    rateLimitState.value[key] = allowed;
    return allowed;
  }
  
  /**
   * 安全地存储敏感数据
   * @param key 存储键
   * @param data 敏感数据
   */
  function secureStore(key: string, data: any): void {
    securityService.secureStore(key, data);
  }
  
  /**
   * 安全地获取敏感数据
   * @param key 存储键
   * @returns 敏感数据
   */
  function secureRetrieve(key: string): any {
    return securityService.secureRetrieve(key);
  }
  
  /**
   * 获取CSRF令牌
   * @returns CSRF令牌
   */
  function getCsrfToken(): string | null {
    return securityService.getCsrfToken();
  }
  
  // 组件挂载时刷新CSRF令牌
  onMounted(() => {
    securityService.refreshCsrfToken();
  });
  
  return {
    passwordStrength,
    inputValidationState,
    rateLimitState,
    validateInput,
    sanitizeInput,
    sanitizeHtml,
    checkPasswordStrength,
    applyRateLimit,
    secureStore,
    secureRetrieve,
    getCsrfToken
  };
}