'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE } = Sequelize;
    
    // 创建用户浏览历史表
    await queryInterface.createTable('user_browsing_histories', {
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
      view_count: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        defaultValue: 1
      },
      last_viewed_at: { 
        type: DATE, 
        allowNull: false 
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

    // 添加联合唯一索引，确保每个用户对每只股票只有一条记录
    await queryInterface.addIndex('user_browsing_histories', ['user_id', 'stock_code'], {
      unique: true,
      name: 'idx_user_stock_history'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_browsing_histories');
  }
};
