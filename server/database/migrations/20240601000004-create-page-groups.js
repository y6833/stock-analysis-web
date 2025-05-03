'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, TEXT, DATE } = Sequelize;
    
    // 创建页面组表
    await queryInterface.createTable('page_groups', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      name: { 
        type: STRING(50), 
        allowNull: false,
        comment: '组名称'
      },
      description: { 
        type: TEXT, 
        allowNull: true,
        comment: '组描述'
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
    
    // 创建页面组关联表
    await queryInterface.createTable('page_group_mappings', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      group_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'page_groups', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '组ID'
      },
      page_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'system_pages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '页面ID'
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

    // 添加联合唯一索引，确保每个页面在每个组中只出现一次
    await queryInterface.addIndex('page_group_mappings', ['group_id', 'page_id'], {
      unique: true,
      name: 'idx_group_page'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('page_group_mappings');
    await queryInterface.dropTable('page_groups');
  }
};
