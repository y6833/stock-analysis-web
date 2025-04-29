'use strict';

/**
 * 系统日志模型
 * @param {Object} app - 应用实例
 * @return {Object} 系统日志模型
 */
module.exports = app => {
  const { STRING, TEXT, DATE, INTEGER } = app.Sequelize;

  const SystemLog = app.model.define('system_log', {
    id: {
      type: INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: STRING(50),
      allowNull: false,
      comment: '日志类型，如：data_source, user, system'
    },
    level: {
      type: STRING(20),
      allowNull: false,
      comment: '日志级别，如：DEBUG, INFO, WARN, ERROR'
    },
    module: {
      type: STRING(100),
      comment: '模块名称'
    },
    source: {
      type: STRING(50),
      comment: '数据源名称'
    },
    message: {
      type: TEXT,
      allowNull: false,
      comment: '日志消息'
    },
    data: {
      type: TEXT,
      comment: '附加数据，JSON格式'
    },
    userId: {
      type: INTEGER.UNSIGNED,
      comment: '用户ID'
    },
    createdAt: {
      type: DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'system_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['level']
      },
      {
        fields: ['source']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  // 不使用关联，避免别名冲突

  return SystemLog;
};
