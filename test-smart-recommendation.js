/**
 * 智能推荐功能测试脚本
 * 测试智能推荐API的各项功能
 */

const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:7001';
const API_URL = `${BASE_URL}/api/smart-recommendation`;

/**
 * 测试获取推荐配置
 */
async function testGetConfig() {
  console.log('\n=== 测试获取推荐配置 ===');
  try {
    const response = await axios.get(`${API_URL}/config`);
    console.log('✅ 获取配置成功');
    console.log('风险等级选项:', response.data.data.riskLevels.length);
    console.log('时间周期选项:', response.data.data.timeHorizons.length);
    console.log('预期收益选项:', response.data.data.expectedReturns.length);
    console.log('免责声明:', response.data.data.disclaimer.substring(0, 50) + '...');
    return true;
  } catch (error) {
    console.log('❌ 获取配置失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试获取推荐统计
 */
async function testGetStats() {
  console.log('\n=== 测试获取推荐统计 ===');
  try {
    const response = await axios.get(`${API_URL}/stats?days=30`);
    console.log('✅ 获取统计成功');
    console.log('历史推荐数量:', response.data.data.totalRecommendations);
    console.log('成功率:', response.data.data.successRate + '%');
    console.log('平均收益:', response.data.data.averageReturn + '%');
    console.log('统计周期:', response.data.data.period);
    return true;
  } catch (error) {
    console.log('❌ 获取统计失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试获取智能推荐
 */
async function testGetRecommendations() {
  console.log('\n=== 测试获取智能推荐 ===');
  try {
    const params = {
      riskLevel: 'medium',
      expectedReturn: 0.05,
      timeHorizon: 7,
      limit: 5
    };
    
    const response = await axios.get(API_URL, { params });
    
    if (response.data.success) {
      console.log('✅ 获取推荐成功');
      console.log('推荐数量:', response.data.data.length);
      console.log('分析股票总数:', response.data.meta.totalAnalyzed);
      console.log('符合条件股票数:', response.data.meta.qualified);
      
      // 显示推荐详情
      response.data.data.forEach((stock, index) => {
        console.log(`\n推荐 ${index + 1}:`);
        console.log(`  股票: ${stock.name} (${stock.symbol})`);
        console.log(`  当前价格: ¥${stock.currentPrice}`);
        console.log(`  综合评分: ${stock.totalScore}`);
        console.log(`  推荐等级: ${stock.recommendation}`);
        console.log(`  风险等级: ${stock.riskLevel}`);
        console.log(`  预期收益: ${(stock.expectedReturn * 100).toFixed(2)}%`);
        console.log(`  目标价格: ¥${stock.targetPrice.target}`);
        console.log(`  上涨空间: ${stock.targetPrice.upside}%`);
        console.log(`  推荐理由: ${stock.reasons[0]}`);
      });
      
      return true;
    } else {
      console.log('❌ 获取推荐失败:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取推荐失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试分析单个股票
 */
async function testAnalyzeStock() {
  console.log('\n=== 测试分析单个股票 ===');
  try {
    const symbol = '000001.SZ'; // 平安银行
    const response = await axios.get(`${API_URL}/analyze/${symbol}`);
    
    if (response.data.success) {
      const stock = response.data.data;
      console.log('✅ 股票分析成功');
      console.log(`股票: ${stock.name} (${stock.symbol})`);
      console.log(`当前价格: ¥${stock.currentPrice}`);
      console.log(`综合评分: ${stock.totalScore}`);
      console.log(`技术面评分: ${stock.technicalScore}`);
      console.log(`量价面评分: ${stock.volumePriceScore}`);
      console.log(`趋势面评分: ${stock.trendScore}`);
      console.log(`动量面评分: ${stock.momentumScore}`);
      console.log(`推荐等级: ${stock.recommendation}`);
      console.log(`风险等级: ${stock.riskLevel}`);
      console.log(`建议买入价: ¥${stock.tradingAdvice.buyPriceRange.min} - ¥${stock.tradingAdvice.buyPriceRange.max}`);
      console.log(`止损价位: ¥${stock.tradingAdvice.stopLoss}`);
      console.log(`持有周期: ${stock.tradingAdvice.holdingPeriod}`);
      return true;
    } else {
      console.log('❌ 股票分析失败:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ 股票分析失败:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 测试不同参数组合
 */
async function testDifferentParameters() {
  console.log('\n=== 测试不同参数组合 ===');
  
  const testCases = [
    { riskLevel: 'low', expectedReturn: 0.02, timeHorizon: 3, limit: 3 },
    { riskLevel: 'high', expectedReturn: 0.12, timeHorizon: 15, limit: 8 },
    { riskLevel: 'medium', expectedReturn: 0.08, timeHorizon: 30, limit: 10 }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const params = testCases[i];
    console.log(`\n测试参数组合 ${i + 1}:`, params);
    
    try {
      const response = await axios.get(API_URL, { params });
      
      if (response.data.success) {
        console.log(`✅ 参数组合 ${i + 1} 测试成功`);
        console.log(`  推荐数量: ${response.data.data.length}`);
        console.log(`  平均评分: ${response.data.data.reduce((sum, stock) => sum + stock.totalScore, 0) / response.data.data.length || 0}`);
      } else {
        console.log(`❌ 参数组合 ${i + 1} 测试失败:`, response.data.error);
      }
    } catch (error) {
      console.log(`❌ 参数组合 ${i + 1} 测试失败:`, error.response?.data?.message || error.message);
    }
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试智能推荐功能...');
  console.log('测试服务器:', BASE_URL);
  
  const results = [];
  
  // 执行各项测试
  results.push(await testGetConfig());
  results.push(await testGetStats());
  results.push(await testGetRecommendations());
  results.push(await testAnalyzeStock());
  await testDifferentParameters();
  
  // 统计测试结果
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！智能推荐功能正常工作。');
  } else {
    console.log('⚠️  部分测试失败，请检查服务器状态和配置。');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testGetConfig,
  testGetStats,
  testGetRecommendations,
  testAnalyzeStock,
  testDifferentParameters,
  runTests
};
