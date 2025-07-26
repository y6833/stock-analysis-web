import axios from 'axios';

async function testAIRecommendation() {
  try {
    console.log('🔍 测试AI选股功能...');

    const response = await axios.get('http://localhost:7001/api/smart-recommendation', {
      params: {
        riskLevel: 'medium',
        expectedReturn: 0.05,
        timeHorizon: 7,
        limit: 10
      },
      timeout: 10000
    });

    console.log('✅ API响应成功');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.length > 0) {
      console.log('🎉 AI选股功能修复成功！返回了', response.data.data.length, '个推荐股票');
      response.data.data.forEach((stock, index) => {
        console.log(`${index + 1}. ${stock.name} (${stock.symbol}) - 评分: ${stock.totalScore}`);
      });
    } else {
      console.log('⚠️  仍然返回0个推荐，但API调用成功');
      console.log('Meta信息:', response.data.meta);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ 服务器未启动，请先启动后端服务器');
    } else {
      console.log('❌ 测试失败:', error.message);
      if (error.response) {
        console.log('响应状态:', error.response.status);
        console.log('响应数据:', error.response.data);
      }
    }
  }
}

// 运行测试
testAIRecommendation();
