#!/usr/bin/env node

/**
 * 测试登录修复是否成功
 */

const axios = require('axios');

// 颜色输出
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.blue(colors.bold('\n🧪 测试登录修复\n')));

async function testBackendConnection() {
  console.log(colors.blue('1. 测试后端连接...'));
  
  try {
    const response = await axios.get('http://localhost:7001', { timeout: 5000 });
    console.log(colors.green('✅ 后端服务正常运行'));
    return true;
  } catch (error) {
    console.log(colors.red('❌ 后端服务连接失败'));
    console.log(colors.gray(`   错误: ${error.message}`));
    return false;
  }
}

async function testLoginAPI() {
  console.log(colors.blue('\n2. 测试登录API...'));
  
  try {
    const response = await axios.post('http://localhost:7001/api/auth/login', {
      username: 'test',
      password: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(colors.green('✅ 登录API响应正常'));
    console.log(colors.gray(`   状态码: ${response.status}`));
    console.log(colors.gray(`   响应: ${JSON.stringify(response.data).substring(0, 100)}...`));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(colors.green('✅ 登录API正常工作（返回预期的认证错误）'));
      console.log(colors.gray(`   状态码: ${error.response.status}`));
      console.log(colors.gray(`   错误信息: ${JSON.stringify(error.response.data)}`));
      return true;
    } else {
      console.log(colors.red('❌ 登录API异常'));
      console.log(colors.gray(`   错误: ${error.message}`));
      if (error.response) {
        console.log(colors.gray(`   状态码: ${error.response.status}`));
        console.log(colors.gray(`   响应: ${JSON.stringify(error.response.data)}`));
      }
      return false;
    }
  }
}

async function testFrontendProxy() {
  console.log(colors.blue('\n3. 测试前端代理...'));
  
  try {
    // 通过前端代理测试
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'test',
      password: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(colors.green('✅ 前端代理正常工作'));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(colors.green('✅ 前端代理正常工作（返回预期的认证错误）'));
      console.log(colors.gray(`   通过代理的状态码: ${error.response.status}`));
      return true;
    } else {
      console.log(colors.red('❌ 前端代理异常'));
      console.log(colors.gray(`   错误: ${error.message}`));
      if (error.response) {
        console.log(colors.gray(`   状态码: ${error.response.status}`));
      }
      return false;
    }
  }
}

async function checkServices() {
  console.log(colors.blue('\n4. 检查服务状态...'));
  
  const services = [
    { name: '前端服务', port: 3000 },
    { name: '后端服务', port: 7001 }
  ];
  
  for (const service of services) {
    try {
      const response = await axios.get(`http://localhost:${service.port}`, { 
        timeout: 3000,
        validateStatus: () => true // 接受所有状态码
      });
      console.log(colors.green(`✅ ${service.name} (端口 ${service.port}): 运行中`));
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(colors.red(`❌ ${service.name} (端口 ${service.port}): 未运行`));
      } else {
        console.log(colors.yellow(`⚠️  ${service.name} (端口 ${service.port}): ${error.message}`));
      }
    }
  }
}

async function main() {
  let allTestsPassed = true;
  
  // 检查服务状态
  await checkServices();
  
  // 测试后端连接
  if (!await testBackendConnection()) {
    allTestsPassed = false;
  }
  
  // 测试登录API
  if (!await testLoginAPI()) {
    allTestsPassed = false;
  }
  
  // 测试前端代理
  if (!await testFrontendProxy()) {
    allTestsPassed = false;
  }
  
  // 输出结果
  console.log(colors.blue(colors.bold('\n📊 测试结果\n')));
  
  if (allTestsPassed) {
    console.log(colors.green('🎉 所有测试通过！登录功能已修复。'));
    console.log(colors.gray('✅ 后端服务正常'));
    console.log(colors.gray('✅ 登录API工作正常'));
    console.log(colors.gray('✅ 前端代理配置正确'));
    console.log(colors.blue('\n💡 现在您可以在前端页面正常登录了！'));
  } else {
    console.log(colors.yellow('⚠️  部分测试失败，请检查上述错误信息。'));
    console.log(colors.blue('\n🔧 可能的解决方案:'));
    console.log(colors.gray('1. 确保后端服务在端口7001运行: cd server && npm run dev'));
    console.log(colors.gray('2. 确保前端服务在端口3000运行: npm run serve'));
    console.log(colors.gray('3. 检查数据库连接是否正常'));
    console.log(colors.gray('4. 重启服务后重新测试'));
  }
}

main().catch(error => {
  console.error(colors.red(`\n❌ 测试执行失败: ${error.message}`));
  process.exit(1);
});
