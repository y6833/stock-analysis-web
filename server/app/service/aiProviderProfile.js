'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function newId() {
  return crypto.randomUUID()
}

const DATA_FILE = path.join(__dirname, '../../data/ai-provider-profiles.json')

/** CC Switch 兼容的配置结构 */
function normalizeCcSwitchConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('无效的配置格式')
  }

  const config = {
    env: {},
    includeCoAuthoredBy: false,
  }

  if (raw.env && typeof raw.env === 'object') {
    config.env = { ...raw.env }
  } else {
    // 兼容扁平 env 变量导入
    Object.keys(raw).forEach((key) => {
      if (key !== 'includeCoAuthoredBy' && typeof raw[key] === 'string') {
        config.env[key] = raw[key]
      }
    })
  }

  if (typeof raw.includeCoAuthoredBy === 'boolean') {
    config.includeCoAuthoredBy = raw.includeCoAuthoredBy
  }

  return config
}

function detectProvider(env) {
  const keys = Object.keys(env || {})
  if (keys.some((k) => k.startsWith('ANTHROPIC_'))) return 'anthropic'
  if (keys.some((k) => k.startsWith('DEEPSEEK_'))) return 'deepseek'
  if (keys.some((k) => k.startsWith('OPENAI_'))) return 'openai'
  return 'custom'
}

function maskEnv(env) {
  const masked = { ...env }
  Object.keys(masked).forEach((key) => {
    if (/TOKEN|KEY|SECRET|PASSWORD/i.test(key) && masked[key]) {
      const v = String(masked[key])
      masked[key] = v.length <= 8 ? '****' : `${v.slice(0, 4)}****${v.slice(-4)}`
    }
  })
  return masked
}

function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { activeProfileId: null, profiles: [] }
  }
}

function writeStore(store) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

const Service = require('egg').Service

class AiProviderProfileService extends Service {
  listProfiles() {
    const store = readStore()
    return {
      activeProfileId: store.activeProfileId,
      profiles: store.profiles.map((p) => ({
        ...p,
        config: {
          env: maskEnv(p.config?.env || {}),
          includeCoAuthoredBy: p.config?.includeCoAuthoredBy ?? false,
        },
        provider: p.provider || detectProvider(p.config?.env),
      })),
    }
  }

  getProfile(id, includeSecrets = false) {
    const store = readStore()
    const profile = store.profiles.find((p) => p.id === id)
    if (!profile) return null

    if (!includeSecrets) {
      return {
        ...profile,
        config: {
          env: maskEnv(profile.config?.env || {}),
          includeCoAuthoredBy: profile.config?.includeCoAuthoredBy ?? false,
        },
      }
    }
    return profile
  }

  getActiveProfile() {
    const store = readStore()
    if (!store.activeProfileId) return null
    return store.profiles.find((p) => p.id === store.activeProfileId) || null
  }

  createProfile({ name, config }) {
    const normalized = normalizeCcSwitchConfig(config)
    const store = readStore()
    const now = new Date().toISOString()
    const profile = {
      id: newId(),
      name: name || '未命名配置',
      provider: detectProvider(normalized.env),
      config: normalized,
      createdAt: now,
      updatedAt: now,
    }
    store.profiles.push(profile)
    if (!store.activeProfileId) store.activeProfileId = profile.id
    writeStore(store)
    return this.getProfile(profile.id)
  }

  updateProfile(id, { name, config }) {
    const store = readStore()
    const idx = store.profiles.findIndex((p) => p.id === id)
    if (idx === -1) return null

    const existing = store.profiles[idx]
    if (name) existing.name = name

    if (config) {
      const normalized = normalizeCcSwitchConfig(config)
      // 合并 env：掩码值不覆盖原密钥
      const mergedEnv = { ...(existing.config?.env || {}) }
      Object.entries(normalized.env).forEach(([k, v]) => {
        if (typeof v === 'string' && v.includes('****')) return
        mergedEnv[k] = v
      })
      existing.config = {
        env: mergedEnv,
        includeCoAuthoredBy: normalized.includeCoAuthoredBy,
      }
      existing.provider = detectProvider(mergedEnv)
    }

    existing.updatedAt = new Date().toISOString()
    store.profiles[idx] = existing
    writeStore(store)
    return this.getProfile(id)
  }

  deleteProfile(id) {
    const store = readStore()
    store.profiles = store.profiles.filter((p) => p.id !== id)
    if (store.activeProfileId === id) {
      store.activeProfileId = store.profiles[0]?.id || null
    }
    writeStore(store)
    return true
  }

  setActiveProfile(id) {
    const store = readStore()
    const profile = store.profiles.find((p) => p.id === id)
    if (!profile) return null
    store.activeProfileId = id
    writeStore(store)
    return this.getProfile(id)
  }

  importCcSwitch(json, name) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    return this.createProfile({
      name: name || `导入配置 ${new Date().toLocaleString('zh-CN')}`,
      config: normalizeCcSwitchConfig(parsed),
    })
  }

  exportCcSwitch(id) {
    const profile = this.getProfile(id, true)
    if (!profile) return null
    return {
      env: profile.config.env,
      includeCoAuthoredBy: profile.config.includeCoAuthoredBy ?? false,
    }
  }

  getPresets() {
    return [
      {
        id: 'anthropic-cc-switch',
        name: 'Anthropic / CC Switch',
        description: '兼容 Claude Code CC Switch 配置格式',
        template: {
          env: {
            ANTHROPIC_AUTH_TOKEN: '',
            ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
            ANTHROPIC_MODEL: 'claude-sonnet-4-6',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
            ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
            ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
            ANTHROPIC_REASONING_MODEL: 'claude-sonnet-4-6-thinking',
          },
          includeCoAuthoredBy: false,
        },
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        template: {
          env: {
            DEEPSEEK_API_KEY: '',
            DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
            DEEPSEEK_MODEL: 'deepseek-chat',
          },
          includeCoAuthoredBy: false,
        },
      },
      {
        id: 'openai',
        name: 'OpenAI 兼容',
        template: {
          env: {
            OPENAI_API_KEY: '',
            OPENAI_BASE_URL: 'https://api.openai.com/v1',
            OPENAI_MODEL: 'gpt-4o',
          },
          includeCoAuthoredBy: false,
        },
      },
    ]
  }
}

module.exports = AiProviderProfileService
