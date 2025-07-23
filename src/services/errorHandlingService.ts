/**
 * 错误处理服务
 * 提供统一的错误处理机制，包括错误分类、日志记录和用户友好的错误消息
 */

import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/userStore';
import { isOnline } from './offlineDataService';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

// 错误严重程度枚举
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// 错误对象接口
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: any;
  code?: string;
  details?: any;
}

/**
 * 创建应用错误对象
 */
export function createAppError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  originalError?: any,
  code?: string,
  details?: any
): AppError {
  return {
    type,
    severity,
    message,
    originalError,
    code,
    details,
  };
}

/**
 * 从Axios错误创建应用错误对象
 */
export function createErrorFromAxiosError(error: any): AppError {
  // 检查是否离线
  if (!isOnline()) {
    return createAppError(
      ErrorType.OFFLINE,
      '您当前处于离线状态，无法连接到服务器',
      ErrorSeverity.WARNING,
      error
    );
  }

  // 网络错误
  if (error.message === 'Network Error') {
    return createAppError(
      ErrorType.NETWORK,
      '网络连接错误，请检查您的网络连接',
      ErrorSeverity.ERROR,
      error
    );
  }

  // 请求超时
  if (error.code === 'ECONNABORTED') {
    return createAppError(
      ErrorType.TIMEOUT,
      '请求超时，请稍后重试',
      ErrorSeverity.WARNING,
      error
    );
  }

  // 服务器响应错误
  if (error.response) {
    const { status, data } = error.response;

    // 身份验证错误
    if (status === 401) {
      return createAppError(
        ErrorType.AUTHENTICATION,
        '身份验证失败，请重新登录',
        ErrorSeverity.WARNING,
        error,
        'AUTH_FAILED'
      );
    }

    // 授权错误
    if (status === 403) {
      return createAppError(
        ErrorType.AUTHORIZATION,
        '您没有权限执行此操作',
        ErrorSeverity.WARNING,
        error,
        'FORBIDDEN'
      );
    }

    // 验证错误
    if (status === 400 || status === 422) {
      return createAppError(
        ErrorType.VALIDATION,
        data.message || '输入数据无效，请检查您的输入',
        ErrorSeverity.WARNING,
        error,
        'VALIDATION_ERROR',
        data.errors
      );
    }

    // 服务器错误
    if (status >= 500) {
      return createAppError(
        ErrorType.API,
        '服务器错误，请稍后重试',
        ErrorSeverity.ERROR,
        error,
        `SERVER_${status}`
      );
    }

    // 其他API错误
    return createAppError(
      ErrorType.API,
      data.message || `请求失败 (${status})`,
      ErrorSeverity.ERROR,
      error,
      `API_${status}`
    );
  }

  // 未知错误
  return createAppError(
    ErrorType.UNKNOWN,
    '发生未知错误',
    ErrorSeverity.ERROR,
    error
  );
}

/**
 * 处理应用错误
 */
export function handleError(appError: AppError): void {
  // 记录错误
  logError(appError);

  // 显示错误消息
  showErrorMessage(appError);

  // 处理特定类型的错误
  handleSpecificError(appError);
}

/**
 * 记录错误到控制台和可能的错误跟踪服务
 */
function logError(appError: AppError): void {
  const { type, severity, message, originalError, code, details } = appError;

  // 构建日志消息
  const logMessage = `[${severity.toUpperCase()}] [${type}] ${message}${code ? ` (${code})` : ''}`;

  // 根据严重程度选择日志级别
  switch (severity) {
    case ErrorSeverity.INFO:
      console.info(logMessage, { originalError, details });
      break;
    case ErrorSeverity.WARNING:
      console.warn(logMessage, { originalError, details });
      break;
    case ErrorSeverity.CRITICAL:
      console.error(logMessage, { originalError, details });
      // 这里可以添加向错误跟踪服务报告的代码
      break;
    case ErrorSeverity.ERROR:
    default:
      console.error(logMessage, { originalError, details });
      break;
  }
}

/**
 * 显示用户友好的错误消息
 */
function showErrorMessage(appError: AppError): void {
  const { severity, message, details } = appError;

  // 将应用严重程度映射到Element Plus消息类型
  let messageType: 'success' | 'warning' | 'info' | 'error' = 'error';
  switch (severity) {
    case ErrorSeverity.INFO:
      messageType = 'info';
      break;
    case ErrorSeverity.WARNING:
      messageType = 'warning';
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      messageType = 'error';
      break;
  }

  // 显示消息
  ElMessage({
    message,
    type: messageType,
    duration: severity === ErrorSeverity.CRITICAL ? 0 : 5000,
    showClose: true,
  });

  // 对于验证错误，显示详细信息
  if (details && Object.keys(details).length > 0) {
    const detailsMessage = Object.entries(details)
      .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
      .join('\n');

    ElMessageBox.alert(detailsMessage, '验证错误', {
      confirmButtonText: '确定',
      type: 'warning',
    });
  }
}

/**
 * 处理特定类型的错误
 */
function handleSpecificError(appError: AppError): void {
  const { type, code } = appError;

  // 处理身份验证错误
  if (type === ErrorType.AUTHENTICATION) {
    const userStore = useUserStore();
    
    // 如果是身份验证失败，清除用户会话并重定向到登录页面
    if (code === 'AUTH_FAILED') {
      userStore.logout();
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
  }

  // 处理离线错误
  if (type === ErrorType.OFFLINE) {
    // 可以在这里添加特定的离线处理逻辑
  }
}

/**
 * 全局错误处理函数
 */
export function setupGlobalErrorHandlers(): void {
  // 处理未捕获的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const appError = createAppError(
      ErrorType.UNKNOWN,
      '未处理的Promise错误',
      ErrorSeverity.ERROR,
      event.reason
    );
    handleError(appError);
  });

  // 处理全局JavaScript错误
  window.addEventListener('error', (event) => {
    const appError = createAppError(
      ErrorType.UNKNOWN,
      `JavaScript错误: ${event.message}`,
      ErrorSeverity.ERROR,
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      }
    );
    handleError(appError);
  });
}

export default {
  createAppError,
  createErrorFromAxiosError,
  handleError,
  setupGlobalErrorHandlers,
  ErrorType,
  ErrorSeverity,
};