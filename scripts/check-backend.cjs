#!/usr/bin/env node

/**
 * 后端服务检查和启动脚本
 * 检查后端服务状态并提供启动建议
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

// 简单的颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

const execAsync = promisify(exec);

// 检查端口占用
async function checkPort(port) {
  try {
    // Windows系统检查端口
    const { stdout } = await execAsync(`netstat -an | findstr :${port}`, { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch (error) {
    // 如果命令失败，尝试连接测试
    try {
      await axios.get(`http://localhost:${port}`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

// 检查后端服务状态
async function checkBackendService() {
  console.log(colors.blue('🔍 检查后端服务状态...\n'));
  
  // 1. 检查端口7001是否被占用
  console.log(colors.yellow('1. 检查端口7001占用情况...'));
  const portOccupied = await checkPort(7001);
  
  if (portOccupied) {
    console.log(colors.green('✅ 端口7001已被占用'));
    
    // 2. 测试后端服务响应
    console.log(colors.yellow('\n2. 测试后端服务响应...'));
    try {
      const response = await axios.get('http://localhost:7001', { timeout: 5000 });
      console.log(colors.green('✅ 后端服务响应正常'));
      console.log(colors.gray(`   HTTP状态: ${response.status}`));
      return { running: true, responsive: true };
    } catch (error) {
      console.log(colors.red('❌ 后端服务无响应'));
      console.log(colors.gray(`   错误: ${error.message}`));
      return { running: true, responsive: false };
    }
  } else {
    console.log(colors.red('❌ 端口7001未被占用'));
    return { running: false, responsive: false };
  }
}

// 检查后端项目结构
async function checkBackendProject() {
  console.log(colors.blue('\n🔍 检查后端项目结构...\n'));
  
  const requiredFiles = [
    'server/package.json',
    'server/app.js',
    'server/config/config.default.js',
    'server/app/router.js'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(colors.green(`✅ ${file}`));
    } else {
      console.log(colors.red(`❌ ${file}`));
      missingFiles.push(file);
    }
  }
  
  return missingFiles.length === 0;
}

// 检查后端依赖
async function checkBackendDependencies() {
  console.log(colors.blue('\n🔍 检查后端依赖...\n'));
  
  const nodeModulesPath = path.join(__dirname, '../server/node_modules');
  
  if (fs.existsSync(nodeModulesPath)) {
    console.log(colors.green('✅ node_modules 目录存在'));
    
    // 检查关键依赖
    const keyDependencies = ['egg', 'egg-sequelize', 'mysql2', 'egg-jwt'];
    let missingDeps = [];
    
    for (const dep of keyDependencies) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(colors.green(`✅ ${dep}`));
      } else {
        console.log(colors.red(`❌ ${dep}`));
        missingDeps.push(dep);
      }
    }
    
    return missingDeps.length === 0;
  } else {
    console.log(colors.red('❌ node_modules 目录不存在'));
    return false;
  }
}

// 检查数据库配置
async function checkDatabaseConfig() {
  console.log(colors.blue('\n🔍 检查数据库配置...\n'));
  
  const envPath = path.join(__dirname, '../server/.env');
  const configPath = path.join(__dirname, '../server/config/config.default.js');
  
  // 检查环境配置文件
  if (fs.existsSync(envPath)) {
    console.log(colors.green('✅ server/.env 文件存在'));
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
    
    for (const varName of dbVars) {
      if (envContent.includes(varName)) {
        console.log(colors.green(`✅ ${varName} 已配置`));
      } else {
        console.log(colors.yellow(`⚠️ ${varName} 未配置`));
      }
    }
  } else {
    console.log(colors.red('❌ server/.env 文件不存在'));
  }
  
  // 检查配置文件
  if (fs.existsSync(configPath)) {
    console.log(colors.green('✅ config.default.js 文件存在'));
  } else {
    console.log(colors.red('❌ config.default.js 文件不存在'));
  }
}

// 尝试启动后端服务
async function tryStartBackend() {
  console.log(colors.blue('\n🚀 尝试启动后端服务...\n'));
  
  try {
    console.log(colors.yellow('正在启动后端服务...'));
    console.log(colors.gray('命令: cd server && npm run dev'));
    
    // 注意：这里不能直接启动服务，因为会阻塞脚本
    // 只提供启动指令
    console.log(colors.yellow('\n请在新的终端窗口中运行以下命令:'));
    console.log(colors.blue('cd server'));
    console.log(colors.blue('npm run dev'));
    
    return false; // 表示需要手动启动
  } catch (error) {
    console.log(colors.red(`❌ 启动失败: ${error.message}`));
    return false;
  }
}

// 提供解决方案
function provideSolutions(checks) {
  console.log(colors.blue(colors.bold('\n💡 解决方案建议\n')));
  
  if (!checks.projectStructure) {
    console.log(colors.yellow('项目结构问题:'));
    console.log(colors.gray('  - 确保在正确的项目目录中'));
    console.log(colors.gray('  - 检查server目录是否完整'));
    console.log();
  }
  
  if (!checks.dependencies) {
    console.log(colors.yellow('依赖问题:'));
    console.log(colors.gray('  1. cd server'));
    console.log(colors.gray('  2. npm install'));
    console.log();
  }
  
  if (!checks.service.running) {
    console.log(colors.yellow('服务未启动:'));
    console.log(colors.gray('  1. cd server'));
    console.log(colors.gray('  2. npm run dev'));
    console.log(colors.gray('  3. 等待服务启动完成'));
    console.log();
  } else if (!checks.service.responsive) {
    console.log(colors.yellow('服务无响应:'));
    console.log(colors.gray('  1. 检查服务启动日志'));
    console.log(colors.gray('  2. 检查数据库连接'));
    console.log(colors.gray('  3. 重启服务'));
    console.log();
  }
  
  console.log(colors.blue('完整启动流程:'));
  console.log(colors.gray('1. 确保MySQL服务运行'));
  console.log(colors.gray('2. cd server'));
  console.log(colors.gray('3. npm install (如果需要)'));
  console.log(colors.gray('4. 配置 .env 文件'));
  console.log(colors.gray('5. npm run dev'));
  console.log(colors.gray('6. 等待看到 "server started on http://127.0.0.1:7001"'));
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 后端服务检查工具\n')));
  
  const checks = {
    projectStructure: false,
    dependencies: false,
    service: { running: false, responsive: false }
  };
  
  // 执行检查
  checks.projectStructure = await checkBackendProject();
  
  if (checks.projectStructure) {
    checks.dependencies = await checkBackendDependencies();
  }
  
  checks.service = await checkBackendService();
  
  await checkDatabaseConfig();
  
  // 输出检查结果
  console.log(colors.blue(colors.bold('\n📊 检查结果汇总\n')));
  
  console.log(`项目结构: ${checks.projectStructure ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`依赖安装: ${checks.dependencies ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`服务运行: ${checks.service.running ? colors.green('✅ 运行中') : colors.red('❌ 未运行')}`);
  console.log(`服务响应: ${checks.service.responsive ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  
  // 提供解决方案
  provideSolutions(checks);
  
  // 如果服务正常，提供测试建议
  if (checks.service.running && checks.service.responsive) {
    console.log(colors.green(colors.bold('\n🎉 后端服务运行正常！')));
    console.log(colors.gray('现在可以测试前端连接:'));
    console.log(colors.gray('1. 刷新前端页面'));
    console.log(colors.gray('2. 检查API调用是否正常'));
    console.log(colors.gray('3. 运行登录诊断: npm run diagnose-login'));
  } else {
    console.log(colors.red(colors.bold('\n⚠️ 后端服务需要修复')));
    console.log(colors.yellow('请按照上述建议启动后端服务'));
  }
  
  const allGood = checks.projectStructure && checks.dependencies && checks.service.running && checks.service.responsive;
  process.exit(allGood ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行检查
main().catch(error => {
  console.error(colors.red('\n❌ 检查过程发生错误:'), error);
  process.exit(1);
});
