'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '日志类型，如：data_source, user, system'
      },
      level: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: '日志级别，如：DEBUG, INFO, WARN, ERROR'
      },
      module: {
        type: Sequelize.STRING(100),
        comment: '模块名称'
      },
      source: {
        type: Sequelize.STRING(50),
        comment: '数据源名称'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: '日志消息'
      },
      data: {
        type: Sequelize.TEXT,
        comment: '附加数据，JSON格式'
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // 添加索引
    await queryInterface.addIndex('system_logs', ['type']);
    await queryInterface.addIndex('system_logs', ['level']);
    await queryInterface.addIndex('system_logs', ['source']);
    await queryInterface.addIndex('system_logs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('system_logs');
  }
};
