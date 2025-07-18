const mysql = require('mysql2/promise');

async function testSearch() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'root',
      database: 'stock_analysis'
    });
    
    console.log('数据库连接成功');
    
    const keyword = '平安';
    const searchPattern = `%${keyword}%`;
    
    // 测试搜索查询
    const searchQuery = `
      SELECT ts_code as tsCode, symbol, name, area, industry, market, list_date as listDate
      FROM stock_basic
      WHERE (
        symbol LIKE ? OR 
        name LIKE ? OR 
        ts_code LIKE ? OR
        cnspell LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN symbol = ? THEN 1
          WHEN name = ? THEN 2
          WHEN symbol LIKE ? THEN 3
          WHEN name LIKE ? THEN 4
          ELSE 5
        END,
        symbol ASC
      LIMIT 50
    `;
    
    console.log('执行搜索查询...');
    console.log('关键词:', keyword);
    console.log('搜索模式:', searchPattern);
    
    const [results] = await connection.execute(searchQuery, [
      searchPattern, searchPattern, searchPattern, searchPattern,
      keyword, keyword, `${keyword}%`, `${keyword}%`
    ]);
    
    console.log('查询结果类型:', typeof results);
    console.log('是否为数组:', Array.isArray(results));
    console.log('结果数量:', results.length);
    
    if (results.length > 0) {
      console.log('前3条结果:');
      results.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.tsCode} | ${row.symbol} | ${row.name} | ${row.area} | ${row.industry}`);
      });
    } else {
      console.log('没有找到匹配的结果');
    }
    
    await connection.end();
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testSearch();
