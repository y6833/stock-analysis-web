'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, BOOLEAN } = app.Sequelize;

  const Notification = app.model.define('notification', {
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
    title: {
      type: STRING(100),
      allowNull: false,
      comment: '通知标题',
    },
    content: {
      type: TEXT,
      allowNull: false,
      comment: '通知内容',
    },
    type: {
      type: STRING(50),
      allowNull: false,
      comment: '通知类型：recharge(充值), recharge_completed(充值完成), recharge_rejected(充值拒绝), recharge_cancelled(充值取消), admin_recharge(管理员充值通知), system(系统通知)',
    },
    relatedId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'related_id',
      comment: '相关ID，如充值请求ID',
    },
    isRead: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
      comment: '是否已读',
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

  Notification.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 关联用户
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
  };

  return Notification;
};
