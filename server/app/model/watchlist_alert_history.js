'use strict';

module.exports = app => {
  const { INTEGER, DATE, TEXT, DECIMAL, BOOLEAN } = app.Sequelize;

  const WatchlistAlertHistory = app.model.define('watchlist_alert_history', {
    id: {
      type: INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    alertId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'alert_id',
    },
    triggeredValue: {
      type: DECIMAL(10, 2),
      allowNull: true,
      field: 'triggered_value',
    },
    message: {
      type: TEXT,
      allowNull: false,
    },
    isRead: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
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
    tableName: 'watchlist_alert_histories',
    underscored: true,
  });

  WatchlistAlertHistory.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    this.belongsTo(app.model.WatchlistAlert, { foreignKey: 'alertId' });
  };

  return WatchlistAlertHistory;
};
