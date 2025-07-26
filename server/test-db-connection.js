const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'stock_analysis'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 检查用户表结构
    const [rows] = await connection.execute('DESCRIBE users');
    console.log('📋 用户表结构:');
    rows.forEach(row => {
      console.log(`  ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(可空)' : '(非空)'}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
  }
}

testConnection();
