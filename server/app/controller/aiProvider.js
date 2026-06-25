'use strict'

const Controller = require('egg').Controller

function requireAdmin(ctx) {
  if (!ctx.user || ctx.user.role !== 'admin') {
    ctx.status = 403
    ctx.body = { success: false, message: '需要管理员权限' }
    return false
  }
  return true
}

class AiProviderController extends Controller {
  async list() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const data = ctx.service.aiProviderProfile.listProfiles()
    const runtime = ctx.service.aiProviderRuntime.getRuntimeConfig()
    ctx.body = {
      success: true,
      data: {
        ...data,
        runtime: runtime
          ? {
              provider: runtime.provider,
              model: runtime.model,
              baseUrl: runtime.baseUrl,
              profileId: runtime.profileId,
              profileName: runtime.profileName,
            }
          : null,
      },
    }
  }

  async presets() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    ctx.body = { success: true, data: ctx.service.aiProviderProfile.getPresets() }
  }

  async create() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const { name, config } = ctx.request.body || {}
    const profile = ctx.service.aiProviderProfile.createProfile({ name, config })
    ctx.body = { success: true, data: profile }
  }

  async update() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const { id } = ctx.params
    const profile = ctx.service.aiProviderProfile.updateProfile(id, ctx.request.body || {})
    if (!profile) {
      ctx.status = 404
      ctx.body = { success: false, message: '配置不存在' }
      return
    }
    ctx.body = { success: true, data: profile }
  }

  async destroy() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    ctx.service.aiProviderProfile.deleteProfile(ctx.params.id)
    ctx.body = { success: true }
  }

  async activate() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const profile = ctx.service.aiProviderProfile.setActiveProfile(ctx.params.id)
    if (!profile) {
      ctx.status = 404
      ctx.body = { success: false, message: '配置不存在' }
      return
    }
    ctx.body = { success: true, data: profile, message: `已切换到「${profile.name}」` }
  }

  async importConfig() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const { config, name } = ctx.request.body || {}
    try {
      const profile = ctx.service.aiProviderProfile.importCcSwitch(config, name)
      ctx.body = { success: true, data: profile, message: 'CC Switch 配置导入成功' }
    } catch (error) {
      ctx.status = 400
      ctx.body = { success: false, message: error.message }
    }
  }

  async exportConfig() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const exported = ctx.service.aiProviderProfile.exportCcSwitch(ctx.params.id)
    if (!exported) {
      ctx.status = 404
      ctx.body = { success: false, message: '配置不存在' }
      return
    }
    ctx.body = { success: true, data: exported }
  }

  async test() {
    const { ctx } = this
    if (!requireAdmin(ctx)) return
    const { profileId } = ctx.request.body || {}
    try {
      if (profileId) {
        const profile = ctx.service.aiProviderProfile.getProfile(profileId, true)
        if (!profile) throw new Error('配置不存在')
        const runtime = ctx.service.aiProviderRuntime.resolveFromProfile(profile)
        if (!runtime?.apiKey) throw new Error('API Key 未配置')

        const result = await ctx.service.aiProviderRuntime.chatWithRuntime(runtime, [
          { role: 'user', content: '回复 OK 两个字母即可' },
        ], { maxTokens: 10 })

        ctx.body = {
          success: true,
          data: {
            response: result.content,
            model: result.model,
            provider: result.provider,
            profileName: profile.name,
            latencyMs: result.processingTime,
          },
        }
        return
      }

      const result = await ctx.service.aiProviderRuntime.chat([
        { role: 'user', content: '回复 OK 两个字母即可' },
      ], { maxTokens: 10 })

      ctx.body = {
        success: true,
        data: {
          response: result.content,
          model: result.model,
          provider: result.provider,
          profileName: result.profileName,
          latencyMs: result.processingTime,
        },
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = { success: false, message: error.message }
    }
  }
}

module.exports = AiProviderController
