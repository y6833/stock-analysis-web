/**
 * 认证拦截器
 * 处理API请求的认证令牌和自动刷新
 */

import axios from 'axios'
import { authService } from '@/services/authService'
import router from '@/router'

// 标记是否正在刷新令牌
let isRefreshing = false
// 等待令牌刷新的请求队列
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 将请求添加到等待队列
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

/**
 * 执行等待队列中的所有请求
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * 重置刷新状态
 */
function resetRefreshState() {
  isRefreshing = false
  refreshSubscribers = []
}

/**
 * 初始化认证拦截器
 */
export function setupAuthInterceptors() {
  // 请求拦截器
  axios.interceptors.request.use(
    config => {
      // 如果有令牌，添加到请求头
      const token = authService.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    error => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  axios.interceptors.response.use(
    response => {
      return response
    },
    async error => {
      const originalRequest = error.config

      // 如果响应状态码是401（未授权）且不是刷新令牌的请求
      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes('/auth/refresh-token')
      ) {
        if (isRefreshing) {
          // 如果正在刷新令牌，将请求添加到等待队列
          return new Promise(resolve => {
            subscribeTokenRefresh(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(axios(originalRequest))
            })
          })
        }

        // 标记正在刷新令牌
        originalRequest._retry = true
        isRefreshing = true

        try {
          // 尝试刷新令牌
          const refreshed = await authService.refreshToken()
          
          if (refreshed) {
            // 刷新成功，更新请求头并重试
            const newToken = authService.getToken()
            if (newToken) {
              // 通知所有等待的请求
              onTokenRefreshed(newToken)
              // 更新当前请求的认证头
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return axios(originalRequest)
            }
          }
          
          // 刷新失败，重定向到登录页面
          resetRefreshState()
          router.push('/auth/login?session_expired=true')
          return Promise.reject(error)
        } catch (refreshError) {
          // 刷新令牌出错，重定向到登录页面
          resetRefreshState()
          router.push('/auth/login?session_expired=true')
          return Promise.reject(error)
        }
      }

      // 其他错误直接拒绝
      return Promise.reject(error)
    }
  )
}

export default {
  install(app: any) {
    setupAuthInterceptors()
  }
}