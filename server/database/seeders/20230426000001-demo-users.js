'use strict';

const crypto = require('crypto');

// 哈希密码函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = {
  up: async (queryInterface) => {
    // 插入示例用户
    const users = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: hashPassword('admin123'),
        role: 'admin',
        status: 'active',
        nickname: '管理员',
        bio: '系统管理员',
        phone: '13800138000',
        location: '北京',
        website: 'https://example.com',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        username: 'user',
        email: 'user@example.com',
        password: hashPassword('user123'),
        role: 'user',
        status: 'active',
        nickname: '普通用户',
        bio: '我是一名股票爱好者',
        phone: '13900139000',
        location: '上海',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    await queryInterface.bulkInsert('users', users);
    
    // 获取插入的用户ID
    const adminUser = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE username = \'admin\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const normalUser = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE username = \'user\'',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // 插入用户偏好设置
    const preferences = [
      {
        user_id: adminUser[0].id,
        theme: 'light',
        language: 'zh-CN',
        default_dashboard_layout: 'default',
        email_notifications: true,
        push_notifications: true,
        default_stock_symbol: '000001.SZ',
        default_timeframe: 'day',
        default_chart_type: 'candle',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        user_id: normalUser[0].id,
        theme: 'light',
        language: 'zh-CN',
        default_dashboard_layout: 'default',
        email_notifications: true,
        push_notifications: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    await queryInterface.bulkInsert('user_preferences', preferences);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('user_preferences', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
