'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;

  const CoinTransaction = app.model.define('coin_transaction', {
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
    type: {
      type: STRING(20),
      allowNull: false,
      validate: {
        isIn: [['add', 'deduct', 'exchange']],
      },
      comment: '交易类型: add(增加), deduct(减少), exchange(兑换会员)',
    },
    amount: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '交易数量',
    },
    balance: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      comment: '交易后余额',
    },
    reason: {
      type: STRING(100),
      allowNull: true,
      comment: '交易原因',
    },
    details: {
      type: TEXT,
      allowNull: true,
      comment: '交易详情，JSON格式',
      get() {
        const rawValue = this.getDataValue('details');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('details', value ? JSON.stringify(value) : null);
      },
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

  CoinTransaction.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 关联用户
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
  };

  return CoinTransaction;
};
