'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL, BOOLEAN } = app.Sequelize;

  const WatchlistAlert = app.model.define('watchlist_alert', {
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
    symbol: {
      type: STRING(20),
      allowNull: false,
    },
    stockName: {
      type: STRING(50),
      allowNull: false,
      field: 'stock_name',
    },
    condition: {
      type: STRING(20),
      allowNull: false,
      comment: 'price_above, price_below, volume_above, change_above, change_below',
    },
    value: {
      type: DECIMAL(10, 2),
      allowNull: false,
      comment: '提醒阈值',
    },
    message: {
      type: TEXT,
      allowNull: true,
    },
    isActive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isTriggered: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_triggered',
    },
    lastTriggeredAt: {
      type: DATE,
      allowNull: true,
      field: 'last_triggered_at',
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
    tableName: 'watchlist_alerts',
    underscored: true,
  });

  WatchlistAlert.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    this.belongsTo(app.model.UserWatchlist, { foreignKey: 'watchlistId' });
    this.hasMany(app.model.WatchlistAlertHistory, { foreignKey: 'alertId' });
  };

  return WatchlistAlert;
};
