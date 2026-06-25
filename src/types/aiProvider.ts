/**
 * CC Switch 兼容的 AI Provider 配置类型
 */

export interface CcSwitchConfig {
  env: Record<string, string>
  includeCoAuthoredBy?: boolean
}

export interface AIProviderProfile {
  id: string
  name: string
  provider: 'anthropic' | 'deepseek' | 'openai' | 'custom'
  config: CcSwitchConfig
  createdAt: string
  updatedAt: string
}

export interface AIProviderListResponse {
  activeProfileId: string | null
  profiles: AIProviderProfile[]
  runtime: {
    provider: string
    model: string
    baseUrl: string
    profileId: string | null
    profileName: string
  } | null
}

export interface AIProviderPreset {
  id: string
  name: string
  description: string
  template: CcSwitchConfig
}

/** Anthropic CC Switch 常用字段 */
export const ANTHROPIC_ENV_FIELDS = [
  { key: 'ANTHROPIC_AUTH_TOKEN', label: 'Auth Token', secret: true, required: true },
  { key: 'ANTHROPIC_BASE_URL', label: 'Base URL', placeholder: 'https://yinli.one' },
  { key: 'ANTHROPIC_MODEL', label: '默认模型' },
  { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'Haiku 模型' },
  { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'Sonnet 模型' },
  { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'Opus 模型' },
  { key: 'ANTHROPIC_REASONING_MODEL', label: 'Reasoning 模型' },
] as const

export const DEEPSEEK_ENV_FIELDS = [
  { key: 'DEEPSEEK_API_KEY', label: 'API Key', secret: true, required: true },
  { key: 'DEEPSEEK_BASE_URL', label: 'Base URL' },
  { key: 'DEEPSEEK_MODEL', label: '模型' },
] as const
