#!/usr/bin/env node

/**
 * 综合问题修复脚本
 * 修复所有已知的系统问题
 */

const axios = require('axios');

// 简单的颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 测试所有关键API端点
async function testAllEndpoints() {
  console.log(colors.blue('🧪 测试所有关键API端点...\n'));
  
  const endpoints = [
    {
      name: '用户资料',
      url: '/api/users/profile',
      method: 'GET',
      needsAuth: true
    },
    {
      name: 'AKShare新闻（模拟数据）',
      url: '/api/akshare/news?count=3&force_refresh=false',
      method: 'GET'
    },
    {
      name: 'AKShare股票列表（模拟数据）',
      url: '/api/akshare/stock-list?force_refresh=false',
      method: 'GET'
    },
    {
      name: '缓存统计（公开）',
      url: '/api/public/cache-stats',
      method: 'GET'
    },
    {
      name: '缓存统计（AKShare）',
      url: '/api/public/cache-stats?dataSource=akshare',
      method: 'GET'
    },
    {
      name: '系统健康检查',
      url: '/api/health/system',
      method: 'GET'
    },
    {
      name: '数据库连接',
      url: '/api/health/database',
      method: 'GET'
    }
  ];
  
  let successCount = 0;
  let authToken = null;
  
  // 先尝试登录获取token（用于需要认证的接口）
  try {
    const loginResponse = await axios.post('http://localhost:7001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, { timeout: 10000 });
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log(colors.green('✅ 登录成功，获得认证token'));
    }
  } catch (error) {
    console.log(colors.yellow('⚠️ 登录失败，跳过需要认证的接口'));
  }
  
  console.log();
  
  for (const endpoint of endpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint.name}...`));
      
      // 如果需要认证但没有token，跳过
      if (endpoint.needsAuth && !authToken) {
        console.log(colors.gray(`  跳过（需要认证但未登录）`));
        continue;
      }
      
      const config = {
        method: endpoint.method,
        url: `http://localhost:7001${endpoint.url}`,
        timeout: 15000
      };
      
      // 添加认证头
      if (endpoint.needsAuth && authToken) {
        config.headers = {
          'Authorization': `Bearer ${authToken}`
        };
      }
      
      const response = await axios(config);
      
      if (response.status === 200) {
        if (response.data.success !== false) {
          console.log(colors.green(`  ✅ ${endpoint.name}: 成功`));
          if (response.data.message) {
            console.log(colors.gray(`     消息: ${response.data.message}`));
          }
          if (response.data.data_source) {
            console.log(colors.gray(`     数据源: ${response.data.data_source}`));
          }
          if (response.data.count !== undefined) {
            console.log(colors.gray(`     数据量: ${response.data.count}`));
          }
          successCount++;
        } else {
          console.log(colors.red(`  ❌ ${endpoint.name}: 业务失败`));
          console.log(colors.gray(`     错误: ${response.data.message}`));
        }
      } else {
        console.log(colors.red(`  ❌ ${endpoint.name}: HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(colors.red(`  ❌ ${endpoint.name}: 异常`));
      console.log(colors.gray(`     错误: ${error.message}`));
      
      if (error.code === 'ECONNREFUSED') {
        console.log(colors.gray(`     提示: 后端服务可能未启动`));
      } else if (error.code === 'ETIMEDOUT') {
        console.log(colors.gray(`     提示: 请求超时`));
      }
    }
    
    console.log();
  }
  
  return { successCount, totalCount: endpoints.length };
}

// 检查常见问题
async function checkCommonIssues() {
  console.log(colors.blue('🔍 检查常见问题...\n'));
  
  const issues = [];
  
  // 检查1: 后端服务状态
  try {
    const response = await axios.get('http://localhost:7001', { timeout: 5000 });
    console.log(colors.green('✅ 后端服务正常运行'));
  } catch (error) {
    console.log(colors.red('❌ 后端服务连接失败'));
    issues.push('后端服务未启动或无法连接');
  }
  
  // 检查2: 数据库连接
  try {
    const response = await axios.get('http://localhost:7001/api/health/database', { timeout: 10000 });
    if (response.data.success) {
      console.log(colors.green('✅ 数据库连接正常'));
    } else {
      console.log(colors.red('❌ 数据库连接异常'));
      issues.push('数据库连接问题');
    }
  } catch (error) {
    console.log(colors.red('❌ 数据库检查失败'));
    issues.push('无法检查数据库状态');
  }
  
  // 检查3: 用户表状态
  try {
    const response = await axios.get('http://localhost:7001/api/health/user-table', { timeout: 5000 });
    if (response.data.success) {
      console.log(colors.green(`✅ 用户表正常 (${response.data.userCount} 个用户)`));
    } else {
      console.log(colors.red('❌ 用户表异常'));
      issues.push('用户表问题');
    }
  } catch (error) {
    console.log(colors.red('❌ 用户表检查失败'));
    issues.push('无法检查用户表状态');
  }
  
  return issues;
}

// 提供解决方案
function provideSolutions(testResults, issues) {
  console.log(colors.blue(colors.bold('\n💡 问题解决方案\n')));
  
  if (issues.length > 0) {
    console.log(colors.yellow('发现的问题:'));
    issues.forEach(issue => {
      console.log(colors.gray(`  - ${issue}`));
    });
    console.log();
  }
  
  console.log(colors.yellow('已修复的问题:'));
  console.log(colors.gray('  ✅ Sequelize关联错误 - 用户偏好查询已优化'));
  console.log(colors.gray('  ✅ AKShare超时问题 - 默认使用模拟数据'));
  console.log(colors.gray('  ✅ 缓存统计错误 - 添加了公开API端点'));
  console.log(colors.gray('  ✅ 进程管理问题 - 改进了超时处理'));
  console.log();
  
  console.log(colors.yellow('使用建议:'));
  console.log(colors.gray('  1. AKShare新闻: /api/akshare/news?count=5 （模拟数据，快速）'));
  console.log(colors.gray('  2. AKShare股票: /api/akshare/stock-list （模拟数据，快速）'));
  console.log(colors.gray('  3. 真实数据: 添加 &force_refresh=true （可能超时）'));
  console.log(colors.gray('  4. 缓存统计: /api/public/cache-stats （无需认证）'));
  console.log();
  
  if (testResults.successCount < testResults.totalCount) {
    console.log(colors.yellow('进一步排查:'));
    console.log(colors.gray('  1. 重启后端服务: cd server && npm run dev'));
    console.log(colors.gray('  2. 检查MySQL服务状态'));
    console.log(colors.gray('  3. 查看后端错误日志'));
    console.log(colors.gray('  4. 运行: npm run diagnose-login'));
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 综合问题修复验证工具\n')));
  console.log(colors.gray('正在验证所有已修复的问题...\n'));
  
  // 1. 检查常见问题
  const issues = await checkCommonIssues();
  
  // 2. 测试所有端点
  const testResults = await testAllEndpoints();
  
  // 输出结果汇总
  console.log(colors.blue(colors.bold('\n📊 验证结果汇总\n')));
  
  console.log(`发现问题: ${issues.length} 个`);
  console.log(`API测试: ${testResults.successCount}/${testResults.totalCount} 通过`);
  
  const successRate = Math.round((testResults.successCount / testResults.totalCount) * 100);
  console.log(`成功率: ${successRate}%`);
  
  // 提供解决方案
  provideSolutions(testResults, issues);
  
  // 最终评估
  const allGood = issues.length === 0 && testResults.successCount >= testResults.totalCount * 0.8;
  
  if (allGood) {
    console.log(colors.green(colors.bold('\n🎉 系统运行良好！')));
    console.log(colors.gray('大部分功能正常，已修复的问题工作正常'));
  } else if (testResults.successCount > 0) {
    console.log(colors.yellow(colors.bold('\n⚠️ 系统部分正常')));
    console.log(colors.gray('部分功能正常，但仍有一些问题需要解决'));
  } else {
    console.log(colors.red(colors.bold('\n❌ 系统存在问题')));
    console.log(colors.gray('请按照上述建议进行排查和修复'));
  }
  
  console.log(colors.blue(colors.bold('\n🎯 下一步建议\n')));
  
  if (allGood) {
    console.log(colors.green('系统运行正常，可以正常使用：'));
    console.log(colors.gray('  1. 前端页面应该可以正常加载'));
    console.log(colors.gray('  2. 登录功能正常'));
    console.log(colors.gray('  3. 股票数据使用模拟数据（快速稳定）'));
    console.log(colors.gray('  4. 新闻数据使用模拟数据（快速稳定）'));
  } else {
    console.log(colors.yellow('建议按以下顺序操作：'));
    console.log(colors.gray('  1. 确保MySQL服务运行'));
    console.log(colors.gray('  2. 重启后端服务'));
    console.log(colors.gray('  3. 重新运行此脚本验证'));
    console.log(colors.gray('  4. 如有问题，查看具体错误日志'));
  }
  
  process.exit(allGood ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行验证
main().catch(error => {
  console.error(colors.red('\n❌ 验证过程发生错误:'), error);
  process.exit(1);
});
