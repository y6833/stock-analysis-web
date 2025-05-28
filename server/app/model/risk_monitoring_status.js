'use strict'

module.exports = (app) => {
  const { INTEGER, DATE, DECIMAL, JSON } = app.Sequelize

  const RiskMonitoringStatus = app.model.define(
    'risk_monitoring_status',
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
      monitoringDate: {
        type: DATE,
        allowNull: false,
        field: 'monitoring_date',
        comment: '监控日期',
      },
      portfolioValue: {
        type: DECIMAL(15, 2),
        allowNull: false,
        field: 'portfolio_value',
        comment: '投资组合价值',
      },
      dailyPnl: {
        type: DECIMAL(15, 2),
        allowNull: true,
        field: 'daily_pnl',
        comment: '日盈亏',
      },
      dailyPnlPercentage: {
        type: DECIMAL(8, 6),
        allowNull: true,
        field: 'daily_pnl_percentage',
        comment: '日盈亏百分比',
      },
      currentVar: {
        type: DECIMAL(15, 2),
        allowNull: true,
        field: 'current_var',
        comment: '当前VaR值',
      },
      volatility: {
        type: DECIMAL(8, 6),
        allowNull: true,
        comment: '当前波动率',
      },
      maxDrawdown: {
        type: DECIMAL(8, 6),
        allowNull: true,
        field: 'max_drawdown',
        comment: '最大回撤',
      },
      concentrationRisk: {
        type: DECIMAL(8, 6),
        allowNull: true,
        field: 'concentration_risk',
        comment: '集中度风险',
      },
      riskMetrics: {
        type: JSON,
        allowNull: true,
        field: 'risk_metrics',
        comment: '其他风险指标JSON',
      },
      alertCount: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'alert_count',
        comment: '当日预警次数',
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
      tableName: 'risk_monitoring_status',
      underscored: true,
    }
  )

  RiskMonitoringStatus.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 关联用户 - 使用唯一别名
    RiskMonitoringStatus.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_${prefix}_riskMonitoringStatusUser`,
    })

    // 关联投资组合
    RiskMonitoringStatus.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: `${prefix}_${prefix}_portfolio`,
    })
  }

  return RiskMonitoringStatus
}
