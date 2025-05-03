'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, BIGINT } = Sequelize;
    
    // 创建页面访问统计表
    await queryInterface.createTable('page_access_stats', {
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
      membership_level: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'free',
        comment: '访问时的会员等级'
      },
      access_count: { 
        type: BIGINT.UNSIGNED, 
        allowNull: false,
        defaultValue: 1,
        comment: '访问次数'
      },
      total_duration: { 
        type: BIGINT.UNSIGNED, 
        allowNull: false,
        defaultValue: 0,
        comment: '总停留时间（秒）'
      },
      last_access_at: { 
        type: DATE, 
        allowNull: false,
        comment: '最后访问时间'
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

    // 添加联合索引，加速查询
    await queryInterface.addIndex('page_access_stats', ['page_id', 'user_id'], {
      name: 'idx_page_user'
    });
    
    // 添加页面ID索引，用于统计查询
    await queryInterface.addIndex('page_access_stats', ['page_id'], {
      name: 'idx_page'
    });
    
    // 添加用户ID索引，用于用户行为分析
    await queryInterface.addIndex('page_access_stats', ['user_id'], {
      name: 'idx_user'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('page_access_stats');
  }
};
