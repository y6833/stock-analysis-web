'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;

  const WatchlistItem = app.model.define('watchlist_item', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    watchlistId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'watchlist_id',
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
    notes: {
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
    tableName: 'watchlist_items',
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['watchlist_id', 'stock_code'],
        name: 'idx_watchlist_stock',
      },
    ],
  });

  WatchlistItem.associate = function () {
    // 使用 this 而不是 app.model.WatchlistItem
    this.belongsTo(app.model.UserWatchlist, { foreignKey: 'watchlistId' });
  };

  return WatchlistItem;
};
