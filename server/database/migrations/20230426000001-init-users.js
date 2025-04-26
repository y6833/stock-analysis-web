'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, BOOLEAN } = Sequelize;

    // 创建用户表
    await queryInterface.createTable('users', {
      id: { type: INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      username: { type: STRING(30), allowNull: false, unique: true },
      email: { type: STRING(100), allowNull: false, unique: true },
      password: { type: STRING(100), allowNull: false },
      role: { type: STRING(10), allowNull: false, defaultValue: 'user' },
      status: { type: STRING(10), allowNull: false, defaultValue: 'active' },
      nickname: { type: STRING(30), allowNull: true },
      bio: { type: TEXT, allowNull: true },
      phone: { type: STRING(20), allowNull: true },
      location: { type: STRING(100), allowNull: true },
      website: { type: STRING(100), allowNull: true },
      avatar: { type: TEXT('long'), allowNull: true },
      last_login: { type: DATE, allowNull: true },
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    });

    // 创建用户偏好设置表
    await queryInterface.createTable('user_preferences', {
      id: { type: INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      theme: { type: STRING(10), allowNull: false, defaultValue: 'light' },
      language: { type: STRING(10), allowNull: false, defaultValue: 'zh-CN' },
      default_dashboard_layout: { type: STRING(100), allowNull: true, defaultValue: 'default' },
      email_notifications: { type: BOOLEAN, allowNull: false, defaultValue: true },
      push_notifications: { type: BOOLEAN, allowNull: false, defaultValue: true },
      default_stock_symbol: { type: STRING(20), allowNull: true },
      default_timeframe: { type: STRING(20), allowNull: true },
      default_chart_type: { type: STRING(20), allowNull: true },
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_preferences');
    await queryInterface.dropTable('users');
  }
};
