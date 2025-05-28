'use strict'

module.exports = (app) => {
  const { STRING, INTEGER, DECIMAL, BOOLEAN, DATE, JSON } = app.Sequelize

  const StopLossConfig = app.model.define(
    'stop_loss_config',
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
        comment: '用户ID',
      },
      portfolioId: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        field: 'portfolio_id',
        comment: '投资组合ID，null表示全局配置',
      },
      symbol: {
        type: STRING(20),
        allowNull: true,
        comment: '股票代码，null表示组合级配置',
      },
      configName: {
        type: STRING(100),
        allowNull: false,
        field: 'config_name',
        comment: '配置名称',
      },
      stopLossType: {
        type: STRING(20),
        allowNull: false,
        field: 'stop_loss_type',
        comment: '止损类型: fixed, trailing, atr, volatility, time',
      },
      stopLossPercentage: {
        type: DECIMAL(5, 4),
        allowNull: true,
        field: 'stop_loss_percentage',
        comment: '止损百分比',
      },
      trailingDistance: {
        type: DECIMAL(5, 4),
        allowNull: true,
        field: 'trailing_distance',
        comment: '移动止损距离',
      },
      atrMultiplier: {
        type: DECIMAL(5, 2),
        allowNull: true,
        field: 'atr_multiplier',
        comment: 'ATR倍数',
      },
      volatilityMultiplier: {
        type: DECIMAL(5, 2),
        allowNull: true,
        field: 'volatility_multiplier',
        comment: '波动率倍数',
      },
      timeLimit: {
        type: INTEGER,
        allowNull: true,
        field: 'time_limit',
        comment: '时间限制(天)',
      },
      takeProfitType: {
        type: STRING(20),
        allowNull: false,
        field: 'take_profit_type',
        comment: '止盈类型: fixed, ladder, trailing, dynamic',
      },
      takeProfitLevels: {
        type: JSON,
        allowNull: true,
        field: 'take_profit_levels',
        comment: '止盈层级配置',
      },
      trailingActivation: {
        type: DECIMAL(5, 4),
        allowNull: true,
        field: 'trailing_activation',
        comment: '移动止盈激活点',
      },
      trailingTakeProfitDistance: {
        type: DECIMAL(5, 4),
        allowNull: true,
        field: 'trailing_take_profit_distance',
        comment: '移动止盈距离',
      },
      isStopLossEnabled: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_stop_loss_enabled',
        comment: '是否启用止损',
      },
      isTakeProfitEnabled: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_take_profit_enabled',
        comment: '是否启用止盈',
      },
      isActive: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
        comment: '是否激活',
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
      tableName: 'stop_loss_configs',
      timestamps: true,
      underscored: true,
      comment: '止损止盈配置表',
    }
  )

  StopLossConfig.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 关联用户 - 使用唯一别名
    app.model.StopLossConfig.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_${prefix}_stopLossConfigUser`,
    })

    // 关联投资组合
    app.model.StopLossConfig.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: `${prefix}_${prefix}_portfolio`,
    })
  }

  return StopLossConfig
}
