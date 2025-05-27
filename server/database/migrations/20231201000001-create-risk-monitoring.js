'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = Sequelize;
    
    // 创建风险监控配置表
    await queryInterface.createTable('risk_monitoring_configs', {
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
      config_name: { 
        type: STRING(100), 
        allowNull: false,
        defaultValue: '默认风险配置'
      },
      var_confidence_level: { 
        type: DECIMAL(5, 4), 
        allowNull: false,
        defaultValue: 0.05,
        comment: 'VaR置信水平，如0.05表示95%置信度'
      },
      var_time_horizon: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 1,
        comment: 'VaR时间跨度（天）'
      },
      var_method: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'historical',
        comment: 'VaR计算方法：historical, parametric, monte_carlo'
      },
      lookback_period: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 252,
        comment: '历史数据回看期（天）'
      },
      monte_carlo_simulations: { 
        type: INTEGER, 
        allowNull: false,
        defaultValue: 10000,
        comment: '蒙特卡洛模拟次数'
      },
      risk_limits: { 
        type: JSON, 
        allowNull: true,
        comment: '风险限制配置JSON'
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

    // 创建VaR计算记录表
    await queryInterface.createTable('var_calculations', {
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
      config_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'risk_monitoring_configs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      calculation_date: { 
        type: DATE, 
        allowNull: false,
        comment: '计算日期'
      },
      portfolio_value: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '投资组合总价值'
      },
      var_absolute: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: 'VaR绝对值（货币单位）'
      },
      var_percentage: { 
        type: DECIMAL(8, 6), 
        allowNull: false,
        comment: 'VaR百分比'
      },
      expected_shortfall: { 
        type: DECIMAL(15, 2), 
        allowNull: true,
        comment: '期望损失（ES/CVaR）'
      },
      confidence_level: { 
        type: DECIMAL(5, 4), 
        allowNull: false,
        comment: '置信水平'
      },
      time_horizon: { 
        type: INTEGER, 
        allowNull: false,
        comment: '时间跨度（天）'
      },
      calculation_method: { 
        type: STRING(20), 
        allowNull: false,
        comment: '计算方法'
      },
      component_var: { 
        type: JSON, 
        allowNull: true,
        comment: '成分VaR详情JSON'
      },
      risk_metrics: { 
        type: JSON, 
        allowNull: true,
        comment: '其他风险指标JSON'
      },
      calculation_details: { 
        type: JSON, 
        allowNull: true,
        comment: '计算详情和参数JSON'
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

    // 创建历史收益率数据表
    await queryInterface.createTable('portfolio_returns', {
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
      return_date: { 
        type: DATE, 
        allowNull: false,
        comment: '收益率日期'
      },
      daily_return: { 
        type: DECIMAL(10, 8), 
        allowNull: false,
        comment: '日收益率'
      },
      portfolio_value: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '当日投资组合价值'
      },
      benchmark_return: { 
        type: DECIMAL(10, 8), 
        allowNull: true,
        comment: '基准收益率'
      },
      excess_return: { 
        type: DECIMAL(10, 8), 
        allowNull: true,
        comment: '超额收益率'
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
    await queryInterface.addIndex('risk_monitoring_configs', ['user_id']);
    await queryInterface.addIndex('risk_monitoring_configs', ['portfolio_id']);
    await queryInterface.addIndex('var_calculations', ['user_id']);
    await queryInterface.addIndex('var_calculations', ['portfolio_id']);
    await queryInterface.addIndex('var_calculations', ['calculation_date']);
    await queryInterface.addIndex('portfolio_returns', ['user_id']);
    await queryInterface.addIndex('portfolio_returns', ['portfolio_id']);
    await queryInterface.addIndex('portfolio_returns', ['return_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('portfolio_returns');
    await queryInterface.dropTable('var_calculations');
    await queryInterface.dropTable('risk_monitoring_configs');
  }
};
