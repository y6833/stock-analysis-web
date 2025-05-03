'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, TEXT, JSON, DATE } = Sequelize;
    
    // 创建权限模板表
    await queryInterface.createTable('permission_templates', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      name: { 
        type: STRING(50), 
        allowNull: false,
        comment: '模板名称'
      },
      description: { 
        type: TEXT, 
        allowNull: true,
        comment: '模板描述'
      },
      permissions: { 
        type: JSON, 
        allowNull: false,
        comment: '权限配置JSON'
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
    // 删除表
    await queryInterface.dropTable('permission_templates');
  }
};
