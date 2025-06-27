#!/usr/bin/env node

/**
 * 系统错误修复脚本
 * 修复常见的系统运行时错误
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

// 检查后端服务状态
async function checkBackendHealth() {
  console.log(colors.blue('🔍 检查后端服务健康状态...\n'));
  
  try {
    const response = await axios.get('http://localhost:7001/api/health/system', {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ 后端服务健康检查通过'));
      
      const checks = response.data.checks;
      Object.entries(checks).forEach(([key, value]) => {
        const status = value ? colors.green('✅') : colors.red('❌');
        console.log(`  ${status} ${key}: ${value ? '正常' : '异常'}`);
      });
      
      return { healthy: true, checks };
    } else {
      console.log(colors.red('❌ 后端服务健康检查失败'));
      return { healthy: false, errors: response.data.errors };
    }
  } catch (error) {
    console.log(colors.red('❌ 无法连接后端服务进行健康检查'));
    console.log(colors.gray(`错误: ${error.message}`));
    return { healthy: false, error: error.message };
  }
}

// 测试关键API端点
async function testKeyEndpoints() {
  console.log(colors.blue('\n🧪 测试关键API端点...\n'));
  
  const endpoints = [
    { name: '数据库连接', url: '/api/health/database' },
    { name: 'JWT配置', url: '/api/health/jwt' },
    { name: '用户表', url: '/api/health/user-table' },
    { name: '股票列表', url: '/api/stock/list' },
    { name: '市场概览', url: '/api/dashboard/market-overview' }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      console.log(colors.yellow(`测试: ${endpoint.name}...`));
      
      const response = await axios.get(`http://localhost:7001${endpoint.url}`, {
        timeout: 15000
      });
      
      if (response.status === 200) {
        console.log(colors.green(`✅ ${endpoint.name}: 正常`));
        successCount++;
      } else {
        console.log(colors.red(`❌ ${endpoint.name}: HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(colors.red(`❌ ${endpoint.name}: ${error.message}`));
      if (error.response && error.response.data) {
        console.log(colors.gray(`   详情: ${JSON.stringify(error.response.data).substring(0, 100)}...`));
      }
    }
  }
  
  console.log(colors.blue(`\n测试结果: ${successCount}/${endpoints.length} 通过`));
  return { successCount, totalCount: endpoints.length };
}

// 检查定时任务状态
async function checkScheduledTasks() {
  console.log(colors.blue('\n⏰ 检查定时任务状态...\n'));
  
  try {
    // 检查定时任务文件是否存在
    const schedulePath = path.join(__dirname, '../server/app/schedule');
    
    if (fs.existsSync(schedulePath)) {
      const scheduleFiles = fs.readdirSync(schedulePath);
      console.log(colors.green(`✅ 定时任务目录存在，包含 ${scheduleFiles.length} 个任务文件`));
      
      scheduleFiles.forEach(file => {
        console.log(colors.gray(`  - ${file}`));
      });
      
      // 建议禁用有问题的定时任务
      console.log(colors.yellow('\n💡 建议:'));
      console.log(colors.gray('如果定时任务导致错误，可以临时禁用:'));
      console.log(colors.gray('1. 重命名文件扩展名: .js -> .js.disabled'));
      console.log(colors.gray('2. 或在配置中禁用定时任务'));
      
      return true;
    } else {
      console.log(colors.red('❌ 定时任务目录不存在'));
      return false;
    }
  } catch (error) {
    console.log(colors.red(`❌ 检查定时任务失败: ${error.message}`));
    return false;
  }
}

// 修复常见问题
async function fixCommonIssues() {
  console.log(colors.blue('\n🔧 修复常见问题...\n'));
  
  const fixes = [];
  
  // 修复1: 创建测试用户
  try {
    console.log(colors.yellow('修复1: 创建测试用户...'));
    const response = await axios.post('http://localhost:7001/api/health/create-test-user', {}, {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ 测试用户创建/检查完成'));
      fixes.push('测试用户');
    } else {
      console.log(colors.red('❌ 测试用户创建失败'));
    }
  } catch (error) {
    console.log(colors.red('❌ 无法创建测试用户'));
  }
  
  // 修复2: 重置测试用户密码
  try {
    console.log(colors.yellow('\n修复2: 重置测试用户密码...'));
    const response = await axios.post('http://localhost:7001/api/health/reset-test-passwords', {}, {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ 测试用户密码重置完成'));
      fixes.push('密码重置');
    } else {
      console.log(colors.red('❌ 密码重置失败'));
    }
  } catch (error) {
    console.log(colors.red('❌ 无法重置密码'));
  }
  
  return fixes;
}

// 提供解决方案建议
function provideSolutions(healthCheck, endpointTest) {
  console.log(colors.blue(colors.bold('\n💡 问题解决建议\n')));
  
  if (!healthCheck.healthy) {
    console.log(colors.yellow('后端服务问题:'));
    console.log(colors.gray('1. 重启后端服务: cd server && npm run dev'));
    console.log(colors.gray('2. 检查数据库连接'));
    console.log(colors.gray('3. 检查环境配置文件'));
    console.log();
  }
  
  if (endpointTest.successCount < endpointTest.totalCount) {
    console.log(colors.yellow('API端点问题:'));
    console.log(colors.gray('1. 检查数据库是否正常运行'));
    console.log(colors.gray('2. 确认所有必需的服务方法已实现'));
    console.log(colors.gray('3. 查看后端错误日志'));
    console.log();
  }
  
  console.log(colors.yellow('定时任务错误解决:'));
  console.log(colors.gray('1. 临时禁用有问题的定时任务'));
  console.log(colors.gray('2. 检查缓存服务配置'));
  console.log(colors.gray('3. 确保所有服务方法已实现'));
  console.log();
  
  console.log(colors.yellow('Redis缓存问题解决:'));
  console.log(colors.gray('1. 启动Redis服务（如果需要）'));
  console.log(colors.gray('2. 或继续使用内存缓存（已自动降级）'));
  console.log(colors.gray('3. 检查Redis配置'));
  console.log();
  
  console.log(colors.blue('推荐操作顺序:'));
  console.log(colors.gray('1. 重启后端服务'));
  console.log(colors.gray('2. 运行登录诊断: npm run diagnose-login'));
  console.log(colors.gray('3. 测试前端功能'));
  console.log(colors.gray('4. 如有问题，查看具体错误日志'));
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 系统错误修复工具\n')));
  console.log(colors.gray('正在检查和修复系统运行时错误...\n'));
  
  // 1. 检查后端健康状态
  const healthCheck = await checkBackendHealth();
  
  // 2. 测试关键端点
  const endpointTest = await testKeyEndpoints();
  
  // 3. 检查定时任务
  const scheduleCheck = await checkScheduledTasks();
  
  // 4. 修复常见问题
  const fixes = await fixCommonIssues();
  
  // 输出修复结果
  console.log(colors.blue(colors.bold('\n📊 修复结果汇总\n')));
  
  console.log(`后端健康状态: ${healthCheck.healthy ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`API端点测试: ${endpointTest.successCount}/${endpointTest.totalCount} 通过`);
  console.log(`定时任务检查: ${scheduleCheck ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`问题修复: ${fixes.length} 项完成`);
  
  if (fixes.length > 0) {
    console.log(colors.green('\n已修复的问题:'));
    fixes.forEach(fix => {
      console.log(colors.gray(`  - ${fix}`));
    });
  }
  
  // 提供解决方案
  provideSolutions(healthCheck, endpointTest);
  
  // 最终建议
  const allGood = healthCheck.healthy && endpointTest.successCount === endpointTest.totalCount;
  
  if (allGood) {
    console.log(colors.green(colors.bold('\n🎉 系统运行正常！')));
    console.log(colors.gray('所有检查都通过，系统应该可以正常使用'));
  } else {
    console.log(colors.yellow(colors.bold('\n⚠️ 系统仍有一些问题')));
    console.log(colors.gray('请按照上述建议进行修复'));
    console.log(colors.gray('修复后重新运行此脚本进行验证'));
  }
  
  console.log(colors.blue(colors.bold('\n🎯 下一步操作\n')));
  console.log(colors.gray('1. 重启后端服务（如果需要）'));
  console.log(colors.gray('2. 刷新前端页面'));
  console.log(colors.gray('3. 测试登录功能'));
  console.log(colors.gray('4. 检查股票数据加载'));
  
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
