'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DECIMAL, BOOLEAN, DATE, JSON, TEXT } = Sequelize;

    // 创建止损止盈配置表
    await queryInterface.createTable('stop_loss_configs', {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        comment: '投资组合ID，null表示全局配置',
        references: {
          model: 'user_portfolios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      symbol: {
        type: STRING(20),
        allowNull: true,
        comment: '股票代码，null表示组合级配置',
      },
      config_name: {
        type: STRING(100),
        allowNull: false,
        comment: '配置名称',
      },
      stop_loss_type: {
        type: STRING(20),
        allowNull: false,
        comment: '止损类型: fixed, trailing, atr, volatility, time',
      },
      stop_loss_percentage: {
        type: DECIMAL(5, 4),
        allowNull: true,
        comment: '止损百分比',
      },
      trailing_distance: {
        type: DECIMAL(5, 4),
        allowNull: true,
        comment: '移动止损距离',
      },
      atr_multiplier: {
        type: DECIMAL(5, 2),
        allowNull: true,
        comment: 'ATR倍数',
      },
      volatility_multiplier: {
        type: DECIMAL(5, 2),
        allowNull: true,
        comment: '波动率倍数',
      },
      time_limit: {
        type: INTEGER,
        allowNull: true,
        comment: '时间限制(天)',
      },
      take_profit_type: {
        type: STRING(20),
        allowNull: false,
        comment: '止盈类型: fixed, ladder, trailing, dynamic',
      },
      take_profit_levels: {
        type: JSON,
        allowNull: true,
        comment: '止盈层级配置',
      },
      trailing_activation: {
        type: DECIMAL(5, 4),
        allowNull: true,
        comment: '移动止盈激活点',
      },
      trailing_take_profit_distance: {
        type: DECIMAL(5, 4),
        allowNull: true,
        comment: '移动止盈距离',
      },
      is_stop_loss_enabled: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否启用止损',
      },
      is_take_profit_enabled: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否启用止盈',
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否激活',
      },
      created_at: {
        type: DATE,
        allowNull: false,
      },
      updated_at: {
        type: DATE,
        allowNull: false,
      },
    });

    // 创建索引
    await queryInterface.addIndex('stop_loss_configs', ['user_id']);
    await queryInterface.addIndex('stop_loss_configs', ['portfolio_id']);
    await queryInterface.addIndex('stop_loss_configs', ['symbol']);
    await queryInterface.addIndex('stop_loss_configs', ['is_active']);

    // 创建止损止盈订单表
    await queryInterface.createTable('stop_loss_orders', {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        comment: '投资组合ID',
        references: {
          model: 'user_portfolios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      config_id: {
        type: INTEGER.UNSIGNED,
        allowNull: true,
        comment: '配置ID',
        references: {
          model: 'stop_loss_configs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      symbol: {
        type: STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      stock_name: {
        type: STRING(50),
        allowNull: true,
        comment: '股票名称',
      },
      order_type: {
        type: STRING(20),
        allowNull: false,
        comment: '订单类型: stop_loss, take_profit',
      },
      trigger_price: {
        type: DECIMAL(10, 4),
        allowNull: false,
        comment: '触发价格',
      },
      quantity: {
        type: INTEGER,
        allowNull: false,
        comment: '数量',
      },
      execution_type: {
        type: STRING(10),
        allowNull: false,
        defaultValue: 'market',
        comment: '执行类型: market, limit',
      },
      limit_price: {
        type: DECIMAL(10, 4),
        allowNull: true,
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
      expected_loss: {
        type: DECIMAL(15, 4),
        allowNull: true,
        comment: '预期损失',
      },
      expected_profit: {
        type: DECIMAL(15, 4),
        allowNull: true,
        comment: '预期收益',
      },
      actual_price: {
        type: DECIMAL(10, 4),
        allowNull: true,
        comment: '实际执行价格',
      },
      actual_quantity: {
        type: INTEGER,
        allowNull: true,
        comment: '实际执行数量',
      },
      actual_loss: {
        type: DECIMAL(15, 4),
        allowNull: true,
        comment: '实际损失',
      },
      actual_profit: {
        type: DECIMAL(15, 4),
        allowNull: true,
        comment: '实际收益',
      },
      trigger_time: {
        type: DATE,
        allowNull: true,
        comment: '触发时间',
      },
      execution_time: {
        type: DATE,
        allowNull: true,
        comment: '执行时间',
      },
      cancel_time: {
        type: DATE,
        allowNull: true,
        comment: '取消时间',
      },
      cancel_reason: {
        type: STRING(200),
        allowNull: true,
        comment: '取消原因',
      },
      notes: {
        type: TEXT,
        allowNull: true,
        comment: '备注',
      },
      created_at: {
        type: DATE,
        allowNull: false,
      },
      updated_at: {
        type: DATE,
        allowNull: false,
      },
    });

    // 创建订单表索引
    await queryInterface.addIndex('stop_loss_orders', ['user_id']);
    await queryInterface.addIndex('stop_loss_orders', ['portfolio_id']);
    await queryInterface.addIndex('stop_loss_orders', ['symbol']);
    await queryInterface.addIndex('stop_loss_orders', ['status']);
    await queryInterface.addIndex('stop_loss_orders', ['order_type']);
    await queryInterface.addIndex('stop_loss_orders', ['trigger_time']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stop_loss_orders');
    await queryInterface.dropTable('stop_loss_configs');
  }
};
