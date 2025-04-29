'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DATE } = Sequelize;
    
    // 添加 lastRefreshTime 字段到 users 表
    await queryInterface.addColumn('users', 'last_refresh_time', {
      type: DATE,
      allowNull: true,
      after: 'last_login'
    });
  },

  down: async (queryInterface) => {
    // 删除 lastRefreshTime 字段
    await queryInterface.removeColumn('users', 'last_refresh_time');
  }
};
