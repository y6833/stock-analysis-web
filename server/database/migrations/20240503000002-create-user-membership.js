'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT } = Sequelize;
    
    // 创建用户会员表
    await queryInterface.createTable('user_memberships', {
      id: {
        type: INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: INTEGER.UNSIGNED,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    });
    
    // 添加唯一索引，确保每个用户只有一条会员记录
    await queryInterface.addIndex('user_memberships', ['user_id'], {
      unique: true,
      name: 'user_memberships_user_id_unique'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('user_memberships');
  }
};
