'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, JSON, DATE } = app.Sequelize;

  const PermissionTemplate = app.model.define('permission_template', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: STRING(50),
      allowNull: false,
      comment: '模板名称',
    },
    description: {
      type: TEXT,
      allowNull: true,
      comment: '模板描述',
    },
    permissions: {
      type: JSON,
      allowNull: false,
      comment: '权限配置JSON',
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
  });

  return PermissionTemplate;
};
