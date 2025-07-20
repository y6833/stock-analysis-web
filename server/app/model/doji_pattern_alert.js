'use strict'

/**
 * 十字星形态提醒设置模型
 */
module.exports = (app) => {
  const { INTEGER, STRING, JSON, DECIMAL, BOOLEAN, DATE } = app.Sequelize

  const DojiPatternAlert = app.model.define(
    'doji_pattern_alert',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        comment: '用户ID',
      },
      stockId: {
        type: STRING(20),
        allowNull: true,
        comment: '股票代码，为空表示监控所有股票',
      },
      stockName: {
        type: STRING(50),
        allowNull: true,
        comment: '股票名称',
      },
      patternTypes: {
        type: JSON,
        allowNull: false,
        comment: '监控的十字星类型数组',
      },
      minSignificance: {
        type: DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.5,
        comment: '最小形态显著性',
      },
      marketConditions: {
        type: JSON,
        allowNull: true,
        comment: '市场环境条件',
      },
      isActive: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否启用',
      },
      notificationMethods: {
        type: JSON,
        allowNull: false,
        defaultValue: ['web'],
        comment: '通知方式 ["web", "email", "sms"]',
      },
      lastTriggeredAt: {
        type: DATE,
        allowNull: true,
        comment: '最后触发时间',
      },
    },
    {
      tableName: 'doji_pattern_alerts',
      underscored: true,
      indexes: [
        {
          name: 'idx_doji_pattern_alerts_user_active',
          fields: ['user_id', 'is_active'],
        },
        {
          name: 'idx_doji_pattern_alerts_stock_active',
          fields: ['stock_id', 'is_active'],
        },
      ],
    }
  )

  DojiPatternAlert.associate = function () {
    // 关联到用户表
    this.belongsTo(app.model.User, { foreignKey: 'userId' })

    // 关联到提醒历史表
    this.hasMany(app.model.DojiPatternAlertHistory, { foreignKey: 'alertId' })
  }

  // 静态方法：获取用户的活跃提醒
  DojiPatternAlert.findActiveByUser = async function (userId) {
    return await this.findAll({
      where: {
        userId,
        isActive: true,
      },
      order: [['createdAt', 'desc']],
    })
  }

  // 静态方法：获取特定股票的活跃提醒
  DojiPatternAlert.findActiveByStock = async function (stockId) {
    return await this.findAll({
      where: {
        [app.Sequelize.Op.or]: [
          { stockId },
          { stockId: null }, // 监控所有股票的提醒
        ],
        isActive: true,
      },
    })
  }

  // 实例方法：检查形态是否匹配提醒条件
  DojiPatternAlert.prototype.matchesPattern = function (pattern) {
    // 检查形态类型
    if (!this.patternTypes.includes(pattern.patternType)) {
      return false
    }

    // 检查显著性
    if (pattern.significance < this.minSignificance) {
      return false
    }

    // 检查股票（如果指定了特定股票）
    if (this.stockId && this.stockId !== pattern.stockId) {
      return false
    }

    // 检查市场环境（如果指定了）
    if (this.marketConditions && this.marketConditions.length > 0) {
      const patternMarketCondition = pattern.context?.trend || 'sideways'
      if (!this.marketConditions.includes(patternMarketCondition)) {
        return false
      }
    }

    return true
  }

  // 实例方法：触发提醒
  DojiPatternAlert.prototype.trigger = async function (pattern) {
    // 更新最后触发时间
    this.lastTriggeredAt = new Date()
    await this.save()

    // 创建提醒历史记录
    await app.model.DojiPatternAlertHistory.create({
      alertId: this.id,
      triggeredAt: new Date(),
      acknowledged: false,
      patternDetails: {
        patternId: pattern.id,
        stockId: pattern.stockId,
        stockName: pattern.stockName,
        patternType: pattern.patternType,
        patternDate: pattern.patternDate,
        significance: pattern.significance,
        candleData: pattern.candleData,
      },
    })

    return true
  }

  return DojiPatternAlert
}
