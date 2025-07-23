'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;

  const UserWatchlist = app.model.define('user_watchlist', {
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
    name: {
      type: STRING(50),
      allowNull: false,
      defaultValue: '默认分组',
    },
    description: {
      type: TEXT,
      allowNull: true,
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
    tableName: 'user_watchlists',
    underscored: true,
  });

  UserWatchlist.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.UserWatchlist
    this.belongsTo(app.model.User, { foreignKey: 'userId' });
    this.hasMany(app.model.WatchlistItem, { foreignKey: 'watchlistId' });
  };

  return UserWatchlist;
};
