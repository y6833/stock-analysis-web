'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建十字星形态用户设置表
    await queryInterface.createTable('doji_pattern_user_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: '设置数据JSON',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: '创建时间',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: '更新时间',
      },
    });

    // 创建索引
    await queryInterface.addIndex('doji_pattern_user_settings', ['userId'], {
      unique: true,
      name: 'idx_doji_pattern_user_settings_user_id',
    });

    // 创建十字星形态性能统计表
    await queryInterface.createTable('doji_pattern_performance_stats', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '用户ID',
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      avgCalculationTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '平均计算时间（毫秒）',
      },
      cacheHitRate: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '缓存命中率（百分比）',
      },
      memoryUsage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: '内存使用量（MB）',
      },
      totalCalculations: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总计算次数',
      },
      lastCalculationTime: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: '最后计算时间',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: '创建时间',
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: '更新时间',
      },
    });

    // 创建索引
    await queryInterface.addIndex('doji_pattern_performance_stats', ['userId'], {
      name: 'idx_doji_pattern_performance_stats_user_id',
    });

    await queryInterface.addIndex('doji_pattern_performance_stats', ['createdAt'], {
      name: 'idx_doji_pattern_performance_stats_created_at',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 删除表
    await queryInterface.dropTable('doji_pattern_performance_stats');
    await queryInterface.dropTable('doji_pattern_user_settings');
  },
};
