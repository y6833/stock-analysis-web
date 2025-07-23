'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = app.Sequelize;

  const UserAlert = app.model.define('user_alert', {
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
    alertType: {
      type: STRING(20),
      allowNull: false,
      field: 'alert_type',
      comment: 'price: 价格提醒, indicator: 指标提醒, pattern: 形态提醒',
    },
    condition: {
      type: STRING(20),
      allowNull: false,
      comment: 'above: 高于, below: 低于, cross_up: 向上穿越, cross_down: 向下穿越',
    },
    value: {
      type: DECIMAL(10, 2),
      allowNull: true,
      comment: '提醒阈值',
    },
    indicator: {
      type: STRING(20),
      allowNull: true,
      comment: '指标名称: MA, MACD, KDJ, etc.',
    },
    indicatorParams: {
      type: JSON,
      allowNull: true,
      field: 'indicator_params',
      comment: '指标参数',
    },
    isActive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isTriggered: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_triggered',
    },
    lastTriggeredAt: {
      type: DATE,
      allowNull: true,
      field: 'last_triggered_at',
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
    tableName: 'user_alerts',
    underscored: true,
  });

  UserAlert.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.UserAlert
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.hasMany(app.model.AlertHistory, { foreignKey: 'alertId' });
  };

  return UserAlert;
};
