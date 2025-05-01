'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, BOOLEAN } = Sequelize;
    
    // 创建通知表
    await queryInterface.createTable('notifications', {
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
      title: { 
        type: STRING(100), 
        allowNull: false,
        comment: '通知标题'
      },
      content: { 
        type: TEXT, 
        allowNull: false,
        comment: '通知内容'
      },
      type: { 
        type: STRING(50), 
        allowNull: false,
        comment: '通知类型：recharge(充值), recharge_completed(充值完成), recharge_rejected(充值拒绝), recharge_cancelled(充值取消), admin_recharge(管理员充值通知), system(系统通知)'
      },
      related_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        comment: '相关ID，如充值请求ID'
      },
      is_read: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: false,
        comment: '是否已读'
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
    await queryInterface.addIndex('notifications', ['user_id'], {
      name: 'idx_notifications_user_id'
    });
    
    await queryInterface.addIndex('notifications', ['is_read'], {
      name: 'idx_notifications_is_read'
    });
    
    await queryInterface.addIndex('notifications', ['type'], {
      name: 'idx_notifications_type'
    });
    
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created_at'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('notifications');
  }
};
