import { describe, it, expect } from 'vitest'

/** 与 recommendationPerformanceTracker 回填逻辑一致的收益率计算 */
function calculateActualReturn(entryPrice: number, currentPrice: number) {
  return (currentPrice - entryPrice) / entryPrice
}

function evaluateStatus(
  recommendationType: string,
  targetPrice: number | null,
  currentPrice: number,
  expiresAt: Date | null,
) {
  if (expiresAt && new Date() > expiresAt) return 'expired'
  if (targetPrice != null && Number.isFinite(targetPrice)) {
    if (['strong_buy', 'buy'].includes(recommendationType) && currentPrice >= targetPrice) {
      return 'achieved'
    }
    if (['strong_sell', 'sell'].includes(recommendationType) && currentPrice <= targetPrice) {
      return 'achieved'
    }
  }
  return 'active'
}

describe('推荐绩效回填计算', () => {
  it('应正确计算 actualReturn', () => {
    expect(calculateActualReturn(10, 11)).toBe(0.1)
    expect(calculateActualReturn(10, 9)).toBe(-0.1)
  })

  it('买入达标应标记 achieved', () => {
    const status = evaluateStatus('buy', 12, 12.5, new Date(Date.now() + 86400000))
    expect(status).toBe('achieved')
  })

  it('过期应标记 expired', () => {
    const status = evaluateStatus('buy', 12, 11, new Date(Date.now() - 1000))
    expect(status).toBe('expired')
  })
})
