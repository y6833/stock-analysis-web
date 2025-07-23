'use strict';

module.exports = app => {
  const { INTEGER, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = app.Sequelize;

  const DojiPatternAlertHistory = app.model.define('doji_pattern_alert_history', {
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
    triggeredAt: {
      type: DATE,
      allowNull: false,
      field: 'triggered_at',
    },
    acknowledged: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acknowledgedAt: {
      type: DATE,
      allowNull: true,
      field: 'acknowledged_at',
    },
    patternDetails: {
      type: JSON,
      allowNull: true,
      field: 'pattern_details',
      comment: '十字星形态详情',
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
    tableName: 'doji_pattern_alert_histories',
    underscored: true,
  });

  DojiPatternAlertHistory.associate = function () {
    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';

    // 使用 this 而不是 app.model.DojiPatternAlertHistory
    this.belongsTo(app.model.DojiPatternAlert, { foreignKey: 'alertId' });
  };

  return DojiPatternAlertHistory;
};
