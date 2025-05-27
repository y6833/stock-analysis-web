'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DECIMAL, BOOLEAN, DATE, JSON, TEXT } = Sequelize;

    // 创建止损止盈执行记录表
    await queryInterface.createTable('stop_loss_executions', {
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
      order_id: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        comment: '止损订单ID',
        references: {
          model: 'stop_loss_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      symbol: {
        type: STRING(20),
        allowNull: false,
        comment: '股票代码',
      },
      execution_type: {
        type: STRING(20),
        allowNull: false,
        comment: '执行类型: stop_loss, take_profit, partial_take_profit',
      },
      trigger_price: {
        type: DECIMAL(10, 4),
        allowNull: false,
        comment: '触发价格',
      },
      execution_price: {
        type: DECIMAL(10, 4),
        allowNull: false,
        comment: '执行价格',
      },
      quantity: {
        type: INTEGER,
        allowNull: false,
        comment: '执行数量',
      },
      original_quantity: {
        type: INTEGER,
        allowNull: false,
        comment: '原始持仓数量',
      },
      remaining_quantity: {
        type: INTEGER,
        allowNull: false,
        comment: '剩余数量',
      },
      average_cost: {
        type: DECIMAL(10, 4),
        allowNull: false,
        comment: '平均成本',
      },
      realized_pnl: {
        type: DECIMAL(15, 4),
        allowNull: false,
        comment: '已实现盈亏',
      },
      realized_pnl_percentage: {
        type: DECIMAL(8, 4),
        allowNull: false,
        comment: '已实现盈亏百分比',
      },
      commission: {
        type: DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0,
        comment: '手续费',
      },
      slippage: {
        type: DECIMAL(10, 4),
        allowNull: true,
        comment: '滑点',
      },
      execution_method: {
        type: STRING(20),
        allowNull: false,
        comment: '执行方式: manual, automatic',
      },
      is_successful: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否执行成功',
      },
      error_message: {
        type: STRING(500),
        allowNull: true,
        comment: '错误信息',
      },
      market_conditions: {
        type: JSON,
        allowNull: true,
        comment: '执行时市场条件',
      },
      performance_metrics: {
        type: JSON,
        allowNull: true,
        comment: '执行绩效指标',
      },
      execution_time: {
        type: DATE,
        allowNull: false,
        comment: '执行时间',
      },
      notes: {
        type: TEXT,
        allowNull: true,
        comment: '执行备注',
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
    await queryInterface.addIndex('stop_loss_executions', ['user_id']);
    await queryInterface.addIndex('stop_loss_executions', ['order_id']);
    await queryInterface.addIndex('stop_loss_executions', ['symbol']);
    await queryInterface.addIndex('stop_loss_executions', ['execution_type']);
    await queryInterface.addIndex('stop_loss_executions', ['execution_time']);
    await queryInterface.addIndex('stop_loss_executions', ['is_successful']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stop_loss_executions');
  }
};
