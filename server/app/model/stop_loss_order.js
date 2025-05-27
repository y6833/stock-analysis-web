'use strict';

module.exports = app => {
  const { STRING, INTEGER, DECIMAL, BOOLEAN, DATE, TEXT } = app.Sequelize;

  const StopLossOrder = app.model.define('stop_loss_order', {
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
      comment: '投资组合ID',
    },
    configId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'config_id',
      comment: '配置ID',
    },
    symbol: {
      type: STRING(20),
      allowNull: false,
      comment: '股票代码',
    },
    stockName: {
      type: STRING(50),
      allowNull: true,
      field: 'stock_name',
      comment: '股票名称',
    },
    orderType: {
      type: STRING(20),
      allowNull: false,
      field: 'order_type',
      comment: '订单类型: stop_loss, take_profit',
    },
    triggerPrice: {
      type: DECIMAL(10, 4),
      allowNull: false,
      field: 'trigger_price',
      comment: '触发价格',
    },
    quantity: {
      type: INTEGER,
      allowNull: false,
      comment: '数量',
    },
    executionType: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'market',
      field: 'execution_type',
      comment: '执行类型: market, limit',
    },
    limitPrice: {
      type: DECIMAL(10, 4),
      allowNull: true,
      field: 'limit_price',
      comment: '限价价格',
    },
    status: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      comment: '状态: pending, triggered, executed, cancelled, expired',
    },
    reason: {
      type: STRING(200),
      allowNull: true,
      comment: '触发原因',
    },
    urgency: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'medium',
      comment: '紧急程度: low, medium, high, critical',
    },
    confidence: {
      type: DECIMAL(3, 2),
      allowNull: true,
      comment: '信心度 0-1',
    },
    expectedLoss: {
      type: DECIMAL(15, 4),
      allowNull: true,
      field: 'expected_loss',
      comment: '预期损失',
    },
    expectedProfit: {
      type: DECIMAL(15, 4),
      allowNull: true,
      field: 'expected_profit',
      comment: '预期收益',
    },
    actualPrice: {
      type: DECIMAL(10, 4),
      allowNull: true,
      field: 'actual_price',
      comment: '实际执行价格',
    },
    actualQuantity: {
      type: INTEGER,
      allowNull: true,
      field: 'actual_quantity',
      comment: '实际执行数量',
    },
    actualLoss: {
      type: DECIMAL(15, 4),
      allowNull: true,
      field: 'actual_loss',
      comment: '实际损失',
    },
    actualProfit: {
      type: DECIMAL(15, 4),
      allowNull: true,
      field: 'actual_profit',
      comment: '实际收益',
    },
    triggerTime: {
      type: DATE,
      allowNull: true,
      field: 'trigger_time',
      comment: '触发时间',
    },
    executionTime: {
      type: DATE,
      allowNull: true,
      field: 'execution_time',
      comment: '执行时间',
    },
    cancelTime: {
      type: DATE,
      allowNull: true,
      field: 'cancel_time',
      comment: '取消时间',
    },
    cancelReason: {
      type: STRING(200),
      allowNull: true,
      field: 'cancel_reason',
      comment: '取消原因',
    },
    notes: {
      type: TEXT,
      allowNull: true,
      comment: '备注',
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
    tableName: 'stop_loss_orders',
    timestamps: true,
    underscored: true,
    comment: '止损止盈订单表',
  });

  StopLossOrder.associate = function() {
    // 关联用户
    app.model.StopLossOrder.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // 关联投资组合
    app.model.StopLossOrder.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: 'portfolio',
    });

    // 关联配置
    app.model.StopLossOrder.belongsTo(app.model.StopLossConfig, {
      foreignKey: 'configId',
      as: 'config',
    });
  };

  return StopLossOrder;
};
