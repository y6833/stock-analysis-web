'use strict';

/**
 * 安全审计日志模型
 */
module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT } = app.Sequelize;
  
  const SecurityAuditLog = app.model.define('security_audit_log', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ipAddress: {
      type: STRING(45),
      allowNull: false,
      field: 'ip_address',
    },
    userId: {
      type: INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    eventType: {
      type: STRING(50),
      allowNull: false,
      field: 'event_type',
    },
    eventDetails: {
      type: TEXT,
      allowNull: true,
      field: 'event_details',
    },
    severity: {
      type: STRING(20),
      allowNull: false,
      defaultValue: 'info',
    },
    eventTime: {
      type: DATE,
      allowNull: false,
      field: 'event_time',
    },
    userAgent: {
      type: STRING(255),
      allowNull: true,
      field: 'user_agent',
    },
    createdAt: {
      type: DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DATE,
      field: 'updated_at',
    },
  }, {
    tableName: 'security_audit_logs',
    underscored: true,
  });
  
  SecurityAuditLog.associate = function() {
    // 关联用户
    app.model.SecurityAuditLog.belongsTo(app.model.User, { foreignKey: 'userId' });
  };
  
  return SecurityAuditLog;
};