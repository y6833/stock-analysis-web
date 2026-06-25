/**
 * 统一 API 基址 — 支持本地开发、Cloudflare Pages + 独立后端
 *
 * 开发：Vite 代理 /api → localhost:7001
 * 生产：VITE_API_BASE_URL 指向后端公网地址；留空则使用相对路径 /api（需 Worker 反代）
 */

export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL
  if (env && env !== '') return env.replace(/\/$/, '')
  if (import.meta.env.PROD) return ''
  return 'http://localhost:7001'
}

/** 返回 /api 根路径，如 http://localhost:7001/api 或 /api */
export function getApiRoot(): string {
  const base = getApiBaseUrl()
  return base ? `${base}/api` : '/api'
}

/** 拼接完整 API 路径 */
export function getApiUrl(path: string): string {
  const root = getApiRoot()
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized.startsWith('/api')) {
    return root.replace(/\/api$/, '') + normalized
  }
  return `${root}${normalized}`
}

export function getWsBaseUrl(): string {
  const env = import.meta.env.VITE_WS_BASE_URL
  if (env) return env.replace(/\/$/, '')
  const base = getApiBaseUrl()
  if (base) return base.replace(/^http/, 'ws') + '/ws'
  if (import.meta.env.PROD) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin.replace(/^http/, 'ws') + '/ws'
  }
  return 'ws://localhost:7001/ws'
}
