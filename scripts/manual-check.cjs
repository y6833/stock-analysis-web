#!/usr/bin/env node

/**
 * 手动检查API配置
 * 不依赖任何外部库的简单检查脚本
 */

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

console.log(colors.blue(colors.bold('\n🔍 API配置手动检查\n')));

// 检查server/.env文件
const envPath = path.join(__dirname, '../server/.env');
const envExamplePath = path.join(__dirname, '../server/.env.example');

console.log(colors.blue('📁 检查配置文件:'));

if (fs.existsSync(envPath)) {
  console.log(colors.green('✅ server/.env 文件存在'));

  // 读取并显示内容（隐藏敏感信息）
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    console.log(colors.blue('\n📋 配置内容:'));

    const apiKeyLines = lines.filter(line =>
      line.includes('API_KEY') ||
      line.includes('JUHE_') ||
      line.includes('ZHITU_') ||
      line.includes('ALPHA_')
    );

    if (apiKeyLines.length > 0) {
      apiKeyLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          const maskedValue = value.length > 8 ?
            `${value.substring(0, 4)}...${value.substring(value.length - 4)}` :
            '***';
          console.log(colors.green(`✅ ${key.trim()} = ${maskedValue} (长度: ${value.length})`));
        }
      });
    } else {
      console.log(colors.yellow('⚠️  未找到API Key配置'));
    }

  } catch (error) {
    console.log(colors.red(`❌ 读取配置文件失败: ${error.message}`));
  }

} else {
  console.log(colors.red('❌ server/.env 文件不存在'));

  if (fs.existsSync(envExamplePath)) {
    console.log(colors.yellow('💡 建议: 复制示例文件'));
    console.log(colors.gray('   cp server/.env.example server/.env'));
  }
}

console.log(colors.blue(colors.bold('\n🔑 需要配置的API Key:\n')));

const apis = [
  {
    name: '聚合数据',
    key: 'JUHE_API_KEY',
    website: 'https://www.juhe.cn/',
    description: '免费额度: 每天100次调用'
  },
  {
    name: '智兔数服',
    key: 'ZHITU_API_KEY',
    website: 'https://www.zhitudata.com/',
    description: '专业数据服务，需要付费'
  },
  {
    name: 'Alpha Vantage',
    key: 'ALPHA_VANTAGE_API_KEY',
    website: 'https://www.alphavantage.co/',
    description: '免费额度: 每分钟5次，每天500次'
  },
  {
    name: 'Tushare',
    key: 'TUSHARE_TOKEN',
    website: 'https://tushare.pro/',
    description: '专业金融数据平台，免费用户有调用限制'
  }
];

apis.forEach((api, index) => {
  console.log(colors.blue(`${index + 1}. ${api.name}`));
  console.log(colors.gray(`   环境变量: ${api.key}`));
  console.log(colors.gray(`   网站: ${api.website}`));
  console.log(colors.gray(`   说明: ${api.description}`));
  console.log();
});

console.log(colors.blue(colors.bold('📝 配置步骤:\n')));
console.log(colors.yellow('1. 访问API提供商网站注册账号'));
console.log(colors.yellow('2. 申请API Key'));
console.log(colors.yellow('3. 编辑 server/.env 文件'));
console.log(colors.yellow('4. 添加配置: API_KEY_NAME=your_actual_key'));
console.log(colors.yellow('5. 重启服务: npm run dev'));
console.log(colors.yellow('6. 测试连接: npm run check-datasources'));

console.log(colors.blue(colors.bold('\n🎯 推荐配置优先级:\n')));
console.log(colors.green('1. 聚合数据 - 免费额度高，适合开发测试'));
console.log(colors.green('2. Alpha Vantage - 国际化，数据质量好'));
console.log(colors.gray('3. 智兔数服 - 专业服务，适合生产环境'));

console.log(colors.blue(colors.bold('\n💡 当前可用数据源:\n')));
console.log(colors.green('✅ 腾讯财经增强版 - 无需配置，推荐主用'));
console.log(colors.green('✅ 新浪财经 - 需要后端服务'));
console.log(colors.green('✅ 东方财富 - 需要后端服务'));
console.log(colors.green('✅ Alpha Vantage - demo key可用'));

console.log(colors.gray('\n💭 提示: 即使不配置额外API，现有的4个数据源已经足够使用！'));

console.log(colors.blue(colors.bold('\n🔧 如果配置后仍有问题:\n')));
console.log(colors.yellow('1. 检查API Key格式是否正确'));
console.log(colors.yellow('2. 确认API Key有效期和额度'));
console.log(colors.yellow('3. 查看API提供商的文档'));
console.log(colors.yellow('4. 检查网络连接和防火墙'));

console.log();
