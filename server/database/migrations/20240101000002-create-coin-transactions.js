'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT } = Sequelize;
    
    // 创建逗币交易记录表
    await queryInterface.createTable('coin_transactions', {
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
      type: { 
        type: STRING(20), 
        allowNull: false,
        comment: '交易类型: add(增加), deduct(减少), exchange(兑换会员)'
      },
      amount: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        comment: '交易数量'
      },
      balance: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        comment: '交易后余额'
      },
      reason: { 
        type: STRING(100), 
        allowNull: true,
        comment: '交易原因'
      },
      details: { 
        type: TEXT, 
        allowNull: true,
        comment: '交易详情，JSON格式'
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
    
    // 添加索引
    await queryInterface.addIndex('coin_transactions', ['user_id'], {
      name: 'idx_coin_transactions_user_id'
    });
    
    await queryInterface.addIndex('coin_transactions', ['type'], {
      name: 'idx_coin_transactions_type'
    });
    
    await queryInterface.addIndex('coin_transactions', ['created_at'], {
      name: 'idx_coin_transactions_created_at'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('coin_transactions');
  }
};
