'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = Sequelize;
    
    // 创建用户提醒表
    await queryInterface.createTable('user_alerts', {
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
      stock_code: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
      },
      alert_type: { 
        type: STRING(20), 
        allowNull: false,
        comment: 'price: 价格提醒, indicator: 指标提醒, pattern: 形态提醒'
      },
      condition: { 
        type: STRING(20), 
        allowNull: false,
        comment: 'above: 高于, below: 低于, cross_up: 向上穿越, cross_down: 向下穿越'
      },
      value: { 
        type: DECIMAL(10, 2), 
        allowNull: true,
        comment: '提醒阈值'
      },
      indicator: { 
        type: STRING(20), 
        allowNull: true,
        comment: '指标名称: MA, MACD, KDJ, etc.'
      },
      indicator_params: {
        type: JSON,
        allowNull: true,
        comment: '指标参数'
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      is_triggered: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      last_triggered_at: { 
        type: DATE, 
        allowNull: true 
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

    // 创建提醒历史表
    await queryInterface.createTable('alert_histories', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      alert_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_alerts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      triggered_value: { 
        type: DECIMAL(10, 2), 
        allowNull: true
      },
      message: { 
        type: TEXT, 
        allowNull: false 
      },
      is_read: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    await queryInterface.dropTable('alert_histories');
    await queryInterface.dropTable('user_alerts');
  }
};
