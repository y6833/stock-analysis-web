'use strict';

/**
 * 添加安全相关的数据库索引
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 添加用户表的索引
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true,
    });
    
    await queryInterface.addIndex('users', ['username'], {
      name: 'idx_users_username',
      unique: true,
    });
    
    // 添加登录尝试表的索引
    await queryInterface.createTable('login_attempts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      attempt_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    
    await queryInterface.addIndex('login_attempts', ['ip_address'], {
      name: 'idx_login_attempts_ip',
    });
    
    await queryInterface.addIndex('login_attempts', ['user_id'], {
      name: 'idx_login_attempts_user_id',
    });
    
    await queryInterface.addIndex('login_attempts', ['email'], {
      name: 'idx_login_attempts_email',
    });
    
    await queryInterface.addIndex('login_attempts', ['attempt_time'], {
      name: 'idx_login_attempts_time',
    });
    
    // 添加API请求日志表
    await queryInterface.createTable('api_request_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      path: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '响应时间（毫秒）',
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      request_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    
    await queryInterface.addIndex('api_request_logs', ['ip_address'], {
      name: 'idx_api_logs_ip',
    });
    
    await queryInterface.addIndex('api_request_logs', ['user_id'], {
      name: 'idx_api_logs_user_id',
    });
    
    await queryInterface.addIndex('api_request_logs', ['path'], {
      name: 'idx_api_logs_path',
    });
    
    await queryInterface.addIndex('api_request_logs', ['request_time'], {
      name: 'idx_api_logs_time',
    });
    
    // 添加安全审计日志表
    await queryInterface.createTable('security_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: '事件类型，如：login_failed, password_changed, permission_changed',
      },
      event_details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'info',
        comment: '严重程度：info, warning, error, critical',
      },
      event_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      user_agent: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    
    await queryInterface.addIndex('security_audit_logs', ['ip_address'], {
      name: 'idx_audit_logs_ip',
    });
    
    await queryInterface.addIndex('security_audit_logs', ['user_id'], {
      name: 'idx_audit_logs_user_id',
    });
    
    await queryInterface.addIndex('security_audit_logs', ['event_type'], {
      name: 'idx_audit_logs_event_type',
    });
    
    await queryInterface.addIndex('security_audit_logs', ['severity'], {
      name: 'idx_audit_logs_severity',
    });
    
    await queryInterface.addIndex('security_audit_logs', ['event_time'], {
      name: 'idx_audit_logs_time',
    });
  },

  async down(queryInterface, Sequelize) {
    // 删除索引
    await queryInterface.removeIndex('users', 'idx_users_email');
    await queryInterface.removeIndex('users', 'idx_users_username');
    
    // 删除表
    await queryInterface.dropTable('login_attempts');
    await queryInterface.dropTable('api_request_logs');
    await queryInterface.dropTable('security_audit_logs');
  }
};