'use strict'

module.exports = (app) => {
  const { INTEGER, DATE, TEXT, DECIMAL, BOOLEAN, JSON, ENUM } = app.Sequelize

  const RiskAlertLog = app.model.define(
    'risk_alert_log',
    {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      portfolioId: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        field: 'portfolio_id',
      },
      ruleId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'rule_id',
      },
      alertTime: {
        type: DATE,
        allowNull: false,
        field: 'alert_time',
        comment: '预警时间',
      },
      alertLevel: {
        type: ENUM('info', 'warning', 'critical', 'emergency'),
        allowNull: false,
        field: 'alert_level',
        comment: '预警级别',
      },
      alertMessage: {
        type: TEXT,
        allowNull: false,
        field: 'alert_message',
        comment: '预警消息',
      },
      currentValue: {
        type: DECIMAL(15, 6),
        allowNull: true,
        field: 'current_value',
        comment: '当前值',
      },
      thresholdValue: {
        type: DECIMAL(15, 6),
        allowNull: true,
        field: 'threshold_value',
        comment: '阈值',
      },
      alertData: {
        type: JSON,
        allowNull: true,
        field: 'alert_data',
        comment: '预警详细数据JSON',
      },
      isResolved: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_resolved',
        comment: '是否已解决',
      },
      resolvedAt: {
        type: DATE,
        allowNull: true,
        field: 'resolved_at',
        comment: '解决时间',
      },
      notificationSent: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'notification_sent',
        comment: '是否已发送通知',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      tableName: 'risk_alert_logs',
      underscored: true,
    }
  )

  RiskAlertLog.associate = function () {
    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || ''

    // 关联用户 - 使用唯一前缀防止别名冲突
    RiskAlertLog.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_riskAlertLogBelongsToUser`,
    })

    // 关联投资组合
    RiskAlertLog.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: `${prefix}_portfolio`,
    })

    // 关联预警规则
    RiskAlertLog.belongsTo(app.model.RiskAlertRule, {
      foreignKey: 'ruleId',
      as: `${prefix}_rule`,
    })
  }

  return RiskAlertLog
}
