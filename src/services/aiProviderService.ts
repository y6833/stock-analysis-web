import axios from 'axios'
import { getApiRoot } from '@/utils/apiBase'
import { getAuthHeaders } from '@/utils/auth'
import type {
  AIProviderListResponse,
  AIProviderPreset,
  AIProviderProfile,
  CcSwitchConfig,
} from '@/types/aiProvider'

const API = `${getApiRoot()}/admin/ai-providers`

export const aiProviderService = {
  async list(): Promise<AIProviderListResponse> {
    const res = await axios.get(API, getAuthHeaders())
    return res.data.data
  },

  async getPresets(): Promise<AIProviderPreset[]> {
    const res = await axios.get(`${API}/presets`, getAuthHeaders())
    return res.data.data
  },

  async create(name: string, config: CcSwitchConfig): Promise<AIProviderProfile> {
    const res = await axios.post(API, { name, config }, getAuthHeaders())
    return res.data.data
  },

  async update(id: string, data: { name?: string; config?: CcSwitchConfig }): Promise<AIProviderProfile> {
    const res = await axios.put(`${API}/${id}`, data, getAuthHeaders())
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    await axios.delete(`${API}/${id}`, getAuthHeaders())
  },

  async activate(id: string): Promise<AIProviderProfile> {
    const res = await axios.post(`${API}/${id}/activate`, {}, getAuthHeaders())
    return res.data.data
  },

  async importCcSwitch(config: CcSwitchConfig | string, name?: string): Promise<AIProviderProfile> {
    const parsed = typeof config === 'string' ? JSON.parse(config) : config
    const res = await axios.post(`${API}/import`, { config: parsed, name }, getAuthHeaders())
    return res.data.data
  },

  async exportCcSwitch(id: string): Promise<CcSwitchConfig> {
    const res = await axios.get(`${API}/${id}/export`, getAuthHeaders())
    return res.data.data
  },

  async test(profileId?: string): Promise<{
    response: string
    model: string
    provider: string
    profileName?: string
    latencyMs: number
  }> {
    const res = await axios.post(`${API}/test`, { profileId }, getAuthHeaders())
    return res.data.data
  },
}

export default aiProviderService
