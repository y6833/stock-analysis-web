'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, BOOLEAN, JSON } = Sequelize;
    
    // 创建用户策略表
    await queryInterface.createTable('user_strategies', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { 
        type: STRING(100), 
        allowNull: false 
      },
      description: { 
        type: TEXT, 
        allowNull: true 
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_public: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      entry_conditions: {
        type: JSON,
        allowNull: false,
        comment: '入场条件'
      },
      exit_conditions: {
        type: JSON,
        allowNull: false,
        comment: '出场条件'
      },
      risk_management: {
        type: JSON,
        allowNull: true,
        comment: '风险管理参数'
      },
      backtest_results: {
        type: JSON,
        allowNull: true,
        comment: '回测结果'
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 创建策略执行记录表
    await queryInterface.createTable('strategy_executions', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      strategy_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_strategies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stock_code: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
      },
      action: { 
        type: STRING(10), 
        allowNull: false,
        comment: 'buy: 买入信号, sell: 卖出信号'
      },
      signal_price: { 
        type: STRING(10), 
        allowNull: true
      },
      signal_date: { 
        type: DATE, 
        allowNull: false 
      },
      is_executed: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      execution_details: {
        type: JSON,
        allowNull: true,
        comment: '执行详情'
      },
      notes: { 
        type: TEXT, 
        allowNull: true 
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('strategy_executions');
    await queryInterface.dropTable('user_strategies');
  }
};
