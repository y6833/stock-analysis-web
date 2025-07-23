'use strict';

/**
 * 创建十字星形态查询结果缓存表
 * 用于缓存常用筛选查询结果，提高性能
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 创建查询结果缓存表
    await queryInterface.createTable('doji_pattern_query_cache', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      cache_key: {
        allowNull: false,
        type: Sequelize.STRING(255),
        unique: true,
        comment: '缓存键，基于查询条件生成的哈希值',
      },
      query_params: {
        allowNull: false,
        type: Sequelize.JSON,
        comment: '查询参数',
      },
      result_data: {
        allowNull: false,
        type: Sequelize.JSON,
        comment: '查询结果数据',
      },
      total_count: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '总记录数',
      },
      expires_at: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: '过期时间',
      },
      hit_count: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: '命中次数',
      },
      last_hit_at: {
        allowNull: true,
        type: Sequelize.DATE,
        comment: '最后命中时间',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 创建分页查询配置表
    await queryInterface.createTable('doji_pattern_pagination_config', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
      },
      query_type: {
        allowNull: false,
        type: Sequelize.STRING(50),
        unique: true,
        comment: '查询类型标识',
      },
      default_page_size: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 20,
        comment: '默认分页大小',
      },
      max_page_size: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 100,
        comment: '最大分页大小',
      },
      cache_duration: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 300,
        comment: '缓存持续时间（秒）',
      },
      enable_cache: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: '是否启用缓存',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // 添加索引
    await queryInterface.addIndex('doji_pattern_query_cache', ['cache_key'], {
      name: 'idx_doji_pattern_query_cache_key',
    });

    await queryInterface.addIndex('doji_pattern_query_cache', ['expires_at'], {
      name: 'idx_doji_pattern_query_cache_expires_at',
    });

    await queryInterface.addIndex('doji_pattern_query_cache', ['last_hit_at'], {
      name: 'idx_doji_pattern_query_cache_last_hit_at',
    });

    await queryInterface.addIndex('doji_pattern_pagination_config', ['query_type'], {
      name: 'idx_doji_pattern_pagination_config_query_type',
    });

    // 插入默认分页配置
    await queryInterface.bulkInsert('doji_pattern_pagination_config', [
      {
        query_type: 'upward_stocks_screening',
        default_page_size: 20,
        max_page_size: 100,
        cache_duration: 300,
        enable_cache: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        query_type: 'pattern_history_query',
        default_page_size: 50,
        max_page_size: 200,
        cache_duration: 600,
        enable_cache: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        query_type: 'pattern_statistics_query',
        default_page_size: 10,
        max_page_size: 50,
        cache_duration: 1800,
        enable_cache: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('doji_pattern_pagination_config');
    await queryInterface.dropTable('doji_pattern_query_cache');
  },
};
