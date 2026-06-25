/**
 * AI 功能服务 — 统一调用服务端 /api/ai/* 接口
 */
import axios, { AxiosError } from 'axios'
import { getApiRoot } from '@/utils/apiBase'
import { getAuthHeaders } from '@/utils/auth'

const API_ROOT = getApiRoot()

export class AIServiceError extends Error {
  code: string
  retryable: boolean
  userMessage: string

  constructor(message: string, options: { code?: string; retryable?: boolean; userMessage?: string } = {}) {
    super(message)
    this.name = 'AIServiceError'
    this.code = options.code || 'AI_ERROR'
    this.retryable = options.retryable ?? false
    this.userMessage = options.userMessage || message
  }
}

function wrapAxiosError(error: unknown, fallback: string): AIServiceError {
  if (error instanceof AIServiceError) return error
  const axiosErr = error as AxiosError<{ message?: string }>
  const status = axiosErr.response?.status
  const serverMsg = axiosErr.response?.data?.message

  if (status === 401) {
    return new AIServiceError('未登录', {
      code: 'UNAUTHORIZED',
      userMessage: '请先登录后再使用 AI 功能',
    })
  }
  if (status === 503) {
    return new AIServiceError(serverMsg || 'AI 服务不可用', {
      code: 'AI_UNAVAILABLE',
      retryable: true,
      userMessage: serverMsg || 'AI 服务暂不可用，请稍后重试',
    })
  }
  if (axiosErr.code === 'ECONNABORTED') {
    return new AIServiceError('请求超时', {
      code: 'TIMEOUT',
      retryable: true,
      userMessage: 'AI 分析耗时较长，请稍后重试',
    })
  }
  return new AIServiceError(serverMsg || fallback, {
    code: 'NETWORK_ERROR',
    retryable: true,
    userMessage: serverMsg || fallback,
  })
}

export interface AIStatus {
  aiEnabled: boolean
  provider: string
  model?: string | null
  profileName?: string | null
  features: Record<string, boolean>
}

export interface ScreeningConditions {
  riskLevel?: string
  industries?: string[]
  marketCap?: string
  minExpectedReturn?: number
  timeHorizon?: number
  keywords?: string[]
  summary?: string
}

export interface GoldenStock {
  symbol: string
  name: string
  goldenScore: number
  reasons: string[]
  riskLevel: string
  expectedReturn?: number
  holdingPeriod?: string
  isGoldenStock?: boolean
  currentPrice?: number
  totalScore?: number
}

export const aiService = {
  async getStatus(): Promise<AIStatus> {
    try {
      const res = await axios.get(`${API_ROOT}/ai/status`)
      return res.data.data
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return { aiEnabled: false, provider: 'none', features: {} }
      }
      return { aiEnabled: false, provider: 'none', features: {} }
    }
  },

  async screenByConditions(query: string, options: { riskLevel?: string; limit?: number } = {}) {
    try {
      const res = await axios.post(
        `${API_ROOT}/ai/screen`,
        { query, ...options },
        getAuthHeaders(),
      )
      return res.data
    } catch (error) {
      throw wrapAxiosError(error, 'AI 筛选失败')
    }
  },

  async getGoldenStocks(options: { riskLevel?: string; limit?: number } = {}) {
    try {
      const res = await axios.get(`${API_ROOT}/ai/golden-stocks`, {
        params: options,
        ...getAuthHeaders(),
      })
      return res.data
    } catch (error) {
      throw wrapAxiosError(error, '获取金股失败')
    }
  },

  async analyzeStock(symbol: string, options: { riskLevel?: string; timeHorizon?: number } = {}) {
    try {
      const res = await axios.post(
        `${API_ROOT}/ai/analyze/${symbol}`,
        options,
        getAuthHeaders(),
      )
      return res.data
    } catch (error) {
      throw wrapAxiosError(error, 'AI 分析失败')
    }
  },
}

export default aiService
