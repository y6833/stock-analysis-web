'use strict';

/**
 * 登录尝试模型
 */
module.exports = app => {
  const { STRING, INTEGER, DATE, BOOLEAN } = app.Sequelize;
  
  const LoginAttempt = app.model.define('login_attempt', {
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
    email: {
      type: STRING(255),
      allowNull: true,
    },
    success: {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    attemptTime: {
      type: DATE,
      allowNull: false,
      field: 'attempt_time',
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
    tableName: 'login_attempts',
    underscored: true,
  });
  
  LoginAttempt.associate = function() {
    // 关联用户
    app.model.LoginAttempt.belongsTo(app.model.User, { foreignKey: 'userId' });
  };
  
  return LoginAttempt;
};