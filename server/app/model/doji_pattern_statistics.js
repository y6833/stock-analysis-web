'use strict'

/**
 * 十字星形态统计缓存模型
 */
module.exports = (app) => {
  const { INTEGER, ENUM, DECIMAL, JSON, DATE } = app.Sequelize

  const DojiPatternStatistics = app.model.define(
    'doji_pattern_statistics',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      patternType: {
        type: ENUM('standard', 'dragonfly', 'gravestone', 'longLegged'),
        allowNull: false,
        comment: '十字星类型',
      },
      analysisPeriod: {
        type: INTEGER,
        allowNull: false,
        comment: '分析周期（天数）',
      },
      marketCondition: {
        type: ENUM('bull', 'bear', 'sideways'),
        allowNull: true,
        comment: '市场环境',
      },
      totalPatterns: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总形态数量',
      },
      upwardPatterns: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '上涨形态数量',
      },
      successRate: {
        type: DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: '成功率百分比',
      },
      avgPriceChange: {
        type: DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 0,
        comment: '平均价格变化百分比',
      },
      priceDistribution: {
        type: JSON,
        allowNull: true,
        comment: '价格分布统计',
      },
      lastUpdated: {
        type: DATE,
        allowNull: false,
        comment: '最后更新时间',
      },
    },
    {
      tableName: 'doji_pattern_statistics',
      underscored: true,
      indexes: [
        {
          name: 'idx_doji_pattern_statistics_type_period_market',
          fields: ['pattern_type', 'analysis_period', 'market_condition'],
          unique: true,
        },
      ],
    }
  )

  // 静态方法：获取或创建统计记录
  DojiPatternStatistics.findOrCreateStats = async function (
    patternType,
    analysisPeriod,
    marketCondition = null
  ) {
    const [stats, created] = await this.findOrCreate({
      where: {
        patternType,
        analysisPeriod,
        marketCondition,
      },
      defaults: {
        totalPatterns: 0,
        upwardPatterns: 0,
        successRate: 0,
        avgPriceChange: 0,
        priceDistribution: {},
        lastUpdated: new Date(),
      },
    })

    return stats
  }

  // 静态方法：更新统计数据
  DojiPatternStatistics.updateStats = async function (
    patternType,
    analysisPeriod,
    marketCondition = null
  ) {
    const stats = await this.findOrCreateStats(patternType, analysisPeriod, marketCondition)

    // 查询对应的形态数据
    const whereClause = {
      patternType,
      priceMovement: {
        [app.Sequelize.Op.ne]: null,
      },
    }

    // 根据分析周期设置日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - analysisPeriod)
    whereClause.patternDate = {
      [app.Sequelize.Op.between]: [startDate, endDate],
    }

    // 如果指定了市场环境，添加条件
    if (marketCondition) {
      whereClause[app.Sequelize.Op.and] = app.Sequelize.literal(
        `JSON_EXTRACT(context, '$.trend') = '${marketCondition}'`
      )
    }

    const patterns = await app.model.DojiPattern.findAll({
      where: whereClause,
    })

    // 计算统计数据
    const totalPatterns = patterns.length
    const upwardPatterns = patterns.filter((p) => p.isUpward).length
    const successRate = totalPatterns > 0 ? (upwardPatterns / totalPatterns) * 100 : 0

    // 计算平均价格变化
    const priceChanges = patterns
      .filter((p) => p.priceMovement && p.priceMovement.day5 !== undefined)
      .map((p) => p.priceMovement.day5)

    const avgPriceChange =
      priceChanges.length > 0
        ? priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
        : 0

    // 计算价格分布
    const priceDistribution = this.calculatePriceDistribution(priceChanges)

    // 更新统计记录
    await stats.update({
      totalPatterns,
      upwardPatterns,
      successRate: Math.round(successRate * 100) / 100,
      avgPriceChange: Math.round(avgPriceChange * 10000) / 10000,
      priceDistribution,
      lastUpdated: new Date(),
    })

    return stats
  }

  // 静态方法：计算价格分布
  DojiPatternStatistics.calculatePriceDistribution = function (priceChanges) {
    if (priceChanges.length === 0) {
      return {}
    }

    const distribution = {
      ranges: {
        'below_-10': 0,
        '-10_to_-5': 0,
        '-5_to_0': 0,
        '0_to_5': 0,
        '5_to_10': 0,
        above_10: 0,
      },
      percentiles: {},
      mean: 0,
      median: 0,
      stdDev: 0,
    }

    // 计算范围分布
    priceChanges.forEach((change) => {
      if (change < -10) distribution.ranges['below_-10']++
      else if (change < -5) distribution.ranges['-10_to_-5']++
      else if (change < 0) distribution.ranges['-5_to_0']++
      else if (change < 5) distribution.ranges['0_to_5']++
      else if (change < 10) distribution.ranges['5_to_10']++
      else distribution.ranges['above_10']++
    })

    // 计算统计指标
    const sorted = priceChanges.sort((a, b) => a - b)
    distribution.mean = priceChanges.reduce((sum, val) => sum + val, 0) / priceChanges.length
    distribution.median = sorted[Math.floor(sorted.length / 2)]

    // 计算百分位数
    distribution.percentiles = {
      p10: sorted[Math.floor(sorted.length * 0.1)],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
    }

    // 计算标准差
    const variance =
      priceChanges.reduce((sum, val) => sum + Math.pow(val - distribution.mean, 2), 0) /
      priceChanges.length
    distribution.stdDev = Math.sqrt(variance)

    return distribution
  }

  // 静态方法：获取统计摘要
  DojiPatternStatistics.getStatsSummary = async function (
    patternType = null,
    analysisPeriod = null
  ) {
    const whereClause = {}

    if (patternType) {
      whereClause.patternType = patternType
    }

    if (analysisPeriod) {
      whereClause.analysisPeriod = analysisPeriod
    }

    return await this.findAll({
      where: whereClause,
      order: [
        ['patternType', 'asc'],
        ['analysisPeriod', 'asc'],
        ['marketCondition', 'asc'],
      ],
    })
  }

  // 静态方法：检查统计数据是否需要更新
  DojiPatternStatistics.needsUpdate = async function (
    patternType,
    analysisPeriod,
    marketCondition = null,
    maxAge = 3600
  ) {
    const stats = await this.findOne({
      where: {
        patternType,
        analysisPeriod,
        marketCondition,
      },
    })

    if (!stats) {
      return true
    }

    const ageInSeconds = (new Date() - stats.lastUpdated) / 1000
    return ageInSeconds > maxAge
  }

  return DojiPatternStatistics
}
