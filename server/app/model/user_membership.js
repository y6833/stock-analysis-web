'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;

  const UserMembership = app.model.define('user_membership', {
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
    coins: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 10,
      comment: '逗币数量，用于兑换会员权限'
    },
    basicMembershipExpires: {
      type: DATE,
      allowNull: true,
      field: 'basic_membership_expires',
      comment: '基础会员过期时间',
    },
    premiumMembershipExpires: {
      type: DATE,
      allowNull: true,
      field: 'premium_membership_expires',
      comment: '高级会员过期时间',
    },
    enterpriseMembershipExpires: {
      type: DATE,
      allowNull: true,
      field: 'enterprise_membership_expires',
      comment: '企业会员过期时间',
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
    tableName: 'user_memberships',
    underscored: true,
  });

  UserMembership.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 与用户表关联
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
  };

  return UserMembership;
};
