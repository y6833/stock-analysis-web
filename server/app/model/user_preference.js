'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, BOOLEAN } = app.Sequelize;

  const UserPreference = app.model.define('user_preference', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    theme: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'light',
      validate: {
        isIn: [['light', 'dark', 'auto']],
      },
    },
    language: {
      type: STRING(10),
      allowNull: false,
      defaultValue: 'zh-CN',
      validate: {
        isIn: [['zh-CN', 'en-US']],
      },
    },
    defaultDashboardLayout: {
      type: STRING(100),
      allowNull: true,
      defaultValue: 'default',
    },
    emailNotifications: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    pushNotifications: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    defaultStockSymbol: {
      type: STRING(20),
      allowNull: true,
    },
    defaultTimeframe: {
      type: STRING(20),
      allowNull: true,
    },
    defaultChartType: {
      type: STRING(20),
      allowNull: true,
    },
    createdAt: {
      type: DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DATE,
      allowNull: false,
    },
  });

  UserPreference.associate = function () {
    // 使用 this 而不是 app.model.UserPreference
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
  };

  return UserPreference;
};
