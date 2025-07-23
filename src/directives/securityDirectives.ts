/**
 * 安全指令
 * 提供用于增强组件安全性的Vue指令
 */

import { DirectiveBinding } from 'vue';
import { securityService } from '@/services/securityService';

/**
 * v-sanitize 指令：清理HTML内容，防止XSS攻击
 * 用法：<div v-sanitize="htmlContent"></div>
 */
export const sanitize = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding) {
    el.innerHTML = securityService.sanitizeHtml(binding.value || '');
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    el.innerHTML = securityService.sanitizeHtml(binding.value || '');
  }
};

/**
 * v-safe-html 指令：检测并清理HTML内容，如果检测到恶意内容则不渲染
 * 用法：<div v-safe-html="htmlContent"></div>
 */
export const safeHtml = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value) {
      // 检测恶意内容
      if (securityService.detectMaliciousInput(binding.value)) {
        console.warn('检测到潜在的恶意内容:', binding.value);
        el.innerHTML = '';
        return;
      }
      // 清理并设置HTML
      el.innerHTML = securityService.sanitizeHtml(binding.value);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value) {
      // 检测恶意内容
      if (securityService.detectMaliciousInput(binding.value)) {
        console.warn('检测到潜在的恶意内容:', binding.value);
        el.innerHTML = '';
        return;
      }
      // 清理并设置HTML
      el.innerHTML = securityService.sanitizeHtml(binding.value);
    }
  }
};

/**
 * v-mask-data 指令：掩码敏感数据
 * 用法：<span v-mask-data="'1234567890'"></span>
 * 参数：v-mask-data:email - 掩码电子邮件
 *      v-mask-data:phone - 掩码电话号码
 *      v-mask-data:idcard - 掩码身份证号
 *      v-mask-data:bankcard - 掩码银行卡号
 *      v-mask-data:name - 掩码姓名
 */
export const maskData = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding) {
    if (!binding.value) return;
    
    const data = binding.value;
    let maskedData = data;
    
    // 根据参数选择掩码方式
    switch (binding.arg) {
      case 'email':
        maskedData = maskEmail(data);
        break;
      case 'phone':
        maskedData = maskPhone(data);
        break;
      case 'idcard':
        maskedData = maskIdCard(data);
        break;
      case 'bankcard':
        maskedData = maskBankCard(data);
        break;
      case 'name':
        maskedData = maskName(data);
        break;
      default:
        // 默认掩码
        maskedData = maskSensitiveData(data);
    }
    
    el.textContent = maskedData;
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    if (!binding.value) return;
    
    const data = binding.value;
    let maskedData = data;
    
    // 根据参数选择掩码方式
    switch (binding.arg) {
      case 'email':
        maskedData = maskEmail(data);
        break;
      case 'phone':
        maskedData = maskPhone(data);
        break;
      case 'idcard':
        maskedData = maskIdCard(data);
        break;
      case 'bankcard':
        maskedData = maskBankCard(data);
        break;
      case 'name':
        maskedData = maskName(data);
        break;
      default:
        // 默认掩码
        maskedData = maskSensitiveData(data);
    }
    
    el.textContent = maskedData;
  }
};

/**
 * v-rate-limit 指令：限制用户操作频率
 * 用法：<button v-rate-limit="{ key: 'submit-form', limit: 3, window: 60000 }" @click="submitForm">提交</button>
 * 参数：key - 限制键
 *      limit - 时间窗口内的最大操作次数
 *      window - 时间窗口（毫秒）
 */
export const rateLimit = {
  beforeMount(el: HTMLElement, binding: DirectiveBinding) {
    const { key, limit, window: windowMs } = binding.value || {};
    
    if (!key || !limit || !windowMs) {
      console.error('v-rate-limit 指令需要 key, limit 和 window 参数');
      return;
    }
    
    el.addEventListener('click', function(event) {
      const allowed = securityService.rateLimit(key, limit, windowMs);
      
      if (!allowed) {
        event.preventDefault();
        event.stopPropagation();
        
        // 显示提示
        const existingTooltip = document.getElementById(`rate-limit-tooltip-${key}`);
        if (!existingTooltip) {
          const tooltip = document.createElement('div');
          tooltip.id = `rate-limit-tooltip-${key}`;
          tooltip.style.position = 'absolute';
          tooltip.style.backgroundColor = '#f44336';
          tooltip.style.color = 'white';
          tooltip.style.padding = '5px 10px';
          tooltip.style.borderRadius = '4px';
          tooltip.style.fontSize = '12px';
          tooltip.style.zIndex = '1000';
          tooltip.style.top = `${event.clientY + 10}px`;
          tooltip.style.left = `${event.clientX + 10}px`;
          tooltip.textContent = '操作频率过高，请稍后再试';
          
          document.body.appendChild(tooltip);
          
          // 3秒后移除提示
          setTimeout(() => {
            if (tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
          }, 3000);
        }
      }
    });
  }
};

// 掩码函数
function maskSensitiveData(data: string, visibleStartChars: number = 3, visibleEndChars: number = 4): string {
  if (!data) return '';
  
  if (data.length <= visibleStartChars + visibleEndChars) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleStartChars);
  const end = data.substring(data.length - visibleEndChars);
  const masked = '*'.repeat(data.length - visibleStartChars - visibleEndChars);
  
  return `${start}${masked}${end}`;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  const maskedUsername = maskSensitiveData(username, 2, 1);
  
  return `${maskedUsername}@${domain}`;
}

function maskPhone(phone: string): string {
  return maskSensitiveData(phone, 3, 4);
}

function maskIdCard(idCard: string): string {
  return maskSensitiveData(idCard, 4, 4);
}

function maskBankCard(cardNumber: string): string {
  return maskSensitiveData(cardNumber, 4, 4);
}

function maskName(name: string): string {
  if (!name || name.length <= 1) return name;
  
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.substring(0, 1) + '*'.repeat(name.length - 1);
  }
  
  const nameParts = name.split(' ');
  if (nameParts.length > 1) {
    const firstName = nameParts[0].substring(0, 1) + '*'.repeat(nameParts[0].length - 1);
    const lastName = nameParts[nameParts.length - 1].substring(0, 1) + '*'.repeat(nameParts[nameParts.length - 1].length - 1);
    return `${firstName} ${lastName}`;
  }
  
  return name.substring(0, 1) + '*'.repeat(name.length - 1);
}

// 导出所有安全指令
export default {
  sanitize,
  safeHtml,
  maskData,
  rateLimit
};