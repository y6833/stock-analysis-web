'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, BOOLEAN, JSON } = app.Sequelize;

  const RiskMonitoringConfig = app.model.define('risk_monitoring_config', {
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
    configName: {
      type: STRING(100),
      allowNull: false,
      defaultValue: '默认风险配置',
      field: 'config_name',
    },
    varConfidenceLevel: {
      type: DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.05,
      field: 'var_confidence_level',
      comment: 'VaR置信水平，如0.05表示95%置信度',
    },
    varTimeHorizon: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'var_time_horizon',
      comment: 'VaR时间跨度（天）',
    },
    varMethod: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'historical',
      field: 'var_method',
      comment: 'VaR计算方法：historical, parametric, monte_carlo',
      validate: {
        isIn: [['historical', 'parametric', 'monte_carlo']],
      },
    },
    lookbackPeriod: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 252,
      field: 'lookback_period',
      comment: '历史数据回看期（天）',
    },
    monteCarloSimulations: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 10000,
      field: 'monte_carlo_simulations',
      comment: '蒙特卡洛模拟次数',
    },
    riskLimits: {
      type: JSON,
      allowNull: true,
      field: 'risk_limits',
      comment: '风险限制配置JSON',
    },
    isActive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
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
  }, {
    tableName: 'risk_monitoring_configs',
    underscored: true,
  });

  RiskMonitoringConfig.associate = function() {
    // 关联用户
    RiskMonitoringConfig.belongsTo(app.model.User, { 
      foreignKey: 'userId',
      as: 'user'
    });

    // 关联投资组合
    RiskMonitoringConfig.belongsTo(app.model.UserPortfolio, { 
      foreignKey: 'portfolioId',
      as: 'portfolio'
    });

    // 关联VaR计算记录
    RiskMonitoringConfig.hasMany(app.model.VarCalculation, { 
      foreignKey: 'configId',
      as: 'varCalculations'
    });
  };

  return RiskMonitoringConfig;
};
