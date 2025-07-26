import axios from 'axios';

async function testDifferentFilters() {
  const testCases = [
    {
      name: '低风险投资者',
      params: { riskLevel: 'low', expectedReturn: 0.03, timeHorizon: 30, limit: 5 }
    },
    {
      name: '中等风险投资者',
      params: { riskLevel: 'medium', expectedReturn: 0.05, timeHorizon: 14, limit: 8 }
    },
    {
      name: '高风险投资者',
      params: { riskLevel: 'high', expectedReturn: 0.10, timeHorizon: 7, limit: 10 }
    },
    {
      name: '短期交易',
      params: { riskLevel: 'medium', expectedReturn: 0.02, timeHorizon: 3, limit: 3 }
    },
    {
      name: '长期投资',
      params: { riskLevel: 'low', expectedReturn: 0.08, timeHorizon: 90, limit: 6 }
    }
  ];

  console.log('🧪 测试不同筛选条件组合...\n');

  for (const testCase of testCases) {
    try {
      console.log(`📊 测试场景: ${testCase.name}`);
      console.log(`   参数: ${JSON.stringify(testCase.params)}`);

      const response = await axios.get('http://localhost:7001/api/smart-recommendation', {
        params: testCase.params,
        timeout: 10000
      });

      if (response.data.success && response.data.data.length > 0) {
        console.log(`   ✅ 成功返回 ${response.data.data.length} 个推荐`);
        console.log(`   📈 平均评分: ${(response.data.data.reduce((sum, stock) => sum + stock.totalScore, 0) / response.data.data.length).toFixed(1)}`);
        console.log(`   🎯 推荐股票: ${response.data.data.map(s => s.name).join(', ')}`);
      } else {
        console.log(`   ⚠️  返回0个推荐`);
        console.log(`   📊 Meta: 分析${response.data.meta.totalAnalyzed}只，符合${response.data.meta.qualified}只`);
      }

    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.message}`);
    }

    console.log(''); // 空行分隔
  }

  console.log('🏁 所有测试完成');
}

testDifferentFilters();
