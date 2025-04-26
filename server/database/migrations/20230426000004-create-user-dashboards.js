'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, BOOLEAN, JSON } = Sequelize;
    
    // 创建用户仪表盘表
    await queryInterface.createTable('user_dashboards', {
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
        allowNull: false
      },
      description: { 
        type: TEXT, 
        allowNull: true 
      },
      is_default: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      layout: {
        type: JSON,
        allowNull: true,
        comment: '仪表盘布局配置'
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

    // 创建仪表盘组件表
    await queryInterface.createTable('dashboard_widgets', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      dashboard_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'user_dashboards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      widget_type: { 
        type: STRING(50), 
        allowNull: false,
        comment: '组件类型: chart, table, news, etc.'
      },
      title: { 
        type: STRING(100), 
        allowNull: false
      },
      position_x: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 0
      },
      position_y: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 0
      },
      width: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 4
      },
      height: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 4
      },
      config: {
        type: JSON,
        allowNull: true,
        comment: '组件配置'
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
    await queryInterface.dropTable('dashboard_widgets');
    await queryInterface.dropTable('user_dashboards');
  }
};
