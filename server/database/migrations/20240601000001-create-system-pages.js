'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE, JSON } = Sequelize;
    
    // 创建系统页面表
    await queryInterface.createTable('system_pages', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      path: { 
        type: STRING(100), 
        allowNull: false,
        unique: true,
        comment: '页面路径'
      },
      name: { 
        type: STRING(50), 
        allowNull: false,
        comment: '页面名称'
      },
      description: { 
        type: TEXT, 
        allowNull: true,
        comment: '页面描述'
      },
      icon: { 
        type: STRING(50), 
        allowNull: true,
        comment: '页面图标'
      },
      component: { 
        type: STRING(100), 
        allowNull: false,
        comment: '页面组件路径'
      },
      is_menu: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: true,
        comment: '是否在菜单中显示'
      },
      parent_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        comment: '父页面ID'
      },
      sort_order: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        defaultValue: 0,
        comment: '排序顺序'
      },
      is_enabled: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: true,
        comment: '是否启用'
      },
      requires_auth: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: true,
        comment: '是否需要认证'
      },
      requires_admin: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: false,
        comment: '是否需要管理员权限'
      },
      required_membership_level: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'free',
        comment: '所需会员等级'
      },
      meta: { 
        type: JSON, 
        allowNull: true,
        comment: '额外元数据'
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

    // 创建页面权限表
    await queryInterface.createTable('page_permissions', {
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
      membership_level: { 
        type: STRING(20), 
        allowNull: false,
        comment: '会员等级'
      },
      has_access: { 
        type: BOOLEAN, 
        allowNull: false,
        defaultValue: false,
        comment: '是否有访问权限'
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

    // 添加联合唯一索引，确保每个页面对每个会员等级只有一条权限记录
    await queryInterface.addIndex('page_permissions', ['page_id', 'membership_level'], {
      unique: true,
      name: 'idx_page_membership'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('page_permissions');
    await queryInterface.dropTable('system_pages');
  }
};
