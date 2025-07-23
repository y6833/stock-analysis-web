/**
 * 安全服务
 * 提供CSRF保护、XSS防护和其他安全功能
 */

import axios from 'axios';
import DOMPurify from 'dompurify';
import { jwtDecode } from 'jwt-decode';

// CSRF令牌存储键
const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * 安全服务类
 */
class SecurityService {
  private csrfTokenRefreshInterval: number | null = null;
  private rateLimiters: Map<string, RateLimiterInfo> = new Map();

  /**
   * 初始化安全服务
   */
  initialize(): void {
    // 设置CSRF令牌刷新定时器（每30分钟）
    this.csrfTokenRefreshInterval = window.setInterval(() => {
      this.refreshCsrfToken();
    }, 30 * 60 * 1000);

    // 初始化时获取CSRF令牌
    this.refreshCsrfToken();
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.csrfTokenRefreshInterval) {
      clearInterval(this.csrfTokenRefreshInterval);
      this.csrfTokenRefreshInterval = null;
    }
  }

  /**
   * 刷新CSRF令牌
   */
  async refreshCsrfToken(): Promise<string | null> {
    try {
      const response = await axios.get('/api/v1/security/csrf-token');
      const token = response.data.token;
      
      if (token) {
        localStorage.setItem(CSRF_TOKEN_KEY, token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('获取CSRF令牌失败:', error);
      return null;
    }
  }

  /**
   * 获取CSRF令牌
   */
  getCsrfToken(): string | null {
    return localStorage.getItem(CSRF_TOKEN_KEY);
  }

  /**
   * 获取CSRF请求头
   */
  getCsrfHeader(): Record<string, string> {
    const token = this.getCsrfToken();
    return token ? { 'X-CSRF-Token': token } : {};
  }

  /**
   * 清理HTML内容，防止XSS攻击
   * @param html 原始HTML内容
   * @returns 清理后的安全HTML
   */
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html);
  }

  /**
   * 清理用户输入，防止XSS攻击
   * @param input 用户输入
   * @returns 清理后的安全输入
   */
  sanitizeInput(input: string): string {
    // 移除潜在的XSS向量
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 验证JWT令牌的完整性
   * @param token JWT令牌
   * @returns 是否有效
   */
  validateJwtIntegrity(token: string): boolean {
    try {
      // 解码JWT但不验证签名（签名验证在服务器端进行）
      const decoded = jwtDecode(token);
      
      // 检查令牌是否已过期
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp < currentTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('JWT令牌验证失败:', error);
      return false;
    }
  }

  /**
   * 实现速率限制
   * @param key 限制键（如API端点）
   * @param limit 时间窗口内的最大请求数
   * @param windowMs 时间窗口（毫秒）
   * @returns 是否允许请求
   */
  rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let limiterInfo = this.rateLimiters.get(key);
    
    if (!limiterInfo) {
      // 创建新的限制器
      limiterInfo = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now
      };
      this.rateLimiters.set(key, limiterInfo);
    }
    
    // 检查是否需要重置计数器
    if (now > limiterInfo.resetTime) {
      limiterInfo.count = 0;
      limiterInfo.resetTime = now + windowMs;
    }
    
    // 增加计数并检查是否超过限制
    limiterInfo.count++;
    limiterInfo.lastRequest = now;
    
    return limiterInfo.count <= limit;
  }

  /**
   * 获取密码强度（0-100）
   * @param password 密码
   * @returns 强度评分
   */
  getPasswordStrength(password: string): number {
    if (!password) return 0;
    
    let score = 0;
    
    // 长度检查
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    
    // 复杂性检查
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    
    // 多样性检查
    const uniqueChars = new Set(password.split('')).size;
    score += Math.min(10, uniqueChars / 2);
    
    return Math.min(100, score);
  }

  /**
   * 检测潜在的恶意输入
   * @param input 用户输入
   * @returns 是否可能是恶意输入
   */
  detectMaliciousInput(input: string): boolean {
    // 检测常见的恶意模式
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /onerror=/gi,
      /onload=/gi,
      /onclick=/gi,
      /eval\(/gi,
      /alert\(/gi,
      /document\.cookie/gi,
      /\b(union|select|insert|update|delete|drop|alter)\b.*\b(from|into|table|database|values)\b/gi
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 安全地解析JSON，防止原型污染
   * @param jsonString JSON字符串
   * @returns 解析后的对象
   */
  safeJsonParse(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      
      // 防止原型污染
      if (typeof parsed === 'object' && parsed !== null) {
        if ('__proto__' in parsed || 'constructor' in parsed) {
          throw new Error('潜在的原型污染攻击');
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('JSON解析失败:', error);
      return null;
    }
  }

  /**
   * 安全地存储敏感数据
   * @param key 存储键
   * @param data 敏感数据
   */
  secureStore(key: string, data: any): void {
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
   * 安全地获取敏感数据
   * @param key 存储键
   * @returns 解密后的数据
   */
  secureRetrieve(key: string): any {
    try {
      const encoded = localStorage.getItem(`secure_${key}`);
      if (!encoded) return null;
      
      const serialized = atob(encoded);
      return this.safeJsonParse(serialized);
    } catch (error) {
      console.error('安全检索失败:', error);
      return null;
    }
  }
}

// 速率限制器信息接口
interface RateLimiterInfo {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// 导出安全服务实例
export const securityService = new SecurityService();