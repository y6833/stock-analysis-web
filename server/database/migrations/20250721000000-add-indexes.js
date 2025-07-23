'use strict';

/**
 * 数据库迁移：添加索引
 * 为常用查询添加适当的索引，提高查询性能
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 定义要添加的索引
    const indexes = [
      // 用户相关索引
      { table: 'users', fields: ['email'], name: 'idx_users_email', unique: true },
      { table: 'users', fields: ['username'], name: 'idx_users_username', unique: true },
      { table: 'users', fields: ['last_login_at'], name: 'idx_users_last_login' },

      // 股票相关索引
      { table: 'stocks', fields: ['symbol'], name: 'idx_stocks_symbol', unique: true },
      { table: 'stocks', fields: ['name'], name: 'idx_stocks_name' },
      { table: 'stocks', fields: ['exchange'], name: 'idx_stocks_exchange' },

      // 关注列表相关索引
      {
        table: 'watchlist_items',
        fields: ['user_id', 'stock_code'],
        name: 'idx_watchlist_user_stock',
        unique: true,
      },
      { table: 'watchlist_items', fields: ['created_at'], name: 'idx_watchlist_created' },

      // 投资组合相关索引
      {
        table: 'portfolio_holdings',
        fields: ['portfolio_id', 'stock_code'],
        name: 'idx_portfolio_stock',
        unique: true,
      },
      { table: 'portfolio_holdings', fields: ['updated_at'], name: 'idx_portfolio_updated' },

      // 交易记录相关索引
      { table: 'trade_records', fields: ['portfolio_id'], name: 'idx_trade_portfolio' },
      { table: 'trade_records', fields: ['stock_code'], name: 'idx_trade_stock' },
      { table: 'trade_records', fields: ['trade_date'], name: 'idx_trade_date' },

      // 提醒相关索引
      { table: 'user_alerts', fields: ['user_id'], name: 'idx_alerts_user' },
      { table: 'user_alerts', fields: ['stock_code'], name: 'idx_alerts_stock' },
      { table: 'user_alerts', fields: ['is_active'], name: 'idx_alerts_active' },

      // 十字星形态相关索引
      { table: 'doji_patterns', fields: ['stock_code'], name: 'idx_doji_stock' },
      { table: 'doji_patterns', fields: ['pattern_date'], name: 'idx_doji_date' },
      { table: 'doji_patterns', fields: ['pattern_type'], name: 'idx_doji_type' },

      // 系统日志相关索引
      { table: 'system_logs', fields: ['level'], name: 'idx_logs_level' },
      { table: 'system_logs', fields: ['created_at'], name: 'idx_logs_created' },

      // 页面访问相关索引
      {
        table: 'page_access_stats',
        fields: ['page_id', 'access_date'],
        name: 'idx_page_access_date',
      },
      { table: 'page_access_stats', fields: ['user_id'], name: 'idx_page_access_user' },
    ];

    // 创建慢查询表
    await queryInterface.createTable('slow_queries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sql_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      parameters: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 为慢查询表添加索引
    await queryInterface.addIndex('slow_queries', ['created_at'], {
      name: 'idx_slow_queries_created',
    });

    // 添加所有定义的索引
    for (const index of indexes) {
      try {
        // 检查索引是否已存在
        const tableIndexes = await queryInterface.showIndex(index.table);
        const indexExists = tableIndexes.some((i) => i.name === index.name);

        if (!indexExists) {
          // 创建索引
          await queryInterface.addIndex(index.table, index.fields, {
            name: index.name,
            unique: !!index.unique,
          });
          console.log(`已创建索引: ${index.name} 在表 ${index.table} 上`);
        } else {
          console.log(`索引 ${index.name} 已存在于表 ${index.table}`);
        }
      } catch (error) {
        console.error(`创建索引 ${index.name} 失败:`, error);
        // 继续处理其他索引，不中断迁移
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 定义要删除的索引
    const indexes = [
      // 用户相关索引
      { table: 'users', name: 'idx_users_email' },
      { table: 'users', name: 'idx_users_username' },
      { table: 'users', name: 'idx_users_last_login' },

      // 股票相关索引
      { table: 'stocks', name: 'idx_stocks_symbol' },
      { table: 'stocks', name: 'idx_stocks_name' },
      { table: 'stocks', name: 'idx_stocks_exchange' },

      // 关注列表相关索引
      { table: 'watchlist_items', name: 'idx_watchlist_user_stock' },
      { table: 'watchlist_items', name: 'idx_watchlist_created' },

      // 投资组合相关索引
      { table: 'portfolio_holdings', name: 'idx_portfolio_stock' },
      { table: 'portfolio_holdings', name: 'idx_portfolio_updated' },

      // 交易记录相关索引
      { table: 'trade_records', name: 'idx_trade_portfolio' },
      { table: 'trade_records', name: 'idx_trade_stock' },
      { table: 'trade_records', name: 'idx_trade_date' },

      // 提醒相关索引
      { table: 'user_alerts', name: 'idx_alerts_user' },
      { table: 'user_alerts', name: 'idx_alerts_stock' },
      { table: 'user_alerts', name: 'idx_alerts_active' },

      // 十字星形态相关索引
      { table: 'doji_patterns', name: 'idx_doji_stock' },
      { table: 'doji_patterns', name: 'idx_doji_date' },
      { table: 'doji_patterns', name: 'idx_doji_type' },

      // 系统日志相关索引
      { table: 'system_logs', name: 'idx_logs_level' },
      { table: 'system_logs', name: 'idx_logs_created' },

      // 页面访问相关索引
      { table: 'page_access_stats', name: 'idx_page_access_date' },
      { table: 'page_access_stats', name: 'idx_page_access_user' },
    ];

    // 删除所有定义的索引
    for (const index of indexes) {
      try {
        await queryInterface.removeIndex(index.table, index.name);
        console.log(`已删除索引: ${index.name} 从表 ${index.table}`);
      } catch (error) {
        console.error(`删除索引 ${index.name} 失败:`, error);
        // 继续处理其他索引，不中断迁移
      }
    }

    // 删除慢查询表
    await queryInterface.dropTable('slow_queries');
  },
};
