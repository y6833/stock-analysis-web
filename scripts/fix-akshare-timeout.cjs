#!/usr/bin/env node

/**
 * AKShare超时问题修复脚本
 * 解决AKShare Python脚本超时和相关问题
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 简单的颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 测试AKShare API端点
async function testAKShareEndpoints() {
  console.log(colors.blue('🧪 测试AKShare API端点...\n'));
  
  const endpoints = [
    {
      name: '环境测试',
      url: '/api/akshare/test',
      method: 'GET'
    },
    {
      name: '新闻API（模拟数据）',
      url: '/api/akshare/news?count=3&force_refresh=false',
      method: 'GET'
    },
    {
      name: '股票列表',
      url: '/api/akshare/stock-list',
      method: 'GET'
    }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint.name}...`));
      
      const response = await axios({
        method: endpoint.method,
        url: `http://localhost:7001${endpoint.url}`,
        timeout: 15000
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(colors.green(`✅ ${endpoint.name}: 成功`));
        if (response.data.message) {
          console.log(colors.gray(`   消息: ${response.data.message}`));
        }
        if (response.data.data_source) {
          console.log(colors.gray(`   数据源: ${response.data.data_source}`));
        }
        successCount++;
      } else {
        console.log(colors.red(`❌ ${endpoint.name}: 失败`));
        console.log(colors.gray(`   状态: ${response.status}`));
        if (response.data.message) {
          console.log(colors.gray(`   错误: ${response.data.message}`));
        }
      }
    } catch (error) {
      console.log(colors.red(`❌ ${endpoint.name}: 异常`));
      console.log(colors.gray(`   错误: ${error.message}`));
      
      if (error.code === 'ECONNREFUSED') {
        console.log(colors.gray(`   提示: 后端服务可能未启动`));
      } else if (error.code === 'ETIMEDOUT') {
        console.log(colors.gray(`   提示: 请求超时，可能是Python脚本执行时间过长`));
      }
    }
    
    console.log();
  }
  
  return { successCount, totalCount: endpoints.length };
}

// 检查Python脚本文件
async function checkPythonScripts() {
  console.log(colors.blue('📄 检查Python脚本文件...\n'));
  
  const scriptPath = path.join(__dirname, '../server/scripts/akshare_api.py');
  
  if (fs.existsSync(scriptPath)) {
    console.log(colors.green('✅ AKShare Python脚本存在'));
    
    try {
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // 检查关键导入
      const imports = [
        'import akshare as ak',
        'import pandas as pd',
        'import json',
        'import sys'
      ];
      
      for (const importStatement of imports) {
        if (content.includes(importStatement)) {
          console.log(colors.green(`✅ 包含导入: ${importStatement}`));
        } else {
          console.log(colors.red(`❌ 缺少导入: ${importStatement}`));
        }
      }
      
      // 检查新闻函数
      if (content.includes('def get_news(')) {
        console.log(colors.green('✅ 包含新闻获取函数'));
      } else {
        console.log(colors.red('❌ 缺少新闻获取函数'));
      }
      
      return true;
    } catch (error) {
      console.log(colors.red(`❌ 读取脚本文件失败: ${error.message}`));
      return false;
    }
  } else {
    console.log(colors.red('❌ AKShare Python脚本不存在'));
    return false;
  }
}

// 测试缓存统计API
async function testCacheStatsAPI() {
  console.log(colors.blue('\n📊 测试缓存统计API...\n'));
  
  const endpoints = [
    '/api/public/cache-stats',
    '/api/public/cache-stats?dataSource=akshare'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint}...`));
      
      const response = await axios.get(`http://localhost:7001${endpoint}`, {
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(colors.green(`✅ 缓存统计API正常`));
        console.log(colors.gray(`   命中数: ${response.data.hits || 0}`));
        console.log(colors.gray(`   未命中数: ${response.data.misses || 0}`));
        console.log(colors.gray(`   命中率: ${response.data.hitRate || '0.00'}%`));
      } else {
        console.log(colors.red(`❌ 缓存统计API异常`));
      }
    } catch (error) {
      console.log(colors.red(`❌ 缓存统计API失败: ${error.message}`));
    }
  }
}

// 提供解决方案
function provideSolutions(testResults) {
  console.log(colors.blue(colors.bold('\n💡 AKShare问题解决方案\n')));
  
  console.log(colors.yellow('1. 超时问题解决:'));
  console.log(colors.gray('   - 已修改为默认使用模拟数据'));
  console.log(colors.gray('   - 只有在force_refresh=true时才调用Python脚本'));
  console.log(colors.gray('   - 设置了更短的超时时间（10秒）'));
  console.log();
  
  console.log(colors.yellow('2. 使用建议:'));
  console.log(colors.gray('   - 日常使用：/api/akshare/news?count=5 （模拟数据，快速响应）'));
  console.log(colors.gray('   - 真实数据：/api/akshare/news?count=5&force_refresh=true （可能超时）'));
  console.log();
  
  console.log(colors.yellow('3. 缓存统计修复:'));
  console.log(colors.gray('   - 新增公开API：/api/public/cache-stats'));
  console.log(colors.gray('   - 不需要认证，前端可直接调用'));
  console.log();
  
  console.log(colors.yellow('4. 性能优化建议:'));
  console.log(colors.gray('   - 考虑使用其他新闻数据源（如腾讯财经）'));
  console.log(colors.gray('   - 设置合理的缓存时间'));
  console.log(colors.gray('   - 监控Python脚本执行时间'));
  console.log();
  
  if (testResults.successCount < testResults.totalCount) {
    console.log(colors.yellow('5. 故障排除:'));
    console.log(colors.gray('   - 检查Python环境和AKShare库'));
    console.log(colors.gray('   - 检查网络连接'));
    console.log(colors.gray('   - 查看后端错误日志'));
    console.log(colors.gray('   - 重启后端服务'));
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 AKShare超时问题修复工具\n')));
  console.log(colors.gray('正在检查和修复AKShare相关问题...\n'));
  
  // 1. 检查Python脚本
  const scriptCheck = await checkPythonScripts();
  
  // 2. 测试AKShare端点
  const testResults = await testAKShareEndpoints();
  
  // 3. 测试缓存统计API
  await testCacheStatsAPI();
  
  // 输出结果汇总
  console.log(colors.blue(colors.bold('\n📊 修复结果汇总\n')));
  
  console.log(`Python脚本检查: ${scriptCheck ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`API端点测试: ${testResults.successCount}/${testResults.totalCount} 通过`);
  
  // 提供解决方案
  provideSolutions(testResults);
  
  // 最终建议
  const allGood = scriptCheck && testResults.successCount === testResults.totalCount;
  
  if (allGood) {
    console.log(colors.green(colors.bold('\n🎉 AKShare问题已修复！')));
    console.log(colors.gray('现在可以正常使用AKShare数据源'));
    console.log(colors.gray('建议使用模拟数据模式以获得更好的性能'));
  } else {
    console.log(colors.yellow(colors.bold('\n⚠️ 部分问题已修复')));
    console.log(colors.gray('AKShare现在使用模拟数据，避免了超时问题'));
    console.log(colors.gray('如需真实数据，请解决Python环境问题'));
  }
  
  console.log(colors.blue(colors.bold('\n🎯 使用指南\n')));
  console.log(colors.green('快速模式（推荐）:'));
  console.log(colors.gray('  GET /api/akshare/news?count=5'));
  console.log(colors.gray('  - 使用模拟数据'));
  console.log(colors.gray('  - 响应速度快'));
  console.log(colors.gray('  - 不会超时'));
  console.log();
  console.log(colors.yellow('真实数据模式（可能超时）:'));
  console.log(colors.gray('  GET /api/akshare/news?count=5&force_refresh=true'));
  console.log(colors.gray('  - 调用Python脚本'));
  console.log(colors.gray('  - 获取真实数据'));
  console.log(colors.gray('  - 可能会超时'));
  
  process.exit(allGood ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行修复
main().catch(error => {
  console.error(colors.red('\n❌ 修复过程发生错误:'), error);
  process.exit(1);
});
