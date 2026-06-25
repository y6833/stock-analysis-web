import axios from 'axios'
import { getApiRoot } from '@/utils/apiBase'
import { getAuthHeaders } from '@/utils/auth'

const API = `${getApiRoot()}/ai/preferences`

export interface AIPreferences {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  investmentHorizon: 'short' | 'medium' | 'long'
  analysisDepth: 'basic' | 'detailed' | 'comprehensive'
  aiWeight: number
  sectorPreferences?: string[]
  focusAreas?: string[]
  excludePatterns?: string[]
  learningEnabled?: boolean
  customCriteria?: Record<string, unknown>
}

export const aiPreferencesService = {
  async get(): Promise<AIPreferences> {
    const res = await axios.get(API, getAuthHeaders())
    return res.data.data
  },

  async update(prefs: Partial<AIPreferences>) {
    const res = await axios.put(API, prefs, getAuthHeaders())
    return res.data
  },

  async getInsights() {
    const res = await axios.get(`${API}/insights`, getAuthHeaders())
    return res.data.data
  },
}

export default aiPreferencesService
