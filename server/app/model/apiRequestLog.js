'use strict';

/**
 * API请求日志模型
 */
module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;
  
  const ApiRequestLog = app.model.define('api_request_log', {
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
    method: {
      type: STRING(10),
      allowNull: false,
    },
    path: {
      type: STRING(255),
      allowNull: false,
    },
    statusCode: {
      type: INTEGER,
      allowNull: true,
      field: 'status_code',
    },
    responseTime: {
      type: INTEGER,
      allowNull: true,
      field: 'response_time',
    },
    userAgent: {
      type: STRING(255),
      allowNull: true,
      field: 'user_agent',
    },
    requestTime: {
      type: DATE,
      allowNull: false,
      field: 'request_time',
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
    tableName: 'api_request_logs',
    underscored: true,
  });
  
  ApiRequestLog.associate = function() {
    // 关联用户
    app.model.ApiRequestLog.belongsTo(app.model.User, { foreignKey: 'userId' });
  };
  
  return ApiRequestLog;
};