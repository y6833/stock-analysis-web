'use strict'

module.exports = (app) => {
  const { STRING, INTEGER, DATE, TEXT, DECIMAL, BOOLEAN, JSON } = app.Sequelize

  const StressTestScenario = app.model.define(
    'stress_test_scenario',
    {
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
      scenarioName: {
        type: STRING(100),
        allowNull: false,
        field: 'scenario_name',
        comment: '压力测试场景名称',
      },
      scenarioType: {
        type: STRING(20),
        allowNull: false,
        defaultValue: 'historical',
        field: 'scenario_type',
        comment: '场景类型：historical, hypothetical, monte_carlo',
        validate: {
          isIn: [['historical', 'hypothetical', 'monte_carlo']],
        },
      },
      description: {
        type: TEXT,
        allowNull: true,
        comment: '场景描述',
      },
      scenarioParameters: {
        type: JSON,
        allowNull: false,
        field: 'scenario_parameters',
        comment: '场景参数配置JSON',
      },
      marketShocks: {
        type: JSON,
        allowNull: true,
        field: 'market_shocks',
        comment: '市场冲击参数JSON',
      },
      correlationMatrix: {
        type: JSON,
        allowNull: true,
        field: 'correlation_matrix',
        comment: '相关性矩阵JSON',
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
    },
    {
      tableName: 'stress_test_scenarios',
      underscored: true,
    }
  )

  StressTestScenario.associate = function () {    // 获取模型关联唯一前缀，确保别名唯一性
    const prefix = this._associationPrefix || '';
    

    // 关联用户 - 使用唯一别名
    StressTestScenario.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: `${prefix}_${prefix}_stressTestScenarioUser`,
    })

    // 关联压力测试结果
    StressTestScenario.hasMany(app.model.StressTestResult, {
      foreignKey: 'scenarioId',
      as: `${prefix}_${prefix}_testResults`,
    })
  }

  return StressTestScenario
}
