'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, BOOLEAN, JSON } = app.Sequelize;

  const UserStrategy = app.model.define('user_strategy', {
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
    name: {
      type: STRING(100),
      allowNull: false,
    },
    description: {
      type: TEXT,
      allowNull: true,
    },
    isActive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isPublic: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
    entryConditions: {
      type: JSON,
      allowNull: false,
      field: 'entry_conditions',
      comment: '入场条件',
    },
    exitConditions: {
      type: JSON,
      allowNull: false,
      field: 'exit_conditions',
      comment: '出场条件',
    },
    riskManagement: {
      type: JSON,
      allowNull: true,
      field: 'risk_management',
      comment: '风险管理参数',
    },
    backtestResults: {
      type: JSON,
      allowNull: true,
      field: 'backtest_results',
      comment: '回测结果',
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
    tableName: 'user_strategies',
    underscored: true,
  });

  UserStrategy.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 使用 this 而不是 app.model.UserStrategy
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.hasMany(app.model.StrategyExecution, { foreignKey: 'strategyId' });
  };

  return UserStrategy;
};
