'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, BOOLEAN, JSON } = app.Sequelize;

  const StrategyExecution = app.model.define('strategy_execution', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    strategyId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'strategy_id',
    },
    stockCode: {
      type: STRING(20),
      allowNull: false,
      field: 'stock_code',
    },
    stockName: {
      type: STRING(50),
      allowNull: false,
      field: 'stock_name',
    },
    action: {
      type: STRING(10),
      allowNull: false,
      comment: 'buy: 买入信号, sell: 卖出信号',
    },
    signalPrice: {
      type: STRING(10),
      allowNull: true,
      field: 'signal_price',
    },
    signalDate: {
      type: DATE,
      allowNull: false,
      field: 'signal_date',
    },
    isExecuted: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_executed',
    },
    executionDetails: {
      type: JSON,
      allowNull: true,
      field: 'execution_details',
      comment: '执行详情',
    },
    notes: {
      type: TEXT,
      allowNull: true,
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
    tableName: 'strategy_executions',
    underscored: true,
  });

  StrategyExecution.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.StrategyExecution
    this.belongsTo(app.model.UserStrategy, { foreignKey: 'strategyId' });
  };

  return StrategyExecution;
};
