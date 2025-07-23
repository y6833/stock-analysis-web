'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = app.Sequelize;

  const MarketRiskFactor = app.model.define('market_risk_factor', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    factorName: {
      type: STRING(50),
      allowNull: false,
      unique: true,
      field: 'factor_name',
      comment: '风险因子名称',
    },
    factorType: {
      type: STRING(20),
      allowNull: false,
      field: 'factor_type',
      comment: '因子类型：equity, bond, currency, commodity, volatility',
      validate: {
        isIn: [['equity', 'bond', 'currency', 'commodity', 'volatility']],
      },
    },
    description: {
      type: TEXT,
      allowNull: true,
      comment: '因子描述',
    },
    dataSource: {
      type: STRING(50),
      allowNull: true,
      field: 'data_source',
      comment: '数据源',
    },
    historicalData: {
      type: JSON,
      allowNull: true,
      field: 'historical_data',
      comment: '历史数据JSON',
    },
    volatility: {
      type: DECIMAL(8, 6),
      allowNull: true,
      comment: '历史波动率',
    },
    correlationFactors: {
      type: JSON,
      allowNull: true,
      field: 'correlation_factors',
      comment: '与其他因子的相关性JSON',
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
    tableName: 'market_risk_factors',
    underscored: true,
  });

  MarketRiskFactor.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 这个模型主要用于存储市场风险因子数据
    // 可以根据需要添加与其他模型的关联
  };

  return MarketRiskFactor;
};
