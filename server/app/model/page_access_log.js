'use strict';

module.exports = app => {
  const { STRING, INTEGER, TEXT, BOOLEAN, DATE } = app.Sequelize;

  const PageAccessLog = app.model.define('page_access_log', {
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
    userId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'user_id',
      comment: '用户ID，可为空表示未登录用户',
    },
    path: {
      type: STRING(100),
      allowNull: false,
      comment: '访问路径',
    },
    membershipLevel: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'free',
      field: 'membership_level',
      comment: '访问时的会员等级',
    },
    ipAddress: {
      type: STRING(50),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP地址',
    },
    userAgent: {
      type: TEXT,
      allowNull: true,
      field: 'user_agent',
      comment: '用户代理',
    },
    referrer: {
      type: STRING(255),
      allowNull: true,
      comment: '来源页面',
    },
    hasAccess: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'has_access',
      comment: '是否有访问权限',
    },
    accessResult: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'allowed',
      field: 'access_result',
      comment: '访问结果: allowed(允许), denied(拒绝), redirected(重定向)',
    },
    duration: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      comment: '停留时间（秒）',
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

  PageAccessLog.associate = function () {
    // 防止重复关联
    if (PageAccessLog.associations && Object.keys(PageAccessLog.associations).length > 0) {
      return;
    }

    // 页面关联
    this.belongsTo(app.model.SystemPage, { foreignKey: 'pageId', as: 'accessedPage' });

    // 用户关联
    this.belongsTo(app.model.User, { foreignKey: 'userId', as: 'accessUser' });
  };

  return PageAccessLog;
};
