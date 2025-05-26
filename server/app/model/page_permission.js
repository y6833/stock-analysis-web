'use strict';

module.exports = app => {
  const { STRING, INTEGER, BOOLEAN, DATE } = app.Sequelize;

  const PagePermission = app.model.define('page_permission', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    pageId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'page_id',
      comment: '页面ID',
    },
    membershipLevel: {
      type: STRING(20),
      allowNull: false,
      field: 'membership_level',
      comment: '会员等级',
    },
    hasAccess: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'has_access',
      comment: '是否有访问权限',
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

  PagePermission.associate = function () {
    // 防止重复关联
    if (PagePermission.associations && Object.keys(PagePermission.associations).length > 0) {
      return;
    }

    // 页面关联
    this.belongsTo(app.model.SystemPage, { foreignKey: 'pageId', as: 'permissionPage' });
  };

  return PagePermission;
};
