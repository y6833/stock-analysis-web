#!/usr/bin/env node

/**
 * API Key配置检查脚本
 * 验证环境变量中的API Key配置
 */

const fs = require('fs');
const path = require('path');

// 手动读取.env文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '../server/.env');
  const env = {};

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  return env;
}

// 简单的颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// API Key配置
const apiKeys = [
  {
    name: '智兔数服',
    envVar: 'D564FC55-057B-4F6F-932C-C115E78BFAE4',
    required: false,
    description: '专业股票数据服务',
    website: 'https://www.zhitudata.com/',
    testFormat: (key) => key && key.length > 10
  },
  {
    name: '聚合数据',
    envVar: '4191aa94e0f3ba88c66b827fbbe56624',
    required: false,
    description: '实时股票行情数据',
    website: 'https://www.juhe.cn/',
    testFormat: (key) => key && key.length > 10
  },
  {
    name: 'Alpha Vantage',
    envVar: 'f6235795d0b5310a44d87a6a41cd9dfc-c-app',
    required: false,
    description: '国际股票市场数据',
    website: 'https://www.alphavantage.co/',
    testFormat: (key) => key && key.length > 10
  }
];

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔑 API Key配置检查\n')));

  // 加载环境变量
  const envVars = loadEnvFile();

  // 检查.env文件是否存在
  const envPath = path.join(__dirname, '../server/.env');
  const envExamplePath = path.join(__dirname, '../server/.env.example');

  if (!fs.existsSync(envPath)) {
    console.log(colors.red('❌ 未找到 server/.env 配置文件'));

    if (fs.existsSync(envExamplePath)) {
      console.log(colors.yellow('💡 建议: 复制示例配置文件'));
      console.log(colors.gray('   cp server/.env.example server/.env'));
    } else {
      console.log(colors.yellow('💡 建议: 创建 server/.env 配置文件'));
    }

    console.log();
  } else {
    console.log(colors.green('✅ 找到 server/.env 配置文件'));
    console.log();
  }

  let configuredCount = 0;
  let validCount = 0;

  // 检查每个API Key
  for (const api of apiKeys) {
    const value = envVars[api.envVar] || process.env[api.envVar];

    console.log(colors.blue(`🔍 检查 ${api.name} (${api.envVar})`));
    console.log(colors.gray(`   描述: ${api.description}`));
    console.log(colors.gray(`   网站: ${api.website}`));

    if (!value) {
      console.log(colors.yellow(`⚠️  未配置`));
      console.log(colors.gray(`   在 server/.env 中添加: ${api.envVar}=your_api_key_here`));
    } else {
      configuredCount++;

      if (api.testFormat(value)) {
        validCount++;
        console.log(colors.green(`✅ 已配置 (长度: ${value.length})`));
        console.log(colors.gray(`   值: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`));
      } else {
        console.log(colors.red(`❌ 格式可能有误 (长度: ${value.length})`));
        console.log(colors.yellow(`   请检查API Key格式是否正确`));
      }
    }

    console.log();
  }

  // 输出汇总结果
  console.log(colors.blue(colors.bold('📊 配置汇总\n')));
  console.log(colors.gray(`总计API: ${apiKeys.length} 个`));
  console.log(colors.yellow(`已配置: ${configuredCount} 个`));
  console.log(colors.green(`格式正确: ${validCount} 个`));
  console.log(colors.red(`未配置: ${apiKeys.length - configuredCount} 个\n`));

  // 提供建议
  console.log(colors.blue(colors.bold('💡 配置建议\n')));

  if (validCount === 0) {
    console.log(colors.yellow('🎯 推荐优先配置:'));
    console.log(colors.green('1. 聚合数据 - 免费额度较高，适合测试'));
    console.log(colors.green('2. Alpha Vantage - 国际化，支持多市场'));
    console.log(colors.gray('3. 智兔数服 - 专业数据，需要付费'));
  } else if (validCount < apiKeys.length) {
    console.log(colors.green('🎉 部分API已配置！'));
    console.log(colors.gray('可以继续配置其他API以获得更好的数据覆盖'));
  } else {
    console.log(colors.green('🎉 所有API都已配置！'));
    console.log(colors.gray('现在可以使用所有数据源功能'));
  }

  console.log(colors.blue(colors.bold('\n🚀 下一步操作\n')));

  if (configuredCount > 0) {
    console.log(colors.green('1. 重启后端服务: npm run dev'));
    console.log(colors.green('2. 测试数据源: npm run check-datasources'));
  } else {
    console.log(colors.yellow('1. 配置至少一个API Key'));
    console.log(colors.yellow('2. 重启后端服务: npm run dev'));
    console.log(colors.yellow('3. 测试数据源: npm run check-datasources'));
  }

  console.log(colors.blue(colors.bold('\n📝 API Key获取指南\n')));

  apiKeys.forEach((api, index) => {
    console.log(colors.blue(`${index + 1}. ${api.name}`));
    console.log(colors.gray(`   网站: ${api.website}`));
    console.log(colors.gray(`   步骤: 注册账号 → 申请API → 复制密钥 → 配置到.env`));
    console.log();
  });

  console.log(colors.gray('💡 提示: 大部分API都提供免费额度，适合开发和测试使用'));

  process.exit(configuredCount === 0 ? 1 : 0);
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
