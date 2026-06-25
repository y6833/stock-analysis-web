'use strict'

const Service = require('egg').Service

/**
 * AI Provider 运行时 — 根据激活的 CC Switch 配置调用对应 API
 */
class AiProviderRuntimeService extends Service {
  resolveFromProfile(profile) {
    if (!profile?.config?.env) return null
    const env = profile.config.env

    if (env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY) {
      return {
        provider: 'anthropic',
        apiKey: env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY,
        baseUrl: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
        model: env.ANTHROPIC_MODEL || env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-sonnet-4-6',
        models: {
          default: env.ANTHROPIC_MODEL,
          haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
          sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
          opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
          reasoning: env.ANTHROPIC_REASONING_MODEL,
        },
        includeCoAuthoredBy: profile.config.includeCoAuthoredBy ?? false,
        timeout: 60000,
      }
    }

    if (env.DEEPSEEK_API_KEY) {
      return {
        provider: 'deepseek',
        apiKey: env.DEEPSEEK_API_KEY,
        baseUrl: (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, ''),
        model: env.DEEPSEEK_MODEL || 'deepseek-chat',
        timeout: 30000,
      }
    }

    if (env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: env.OPENAI_API_KEY,
        baseUrl: (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
        model: env.OPENAI_MODEL || 'gpt-4o',
        timeout: 30000,
      }
    }

    return null
  }

  getRuntimeConfig() {
    const profile = this.ctx.service.aiProviderProfile.getActiveProfile()
    const fromProfile = profile ? this.resolveFromProfile(profile) : null
    if (fromProfile?.apiKey) {
      return { ...fromProfile, profileId: profile.id, profileName: profile.name }
    }

    const { app } = this
    const apiKey = process.env.DEEPSEEK_API_KEY || app.config.deepseek?.apiKey || ''
    if (!apiKey) return null

    return {
      provider: 'deepseek',
      apiKey,
      baseUrl: (process.env.DEEPSEEK_BASE_URL || app.config.deepseek?.baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, ''),
      model: process.env.DEEPSEEK_MODEL || app.config.deepseek?.model || 'deepseek-chat',
      timeout: 30000,
      profileId: null,
      profileName: '环境变量',
    }
  }

  isAvailable() {
    return Boolean(this.getRuntimeConfig()?.apiKey)
  }

  pickModel(runtime, options = {}) {
    if (options.model) return options.model
    if (options.modelRole && runtime.models?.[options.modelRole]) {
      return runtime.models[options.modelRole]
    }
    return runtime.model
  }

  async chat(messages, options = {}) {
    const runtime = this.getRuntimeConfig()
    if (!runtime) throw new Error('未配置 AI Provider，请在 AI 管理页添加并激活配置')
    return this.chatWithRuntime(runtime, messages, options)
  }

  async chatWithRuntime(runtime, messages, options = {}) {
    const model = this.pickModel(runtime, options)
    const start = Date.now()

    if (runtime.provider === 'anthropic') {
      return this.chatAnthropic(runtime, messages, model, options, start)
    }

    return this.chatOpenAICompatible(runtime, messages, model, options, start)
  }

  async chatOpenAICompatible(runtime, messages, model, options, start) {
    const { ctx } = this
    const base = runtime.baseUrl.endsWith('/v1') ? runtime.baseUrl : `${runtime.baseUrl}/v1`
    const url = `${base}/chat/completions`

    const response = await ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      dataType: 'json',
      timeout: runtime.timeout,
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        model,
        messages,
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature ?? 0.7,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      },
    })

    if (response.status !== 200) {
      throw new Error(response.data?.error?.message || `API 错误: ${response.status}`)
    }

    return {
      content: response.data?.choices?.[0]?.message?.content || '',
      tokensUsed: response.data?.usage?.total_tokens || 0,
      processingTime: Date.now() - start,
      model: response.data?.model || model,
      provider: runtime.provider,
      profileName: runtime.profileName,
    }
  }

  async chatAnthropic(runtime, messages, model, options, start) {
    const { ctx } = this

    try {
      return await this.chatOpenAICompatible(runtime, messages, model, options, start)
    } catch (openaiErr) {
      ctx.logger.warn('Anthropic OpenAI 兼容模式失败，尝试原生 Messages API:', openaiErr.message)
    }

    const url = `${runtime.baseUrl}/v1/messages`
    const systemMsg = messages.find((m) => m.role === 'system')
    const otherMsgs = messages.filter((m) => m.role !== 'system')

    const response = await ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      dataType: 'json',
      timeout: runtime.timeout,
      headers: {
        'x-api-key': runtime.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      data: {
        model,
        max_tokens: options.maxTokens || 4000,
        system: systemMsg?.content,
        messages: otherMsgs.map((m) => ({ role: m.role, content: m.content })),
      },
    })

    if (response.status !== 200) {
      throw new Error(response.data?.error?.message || `Anthropic API 错误: ${response.status}`)
    }

    const content =
      response.data?.content?.map((c) => c.text).join('') ||
      response.data?.content?.[0]?.text ||
      ''

    return {
      content,
      tokensUsed: (response.data?.usage?.input_tokens || 0) + (response.data?.usage?.output_tokens || 0),
      processingTime: Date.now() - start,
      model,
      provider: 'anthropic',
      profileName: runtime.profileName,
    }
  }
}

module.exports = AiProviderRuntimeService
