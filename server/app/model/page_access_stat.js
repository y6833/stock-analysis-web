'use strict';

module.exports = app => {
  const { STRING, INTEGER, BIGINT, DATE } = app.Sequelize;

  const PageAccessStat = app.model.define('page_access_stat', {
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
    membershipLevel: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'free',
      field: 'membership_level',
      comment: '访问时的会员等级',
    },
    accessCount: {
      type: BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: 'access_count',
      comment: '访问次数',
    },
    totalDuration: {
      type: BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'total_duration',
      comment: '总停留时间（秒）',
    },
    lastAccessAt: {
      type: DATE,
      allowNull: false,
      field: 'last_access_at',
      comment: '最后访问时间',
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

  PageAccessStat.associate = function () {
    // 防止重复关联
    if (PageAccessStat.associations && Object.keys(PageAccessStat.associations).length > 0) {
      return;
    }

    // 页面关联
    this.belongsTo(app.model.SystemPage, { foreignKey: 'pageId', as: 'accessPage' });

    // 用户关联
    this.belongsTo(app.model.User, { foreignKey: 'userId', as: 'accessUser' });
  };

  return PageAccessStat;
};
