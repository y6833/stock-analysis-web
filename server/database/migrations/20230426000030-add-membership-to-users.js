'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { STRING, DATE } = Sequelize;
    
    // 添加 membership 字段到 users 表
    await queryInterface.addColumn('users', 'membership', {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'free',
      after: 'role'
    });
    
    // 添加 membership_expires 字段到 users 表
    await queryInterface.addColumn('users', 'membership_expires', {
      type: DATE,
      allowNull: true,
      after: 'membership'
    });
  },

  down: async (queryInterface) => {
    // 删除 membership 字段
    await queryInterface.removeColumn('users', 'membership');
    
    // 删除 membership_expires 字段
    await queryInterface.removeColumn('users', 'membership_expires');
  }
};
