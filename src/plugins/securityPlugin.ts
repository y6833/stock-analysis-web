/**
 * 安全插件
 * 为Vue应用提供安全功能，包括CSRF保护、XSS防护和输入验证
 */

import type { App } from 'vue';
import axios from 'axios';
import { securityService } from '@/services/securityService';
import errorHandlingService, { ErrorType, ErrorSeverity } from '@/services/errorHandlingService';

export default {
  install(app: App) {
    // 初始化安全服务
    securityService.initialize();

    // 添加全局属性
    app.config.globalProperties.$security = securityService;

    // 添加CSRF令牌到所有非GET请求
    axios.interceptors.request.use(
      config => {
        if (config.method?.toLowerCase() !== 'get') {
          const csrfHeader = securityService.getCsrfHeader();
          config.headers = { ...config.headers, ...csrfHeader };
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // 添加安全响应拦截器
    axios.interceptors.response.use(
      response => {
        return response;
      },
      error => {
        // 处理CSRF令牌错误
        if (error.response && error.response.status === 403 &&
          error.response.data && error.response.data.error === 'invalid_csrf_token') {
          // 刷新CSRF令牌并重试请求
          return securityService.refreshCsrfToken().then(token => {
            if (token && error.config) {
              error.config.headers['X-CSRF-Token'] = token;
              return axios(error.config);
            }
            return Promise.reject(error);
          });
        }

        // 处理速率限制错误
        if (error.response && error.response.status === 429) {
          const appError = errorHandlingService.createAppError(
            ErrorType.RATE_LIMIT,
            '请求频率过高，请稍后再试',
            ErrorSeverity.WARNING
          );
          errorHandlingService.handleError(appError);
        }

        return Promise.reject(error);
      }
    );

    // 添加全局指令：v-sanitize
    app.directive('sanitize', {
      beforeMount(el, binding) {
        // 清理HTML内容
        el.innerHTML = securityService.sanitizeHtml(binding.value || '');
      },
      updated(el, binding) {
        // 更新时重新清理
        el.innerHTML = securityService.sanitizeHtml(binding.value || '');
      }
    });

    // 添加全局指令：v-safe-html
    app.directive('safeHtml', {
      beforeMount(el, binding) {
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
      updated(el, binding) {
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
    });

    // 在应用卸载时清理资源
    app.unmount = function () {
      securityService.cleanup();
      return app.unmount();
    };
  }
};