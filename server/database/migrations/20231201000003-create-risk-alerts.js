'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN, JSON, ENUM } = Sequelize;
    
    // 创建风险预警规则表
    await queryInterface.createTable('risk_alert_rules', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        references: { model: 'user_portfolios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rule_name: { 
        type: STRING(100), 
        allowNull: false,
        comment: '预警规则名称'
      },
      rule_type: { 
        type: ENUM('var_threshold', 'loss_threshold', 'volatility_threshold', 'concentration_risk', 'custom'),
        allowNull: false,
        comment: '预警规则类型'
      },
      alert_level: { 
        type: ENUM('info', 'warning', 'critical', 'emergency'),
        allowNull: false,
        defaultValue: 'warning',
        comment: '预警级别'
      },
      threshold_config: { 
        type: JSON, 
        allowNull: false,
        comment: '阈值配置JSON'
      },
      notification_config: { 
        type: JSON, 
        allowNull: true,
        comment: '通知配置JSON'
      },
      is_active: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 创建风险预警记录表
    await queryInterface.createTable('risk_alert_logs', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        references: { model: 'user_portfolios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rule_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'risk_alert_rules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      alert_time: { 
        type: DATE, 
        allowNull: false,
        comment: '预警时间'
      },
      alert_level: { 
        type: ENUM('info', 'warning', 'critical', 'emergency'),
        allowNull: false,
        comment: '预警级别'
      },
      alert_message: { 
        type: TEXT, 
        allowNull: false,
        comment: '预警消息'
      },
      current_value: { 
        type: DECIMAL(15, 6), 
        allowNull: true,
        comment: '当前值'
      },
      threshold_value: { 
        type: DECIMAL(15, 6), 
        allowNull: true,
        comment: '阈值'
      },
      alert_data: { 
        type: JSON, 
        allowNull: true,
        comment: '预警详细数据JSON'
      },
      is_resolved: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已解决'
      },
      resolved_at: { 
        type: DATE, 
        allowNull: true,
        comment: '解决时间'
      },
      notification_sent: {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已发送通知'
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 创建实时风险监控状态表
    await queryInterface.createTable('risk_monitoring_status', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      user_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      portfolio_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: true,
        references: { model: 'user_portfolios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      monitoring_date: { 
        type: DATE, 
        allowNull: false,
        comment: '监控日期'
      },
      portfolio_value: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '投资组合价值'
      },
      daily_pnl: { 
        type: DECIMAL(15, 2), 
        allowNull: true,
        comment: '日盈亏'
      },
      daily_pnl_percentage: { 
        type: DECIMAL(8, 6), 
        allowNull: true,
        comment: '日盈亏百分比'
      },
      current_var: { 
        type: DECIMAL(15, 2), 
        allowNull: true,
        comment: '当前VaR值'
      },
      volatility: { 
        type: DECIMAL(8, 6), 
        allowNull: true,
        comment: '当前波动率'
      },
      max_drawdown: { 
        type: DECIMAL(8, 6), 
        allowNull: true,
        comment: '最大回撤'
      },
      concentration_risk: { 
        type: DECIMAL(8, 6), 
        allowNull: true,
        comment: '集中度风险'
      },
      risk_metrics: { 
        type: JSON, 
        allowNull: true,
        comment: '其他风险指标JSON'
      },
      alert_count: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 0,
        comment: '当日预警次数'
      },
      created_at: { 
        type: DATE, 
        allowNull: false 
      },
      updated_at: { 
        type: DATE, 
        allowNull: false 
      }
    });

    // 添加索引
    await queryInterface.addIndex('risk_alert_rules', ['user_id']);
    await queryInterface.addIndex('risk_alert_rules', ['portfolio_id']);
    await queryInterface.addIndex('risk_alert_rules', ['rule_type']);
    await queryInterface.addIndex('risk_alert_logs', ['user_id']);
    await queryInterface.addIndex('risk_alert_logs', ['portfolio_id']);
    await queryInterface.addIndex('risk_alert_logs', ['rule_id']);
    await queryInterface.addIndex('risk_alert_logs', ['alert_time']);
    await queryInterface.addIndex('risk_alert_logs', ['alert_level']);
    await queryInterface.addIndex('risk_alert_logs', ['is_resolved']);
    await queryInterface.addIndex('risk_monitoring_status', ['user_id']);
    await queryInterface.addIndex('risk_monitoring_status', ['portfolio_id']);
    await queryInterface.addIndex('risk_monitoring_status', ['monitoring_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('risk_monitoring_status');
    await queryInterface.dropTable('risk_alert_logs');
    await queryInterface.dropTable('risk_alert_rules');
  }
};
