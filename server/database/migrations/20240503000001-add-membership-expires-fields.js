'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DATE } = Sequelize;
    
    // 添加基础会员过期时间字段
    await queryInterface.addColumn('users', 'basic_membership_expires', {
      type: DATE,
      allowNull: true,
      after: 'membership_expires'
    });
    
    // 添加高级会员过期时间字段
    await queryInterface.addColumn('users', 'premium_membership_expires', {
      type: DATE,
      allowNull: true,
      after: 'basic_membership_expires'
    });
    
    // 添加企业会员过期时间字段
    await queryInterface.addColumn('users', 'enterprise_membership_expires', {
      type: DATE,
      allowNull: true,
      after: 'premium_membership_expires'
    });
  },

  down: async (queryInterface) => {
    // 删除添加的字段
    await queryInterface.removeColumn('users', 'basic_membership_expires');
    await queryInterface.removeColumn('users', 'premium_membership_expires');
    await queryInterface.removeColumn('users', 'enterprise_membership_expires');
  }
};
