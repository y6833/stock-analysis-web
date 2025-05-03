'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, TEXT, DATE, BOOLEAN } = Sequelize;
    
    // 创建页面访问日志表
    await queryInterface.createTable('page_access_logs', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      page_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'system_pages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '页面ID'
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '用户ID，可为空表示未登录用户'
      },
      path: { 
        type: STRING(100), 
        allowNull: false,
        comment: '访问路径'
      },
      membership_level: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'free',
        comment: '访问时的会员等级'
      },
      ip_address: { 
        type: STRING(50), 
        allowNull: true,
        comment: 'IP地址'
      },
      user_agent: { 
        type: TEXT, 
        allowNull: true,
        comment: '用户代理'
      },
      referrer: { 
        type: STRING(255), 
        allowNull: true,
        comment: '来源页面'
      },
      has_access: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: true,
        comment: '是否有访问权限'
      },
      access_result: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'allowed',
        comment: '访问结果: allowed(允许), denied(拒绝), redirected(重定向)'
      },
      duration: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        comment: '停留时间（秒）'
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

    // 添加索引，加速查询
    await queryInterface.addIndex('page_access_logs', ['page_id'], {
      name: 'idx_log_page'
    });
    
    await queryInterface.addIndex('page_access_logs', ['user_id'], {
      name: 'idx_log_user'
    });
    
    await queryInterface.addIndex('page_access_logs', ['created_at'], {
      name: 'idx_log_time'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('page_access_logs');
  }
};
