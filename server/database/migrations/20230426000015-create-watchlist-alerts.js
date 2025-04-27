'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN } = Sequelize;
    
    // 创建关注列表提醒表
    await queryInterface.createTable('watchlist_alerts', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      watchlist_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_watchlists', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      symbol: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
      },
      condition: { 
        type: STRING(20), 
        allowNull: false,
        comment: 'price_above, price_below, volume_above, change_above, change_below'
      },
      value: { 
        type: DECIMAL(10, 2), 
        allowNull: false,
        comment: '提醒阈值'
      },
      message: { 
        type: TEXT, 
        allowNull: true 
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
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 创建关注列表提醒历史表
    await queryInterface.createTable('watchlist_alert_histories', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      alert_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'watchlist_alerts', key: 'id' },
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
    await queryInterface.dropTable('watchlist_alert_histories');
    await queryInterface.dropTable('watchlist_alerts');
  }
};
