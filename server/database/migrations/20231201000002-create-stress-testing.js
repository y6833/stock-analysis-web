'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, STRING, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = Sequelize;
    
    // 创建压力测试场景表
    await queryInterface.createTable('stress_test_scenarios', {
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
      scenario_name: { 
        type: STRING(100), 
        allowNull: false,
        comment: '压力测试场景名称'
      },
      scenario_type: { 
        type: STRING(20), 
        allowNull: false,
        defaultValue: 'historical',
        comment: '场景类型：historical, hypothetical, monte_carlo'
      },
      description: { 
        type: TEXT, 
        allowNull: true,
        comment: '场景描述'
      },
      scenario_parameters: { 
        type: JSON, 
        allowNull: false,
        comment: '场景参数配置JSON'
      },
      market_shocks: { 
        type: JSON, 
        allowNull: true,
        comment: '市场冲击参数JSON'
      },
      correlation_matrix: { 
        type: JSON, 
        allowNull: true,
        comment: '相关性矩阵JSON'
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

    // 创建压力测试结果表
    await queryInterface.createTable('stress_test_results', {
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
      scenario_id: { 
        type: INTEGER.UNSIGNED, 
        allowNull: false,
        references: { model: 'stress_test_scenarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      test_date: { 
        type: DATE, 
        allowNull: false,
        comment: '测试日期'
      },
      portfolio_value_before: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '压力测试前投资组合价值'
      },
      portfolio_value_after: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '压力测试后投资组合价值'
      },
      absolute_loss: { 
        type: DECIMAL(15, 2), 
        allowNull: false,
        comment: '绝对损失金额'
      },
      percentage_loss: { 
        type: DECIMAL(8, 6), 
        allowNull: false,
        comment: '损失百分比'
      },
      worst_case_loss: { 
        type: DECIMAL(15, 2), 
        allowNull: true,
        comment: '最坏情况损失'
      },
      best_case_gain: { 
        type: DECIMAL(15, 2), 
        allowNull: true,
        comment: '最好情况收益'
      },
      position_impacts: { 
        type: JSON, 
        allowNull: true,
        comment: '各持仓影响详情JSON'
      },
      sensitivity_analysis: { 
        type: JSON, 
        allowNull: true,
        comment: '敏感性分析结果JSON'
      },
      simulation_details: { 
        type: JSON, 
        allowNull: true,
        comment: '模拟详情和统计数据JSON'
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

    // 创建市场风险因子表
    await queryInterface.createTable('market_risk_factors', {
      id: { 
        type: INTEGER.UNSIGNED, 
        primaryKey: true, 
        autoIncrement: true 
      },
      factor_name: { 
        type: STRING(50), 
        allowNull: false,
        unique: true,
        comment: '风险因子名称'
      },
      factor_type: { 
        type: STRING(20), 
        allowNull: false,
        comment: '因子类型：equity, bond, currency, commodity, volatility'
      },
      description: { 
        type: TEXT, 
        allowNull: true,
        comment: '因子描述'
      },
      data_source: { 
        type: STRING(50), 
        allowNull: true,
        comment: '数据源'
      },
      historical_data: { 
        type: JSON, 
        allowNull: true,
        comment: '历史数据JSON'
      },
      volatility: { 
        type: DECIMAL(8, 6), 
        allowNull: true,
        comment: '历史波动率'
      },
      correlation_factors: { 
        type: JSON, 
        allowNull: true,
        comment: '与其他因子的相关性JSON'
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

    // 添加索引
    await queryInterface.addIndex('stress_test_scenarios', ['user_id']);
    await queryInterface.addIndex('stress_test_scenarios', ['scenario_type']);
    await queryInterface.addIndex('stress_test_results', ['user_id']);
    await queryInterface.addIndex('stress_test_results', ['portfolio_id']);
    await queryInterface.addIndex('stress_test_results', ['scenario_id']);
    await queryInterface.addIndex('stress_test_results', ['test_date']);
    await queryInterface.addIndex('market_risk_factors', ['factor_type']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('market_risk_factors');
    await queryInterface.dropTable('stress_test_results');
    await queryInterface.dropTable('stress_test_scenarios');
  }
};
