'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON } = app.Sequelize;

  const VarCalculation = app.model.define('var_calculation', {
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
    configId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'config_id',
    },
    calculationDate: {
      type: DATE,
      allowNull: false,
      field: 'calculation_date',
      comment: '计算日期',
    },
    portfolioValue: {
      type: DECIMAL(15, 2),
      allowNull: false,
      field: 'portfolio_value',
      comment: '投资组合总价值',
    },
    varAbsolute: {
      type: DECIMAL(15, 2),
      allowNull: false,
      field: 'var_absolute',
      comment: 'VaR绝对值（货币单位）',
    },
    varPercentage: {
      type: DECIMAL(8, 6),
      allowNull: false,
      field: 'var_percentage',
      comment: 'VaR百分比',
    },
    expectedShortfall: {
      type: DECIMAL(15, 2),
      allowNull: true,
      field: 'expected_shortfall',
      comment: '期望损失（ES/CVaR）',
    },
    confidenceLevel: {
      type: DECIMAL(5, 4),
      allowNull: false,
      field: 'confidence_level',
      comment: '置信水平',
    },
    timeHorizon: {
      type: INTEGER,
      allowNull: false,
      field: 'time_horizon',
      comment: '时间跨度（天）',
    },
    calculationMethod: {
      type: STRING(20),
      allowNull: false,
      field: 'calculation_method',
      comment: '计算方法',
    },
    componentVar: {
      type: JSON,
      allowNull: true,
      field: 'component_var',
      comment: '成分VaR详情JSON',
    },
    riskMetrics: {
      type: JSON,
      allowNull: true,
      field: 'risk_metrics',
      comment: '其他风险指标JSON',
    },
    calculationDetails: {
      type: JSON,
      allowNull: true,
      field: 'calculation_details',
      comment: '计算详情和参数JSON',
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
    tableName: 'var_calculations',
    underscored: true,
  });

  VarCalculation.associate = function () {
    // 关联用户 - 使用唯一别名
    VarCalculation.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'varUser'
    });

    // 关联投资组合
    VarCalculation.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: 'portfolio'
    });

    // 关联风险配置
    VarCalculation.belongsTo(app.model.RiskMonitoringConfig, {
      foreignKey: 'configId',
      as: 'config'
    });
  };

  return VarCalculation;
};
