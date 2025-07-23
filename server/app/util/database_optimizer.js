'use strict';

/**
 * 数据库优化工具
 * 提供数据库索引管理、查询优化和性能监控功能
 */
class DatabaseOptimizer {
  constructor(app) {
    this.app = app;
    this.sequelize = app.model.sequelize;
    this.Sequelize = app.Sequelize;
    this.logger = app.logger;
  }

  /**
   * 初始化数据库优化器
   */
  async init() {
    this.logger.info('[DatabaseOptimizer] 初始化数据库优化器');

    try {
      // 检查并创建必要的索引
      await this.ensureIndexes();

      // 设置数据库连接池配置
      await this.optimizeConnectionPool();

      // 设置查询超时监控
      this.setupQueryTimeoutMonitoring();

      this.logger.info('[DatabaseOptimizer] 数据库优化器初始化完成');
    } catch (error) {
      this.logger.error('[DatabaseOptimizer] 初始化数据库优化器失败:', error);
    }
  }

  /**
   * 确保所有必要的索引都已创建
   */
  async ensureIndexes() {
    this.logger.info('[DatabaseOptimizer] 检查并创建必要的索引');

    const indexDefinitions = [
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

    for (const indexDef of indexDefinitions) {
      try {
        await this.ensureIndex(indexDef.table, indexDef.fields, indexDef.name, indexDef.unique);
      } catch (error) {
        this.logger.error(`[DatabaseOptimizer] 创建索引 ${indexDef.name} 失败:`, error);
      }
    }
  }

  /**
   * 确保特定索引存在
   * @param {String} table - 表名
   * @param {Array} fields - 索引字段
   * @param {String} indexName - 索引名称
   * @param {Boolean} unique - 是否唯一索引
   */
  async ensureIndex(table, fields, indexName, unique = false) {
    try {
      // 检查索引是否已存在
      const [indexes] = await this.sequelize.query(
        `SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`
      );

      if (indexes.length === 0) {
        // 索引不存在，创建索引
        const uniqueStr = unique ? 'UNIQUE' : '';
        const fieldStr = fields.map((field) => `\`${field}\``).join(', ');

        await this.sequelize.query(
          `CREATE ${uniqueStr} INDEX ${indexName} ON ${table} (${fieldStr})`
        );

        this.logger.info(`[DatabaseOptimizer] 已创建索引: ${indexName} 在表 ${table} 上`);
      } else {
        this.logger.debug(`[DatabaseOptimizer] 索引 ${indexName} 已存在于表 ${table}`);
      }
    } catch (error) {
      this.logger.error(`[DatabaseOptimizer] 检查/创建索引 ${indexName} 失败:`, error);
      throw error;
    }
  }

  /**
   * 优化数据库连接池配置
   */
  async optimizeConnectionPool() {
    // 获取系统环境信息
    const cpuCount = require('os').cpus().length;

    // 根据CPU核心数和内存情况动态调整连接池大小
    const maxConnections = Math.max(5, Math.min(cpuCount * 2, 20)); // 最小5，最大20

    // 设置连接池配置
    const poolConfig = {
      max: maxConnections, // 最大连接数
      min: Math.ceil(maxConnections / 4), // 最小连接数
      idle: 10000, // 连接最大空闲时间（毫秒）
      acquire: 30000, // 获取连接最大等待时间（毫秒）
      evict: 30000, // 清除空闲连接的检查间隔（毫秒）
    };

    try {
      // 应用新的连接池配置
      this.sequelize.connectionManager.pool.config.max = poolConfig.max;
      this.sequelize.connectionManager.pool.config.min = poolConfig.min;
      this.sequelize.connectionManager.pool.config.idle = poolConfig.idle;
      this.sequelize.connectionManager.pool.config.acquire = poolConfig.acquire;

      this.logger.info('[DatabaseOptimizer] 已优化数据库连接池配置:', poolConfig);
    } catch (error) {
      this.logger.error('[DatabaseOptimizer] 优化数据库连接池配置失败:', error);
    }
  }

  /**
   * 设置查询超时监控
   */
  setupQueryTimeoutMonitoring() {
    // 监听查询事件
    this.sequelize.addHook('beforeQuery', (options) => {
      // 设置查询超时
      options.timeout = 10000; // 10秒超时

      // 记录查询开始时间
      options.startTime = Date.now();
    });

    // 监听查询完成事件
    this.sequelize.addHook('afterQuery', (options) => {
      if (options.startTime) {
        const duration = Date.now() - options.startTime;

        // 记录慢查询
        if (duration > 1000) {
          // 超过1秒的查询视为慢查询
          const sql = options.sql.substring(0, 200) + (options.sql.length > 200 ? '...' : '');
          this.logger.warn(`[DatabaseOptimizer] 检测到慢查询 (${duration}ms): ${sql}`);

          // 记录慢查询到数据库（如果有相应的表）
          this.recordSlowQuery(options.sql, duration, options.bind).catch((err) => {
            this.logger.error('[DatabaseOptimizer] 记录慢查询失败:', err);
          });
        }
      }
    });
  }

  /**
   * 记录慢查询到数据库
   * @param {String} sql - SQL查询语句
   * @param {Number} duration - 查询耗时（毫秒）
   * @param {Array} parameters - 查询参数
   */
  async recordSlowQuery(sql, duration, parameters) {
    try {
      // 检查是否有slow_queries表
      const [tables] = await this.sequelize.query('SHOW TABLES LIKE \'slow_queries\'');

      // 如果表不存在，创建表
      if (tables.length === 0) {
        await this.sequelize.query(`
          CREATE TABLE slow_queries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sql_text TEXT NOT NULL,
            parameters TEXT,
            duration INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }

      // 记录慢查询
      await this.sequelize.query(
        'INSERT INTO slow_queries (sql_text, parameters, duration) VALUES (?, ?, ?)',
        {
          replacements: [sql, parameters ? JSON.stringify(parameters) : null, duration],
        }
      );
    } catch (error) {
      this.logger.error('[DatabaseOptimizer] 记录慢查询到数据库失败:', error);
    }
  }

  /**
   * 分析表并优化
   * @param {String} tableName - 表名
   */
  async analyzeAndOptimizeTable(tableName) {
    try {
      // 分析表
      await this.sequelize.query(`ANALYZE TABLE ${tableName}`);

      // 优化表
      await this.sequelize.query(`OPTIMIZE TABLE ${tableName}`);

      this.logger.info(`[DatabaseOptimizer] 已分析和优化表: ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`[DatabaseOptimizer] 分析和优化表 ${tableName} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取表统计信息
   * @param {String} tableName - 表名
   * @returns {Promise<Object>} 表统计信息
   */
  async getTableStats(tableName) {
    try {
      // 获取表信息
      const [tableInfo] = await this.sequelize.query(`SHOW TABLE STATUS LIKE '${tableName}'`);

      if (tableInfo.length === 0) {
        throw new Error(`表 ${tableName} 不存在`);
      }

      // 获取表的列信息
      const [columns] = await this.sequelize.query(`SHOW COLUMNS FROM ${tableName}`);

      // 获取表的索引信息
      const [indexes] = await this.sequelize.query(`SHOW INDEX FROM ${tableName}`);

      // 获取表的行数
      const [rowCountResult] = await this.sequelize.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      return {
        name: tableName,
        rowCount: rowCountResult[0].count,
        engine: tableInfo[0].Engine,
        version: tableInfo[0].Version,
        rowFormat: tableInfo[0].Row_format,
        avgRowLength: tableInfo[0].Avg_row_length,
        dataLength: tableInfo[0].Data_length,
        maxDataLength: tableInfo[0].Max_data_length,
        indexLength: tableInfo[0].Index_length,
        dataFree: tableInfo[0].Data_free,
        createTime: tableInfo[0].Create_time,
        updateTime: tableInfo[0].Update_time,
        checkTime: tableInfo[0].Check_time,
        collation: tableInfo[0].Collation,
        checksum: tableInfo[0].Checksum,
        columns: columns.map((col) => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          key: col.Key,
          default: col.Default,
          extra: col.Extra,
        })),
        indexes: this.groupIndexes(indexes),
      };
    } catch (error) {
      this.logger.error(`[DatabaseOptimizer] 获取表 ${tableName} 统计信息失败:`, error);
      throw error;
    }
  }

  /**
   * 将索引信息按索引名分组
   * @param {Array} indexes - 索引信息数组
   * @returns {Array} 分组后的索引信息
   */
  groupIndexes(indexes) {
    const indexMap = {};

    indexes.forEach((idx) => {
      if (!indexMap[idx.Key_name]) {
        indexMap[idx.Key_name] = {
          name: idx.Key_name,
          unique: idx.Non_unique === 0,
          columns: [],
          type: idx.Index_type,
        };
      }

      indexMap[idx.Key_name].columns.push({
        name: idx.Column_name,
        position: idx.Seq_in_index,
        collation: idx.Collation,
        cardinality: idx.Cardinality,
      });
    });

    return Object.values(indexMap);
  }

  /**
   * 获取所有表的列表
   * @returns {Promise<Array>} 表名列表
   */
  async getAllTables() {
    try {
      const [tables] = await this.sequelize.query('SHOW TABLES');
      return tables.map((table) => Object.values(table)[0]);
    } catch (error) {
      this.logger.error('[DatabaseOptimizer] 获取表列表失败:', error);
      throw error;
    }
  }

  /**
   * 执行数据库维护任务
   */
  async performMaintenance() {
    try {
      this.logger.info('[DatabaseOptimizer] 开始执行数据库维护任务');

      // 获取所有表
      const tables = await this.getAllTables();

      // 对每个表执行分析和优化
      for (const table of tables) {
        await this.analyzeAndOptimizeTable(table);
      }

      this.logger.info('[DatabaseOptimizer] 数据库维护任务完成');
      return true;
    } catch (error) {
      this.logger.error('[DatabaseOptimizer] 执行数据库维护任务失败:', error);
      return false;
    }
  }
}

module.exports = DatabaseOptimizer;
