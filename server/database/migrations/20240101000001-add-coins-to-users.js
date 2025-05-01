'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER } = Sequelize;
    
    // 添加 coins 字段到 users 表
    await queryInterface.addColumn('users', 'coins', {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 10, // 新用户默认获得10个逗币
      after: 'membership_expires',
      comment: '逗币数量，用于兑换会员权限'
    });
  },

  down: async (queryInterface) => {
    // 删除 coins 字段
    await queryInterface.removeColumn('users', 'coins');
  }
};
