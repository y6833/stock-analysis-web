'use strict';

/**
 * 数据库优化测试脚本
 * 用于测试数据库访问层的性能优化效果
 */
const { Application } = require('egg');

// 启动应用
const app = new Application({
  mode: 'single',
  baseDir: __dirname,
  env: 'local',
});

// 测试数据库连接池状态
async function testConnectionPool() {
  console.log('===== 测试数据库连接池状态 =====');

  try {
    // 获取数据库服务
    const ctx = app.createAnonymousContext();
    const dbService = new app.service.database(ctx);

    // 获取连接池状态
    const poolStats = await dbService.getConnectionPoolStats();
    console.log('连接池状态:', poolStats);

    return true;
  } catch (error) {
    console.error('测试数据库连接池状态失败:', error);
    return false;
  }
}

// 测试优化的查询方法
async function testOptimizedQueries() {
  console.log('===== 测试优化的查询方法 =====');

  try {
    // 获取数据库服务
    const ctx = app.createAnonymousContext();
    const dbService = new app.service.database(ctx);

    // 测试普通查询
    console.log('测试普通查询...');
    const users = await dbService.findAll('User', {
      where: {
        is_active: true,
      },
      limit: 10,
    });
    console.log(`查询到 ${users.length} 个用户`);

    // 测试带缓存的查询
    console.log('测试带缓存的查询...');
    console.time('首次查询');
    const stocks1 = await dbService.findAll('Stock', {
      limit: 20,
      useCache: true,
      cacheTTL: 60,
    });
    console.timeEnd('首次查询');

    console.time('缓存查询');
    const stocks2 = await dbService.findAll('Stock', {
      limit: 20,
      useCache: true,
      cacheTTL: 60,
    });
    console.timeEnd('缓存查询');

    console.log(`查询到 ${stocks1.length} 只股票`);

    // 测试分页查询
    console.log('测试分页查询...');
    const paginatedResult = await dbService.findAndCountAll('Stock', {
      page: 1,
      pageSize: 10,
    });

    console.log('分页结果:', {
      total: paginatedResult.pagination.total,
      page: paginatedResult.pagination.page,
      pageSize: paginatedResult.pagination.pageSize,
      totalPages: paginatedResult.pagination.totalPages,
      itemCount: paginatedResult.items.length,
    });

    return true;
  } catch (error) {
    console.error('测试优化的查询方法失败:', error);
    return false;
  }
}

// 测试批量插入
async function testBulkCreate() {
  console.log('===== 测试批量插入 =====');

  try {
    // 获取数据库服务
    const ctx = app.createAnonymousContext();
    const dbService = new app.service.database(ctx);

    // 创建测试数据
    const testLogs = [];
    for (let i = 0; i < 200; i++) {
      testLogs.push({
        level: i % 3 === 0 ? 'INFO' : i % 3 === 1 ? 'WARN' : 'ERROR',
        message: `测试日志消息 ${i}`,
        context: JSON.stringify({ test: true, index: i }),
        created_at: new Date(),
      });
    }

    // 测试批量插入
    console.log(`准备批量插入 ${testLogs.length} 条日志记录...`);
    console.time('批量插入');
    const result = await dbService.bulkCreate('SystemLog', testLogs, {
      ignoreDuplicates: true,
    });
    console.timeEnd('批量插入');

    console.log(`成功插入 ${result.length} 条记录`);

    return true;
  } catch (error) {
    console.error('测试批量插入失败:', error);
    return false;
  }
}

// 测试数据库健康状态
async function testDatabaseHealth() {
  console.log('===== 测试数据库健康状态 =====');

  try {
    // 获取数据库服务
    const ctx = app.createAnonymousContext();
    const dbService = new app.service.database(ctx);

    // 获取数据库健康状态
    const healthStatus = await dbService.getHealthStatus();
    console.log('数据库健康状态:', healthStatus);

    return true;
  } catch (error) {
    console.error('测试数据库健康状态失败:', error);
    return false;
  }
}

// 测试数据库优化器
async function testDatabaseOptimizer() {
  console.log('===== 测试数据库优化器 =====');

  try {
    // 创建数据库优化器
    const dbOptimizer = new app.util.DatabaseOptimizer(app);

    // 获取所有表
    console.log('获取所有表...');
    const tables = await dbOptimizer.getAllTables();
    console.log(`数据库中有 ${tables.length} 个表`);

    if (tables.length > 0) {
      // 获取第一个表的统计信息
      const firstTable = tables[0];
      console.log(`获取表 ${firstTable} 的统计信息...`);
      const tableStats = await dbOptimizer.getTableStats(firstTable);
      console.log(`表 ${firstTable} 的统计信息:`, {
        rowCount: tableStats.rowCount,
        engine: tableStats.engine,
        dataLength: tableStats.dataLength,
        indexLength: tableStats.indexLength,
        columnsCount: tableStats.columns.length,
        indexesCount: tableStats.indexes.length,
      });
    }

    return true;
  } catch (error) {
    console.error('测试数据库优化器失败:', error);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  try {
    // 启动应用
    await app.ready();
    console.log('应用已启动，开始测试...');

    // 运行测试
    await testConnectionPool();
    await testOptimizedQueries();
    await testBulkCreate();
    await testDatabaseHealth();
    await testDatabaseOptimizer();

    console.log('所有测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭应用
    await app.close();
  }
}

// 执行测试
runAllTests().catch((err) => {
  console.error('运行测试失败:', err);
  process.exit(1);
});
