'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, BOOLEAN, JSON, ENUM } = app.Sequelize;

  const RiskAlertRule = app.model.define('risk_alert_rule', {
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
    portfolioId: {
      type: INTEGER.UNSIGNED,
      allowNull: true,
      field: 'portfolio_id',
    },
    ruleName: {
      type: STRING(100),
      allowNull: false,
      field: 'rule_name',
      comment: '预警规则名称',
    },
    ruleType: {
      type: ENUM('var_threshold', 'loss_threshold', 'volatility_threshold', 'concentration_risk', 'custom'),
      allowNull: false,
      field: 'rule_type',
      comment: '预警规则类型',
    },
    alertLevel: {
      type: ENUM('info', 'warning', 'critical', 'emergency'),
      allowNull: false,
      defaultValue: 'warning',
      field: 'alert_level',
      comment: '预警级别',
    },
    thresholdConfig: {
      type: JSON,
      allowNull: false,
      field: 'threshold_config',
      comment: '阈值配置JSON',
    },
    notificationConfig: {
      type: JSON,
      allowNull: true,
      field: 'notification_config',
      comment: '通知配置JSON',
    },
    isActive: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
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
    tableName: 'risk_alert_rules',
    underscored: true,
  });

  RiskAlertRule.associate = function () {
    // 关联用户 - 使用唯一别名
    RiskAlertRule.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'ruleUser'
    });

    // 关联投资组合
    RiskAlertRule.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: 'portfolio'
    });

    // 关联预警记录
    RiskAlertRule.hasMany(app.model.RiskAlertLog, {
      foreignKey: 'ruleId',
      as: 'alertLogs'
    });
  };

  return RiskAlertRule;
};
