'use strict'

/**
 * 为十字星形态相关表添加索引
 * 优化筛选查询和分析性能
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // doji_patterns 表索引
    // 主要查询索引
    await queryInterface.addIndex('doji_patterns', ['stock_id'], {
      name: 'idx_doji_patterns_stock_id',
    })

    await queryInterface.addIndex('doji_patterns', ['pattern_date'], {
      name: 'idx_doji_patterns_pattern_date',
    })

    await queryInterface.addIndex('doji_patterns', ['pattern_type'], {
      name: 'idx_doji_patterns_pattern_type',
    })

    await queryInterface.addIndex('doji_patterns', ['is_upward'], {
      name: 'idx_doji_patterns_is_upward',
    })

    await queryInterface.addIndex('doji_patterns', ['significance'], {
      name: 'idx_doji_patterns_significance',
    })

    // 复合索引用于筛选查询
    await queryInterface.addIndex('doji_patterns', ['pattern_date', 'pattern_type'], {
      name: 'idx_doji_patterns_date_type',
    })

    await queryInterface.addIndex('doji_patterns', ['pattern_type', 'is_upward'], {
      name: 'idx_doji_patterns_type_upward',
    })

    await queryInterface.addIndex('doji_patterns', ['pattern_date', 'is_upward'], {
      name: 'idx_doji_patterns_date_upward',
    })

    await queryInterface.addIndex('doji_patterns', ['stock_id', 'pattern_date'], {
      name: 'idx_doji_patterns_stock_date',
    })

    // 用于筛选上涨股票的复合索引
    await queryInterface.addIndex('doji_patterns', ['pattern_date', 'pattern_type', 'is_upward'], {
      name: 'idx_doji_patterns_date_type_upward',
    })

    // 用于按显著性筛选的复合索引
    await queryInterface.addIndex('doji_patterns', ['pattern_type', 'significance', 'is_upward'], {
      name: 'idx_doji_patterns_type_significance_upward',
    })

    // doji_pattern_alerts 表索引
    await queryInterface.addIndex('doji_pattern_alerts', ['user_id'], {
      name: 'idx_doji_pattern_alerts_user_id',
    })

    await queryInterface.addIndex('doji_pattern_alerts', ['stock_id'], {
      name: 'idx_doji_pattern_alerts_stock_id',
    })

    await queryInterface.addIndex('doji_pattern_alerts', ['is_active'], {
      name: 'idx_doji_pattern_alerts_is_active',
    })

    await queryInterface.addIndex('doji_pattern_alerts', ['last_triggered_at'], {
      name: 'idx_doji_pattern_alerts_last_triggered_at',
    })

    // 复合索引用于活跃提醒查询
    await queryInterface.addIndex('doji_pattern_alerts', ['user_id', 'is_active'], {
      name: 'idx_doji_pattern_alerts_user_active',
    })

    await queryInterface.addIndex('doji_pattern_alerts', ['stock_id', 'is_active'], {
      name: 'idx_doji_pattern_alerts_stock_active',
    })

    // doji_pattern_statistics 表索引
    await queryInterface.addIndex('doji_pattern_statistics', ['pattern_type'], {
      name: 'idx_doji_pattern_statistics_pattern_type',
    })

    await queryInterface.addIndex('doji_pattern_statistics', ['analysis_period'], {
      name: 'idx_doji_pattern_statistics_analysis_period',
    })

    await queryInterface.addIndex('doji_pattern_statistics', ['market_condition'], {
      name: 'idx_doji_pattern_statistics_market_condition',
    })

    await queryInterface.addIndex('doji_pattern_statistics', ['last_updated'], {
      name: 'idx_doji_pattern_statistics_last_updated',
    })

    // 复合索引用于统计查询
    await queryInterface.addIndex('doji_pattern_statistics', ['pattern_type', 'analysis_period'], {
      name: 'idx_doji_pattern_statistics_type_period',
    })

    await queryInterface.addIndex('doji_pattern_statistics', ['pattern_type', 'market_condition'], {
      name: 'idx_doji_pattern_statistics_type_market',
    })

    await queryInterface.addIndex(
      'doji_pattern_statistics',
      ['pattern_type', 'analysis_period', 'market_condition'],
      {
        name: 'idx_doji_pattern_statistics_type_period_market',
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    // 移除 doji_patterns 表索引
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_stock_id')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_pattern_date')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_pattern_type')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_is_upward')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_significance')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_date_type')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_type_upward')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_date_upward')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_stock_date')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_date_type_upward')
    await queryInterface.removeIndex('doji_patterns', 'idx_doji_patterns_type_significance_upward')

    // 移除 doji_pattern_alerts 表索引
    await queryInterface.removeIndex('doji_pattern_alerts', 'idx_doji_pattern_alerts_user_id')
    await queryInterface.removeIndex('doji_pattern_alerts', 'idx_doji_pattern_alerts_stock_id')
    await queryInterface.removeIndex('doji_pattern_alerts', 'idx_doji_pattern_alerts_is_active')
    await queryInterface.removeIndex(
      'doji_pattern_alerts',
      'idx_doji_pattern_alerts_last_triggered_at'
    )
    await queryInterface.removeIndex('doji_pattern_alerts', 'idx_doji_pattern_alerts_user_active')
    await queryInterface.removeIndex('doji_pattern_alerts', 'idx_doji_pattern_alerts_stock_active')

    // 移除 doji_pattern_statistics 表索引
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_pattern_type'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_analysis_period'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_market_condition'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_last_updated'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_type_period'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_type_market'
    )
    await queryInterface.removeIndex(
      'doji_pattern_statistics',
      'idx_doji_pattern_statistics_type_period_market'
    )
  },
}
