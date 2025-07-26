const mysql = require('mysql2/promise')

async function testCache() {
  console.log('开始测试股票日线数据缓存系统...')

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'stock_analysis',
  })

  try {
    // 1. 插入一些测试数据
    console.log('1. 插入测试数据...')
    const testData = [
      {
        ts_code: '000001.SZ',
        trade_date: '20250724',
        open: 10.5,
        high: 10.8,
        low: 10.3,
        close: 10.65,
        pre_close: 10.45,
        change_val: 0.2,
        pct_chg: 1.91,
        vol: 1234567.0,
        amount: 13000000.0,
        cache_priority: 1,
        data_source: 'test',
      },
      {
        ts_code: '000001.SZ',
        trade_date: '20250725',
        open: 10.65,
        high: 10.9,
        low: 10.55,
        close: 10.75,
        pre_close: 10.65,
        change_val: 0.1,
        pct_chg: 0.94,
        vol: 987654.0,
        amount: 10500000.0,
        cache_priority: 1,
        data_source: 'test',
      },
    ]

    for (const data of testData) {
      await connection.execute(
        `
        INSERT INTO stock_daily_data 
        (ts_code, trade_date, open, high, low, close, pre_close, change_val, pct_chg, vol, amount, cache_priority, data_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        open = VALUES(open), high = VALUES(high), low = VALUES(low), close = VALUES(close),
        pre_close = VALUES(pre_close), change_val = VALUES(change_val), pct_chg = VALUES(pct_chg),
        vol = VALUES(vol), amount = VALUES(amount), last_updated = CURRENT_TIMESTAMP
      `,
        [
          data.ts_code,
          data.trade_date,
          data.open,
          data.high,
          data.low,
          data.close,
          data.pre_close,
          data.change_val,
          data.pct_chg,
          data.vol,
          data.amount,
          data.cache_priority,
          data.data_source,
        ]
      )
    }

    console.log('✓ 测试数据插入成功')

    // 2. 查询数据验证
    console.log('2. 查询缓存数据...')
    const [rows] = await connection.execute(`
      SELECT * FROM stock_daily_data 
      WHERE ts_code = '000001.SZ' AND trade_date BETWEEN '20250724' AND '20250725'
      ORDER BY trade_date ASC
    `)

    console.log(`✓ 查询到 ${rows.length} 条缓存数据:`)
    rows.forEach((row) => {
      console.log(
        `  ${row.trade_date}: 开盘=${row.open}, 收盘=${row.close}, 涨跌幅=${row.pct_chg}%`
      )
    })

    // 3. 测试API调用
    console.log('3. 测试API调用...')
    try {
      const response = await fetch(
        'http://localhost:7001/api/stocks/000001.SZ/history?start_date=20250724&end_date=20250725'
      )
      const result = await response.json()

      console.log('API响应:', {
        success: result.success,
        count: result.count,
        data_source: result.data_source,
        data_source_message: result.data_source_message,
      })

      if (result.success && result.data && result.data.length > 0) {
        console.log('✓ API成功返回缓存数据')
        console.log(`  返回 ${result.data.length} 条数据`)
      } else {
        console.log('⚠ API未返回预期数据')
      }
    } catch (error) {
      console.log('⚠ API调用失败:', error.message)
    }

    console.log('\n缓存系统测试完成！')
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    await connection.end()
  }
}

// 运行测试
testCache().catch(console.error)
