const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupRiskMonitoring() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'stock_analysis',
      multipleStatements: true
    });

    console.log('数据库连接成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'create_risk_monitoring_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    await connection.execute(sql);
    console.log('风险监控表创建成功');

  } catch (error) {
    console.error('设置风险监控表失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupRiskMonitoring();
