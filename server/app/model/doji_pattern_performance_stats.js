'use strict';

/**
 * 十字星形态性能统计模型
 */
module.exports = (app) => {
  const { STRING, INTEGER, FLOAT, DATE } = app.Sequelize;

  const DojiPatternPerformanceStats = app.model.define(
    'doji_pattern_performance_stats',
    {
      id: {
        type: INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID',
      },
      userId: {
        type: INTEGER,
        allowNull: false,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id',
        },
      },
      avgCalculationTime: {
        type: FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '平均计算时间（毫秒）',
      },
      cacheHitRate: {
        type: FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '缓存命中率（百分比）',
      },
      memoryUsage: {
        type: FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '内存使用量（MB）',
      },
      totalCalculations: {
        type: INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总计算次数',
      },
      lastCalculationTime: {
        type: DATE,
        allowNull: true,
        comment: '最后计算时间',
      },
      createdAt: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '创建时间',
      },
      updatedAt: {
        type: DATE,
        allowNull: false,
        defaultValue: app.Sequelize.NOW,
        comment: '更新时间',
      },
    },
    {
      tableName: 'doji_pattern_performance_stats',
      comment: '十字星形态性能统计表',
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    }
  );

  // 关联关系
  DojiPatternPerformanceStats.associate = function () {
    // 关联用户表
    DojiPatternPerformanceStats.belongsTo(app.model.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // 实例方法
  DojiPatternPerformanceStats.prototype.updateStats = function (stats) {
    return this.update({
      avgCalculationTime: stats.avgCalculationTime || this.avgCalculationTime,
      cacheHitRate: stats.cacheHitRate || this.cacheHitRate,
      memoryUsage: stats.memoryUsage || this.memoryUsage,
      totalCalculations: stats.totalCalculations || this.totalCalculations,
      lastCalculationTime: stats.lastCalculationTime || new Date(),
    });
  };

  // 类方法
  DojiPatternPerformanceStats.recordCalculation = async function (userId, calculationTime) {
    const [stats, created] = await this.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        avgCalculationTime: calculationTime,
        totalCalculations: 1,
        lastCalculationTime: new Date(),
      },
    });

    if (!created) {
      const newTotalCalculations = stats.totalCalculations + 1;
      const newAvgCalculationTime =
        (stats.avgCalculationTime * stats.totalCalculations + calculationTime) /
        newTotalCalculations;

      await stats.update({
        avgCalculationTime: newAvgCalculationTime,
        totalCalculations: newTotalCalculations,
        lastCalculationTime: new Date(),
      });
    }

    return stats;
  };

  return DojiPatternPerformanceStats;
};
