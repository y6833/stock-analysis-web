'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, BOOLEAN, JSON } = app.Sequelize;

  const UserDashboard = app.model.define('user_dashboard', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    name: {
      type: STRING(50),
      allowNull: false,
    },
    description: {
      type: TEXT,
      allowNull: true,
    },
    isDefault: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    layout: {
      type: JSON,
      allowNull: true,
      comment: '仪表盘布局配置',
    },
    createdAt: {
      type: DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DATE,
      allowNull: false,
      field: 'updated_at',
    },
  }, {
    tableName: 'user_dashboards',
    underscored: true,
  });

  UserDashboard.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.UserDashboard
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.hasMany(app.model.DashboardWidget, { foreignKey: 'dashboardId' });
  };

  return UserDashboard;
};
