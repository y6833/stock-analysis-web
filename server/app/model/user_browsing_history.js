'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const UserBrowsingHistory = app.model.define('user_browsing_history', {
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
    stockCode: {
      type: STRING(20),
      allowNull: false,
      field: 'stock_code',
    },
    stockName: {
      type: STRING(50),
      allowNull: false,
      field: 'stock_name',
    },
    viewCount: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: 'view_count',
    },
    lastViewedAt: {
      type: DATE,
      allowNull: false,
      field: 'last_viewed_at',
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
  }, {
    tableName: 'user_browsing_histories',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'stock_code'],
        name: 'idx_user_stock_history',
      },
    ],
  });

  UserBrowsingHistory.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.UserBrowsingHistory
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
  };

  return UserBrowsingHistory;
};
