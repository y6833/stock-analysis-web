const axios = require('axios');

async function testStockAPIs() {
  console.log('=== 测试股票数据库API ===\n');

  try {
    // 1. 测试股票统计信息
    console.log('1. 测试股票统计信息...');
    try {
      const statsResponse = await axios.get('http://localhost:7001/api/stocks/stats');
      console.log('✅ 股票统计信息:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 股票统计信息失败:', error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. 测试手动同步股票数据
    console.log('2. 测试手动同步股票数据...');
    try {
      const syncResponse = await axios.post('http://localhost:7001/api/stocks/sync');
      console.log('✅ 股票数据同步成功:', JSON.stringify(syncResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 股票数据同步失败:', error.message);
      if (error.response) {
        console.log('错误详情:', error.response.data);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. 测试获取股票列表
    console.log('3. 测试获取股票列表...');
    try {
      const stocksResponse = await axios.get('http://localhost:7001/api/stocks');
      console.log('✅ 股票列表获取成功:');
      console.log('数据源:', stocksResponse.data.data_source);
      console.log('数据源消息:', stocksResponse.data.data_source_message);
      console.log('股票数量:', stocksResponse.data.count);

      if (stocksResponse.data.data && stocksResponse.data.data.length > 0) {
        console.log('前5只股票:');
        stocksResponse.data.data.slice(0, 5).forEach((stock, index) => {
          console.log(`  ${index + 1}. ${stock.symbol} - ${stock.name} (${stock.industry})`);
        });
      }
    } catch (error) {
      console.log('❌ 股票列表获取失败:', error.message);
      if (error.response) {
        console.log('错误详情:', error.response.data);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. 再次测试股票统计信息（同步后）
    console.log('4. 再次测试股票统计信息（同步后）...');
    try {
      const statsResponse2 = await axios.get('http://localhost:7001/api/stocks/stats');
      console.log('✅ 同步后股票统计信息:', JSON.stringify(statsResponse2.data, null, 2));
    } catch (error) {
      console.log('❌ 同步后股票统计信息失败:', error.message);
    }

  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
testStockAPIs().then(() => {
  console.log('\n=== 测试完成 ===');
}).catch(error => {
  console.error('测试失败:', error);
});
