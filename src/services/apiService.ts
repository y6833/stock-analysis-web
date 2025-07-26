/**
 * API服务
 * 负责处理与后端API的通信，支持离线模式和弱网络优化
 */

import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  saveOfflineData,
  getOfflineData,
  isOnline,
  savePendingWatchlistChange,
  savePendingPortfolioChange
} from './offlineDataService';
import { getNetworkAwareTimeout } from './networkStatusService';
import errorHandlingService, { ErrorType, ErrorSeverity } from './errorHandlingService';
import loadingService from './loadingService';

// 创建axios实例
const api = axios.create({
  baseURL: 'http://localhost:7001/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    // 根据网络状态调整超时时间
    config.timeout = getNetworkAwareTimeout();

    // 从localStorage获取认证令牌
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加CSRF令牌到非GET请求
    if (config.method?.toLowerCase() !== 'get') {
      try {
        const csrfToken = localStorage.getItem('csrf_token');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      } catch (error) {
        console.error('获取CSRF令牌失败:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // 如果是网络错误或请求超时，尝试从缓存获取数据
    if (!originalRequest || error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      if (originalRequest && originalRequest.method?.toLowerCase() === 'get') {
        const url = originalRequest.url || '';
        const cacheKey = `api_cache:${url}`;

        try {
          const cachedData = await getOfflineData(cacheKey);
          if (cachedData) {
            console.log(`使用缓存数据: ${url}`);
            return Promise.resolve({
              ...error.response,
              data: cachedData,
              status: 200,
              statusText: 'OK (from cache)',
              headers: {},
              config: originalRequest,
              fromCache: true
            });
          }
        } catch (cacheError) {
          console.error('从缓存获取数据失败:', cacheError);
        }
      }
    }

    // 创建应用错误对象并处理
    const appError = errorHandlingService.createErrorFromAxiosError(error);
    errorHandlingService.handleError(appError);

    return Promise.reject(error);
  }
);

/**
 * 发送GET请求
 * @param url 请求URL
 * @param params 查询参数
 * @param config 请求配置
 * @param showLoading 是否显示加载状态
 * @param loadingText 加载文本
 */
export async function get<T>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig,
  showLoading: boolean = false,
  loadingText: string = '加载中...'
): Promise<T> {
  try {
    // 显示加载状态
    if (showLoading) {
      loadingService.showGlobalLoading(loadingText);
    }

    // 构建缓存键
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `api_cache:${fullUrl}`;

    // 如果离线，尝试从缓存获取数据
    if (!isOnline()) {
      const cachedData = await getOfflineData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const offlineError = errorHandlingService.createAppError(
        ErrorType.OFFLINE,
        '您当前处于离线状态，且没有可用的缓存数据',
        ErrorSeverity.WARNING
      );
      errorHandlingService.handleError(offlineError);
      throw offlineError;
    }

    // 发送请求
    const response = await api.get<T>(url, { ...config, params });

    // 缓存响应数据
    await saveOfflineData(cacheKey, response.data);

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 如果是网络错误，尝试从缓存获取数据
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        const queryString = params ? new URLSearchParams(params).toString() : '';
        const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;
        const cacheKey = `api_cache:${fullUrl}`;

        const cachedData = await getOfflineData<T>(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
    }
    throw error;
  } finally {
    // 隐藏加载状态
    if (showLoading) {
      loadingService.hideGlobalLoading();
    }
  }
}

/**
 * 发送POST请求
 * @param url 请求URL
 * @param data 请求数据
 * @param config 请求配置
 * @param showLoading 是否显示加载状态
 * @param loadingText 加载文本
 */
export async function post<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  showLoading: boolean = false,
  loadingText: string = '提交中...'
): Promise<T> {
  try {
    // 显示加载状态
    if (showLoading) {
      loadingService.showGlobalLoading(loadingText);
    }

    // 如果离线，保存请求以便稍后同步
    if (!isOnline()) {
      // 处理特定的API端点
      if (url.includes('/watchlist')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingWatchlistChange('POST', data, token);
        return { success: true, pendingSync: true } as unknown as T;
      } else if (url.includes('/portfolio')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingPortfolioChange('POST', data, token);
        return { success: true, pendingSync: true } as unknown as T;
      }

      const offlineError = errorHandlingService.createAppError(
        ErrorType.OFFLINE,
        '您当前处于离线状态，无法发送数据',
        ErrorSeverity.WARNING
      );
      errorHandlingService.handleError(offlineError);
      throw offlineError;
    }

    // 发送请求
    const response = await api.post<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  } finally {
    // 隐藏加载状态
    if (showLoading) {
      loadingService.hideGlobalLoading();
    }
  }
}

/**
 * 发送PUT请求
 * @param url 请求URL
 * @param data 请求数据
 * @param config 请求配置
 * @param showLoading 是否显示加载状态
 * @param loadingText 加载文本
 */
export async function put<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  showLoading: boolean = false,
  loadingText: string = '更新中...'
): Promise<T> {
  try {
    // 显示加载状态
    if (showLoading) {
      loadingService.showGlobalLoading(loadingText);
    }

    // 如果离线，保存请求以便稍后同步
    if (!isOnline()) {
      // 处理特定的API端点
      if (url.includes('/watchlist')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingWatchlistChange('PUT', data, token);
        return { success: true, pendingSync: true } as unknown as T;
      } else if (url.includes('/portfolio')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingPortfolioChange('PUT', data, token);
        return { success: true, pendingSync: true } as unknown as T;
      }

      const offlineError = errorHandlingService.createAppError(
        ErrorType.OFFLINE,
        '您当前处于离线状态，无法发送数据',
        ErrorSeverity.WARNING
      );
      errorHandlingService.handleError(offlineError);
      throw offlineError;
    }

    // 发送请求
    const response = await api.put<T>(url, data, config);
    return response.data;
  } catch (error) {
    throw error;
  } finally {
    // 隐藏加载状态
    if (showLoading) {
      loadingService.hideGlobalLoading();
    }
  }
}

