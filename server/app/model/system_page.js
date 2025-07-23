'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, BOOLEAN, DATE, JSON } = app.Sequelize;

  const SystemPage = app.model.define('system_page', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    path: {
      type: STRING(100),
      allowNull: false,
      unique: true,
      comment: '页面路径',
    },
    name: {
      type: STRING(50),
      allowNull: false,
      comment: '页面名称',
    },
    description: {
      type: TEXT,
      allowNull: true,
      comment: '页面描述',
    },
    icon: {
      type: STRING(50),
      allowNull: true,
      comment: '页面图标',
    },
    component: {
      type: STRING(100),
      allowNull: false,
      comment: '页面组件路径',
    },
    isMenu: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_menu',
      comment: '是否在菜单中显示',
    },
    parentId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'parent_id',
      comment: '父页面ID',
    },
    sortOrder: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
      comment: '排序顺序',
    },
    isEnabled: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_enabled',
      comment: '是否启用',
    },
    requiresAuth: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'requires_auth',
      comment: '是否需要认证',
    },
    requiresAdmin: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requires_admin',
      comment: '是否需要管理员权限',
    },
    requiredMembershipLevel: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'free',
      field: 'required_membership_level',
      comment: '所需会员等级',
    },
    meta: {
      type: JSON,
      allowNull: true,
      comment: '额外元数据',
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

  SystemPage.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 防止重复关联
    if (SystemPage.associations && Object.keys(SystemPage.associations).length > 0) {
      return;
    }

    // 自关联 - 父子页面关系
    this.hasMany(app.model.SystemPage, { foreignKey: 'parentId', as: `${prefix}_subPages` });
    this.belongsTo(app.model.SystemPage, { foreignKey: 'parentId', as: `${prefix}_parentPage` });

    // 页面权限
    this.hasMany(app.model.PagePermission, { foreignKey: 'pageId', as: `${prefix}_pagePermissions` });

    // 页面组关联
    this.belongsToMany(app.model.PageGroup, {
      through: app.model.PageGroupMapping,
      foreignKey: 'pageId',
      otherKey: 'groupId',
      as: `${prefix}_pageGroups`,
    });
  };

  return SystemPage;
};
