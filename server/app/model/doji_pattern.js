'use strict'

/**
 * 十字星形态识别结果模型
 */
module.exports = (app) => {
  const { INTEGER, STRING, DATEONLY, ENUM, JSON, DECIMAL, BOOLEAN, DATE } = app.Sequelize

  const DojiPattern = app.model.define(
    'doji_pattern',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      stockId: {
        type: STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      stockName: {
        type: STRING(50),
        allowNull: false,
        comment: '股票名称',
      },
      patternDate: {
        type: DATEONLY,
        allowNull: false,
        comment: '形态出现日期',
      },
      patternType: {
        type: ENUM('standard', 'dragonfly', 'gravestone', 'longLegged'),
        allowNull: false,
        comment: '十字星类型',
      },
      candleData: {
        type: JSON,
        allowNull: false,
        comment: 'K线数据 {open, high, low, close, volume}',
      },
      significance: {
        type: DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.5,
        comment: '形态显著性 0-1',
      },
      context: {
        type: JSON,
        allowNull: true,
        comment: '形态上下文信息 {trend, nearSupportResistance, volumeChange}',
      },
      priceMovement: {
        type: JSON,
        allowNull: true,
        comment: '后续价格走势 {day1, day3, day5, day10}',
      },
      isUpward: {
        type: BOOLEAN,
        allowNull: true,
        comment: '是否上涨（基于5天价格变化）',
      },
    },
    {
      tableName: 'doji_patterns',
      underscored: true,
      indexes: [
        {
          name: 'idx_doji_patterns_stock_date',
          fields: ['stock_id', 'pattern_date'],
        },
        {
          name: 'idx_doji_patterns_date_type_upward',
          fields: ['pattern_date', 'pattern_type', 'is_upward'],
        },
      ],
    }
  )

  DojiPattern.associate = function () {
    // 关联到股票表（如果存在）
    // this.belongsTo(app.model.Stock, { foreignKey: 'stockId', targetKey: 'symbol' });
  }

  // 静态方法：根据条件筛选上涨股票
  DojiPattern.findUpwardStocks = async function (criteria) {
    const {
      days = 3,
      patternTypes = ['standard'],
      minUpwardPercent = 0,
      sortBy = 'priceChange',
      sortDirection = 'desc',
      limit = 20,
      offset = 0,
    } = criteria

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const whereClause = {
      patternDate: {
        [app.Sequelize.Op.gte]: startDate,
      },
      patternType: {
        [app.Sequelize.Op.in]: patternTypes,
      },
      isUpward: true,
    }

    // 如果设置了最小上涨幅度，需要通过 JSON 查询
    if (minUpwardPercent > 0) {
      whereClause[app.Sequelize.Op.and] = app.Sequelize.literal(
        `JSON_EXTRACT(price_movement, '$.day5') >= ${minUpwardPercent}`
      )
    }

    const orderClause = []
    switch (sortBy) {
      case 'priceChange':
        orderClause.push([
          app.Sequelize.literal("JSON_EXTRACT(price_movement, '$.day5')"),
          sortDirection,
        ])
        break
      case 'volumeChange':
        orderClause.push([
          app.Sequelize.literal("JSON_EXTRACT(context, '$.volumeChange')"),
          sortDirection,
        ])
        break
      case 'patternDate':
        orderClause.push(['patternDate', sortDirection])
        break
      case 'significance':
        orderClause.push(['significance', sortDirection])
        break
      default:
        orderClause.push(['patternDate', 'desc'])
    }

    return await this.findAndCountAll({
      where: whereClause,
      order: orderClause,
      limit,
      offset,
    })
  }

  // 静态方法：获取最近形态
  DojiPattern.findRecentPatterns = async function (days = 7, patternType = null, limit = 50) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const whereClause = {
      patternDate: {
        [app.Sequelize.Op.gte]: startDate,
      },
    }

    if (patternType) {
      whereClause.patternType = patternType
    }

    return await this.findAll({
      where: whereClause,
      order: [
        ['patternDate', 'desc'],
        ['significance', 'desc'],
      ],
      limit,
    })
  }

  // 静态方法：分析价格走势
  DojiPattern.analyzePriceMovement = async function (stockId, patternDate, days = 5) {
    const pattern = await this.findOne({
      where: {
        stockId,
        patternDate,
      },
    })

    if (!pattern || !pattern.priceMovement) {
      return null
    }

    const priceMovement = pattern.priceMovement
    const dayKey = `day${days}`

    return {
      patternId: pattern.id,
      stockId: pattern.stockId,
      patternDate: pattern.patternDate,
      priceChange: priceMovement[dayKey] || 0,
      isUpward: priceMovement[dayKey] > 0,
      volumeChange: pattern.context?.volumeChange || 0,
    }
  }

  return DojiPattern
}
