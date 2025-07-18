const mysql = require('mysql2/promise');

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'root',
      database: 'stock_analysis'
    });

    console.log('数据库连接成功');

    // 检查 stock_basic 表是否存在
    const [tables] = await connection.execute('SHOW TABLES LIKE "stock_basic"');
    console.log('stock_basic 表存在:', tables.length > 0);

    if (tables.length > 0) {
      // 检查表结构
      const [columns] = await connection.execute('DESCRIBE stock_basic');
      console.log('stock_basic 表结构:');
      columns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));

      // 检查数据数量
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM stock_basic');
      console.log('stock_basic 表数据数量:', count[0].count);

      // 查看前5条数据
      if (count[0].count > 0) {
        const [rows] = await connection.execute('SELECT * FROM stock_basic LIMIT 5');
        console.log('前5条数据:');
        rows.forEach(row => console.log(`  ${JSON.stringify(row)}`));

        // 搜索"平安"相关的股票
        const [searchRows] = await connection.execute('SELECT ts_code, symbol, name, list_status FROM stock_basic WHERE name LIKE "%平安%" LIMIT 5');
        console.log('搜索"平安"相关股票:');
        searchRows.forEach(row => console.log(`  ${row.ts_code} | ${row.symbol} | ${row.name} | list_status: ${row.list_status}`));
      }
    }

    await connection.end();
  } catch (error) {
    console.error('数据库检查失败:', error.message);
  }
}

checkDatabase();
