const axios = require('axios');

async function testRealAPI() {
  console.log('🚀 测试真实的AI选股API...');
  
  try {
    // 测试基本推荐
    console.log('\n📋 测试1: 基本推荐（无筛选条件）');
    const response1 = await axios.get('http://localhost:7001/api/smart-recommendation', {
      params: {
        riskLevel: 'medium',
        expectedReturn: 0.05,
        timeHorizon: 7,
        limit: 5
      }
    });
    
    console.log('✅ 基本推荐结果:');
    console.log(`   返回数量: ${response1.data.data.length}`);
    response1.data.data.forEach((stock, index) => {
      console.log(`   ${index + 1}. ${stock.name} (${stock.symbol}) - 行业: ${stock.industry} - 评分: ${stock.totalScore}`);
    });
    
    // 测试行业筛选
    console.log('\n📋 测试2: 银行行业筛选');
    const response2 = await axios.get('http://localhost:7001/api/smart-recommendation', {
      params: {
        riskLevel: 'low',
        expectedReturn: 0.03,
        timeHorizon: 30,
        industry: '银行',
        limit: 3
      }
    });
    
    console.log('✅ 银行股推荐结果:');
    console.log(`   返回数量: ${response2.data.data.length}`);
    response2.data.data.forEach((stock, index) => {
      console.log(`   ${index + 1}. ${stock.name} (${stock.symbol}) - 行业: ${stock.industry} - 评分: ${stock.totalScore}`);
    });
    
    // 测试科技股筛选
    console.log('\n📋 测试3: 科技行业筛选');
    const response3 = await axios.get('http://localhost:7001/api/smart-recommendation', {
      params: {
        riskLevel: 'high',
        expectedReturn: 0.12,
        timeHorizon: 7,
        industry: '软件服务',
        limit: 3
      }
    });
    
    console.log('✅ 科技股推荐结果:');
    console.log(`   返回数量: ${response3.data.data.length}`);
    response3.data.data.forEach((stock, index) => {
      console.log(`   ${index + 1}. ${stock.name} (${stock.symbol}) - 行业: ${stock.industry} - 评分: ${stock.totalScore}`);
    });
    
    console.log('\n🎉 真实API测试完成！');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 启动测试
testRealAPI();
