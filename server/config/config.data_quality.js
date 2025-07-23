'use strict'

/**
 * 数据质量配置
 */
module.exports = {
  // 数据验证器配置
  dataValidator: {
    // 是否启用严格模式（验证失败时抛出错误）
    strictMode: false,
    // 是否启用自动修复（尝试修复无效数据）
    autoFix: true,
    // 质量检查配置
    qualityCheck: {
      // 价格异常检测阈值（百分比）
      priceAnomalyThreshold: 20,
      // 成交量异常检测阈值（百分比）
      volumeAnomalyThreshold: 300,
      // 数据完整性要求
      requiredFields: {
        stockQuote: ['symbol', 'name', 'price', 'change', 'changePercent', 'volume', 'timestamp'],
        stockHistory: ['date', 'open', 'high', 'low', 'close', 'volume', 'adjustedClose'],
      },
      // 数据一致性检查
      consistencyChecks: {
        // 价格一致性检查：开盘价、最高价、最低价、收盘价之间的关系
        priceConsistency: true,
        // 日期连续性检查
        dateContinuity: true,
      },
    },
  },

  // 数据转换器配置
  dataTransformer: {
    // 是否启用字段映射
    enableFieldMapping: true,
    // 是否启用类型转换
    enableTypeConversion: true,
    // 是否添加元数据
    addMetadata: true,
  },
}
