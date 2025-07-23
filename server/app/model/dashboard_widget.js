'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, JSON } = app.Sequelize;

  const DashboardWidget = app.model.define('dashboard_widget', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    dashboardId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'dashboard_id',
    },
    widgetType: {
      type: STRING(50),
      allowNull: false,
      field: 'widget_type',
      comment: '组件类型: chart, table, news, etc.',
    },
    title: {
      type: STRING(100),
      allowNull: false,
    },
    positionX: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'position_x',
    },
    positionY: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'position_y',
    },
    width: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    height: {
      type: INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    config: {
      type: JSON,
      allowNull: true,
      comment: '组件配置',
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
    tableName: 'dashboard_widgets',
    underscored: true,
  });

  DashboardWidget.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.DashboardWidget
    this.belongsTo(app.model.UserDashboard, { foreignKey: 'dashboardId' });
  };

  return DashboardWidget;
};
