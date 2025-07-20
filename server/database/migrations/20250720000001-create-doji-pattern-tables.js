'use strict'

/**
 * 创建十字星形态相关数据表
 * 包括形态识别结果、用户提醒设置、统计分析缓存等
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建十字星形态识别结果表
    await queryInterface.createTable('doji_patterns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      stock_id: {
        allowNull: false,
        type: Sequelize.STRING(20),
        comment: '股票代码',
      },
      stock_name: {
        allowNull: false,
        type: Sequelize.STRING(50),
        comment: '股票名称',
      },
      pattern_date: {
        allowNull: false,
        type: Sequelize.DATEONLY,
        comment: '形态出现日期',
      },
      pattern_type: {
        allowNull: false,
        type: Sequelize.ENUM('standard', 'dragonfly', 'gravestone', 'longLegged'),
        comment: '十字星类型',
      },
      candle_data: {
        allowNull: false,
        type: Sequelize.JSON,
        comment: 'K线数据 {open, high, low, close, volume}',
      },
      significance: {
        allowNull: false,
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.5,
        comment: '形态显著性 0-1',
      },
      context: {
        allowNull: true,
        type: Sequelize.JSON,
        comment: '形态上下文信息 {trend, nearSupportResistance, volumeChange}',
      },
      price_movement: {
        allowNull: true,
        type: Sequelize.JSON,
        comment: '后续价格走势 {day1, day3, day5, day10}',
      },
      is_upward: {
        allowNull: true,
        type: Sequelize.BOOLEAN,
        comment: '是否上涨（基于5天价格变化）',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })

    // 创建十字星形态提醒设置表
    await queryInterface.createTable('doji_pattern_alerts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER.UNSIGNED,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      stock_id: {
        allowNull: true,
        type: Sequelize.STRING(20),
        comment: '股票代码，为空表示监控所有股票',
      },
      stock_name: {
        allowNull: true,
        type: Sequelize.STRING(50),
        comment: '股票名称',
      },
      pattern_types: {
        allowNull: false,
        type: Sequelize.JSON,
        comment: '监控的十字星类型数组',
      },
      min_significance: {
        allowNull: false,
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.5,
        comment: '最小形态显著性',
      },
      market_conditions: {
        allowNull: true,
        type: Sequelize.JSON,
        comment: '市场环境条件',
      },
      is_active: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '是否启用',
      },
      notification_methods: {
        allowNull: false,
        type: Sequelize.JSON,
        defaultValue: '["web"]',
        comment: '通知方式 ["web", "email", "sms"]',
      },
      last_triggered_at: {
        allowNull: true,
        type: Sequelize.DATE,
        comment: '最后触发时间',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })

    // 创建十字星形态统计缓存表
    await queryInterface.createTable('doji_pattern_statistics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      pattern_type: {
        allowNull: false,
        type: Sequelize.ENUM('standard', 'dragonfly', 'gravestone', 'longLegged'),
        comment: '十字星类型',
      },
      analysis_period: {
        allowNull: false,
        type: Sequelize.INTEGER,
        comment: '分析周期（天数）',
      },
      market_condition: {
        allowNull: true,
        type: Sequelize.ENUM('bull', 'bear', 'sideways'),
        comment: '市场环境',
      },
      total_patterns: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '总形态数量',
      },
      upward_patterns: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '上涨形态数量',
      },
      success_rate: {
        allowNull: false,
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: '成功率百分比',
      },
      avg_price_change: {
        allowNull: false,
        type: Sequelize.DECIMAL(8, 4),
        defaultValue: 0,
        comment: '平均价格变化百分比',
      },
      price_distribution: {
        allowNull: true,
        type: Sequelize.JSON,
        comment: '价格分布统计',
      },
      last_updated: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: '最后更新时间',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('doji_pattern_statistics')
    await queryInterface.dropTable('doji_pattern_alerts')
    await queryInterface.dropTable('doji_patterns')
  },
}
