#!/usr/bin/env node

/**
 * 登录问题诊断脚本
 * 全面检查登录功能的各个环节
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

// 测试用户账号
const testUsers = [
  {
    username: 'admin',
    password: 'admin123',
    description: '管理员账号'
  },
  {
    username: 'testuser',
    password: 'password123',
    description: '测试用户账号'
  },
  {
    username: 'demo@example.com',
    password: 'demo123',
    description: '演示邮箱账号'
  }
];

// 检查前端服务状态
async function checkFrontendService() {
  console.log(colors.blue('\n1. 检查前端服务状态...'));
  
  try {
    const response = await axios.get('http://localhost:5173', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(colors.green('✅ 前端服务正常运行 (http://localhost:5173)'));
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(colors.red('❌ 前端服务未启动'));
      console.log(colors.yellow('   解决方案: 运行 npm run dev 启动前端服务'));
    } else {
      console.log(colors.red(`❌ 前端服务异常: ${error.message}`));
    }
    return false;
  }
}

// 检查后端服务状态
async function checkBackendService() {
  console.log(colors.blue('\n2. 检查后端服务状态...'));
  
  try {
    const response = await axios.get('http://localhost:7001', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(colors.green('✅ 后端服务正常运行 (http://localhost:7001)'));
      return true;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(colors.red('❌ 后端服务未启动'));
      console.log(colors.yellow('   解决方案: 进入server目录运行 npm run dev'));
    } else {
      console.log(colors.red(`❌ 后端服务异常: ${error.message}`));
    }
    return false;
  }
}

// 检查数据库连接
async function checkDatabaseConnection() {
  console.log(colors.blue('\n3. 检查数据库连接...'));
  
  try {
    const response = await axios.get('http://localhost:7001/api/health/database', {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ 数据库连接正常'));
      console.log(colors.gray(`   数据库: ${response.data.database || 'stock_analysis'}`));
      return true;
    } else {
      console.log(colors.red('❌ 数据库连接失败'));
      console.log(colors.gray(`   错误: ${response.data.error}`));
      return false;
    }
  } catch (error) {
    console.log(colors.red(`❌ 数据库检查失败: ${error.message}`));
    console.log(colors.yellow('   可能原因:'));
    console.log(colors.gray('   - MySQL服务未启动'));
    console.log(colors.gray('   - 数据库配置错误'));
    console.log(colors.gray('   - 数据库不存在'));
    return false;
  }
}

// 检查用户表结构
async function checkUserTable() {
  console.log(colors.blue('\n4. 检查用户表结构...'));
  
  try {
    const response = await axios.get('http://localhost:7001/api/health/user-table', {
      timeout: 5000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ 用户表结构正常'));
      console.log(colors.gray(`   用户数量: ${response.data.userCount || 0}`));
      return true;
    } else {
      console.log(colors.red('❌ 用户表检查失败'));
      console.log(colors.gray(`   错误: ${response.data.error}`));
      return false;
    }
  } catch (error) {
    console.log(colors.red(`❌ 用户表检查异常: ${error.message}`));
    return false;
  }
}

// 测试登录API
async function testLoginAPI() {
  console.log(colors.blue('\n5. 测试登录API...'));
  
  let successCount = 0;
  
  for (const testUser of testUsers) {
    try {
      console.log(colors.yellow(`   测试 ${testUser.description}...`));
      console.log(colors.gray(`   用户名: ${testUser.username}`));
      console.log(colors.gray(`   密码: ${testUser.password}`));
      
      const response = await axios.post('http://localhost:7001/api/auth/login', {
        username: testUser.username,
        password: testUser.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.token) {
        console.log(colors.green(`   ✅ ${testUser.description} 登录成功`));
        console.log(colors.gray(`   Token: ${response.data.token.substring(0, 20)}...`));
        console.log(colors.gray(`   用户ID: ${response.data.user.id}`));
        console.log(colors.gray(`   用户角色: ${response.data.user.role}`));
        successCount++;
      } else {
        console.log(colors.red(`   ❌ ${testUser.description} 登录失败: 响应格式异常`));
      }
      
    } catch (error) {
      if (error.response) {
        console.log(colors.red(`   ❌ ${testUser.description} 登录失败: ${error.response.data.message || error.message}`));
        console.log(colors.gray(`   HTTP状态: ${error.response.status}`));
      } else {
        console.log(colors.red(`   ❌ ${testUser.description} 登录失败: ${error.message}`));
      }
    }
    
    console.log();
  }
  
  return successCount;
}

// 检查JWT配置
async function checkJWTConfig() {
  console.log(colors.blue('\n6. 检查JWT配置...'));
  
  try {
    const response = await axios.get('http://localhost:7001/api/health/jwt', {
      timeout: 5000
    });
    
    if (response.data.success) {
      console.log(colors.green('✅ JWT配置正常'));
      console.log(colors.gray(`   算法: ${response.data.algorithm || 'HS256'}`));
      console.log(colors.gray(`   过期时间: ${response.data.expiresIn || '24h'}`));
      return true;
    } else {
      console.log(colors.red('❌ JWT配置异常'));
      console.log(colors.gray(`   错误: ${response.data.error}`));
      return false;
    }
  } catch (error) {
    console.log(colors.red(`❌ JWT配置检查失败: ${error.message}`));
    return false;
  }
}

// 检查前端登录页面
async function checkLoginPage() {
  console.log(colors.blue('\n7. 检查前端登录页面...'));
  
  try {
    const response = await axios.get('http://localhost:5173/login', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(colors.green('✅ 登录页面可访问'));
      
      // 检查页面内容
      const content = response.data;
      if (content.includes('登录') || content.includes('login')) {
        console.log(colors.green('✅ 登录页面内容正常'));
        return true;
      } else {
        console.log(colors.yellow('⚠️ 登录页面内容可能异常'));
        return false;
      }
    }
  } catch (error) {
    console.log(colors.red(`❌ 登录页面检查失败: ${error.message}`));
    return false;
  }
}

// 创建测试用户
async function createTestUser() {
  console.log(colors.blue('\n8. 创建测试用户...'));
  
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  };
  
  try {
    const response = await axios.post('http://localhost:7001/api/auth/register', testUser, {
      timeout: 10000
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(colors.green('✅ 测试用户创建成功'));
      console.log(colors.gray(`   用户名: ${testUser.username}`));
      console.log(colors.gray(`   邮箱: ${testUser.email}`));
      console.log(colors.gray(`   密码: ${testUser.password}`));
      return true;
    }
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log(colors.yellow('⚠️ 测试用户已存在'));
      return true;
    } else {
      console.log(colors.red(`❌ 测试用户创建失败: ${error.response?.data?.message || error.message}`));
      return false;
    }
  }
}

// 检查环境配置
async function checkEnvironmentConfig() {
  console.log(colors.blue('\n9. 检查环境配置...'));
  
  // 检查server/.env文件
  const serverEnvPath = path.join(__dirname, '../server/.env');
  if (fs.existsSync(serverEnvPath)) {
    console.log(colors.green('✅ server/.env 文件存在'));
    
    const envContent = fs.readFileSync(serverEnvPath, 'utf8');
    const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'JWT_SECRET'];
    
    let missingVars = [];
    for (const varName of requiredVars) {
      if (!envContent.includes(varName)) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length === 0) {
      console.log(colors.green('✅ 必要的环境变量已配置'));
    } else {
      console.log(colors.yellow(`⚠️ 缺少环境变量: ${missingVars.join(', ')}`));
    }
  } else {
    console.log(colors.red('❌ server/.env 文件不存在'));
    console.log(colors.yellow('   解决方案: 复制 server/.env.example 为 server/.env 并配置'));
  }
  
  // 检查前端环境
  const frontendEnvPath = path.join(__dirname, '../.env');
  if (fs.existsSync(frontendEnvPath)) {
    console.log(colors.green('✅ 前端 .env 文件存在'));
  } else {
    console.log(colors.yellow('⚠️ 前端 .env 文件不存在（可选）'));
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔍 登录问题诊断工具\n')));
  console.log(colors.gray('正在全面检查登录功能的各个环节...\n'));
  
  const results = {
    frontend: false,
    backend: false,
    database: false,
    userTable: false,
    loginAPI: 0,
    jwt: false,
    loginPage: false,
    testUser: false
  };
  
  // 执行所有检查
  results.frontend = await checkFrontendService();
  results.backend = await checkBackendService();
  
  if (results.backend) {
    results.database = await checkDatabaseConnection();
    results.userTable = await checkUserTable();
    results.jwt = await checkJWTConfig();
    
    // 如果数据库正常，尝试创建测试用户
    if (results.database) {
      results.testUser = await createTestUser();
    }
    
    // 测试登录API
    results.loginAPI = await testLoginAPI();
  }
  
  if (results.frontend) {
    results.loginPage = await checkLoginPage();
  }
  
  await checkEnvironmentConfig();
  
  // 输出诊断结果
  console.log(colors.blue(colors.bold('\n📊 诊断结果汇总\n')));
  
  console.log(colors.blue('服务状态:'));
  console.log(`  前端服务: ${results.frontend ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`  后端服务: ${results.backend ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`  数据库连接: ${results.database ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  
  console.log(colors.blue('\n功能状态:'));
  console.log(`  用户表结构: ${results.userTable ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`  JWT配置: ${results.jwt ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`  登录页面: ${results.loginPage ? colors.green('✅ 正常') : colors.red('❌ 异常')}`);
  console.log(`  登录API: ${results.loginAPI > 0 ? colors.green(`✅ ${results.loginAPI}/${testUsers.length} 成功`) : colors.red('❌ 全部失败')}`);
  
  // 提供解决方案
  console.log(colors.blue(colors.bold('\n💡 解决方案建议\n')));
  
  if (!results.frontend) {
    console.log(colors.yellow('前端服务问题:'));
    console.log(colors.gray('  1. 运行: npm install'));
    console.log(colors.gray('  2. 运行: npm run dev'));
    console.log(colors.gray('  3. 确保端口5173未被占用'));
  }
  
  if (!results.backend) {
    console.log(colors.yellow('后端服务问题:'));
    console.log(colors.gray('  1. 进入server目录: cd server'));
    console.log(colors.gray('  2. 运行: npm install'));
    console.log(colors.gray('  3. 运行: npm run dev'));
    console.log(colors.gray('  4. 确保端口7001未被占用'));
  }
  
  if (!results.database) {
    console.log(colors.yellow('数据库问题:'));
    console.log(colors.gray('  1. 启动MySQL服务'));
    console.log(colors.gray('  2. 检查数据库配置 (server/.env)'));
    console.log(colors.gray('  3. 创建数据库: CREATE DATABASE stock_analysis;'));
    console.log(colors.gray('  4. 运行数据库迁移'));
  }
  
  if (results.loginAPI === 0) {
    console.log(colors.yellow('登录API问题:'));
    console.log(colors.gray('  1. 检查用户表是否有数据'));
    console.log(colors.gray('  2. 验证密码哈希算法'));
    console.log(colors.gray('  3. 检查JWT密钥配置'));
    console.log(colors.gray('  4. 查看后端错误日志'));
  }
  
  // 提供测试账号
  if (results.loginAPI > 0) {
    console.log(colors.blue(colors.bold('\n🎯 可用的测试账号\n')));
    testUsers.forEach(user => {
      console.log(colors.green(`${user.description}:`));
      console.log(colors.gray(`  用户名: ${user.username}`));
      console.log(colors.gray(`  密码: ${user.password}`));
    });
  }
  
  const overallSuccess = results.frontend && results.backend && results.database && results.loginAPI > 0;
  
  if (overallSuccess) {
    console.log(colors.green(colors.bold('\n🎉 登录功能诊断完成，系统运行正常！')));
  } else {
    console.log(colors.red(colors.bold('\n⚠️ 发现问题，请根据上述建议进行修复')));
  }
  
  process.exit(overallSuccess ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行诊断
main().catch(error => {
  console.error(colors.red('\n❌ 诊断过程发生错误:'), error);
  process.exit(1);
});
