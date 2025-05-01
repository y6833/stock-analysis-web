'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 获取所有用户
    const users = await queryInterface.sequelize.query(
      'SELECT id, coins, membership, membership_expires FROM users',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // 为每个用户创建会员记录
    for (const user of users) {
      // 准备会员数据
      const membershipData = {
        user_id: user.id,
        coins: user.coins || 10,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      // 根据会员级别设置过期时间
      if (user.membership_expires) {
        const expiresAt = new Date(user.membership_expires);
        
        if (user.membership === 'basic') {
          membershipData.basic_membership_expires = expiresAt;
        } else if (user.membership === 'premium') {
          membershipData.premium_membership_expires = expiresAt;
        } else if (user.membership === 'enterprise') {
          membershipData.enterprise_membership_expires = expiresAt;
        }
      }
      
      // 插入数据
      await queryInterface.sequelize.query(
        `INSERT INTO user_memberships 
        (user_id, coins, basic_membership_expires, premium_membership_expires, enterprise_membership_expires, created_at, updated_at) 
        VALUES 
        (:user_id, :coins, :basic_membership_expires, :premium_membership_expires, :enterprise_membership_expires, :created_at, :updated_at)`,
        {
          replacements: {
            user_id: membershipData.user_id,
            coins: membershipData.coins,
            basic_membership_expires: membershipData.basic_membership_expires || null,
            premium_membership_expires: membershipData.premium_membership_expires || null,
            enterprise_membership_expires: membershipData.enterprise_membership_expires || null,
            created_at: membershipData.created_at,
            updated_at: membershipData.updated_at,
          },
          type: Sequelize.QueryTypes.INSERT,
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 清空 user_memberships 表
    await queryInterface.sequelize.query('DELETE FROM user_memberships');
  }
};