/**
 * 发送DELETE请求
 * @param url 请求URL
 * @param config 请求配置
 * @param showLoading 是否显示加载状态
 * @param loadingText 加载文本
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig,
  showLoading: boolean = false,
  loadingText: string = '删除中...'
): Promise<T> {
  try {
    // 显示加载状态
    if (showLoading) {
      loadingService.showGlobalLoading(loadingText);
    }

    // 如果离线，保存请求以便稍后同步
    if (!isOnline()) {
      // 处理特定的API端点
      if (url.includes('/watchlist')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingWatchlistChange('DELETE', { url }, token);
        return { success: true, pendingSync: true } as unknown as T;
      } else if (url.includes('/portfolio')) {
        const token = localStorage.getItem('auth_token') || '';
        await savePendingPortfolioChange('DELETE', { url }, token);
        return { success: true, pendingSync: true } as unknown as T;
      }

      const offlineError = errorHandlingService.createAppError(
        ErrorType.OFFLINE,
        '您当前处于离线状态，无法发送数据',
        ErrorSeverity.WARNING
      );
      errorHandlingService.handleError(offlineError);
      throw offlineError;
    }

    // 发送请求
    const response = await api.delete<T>(url, config);
    return response.data;
  } catch (error) {
    throw error;
  } finally {
    // 隐藏加载状态
    if (showLoading) {
      loadingService.hideGlobalLoading();
    }
  }
}

/**
 * 预加载API数据到缓存
 * @param urls 要预加载的URL列表
 */
export async function preloadApiData(urls: string[]): Promise<void> {
  if (!isOnline()) {
    console.log('离线状态，跳过预加载');
    return;
  }

  try {
    const promises = urls.map(async (url) => {
      try {
        const response = await api.get(url);
        const cacheKey = `api_cache:${url}`;
        await saveOfflineData(cacheKey, response.data);
        console.log(`预加载成功: ${url}`);
      } catch (error) {
        console.error(`预加载失败: ${url}`, error);
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('预加载API数据时出错:', error);
  }
}

/**
 * 使用加载状态包装API请求
 * @param apiFunction API函数
 * @param loadingText 加载文本
 */
export function withApiLoading<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  loadingText: string = '加载中...'
): (...args: Parameters<T>) => ReturnType<T> {
  return async (...args: Parameters<T>): ReturnType<T> => {
    try {
      loadingService.showGlobalLoading(loadingText);
      return await apiFunction(...args) as ReturnType<T>;
    } finally {
      loadingService.hideGlobalLoading();
    }
  };
}

export default {
  get,
  post,
  put,
  delete: del,
  preloadApiData,
  withApiLoading
};