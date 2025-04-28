import { describe, it, expect } from 'vitest'

describe('基本测试', () => {
  it('应该通过基本断言', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该支持异步测试', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })
})
