#!/usr/bin/env node

/**
 * Tushare API专项测试
 * 测试Tushare数据源的连接和功能
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

// 测试Tushare API直接连接
async function testTushareDirectAPI(token) {
  console.log(colors.blue('\n[直接API测试] 测试Tushare官方API...'));
  
  try {
    const response = await axios.post('https://api.tushare.pro', {
      api_name: 'stock_basic',
      token: token,
      params: {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HappyStockMarket/1.0'
      },
      timeout: 15000
    });
    
    console.log(colors.gray(`HTTP状态: ${response.status}`));
    
    if (response.status === 200) {
      const data = response.data;
      
      if (data.code === 0) {
        const recordCount = data.data ? data.data.items.length : 0;
        console.log(colors.green(`[OK] Tushare API调用成功`));
        console.log(colors.gray(`返回记录数: ${recordCount}`));
        console.log(colors.gray(`字段: ${data.data.fields.join(', ')}`));
        return { success: true, recordCount };
      } else {
        console.log(colors.red(`[ERROR] Tushare API错误: ${data.msg}`));
        return { success: false, error: data.msg };
      }
    } else {
      console.log(colors.red(`[ERROR] HTTP错误: ${response.status}`));
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(colors.red(`[ERROR] 请求失败: ${error.message}`));
    if (error.response) {
      console.log(colors.gray(`HTTP状态: ${error.response.status}`));
      if (error.response.data) {
        console.log(colors.gray(`错误响应: ${JSON.stringify(error.response.data)}`));
      }
    }
    return { success: false, error: error.message };
  }
}

// 测试后端代理API
async function testTushareBackendAPI() {
  console.log(colors.blue('\n[后端代理测试] 测试后端Tushare代理...'));
  
  const testEndpoints = [
    {
      name: '连接测试',
      url: 'http://localhost:7001/api/tushare/test',
      method: 'GET'
    },
    {
      name: '股票基本信息',
      url: 'http://localhost:7001/api/tushare/stock-basic',
      method: 'GET'
    }
  ];
  
  let successCount = 0;
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(colors.yellow(`  测试: ${endpoint.name}...`));
      console.log(colors.gray(`  URL: ${endpoint.url}`));
      
      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        timeout: 15000,
        headers: {
          'User-Agent': 'HappyStockMarket/1.0'
        }
      });
      
      console.log(colors.gray(`  HTTP状态: ${response.status}`));
      
      if (response.status === 200) {
        const data = response.data;
        
        if (data.success === true) {
          console.log(colors.green(`  [OK] ${endpoint.name}: ${data.message}`));
          if (data.data_source) {
            console.log(colors.gray(`  数据源: ${data.data_source}`));
          }
          successCount++;
        } else if (data.success === false) {
          console.log(colors.red(`  [ERROR] ${endpoint.name}: ${data.message}`));
          if (data.error) {
            console.log(colors.gray(`  错误详情: ${data.error}`));
          }
        } else {
          console.log(colors.yellow(`  [UNKNOWN] ${endpoint.name}: 未知响应格式`));
          console.log(colors.gray(`  响应: ${JSON.stringify(data, null, 2).substring(0, 200)}...`));
        }
      } else {
        console.log(colors.red(`  [ERROR] HTTP错误: ${response.status}`));
      }
      
    } catch (error) {
      console.log(colors.red(`  [ERROR] ${endpoint.name}: ${error.message}`));
      if (error.code === 'ECONNREFUSED') {
        console.log(colors.gray(`  提示: 后端服务可能未启动`));
      }
    }
    
    console.log();
  }
  
  return { successCount, totalCount: testEndpoints.length };
}

// 测试Tushare代理API调用
async function testTushareProxyAPI(token) {
  console.log(colors.blue('\n[代理API测试] 测试Tushare代理接口...'));
  
  try {
    const response = await axios.post('http://localhost:7001/api/tushare', {
      api_name: 'stock_basic',
      token: token,
      params: {
        exchange: '',
        list_status: 'L',
        fields: 'ts_code,name,industry,market,list_date'
      },
      data_source: 'tushare'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HappyStockMarket/1.0'
      },
      timeout: 20000
    });
    
    console.log(colors.gray(`HTTP状态: ${response.status}`));
    
    if (response.status === 200) {
      const data = response.data;
      
      if (data.code === 0) {
        const recordCount = data.data ? data.data.items.length : 0;
        console.log(colors.green(`[OK] Tushare代理API调用成功`));
        console.log(colors.gray(`返回记录数: ${recordCount}`));
        console.log(colors.gray(`数据源: ${data.data_source || 'Tushare'}`));
        console.log(colors.gray(`是否实时: ${data.is_real_time ? '是' : '否'}`));
        return { success: true, recordCount };
      } else {
        console.log(colors.red(`[ERROR] 代理API错误: ${data.msg}`));
        return { success: false, error: data.msg };
      }
    } else {
      console.log(colors.red(`[ERROR] HTTP错误: ${response.status}`));
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(colors.red(`[ERROR] 代理请求失败: ${error.message}`));
    if (error.code === 'ECONNREFUSED') {
      console.log(colors.gray(`提示: 后端服务可能未启动`));
    }
    return { success: false, error: error.message };
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\nTushare API专项测试\n')));
  console.log(colors.gray('官方文档: https://tushare.pro/document/2\n'));
  
  // 加载环境变量
  const envVars = loadEnvFile();
  
  // 获取Tushare Token
  let tushareToken = envVars.TUSHARE_TOKEN || '983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61';
  
  console.log(colors.blue(`[配置] 使用Token: ${tushareToken.substring(0, 8)}...${tushareToken.substring(tushareToken.length - 4)}`));
  console.log(colors.gray('注意: 这是项目中配置的默认Token，建议配置您自己的Token\n'));
  
  let totalTests = 0;
  let passedTests = 0;
  
  // 1. 测试直接API连接
  totalTests++;
  const directTest = await testTushareDirectAPI(tushareToken);
  if (directTest.success) {
    passedTests++;
  }
  
  // 2. 测试后端代理
  totalTests++;
  const backendTest = await testTushareBackendAPI();
  if (backendTest.successCount > 0) {
    passedTests++;
  }
  
  // 3. 测试代理API调用
  totalTests++;
  const proxyTest = await testTushareProxyAPI(tushareToken);
  if (proxyTest.success) {
    passedTests++;
  }
  
  // 输出结果
  console.log(colors.blue(colors.bold('\n测试结果汇总\n')));
  console.log(colors.gray(`总测试数: ${totalTests}`));
  console.log(colors.green(`成功: ${passedTests}`));
  console.log(colors.red(`失败: ${totalTests - passedTests}`));
  console.log(colors.blue(`成功率: ${Math.round((passedTests / totalTests) * 100)}%`));
  
  if (passedTests === totalTests) {
    console.log(colors.green('\n[SUCCESS] 所有Tushare测试通过！'));
    console.log(colors.gray('Tushare数据源完全可用'));
  } else if (passedTests > 0) {
    console.log(colors.yellow('\n[PARTIAL] 部分Tushare测试通过'));
    console.log(colors.gray('Tushare数据源部分可用，请检查失败的测试'));
  } else {
    console.log(colors.red('\n[FAILED] 所有Tushare测试失败'));
    console.log(colors.yellow('可能的原因:'));
    console.log(colors.gray('1. Tushare Token无效或过期'));
    console.log(colors.gray('2. 网络连接问题'));
    console.log(colors.gray('3. 后端服务未启动'));
    console.log(colors.gray('4. API调用频率限制'));
  }
  
  console.log(colors.blue(colors.bold('\nTushare配置信息\n')));
  console.log(colors.gray('官方网站: https://tushare.pro/'));
  console.log(colors.gray('API文档: https://tushare.pro/document/2'));
  console.log(colors.gray('获取Token: https://tushare.pro/register'));
  console.log(colors.gray('配置位置: server/.env 中的 TUSHARE_TOKEN'));
  
  console.log(colors.blue(colors.bold('\n使用建议\n')));
  if (passedTests > 0) {
    console.log(colors.green('Tushare是专业的金融数据平台，提供高质量的A股数据'));
    console.log(colors.gray('- 适合专业分析和量化交易'));
    console.log(colors.gray('- 数据准确性高，更新及时'));
    console.log(colors.gray('- 支持历史数据和实时行情'));
  } else {
    console.log(colors.yellow('建议配置有效的Tushare Token以获得更好的数据服务'));
    console.log(colors.gray('- 免费用户有一定的调用限制'));
    console.log(colors.gray('- 付费用户可获得更高的调用频率'));
  }
  
  process.exit(passedTests > 0 ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n[ERROR] 未处理的错误:'), error);
  process.exit(1);
});

// 运行测试
main().catch(error => {
  console.error(colors.red('\n[ERROR] 测试过程发生错误:'), error);
  process.exit(1);
});
