import axios from 'axios';

const API_BASE = 'http://localhost:7001/api/smart-recommendation';

// 测试场景配置
const testScenarios = [
  {
    name: '低风险银行股偏好',
    params: {
      riskLevel: 'low',
      expectedReturn: 0.03,
      timeHorizon: 30,
      industry: '银行',
      limit: 5
    }
  },
  {
    name: '高风险科技股偏好',
    params: {
      riskLevel: 'high',
      expectedReturn: 0.1,
      timeHorizon: 7,
      industry: '科技',
      limit: 5
    }
  },
  {
    name: '中等风险白酒股偏好',
    params: {
      riskLevel: 'medium',
      expectedReturn: 0.05,
      timeHorizon: 14,
      industry: '白酒',
      limit: 5
    }
  },
  {
    name: '创业板短期投资',
    params: {
      riskLevel: 'high',
      expectedReturn: 0.08,
      timeHorizon: 3,
      market: 'gem',
      limit: 5
    }
  },
  {
    name: '主板长期投资',
    params: {
      riskLevel: 'low',
      expectedReturn: 0.04,
      timeHorizon: 90,
      market: 'main',
      limit: 5
    }
  },
  {
    name: '大盘股稳健投资',
    params: {
      riskLevel: 'low',
      expectedReturn: 0.03,
      timeHorizon: 60,
      marketCap: 'large',
      limit: 5
    }
  },
  {
    name: '小盘股成长投资',
    params: {
      riskLevel: 'high',
      expectedReturn: 0.12,
      timeHorizon: 14,
      marketCap: 'small',
      limit: 5
    }
  },
  {
    name: '医药行业中期投资',
    params: {
      riskLevel: 'medium',
      expectedReturn: 0.06,
      timeHorizon: 21,
      industry: '医药',
      limit: 5
    }
  }
];

async function testScenario(scenario) {
  try {
    console.log(`\n📊 测试场景: ${scenario.name}`);
    console.log(`   参数: ${JSON.stringify(scenario.params)}`);

    const response = await axios.get(API_BASE, {
      params: scenario.params
    });

    if (response.data.success && response.data.data.length > 0) {
      console.log(`   ✅ 成功返回 ${response.data.data.length} 个推荐`);

      // 显示推荐股票
      const stocks = response.data.data.map(stock => stock.name || stock.symbol).join(', ');
      console.log(`   🎯 推荐股票: ${stocks}`);

      // 显示评分范围
      const scores = response.data.data.map(stock => stock.totalScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      console.log(`   📈 平均评分: ${avgScore.toFixed(1)}`);

      // 显示行业分布
      const industries = response.data.data.map(stock => stock.industry || '未知');
      const uniqueIndustries = [...new Set(industries)];
      console.log(`   🏭 涉及行业: ${uniqueIndustries.join(', ')}`);

      // 显示元数据
      if (response.data.meta) {
        console.log(`   📋 分析统计: 分析${response.data.meta.totalAnalyzed}只，合格${response.data.meta.qualified}只，推荐${response.data.meta.recommended}只`);
      }

      return {
        success: true,
        stocks: response.data.data.map(s => s.symbol || s.tsCode),
        industries: uniqueIndustries,
        avgScore: avgScore
      };
    } else {
      console.log(`   ❌ 返回结果为空`);
      return { success: false, reason: 'empty_result' };
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
    return { success: false, reason: 'request_failed', error: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 测试改进后的AI推荐算法多样性...\n');

  const results = [];

  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push({
      scenario: scenario.name,
      ...result
    });

    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 分析结果多样性
  console.log('\n📊 多样性分析:');

  const allStocks = new Set();
  const allIndustries = new Set();
  let successCount = 0;

  results.forEach(result => {
    if (result.success) {
      successCount++;
      result.stocks?.forEach(stock => allStocks.add(stock));
      result.industries?.forEach(industry => allIndustries.add(industry));
    }
  });

  console.log(`✅ 成功场景: ${successCount}/${testScenarios.length}`);
  console.log(`🎯 推荐股票总数: ${allStocks.size} 只不同股票`);
  console.log(`🏭 涉及行业总数: ${allIndustries.size} 个不同行业`);

  if (allStocks.size >= 10) {
    console.log('🎉 多样性测试通过：推荐结果具有良好的多样性');
  } else {
    console.log('⚠️ 多样性不足：推荐结果缺乏足够的多样性');
  }

  console.log('\n🏁 测试完成');
}

// 运行测试
runAllTests().catch(console.error);
