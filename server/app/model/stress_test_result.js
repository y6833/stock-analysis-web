'use strict';

module.exports = app => {
  const { INTEGER, DATE, DECIMAL, JSON } = app.Sequelize;

  const StressTestResult = app.model.define('stress_test_result', {
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
    scenarioId: {
      type: INTEGER.UNSIGNED,
      allowNull: false,
      field: 'scenario_id',
    },
    testDate: {
      type: DATE,
      allowNull: false,
      field: 'test_date',
      comment: '测试日期',
    },
    portfolioValueBefore: {
      type: DECIMAL(15, 2),
      allowNull: false,
      field: 'portfolio_value_before',
      comment: '压力测试前投资组合价值',
    },
    portfolioValueAfter: {
      type: DECIMAL(15, 2),
      allowNull: false,
      field: 'portfolio_value_after',
      comment: '压力测试后投资组合价值',
    },
    absoluteLoss: {
      type: DECIMAL(15, 2),
      allowNull: false,
      field: 'absolute_loss',
      comment: '绝对损失金额',
    },
    percentageLoss: {
      type: DECIMAL(8, 6),
      allowNull: false,
      field: 'percentage_loss',
      comment: '损失百分比',
    },
    worstCaseLoss: {
      type: DECIMAL(15, 2),
      allowNull: true,
      field: 'worst_case_loss',
      comment: '最坏情况损失',
    },
    bestCaseGain: {
      type: DECIMAL(15, 2),
      allowNull: true,
      field: 'best_case_gain',
      comment: '最好情况收益',
    },
    positionImpacts: {
      type: JSON,
      allowNull: true,
      field: 'position_impacts',
      comment: '各持仓影响详情JSON',
    },
    sensitivityAnalysis: {
      type: JSON,
      allowNull: true,
      field: 'sensitivity_analysis',
      comment: '敏感性分析结果JSON',
    },
    simulationDetails: {
      type: JSON,
      allowNull: true,
      field: 'simulation_details',
      comment: '模拟详情和统计数据JSON',
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
    tableName: 'stress_test_results',
    underscored: true,
  });

  StressTestResult.associate = function () {
    // 关联用户 - 使用唯一别名
    StressTestResult.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'stressTestUser'
    });

    // 关联投资组合
    StressTestResult.belongsTo(app.model.UserPortfolio, {
      foreignKey: 'portfolioId',
      as: 'portfolio'
    });

    // 关联压力测试场景
    StressTestResult.belongsTo(app.model.StressTestScenario, {
      foreignKey: 'scenarioId',
      as: 'scenario'
    });
  };

  return StressTestResult;
};
