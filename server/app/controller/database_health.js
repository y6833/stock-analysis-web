'use strict';

const Controller = require('egg').Controller;

/**
 * 数据库健康控制器
 * 提供数据库健康检查、性能监控和维护功能的API端点
 */
class DatabaseHealthController extends Controller {
  /**
   * 获取数据库健康状态
   */
  async getHealth() {
    const { ctx, app } = this;
    const { service } = ctx;

    try {
      // 获取数据库健康状态
      const dbHealth = await service.database.getHealthStatus();

      // 设置缓存控制
      ctx.setCacheControl(60, false); // 1分钟缓存，私有

      ctx.success(dbHealth, '数据库健康状态获取成功');
    } catch (error) {
      ctx.logger.error('获取数据库健康状态失败:', error);
      ctx.error('获取数据库健康状态失败', 'DB_HEALTH_ERROR', 500, error.message);
    }
  }

  /**
   * 获取连接池状态
   */
  async getConnectionPoolStats() {
    const { ctx } = this;
    const { service } = ctx;

    try {
      // 获取连接池状态
      const poolStats = await service.database.getConnectionPoolStats();

      ctx.success(poolStats, '数据库连接池状态获取成功');
    } catch (error) {
      ctx.logger.error('获取数据库连接池状态失败:', error);
      ctx.error('获取数据库连接池状态失败', 'DB_POOL_ERROR', 500, error.message);
    }
  }

  /**
   * 获取慢查询列表
   */
  async getSlowQueries() {
    const { ctx, app } = this;

    try {
      // 获取分页参数
      const { page, pageSize } = ctx.getPagination(1, 20, 100);

      // 查询慢查询记录
      const [result] = await app.model.sequelize.query(
        `SELECT id, sql_text, parameters, duration, created_at 
         FROM slow_queries 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        {
          replacements: [pageSize, (page - 1) * pageSize],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );

      // 获取总数
      const [countResult] = await app.model.sequelize.query(
        'SELECT COUNT(*) as total FROM slow_queries',
        {
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );

      const total = countResult[0].total || 0;

      ctx.paginated(result, total, page, pageSize, '慢查询列表获取成功');
    } catch (error) {
      ctx.logger.error('获取慢查询列表失败:', error);
      ctx.error('获取慢查询列表失败', 'SLOW_QUERY_ERROR', 500, error.message);
    }
  }

  /**
   * 获取表统计信息
   */
  async getTableStats() {
    const { ctx, app } = this;

    try {
      // 获取表名参数
      const { tableName } = ctx.query;

      if (!tableName) {
        ctx.validationError('表名不能为空');
        return;
      }

      // 获取数据库优化器
      const dbOptimizer = new app.util.DatabaseOptimizer(app);

      // 获取表统计信息
      const tableStats = await dbOptimizer.getTableStats(tableName);

      ctx.success(tableStats, `表 ${tableName} 统计信息获取成功`);
    } catch (error) {
      ctx.logger.error('获取表统计信息失败:', error);
      ctx.error('获取表统计信息失败', 'TABLE_STATS_ERROR', 500, error.message);
    }
  }

  /**
   * 获取所有表列表
   */
  async getAllTables() {
    const { ctx, app } = this;

    try {
      // 获取数据库优化器
      const dbOptimizer = new app.util.DatabaseOptimizer(app);

      // 获取所有表
      const tables = await dbOptimizer.getAllTables();

      ctx.success(tables, '表列表获取成功');
    } catch (error) {
      ctx.logger.error('获取表列表失败:', error);
      ctx.error('获取表列表失败', 'TABLE_LIST_ERROR', 500, error.message);
    }
  }

  /**
   * 执行表维护
   */
  async maintainTable() {
    const { ctx, app } = this;

    try {
      // 获取表名参数
      const { tableName } = ctx.request.body;

      if (!tableName) {
        ctx.validationError('表名不能为空');
        return;
      }

      // 检查权限（仅管理员可执行）
      if (!ctx.state.user || ctx.state.user.role !== 'admin') {
        ctx.forbidden('需要管理员权限');
        return;
      }

      // 获取数据库优化器
      const dbOptimizer = new app.util.DatabaseOptimizer(app);

      // 执行表维护
      const result = await dbOptimizer.analyzeAndOptimizeTable(tableName);

      if (result) {
        ctx.success({ success: true }, `表 ${tableName} 维护成功`);
      } else {
        ctx.error(`表 ${tableName} 维护失败`, 'TABLE_MAINTENANCE_ERROR', 500);
      }
    } catch (error) {
      ctx.logger.error('执行表维护失败:', error);
      ctx.error('执行表维护失败', 'TABLE_MAINTENANCE_ERROR', 500, error.message);
    }
  }

  /**
   * 执行数据库完整维护
   */
  async maintainDatabase() {
    const { ctx, app } = this;

    try {
      // 检查权限（仅管理员可执行）
      if (!ctx.state.user || ctx.state.user.role !== 'admin') {
        ctx.forbidden('需要管理员权限');
        return;
      }

      // 获取数据库优化器
      const dbOptimizer = new app.util.DatabaseOptimizer(app);

      // 执行数据库维护
      const result = await dbOptimizer.performMaintenance();

      if (result) {
        ctx.success({ success: true }, '数据库维护成功');
      } else {
        ctx.error('数据库维护失败', 'DB_MAINTENANCE_ERROR', 500);
      }
    } catch (error) {
      ctx.logger.error('执行数据库维护失败:', error);
      ctx.error('执行数据库维护失败', 'DB_MAINTENANCE_ERROR', 500, error.message);
    }
  }

  /**
   * 清除特定模型的缓存
   */
  async clearModelCache() {
    const { ctx } = this;
    const { service } = ctx;

    try {
      // 获取模型名称参数
      const { modelName } = ctx.request.body;

      if (!modelName) {
        ctx.validationError('模型名称不能为空');
        return;
      }

      // 检查权限（仅管理员可执行）
      if (!ctx.state.user || ctx.state.user.role !== 'admin') {
        ctx.forbidden('需要管理员权限');
        return;
      }

      // 清除模型缓存
      const result = await service.database.clearModelCache(modelName);

      if (result) {
        ctx.success({ success: true }, `模型 ${modelName} 缓存清除成功`);
      } else {
        ctx.error(`模型 ${modelName} 缓存清除失败`, 'CACHE_CLEAR_ERROR', 500);
      }
    } catch (error) {
      ctx.logger.error('清除模型缓存失败:', error);
      ctx.error('清除模型缓存失败', 'CACHE_CLEAR_ERROR', 500, error.message);
    }
  }
}

module.exports = DatabaseHealthController;
