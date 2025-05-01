'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, ENUM } = Sequelize;
    
    // 创建逗币充值请求表
    await queryInterface.createTable('coin_recharge_requests', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        comment: '充值逗币数量'
      },
      payment_amount: { 
        type: DECIMAL(10, 2), 
        allowNull: false,
        comment: '支付金额（元）'
      },
      status: { 
        type: ENUM('pending', 'completed', 'rejected', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
        comment: '状态：pending(待处理), completed(已完成), rejected(已拒绝), cancelled(已取消)'
      },
      payment_method: { 
        type: STRING(50), 
        allowNull: false,
        defaultValue: 'wechat',
        comment: '支付方式：wechat(微信), alipay(支付宝), bank(银行转账)'
      },
      payment_proof: { 
        type: STRING(255), 
        allowNull: true,
        comment: '支付凭证（图片URL或描述）'
      },
      remark: { 
        type: TEXT, 
        allowNull: true,
        comment: '备注信息'
      },
      admin_remark: { 
        type: TEXT, 
        allowNull: true,
        comment: '管理员备注'
      },
      processed_by: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        references: { model: 'users', key: 'id' },
        comment: '处理人（管理员ID）'
      },
      processed_at: { 
        type: DATE, 
        allowNull: true,
        comment: '处理时间'
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });
    
    // 添加索引
    await queryInterface.addIndex('coin_recharge_requests', ['user_id'], {
      name: 'idx_coin_recharge_requests_user_id'
    });
    
    await queryInterface.addIndex('coin_recharge_requests', ['status'], {
      name: 'idx_coin_recharge_requests_status'
    });
    
    await queryInterface.addIndex('coin_recharge_requests', ['created_at'], {
      name: 'idx_coin_recharge_requests_created_at'
    });
  },

  down: async (queryInterface) => {
    // 删除表
    await queryInterface.dropTable('coin_recharge_requests');
  }
};
