'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT } = Sequelize;
    
    await queryInterface.createTable('user_watchlists', {
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
        type: STRING(50), 
        allowNull: false,
        defaultValue: '默认分组'
      },
      description: { 
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

    // 创建股票项表
    await queryInterface.createTable('watchlist_items', {
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
      stock_code: { 
        type: STRING(20), 
        allowNull: false 
      },
      stock_name: { 
        type: STRING(50), 
        allowNull: false 
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

    // 添加联合唯一索引，确保同一个分组中不会有重复的股票
    await queryInterface.addIndex('watchlist_items', ['watchlist_id', 'stock_code'], {
      unique: true,
      name: 'idx_watchlist_stock'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('watchlist_items');
    await queryInterface.dropTable('user_watchlists');
  }
};
