'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL, ENUM } = app.Sequelize;

  const CoinRechargeRequest = app.model.define('coin_recharge_request', {
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
    amount: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '充值逗币数量',
    },
    paymentAmount: {
      type: DECIMAL(10, 2),
      allowNull: false,
      field: 'payment_amount',
      comment: '支付金额（元）',
    },
    status: {
      type: ENUM('pending', 'completed', 'rejected', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
      comment: '状态：pending(待处理), completed(已完成), rejected(已拒绝), cancelled(已取消)',
    },
    paymentMethod: {
      type: STRING(50),
      allowNull: false,
      defaultValue: 'wechat',
      field: 'payment_method',
      comment: '支付方式：wechat(微信), alipay(支付宝), bank(银行转账)',
    },
    paymentProof: {
      type: STRING(255),
      allowNull: true,
      field: 'payment_proof',
      comment: '支付凭证（图片URL或描述）',
    },
    remark: {
      type: TEXT,
      allowNull: true,
      comment: '备注信息',
    },
    adminRemark: {
      type: TEXT,
      allowNull: true,
      field: 'admin_remark',
      comment: '管理员备注',
    },
    processedBy: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'processed_by',
      comment: '处理人（管理员ID）',
    },
    processedAt: {
      type: DATE,
      allowNull: true,
      field: 'processed_at',
      comment: '处理时间',
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

  // 使用 associate 方法建立关联关系
  CoinRechargeRequest.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';


    // 防止重复关联
    if (CoinRechargeRequest.associations && Object.keys(CoinRechargeRequest.associations).length > 0) {
      return;
    }

    // 建立 CoinRechargeRequest 与 User 的关联关系
    // 申请人关联
    CoinRechargeRequest.belongsTo(app.model.User, {
      as: `${prefix}_applicantUser`,  // 修复双重前缀问题
      foreignKey: 'userId',
    });

    // 处理人关联
    CoinRechargeRequest.belongsTo(app.model.User, {
      as: `${prefix}_adminUser`,  // 修复双重前缀问题
      foreignKey: 'processedBy',
    });
  };

  return CoinRechargeRequest;
};
