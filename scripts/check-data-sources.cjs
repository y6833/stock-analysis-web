#!/usr/bin/env node

/**
 * 数据源状态检查脚本
 * 用于诊断和验证所有数据源的连接状态
 */

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

// 简单的颜色输出函数（替代chalk）
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 数据源配置
const dataSources = [
  {
    name: '腾讯财经增强版',
    type: 'tencent_enhanced',
    testUrl: 'https://qt.gtimg.cn/q=sz000001',
    description: '直接API调用，无需后端'
  },
  {
    name: '网易财经增强版',
    type: 'netease_enhanced',
    testUrl: 'http://quotes.money.163.com/service/chddata.html?code=0000001&start=20240101&end=20240102&fields=TCLOSE',
    description: '直接API调用，无需后端'
  },
  {
    name: 'Alpha Vantage',
    type: 'alphavantage',
    testUrl: 'http://localhost:7001/api/alphavantage/test',
    description: '需要API Key配置'
  },
  {
    name: '东方财富',
    type: 'eastmoney',
    testUrl: 'http://localhost:7001/api/eastmoney/test',
    description: '需要后端代理'
  },
  {
    name: '新浪财经',
    type: 'sina',
    testUrl: 'http://localhost:7001/api/sina/test',
    description: '需要后端代理'
  },
  {
    name: '网易财经',
    type: 'netease',
    testUrl: 'http://localhost:7001/api/netease/test',
    description: '需要后端代理'
  },
  {
    name: 'AKShare',
    type: 'akshare',
    testUrl: 'http://localhost:7001/api/akshare/test',
    description: '需要Python环境和AKShare库',
    timeout: 20000  // AKShare需要更长的超时时间
  },
  {
    name: 'Tushare',
    type: 'tushare',
    testUrl: 'http://localhost:7001/api/tushare/test',
    description: '需要Tushare API Token'
  },
  {
    name: '智兔数服',
    type: 'zhitu',
    testUrl: 'http://localhost:7001/api/zhitu/test',
    description: '需要API Key配置'
  },
  {
    name: 'Yahoo Finance',
    type: 'yahoo_finance',
    testUrl: 'http://localhost:7001/api/yahoo_finance/test',
    description: 'API已受限，建议使用替代方案'
  },
  {
    name: 'Google Finance',
    type: 'google_finance',
    testUrl: 'http://localhost:7001/api/google_finance/test',
    description: 'API已废弃'
  },
  {
    name: '聚合数据',
    type: 'juhe',
    testUrl: 'http://localhost:7001/api/juhe/test',
    description: '需要API Key配置'
  }
];

// 检查Python环境
async function checkPythonEnvironment() {
  const execAsync = promisify(exec);

  try {
    // 检查Python版本
    let pythonCmd = 'python';
    let pythonVersion = '';

    try {
      const { stdout } = await execAsync('python --version');
      pythonVersion = stdout.trim();
    } catch (error) {
      try {
        const { stdout } = await execAsync('python3 --version');
        pythonCmd = 'python3';
        pythonVersion = stdout.trim();
      } catch (error3) {
        return {
          success: false,
          error: 'Python未安装或不在PATH中',
          suggestion: '请安装Python 3.7+并添加到系统PATH'
        };
      }
    }

    // 检查AKShare库
    try {
      const { stdout } = await execAsync(`${pythonCmd} -c "import akshare as ak; print(ak.__version__)"`);
      const akshareVersion = stdout.trim();

      return {
        success: true,
        pythonVersion,
        akshareVersion,
        pythonCommand: pythonCmd
      };
    } catch (error) {
      return {
        success: false,
        pythonVersion,
        error: 'AKShare库未安装',
        suggestion: `运行: ${pythonCmd} -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: '环境检查失败',
      details: error.message
    };
  }
}

// 测试单个数据源
async function testDataSource(source) {
  const startTime = Date.now();

  try {
    const response = await axios.get(source.testUrl, {
      timeout: source.timeout || 15000,  // 使用自定义超时或默认15秒
      headers: {
        'User-Agent': 'HappyStockMarket-HealthCheck/1.0'
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      // 检查响应内容
      if (response.data && typeof response.data === 'object') {
        if (response.data.success === true) {
          return {
            success: true,
            responseTime,
            message: response.data.message || '连接成功',
            data: response.data
          };
        } else if (response.data.success === false) {
          return {
            success: false,
            responseTime,
            message: response.data.message || '连接失败',
            error: response.data.error,
            data: response.data
          };
        }
      }

      // 对于直接API调用，检查是否有数据返回
      if (response.data) {
        return {
          success: true,
          responseTime,
          message: '连接成功，有数据返回',
          dataLength: typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length
        };
      }
    }

    return {
      success: false,
      responseTime,
      message: `HTTP ${response.status}`,
      httpStatus: response.status
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      responseTime,
      message: error.message,
      error: error.code || error.name,
      details: {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      }
    };
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔍 数据源连接状态检查\n')));
  console.log(colors.gray('检查时间:', new Date().toLocaleString()));
  console.log(colors.gray('检查项目:', dataSources.length, '个数据源\n'));

  // 检查Python环境（用于AKShare）
  console.log(colors.yellow('🐍 检查Python环境...'));
  const pythonEnv = await checkPythonEnvironment();

  if (pythonEnv.success) {
    console.log(colors.green(`✅ Python环境正常`));
    console.log(colors.gray(`   Python版本: ${pythonEnv.pythonVersion}`));
    console.log(colors.gray(`   AKShare版本: ${pythonEnv.akshareVersion}`));
  } else {
    console.log(colors.red(`❌ Python环境问题: ${pythonEnv.error}`));
    if (pythonEnv.suggestion) {
      console.log(colors.yellow(`   建议: ${pythonEnv.suggestion}`));
    }
  }
  console.log();

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  // 并发测试所有数据源
  const promises = dataSources.map(async (source, index) => {
    console.log(colors.yellow(`[${index + 1}/${dataSources.length}] 测试 ${source.name}...`));

    const result = await testDataSource(source);
    result.source = source;
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(colors.green(`✅ ${source.name} - ${result.message} (${result.responseTime}ms)`));
    } else {
      failedCount++;
      console.log(colors.red(`❌ ${source.name} - ${result.message} (${result.responseTime}ms)`));
      if (result.error) {
        console.log(colors.gray(`   错误: ${result.error}`));
      }
    }

    return result;
  });

  await Promise.all(promises);

  // 输出汇总结果
  console.log(colors.blue(colors.bold('\n📊 检查结果汇总\n')));
  console.log(colors.green(`✅ 成功: ${successCount} 个`));
  console.log(colors.red(`❌ 失败: ${failedCount} 个`));
  console.log(colors.blue(`📈 成功率: ${Math.round((successCount / dataSources.length) * 100)}%\n`));

  // 详细结果
  console.log(colors.blue(colors.bold('📋 详细结果\n')));

  // 成功的数据源
  const successfulSources = results.filter(r => r.success);
  if (successfulSources.length > 0) {
    console.log(colors.green(colors.bold('✅ 可用数据源:')));
    successfulSources.forEach(result => {
      console.log(colors.green(`  • ${result.source.name} (${result.responseTime}ms)`));
      console.log(colors.gray(`    ${result.source.description}`));
    });
    console.log();
  }

  // 失败的数据源
  const failedSources = results.filter(r => !r.success);
  if (failedSources.length > 0) {
    console.log(colors.red(colors.bold('❌ 不可用数据源:')));
    failedSources.forEach(result => {
      console.log(colors.red(`  • ${result.source.name}`));
      console.log(colors.gray(`    错误: ${result.message}`));
      console.log(colors.gray(`    说明: ${result.source.description}`));

      // 提供解决建议
      if (result.source.type === 'akshare') {
        console.log(colors.yellow(`    建议: 检查Python环境和AKShare库安装`));
      } else if (result.source.type === 'zhitu' || result.source.type === 'juhe') {
        console.log(colors.yellow(`    建议: 配置API Key环境变量`));
      } else if (result.source.type === 'yahoo_finance') {
        console.log(colors.yellow(`    建议: 使用Alpha Vantage替代`));
      } else if (result.source.type === 'google_finance') {
        console.log(colors.yellow(`    建议: API已废弃，使用其他数据源`));
      } else if (result.error === 'ECONNREFUSED') {
        console.log(colors.yellow(`    建议: 检查后端服务是否启动 (npm run dev)`));
      }
    });
    console.log();
  }

  // 推荐配置
  console.log(colors.blue(colors.bold('🚀 推荐配置\n')));

  const recommendedSources = [
    'tencent_enhanced',
    'netease_enhanced',
    'alphavantage',
    'eastmoney',
    'sina'
  ];

  const availableRecommended = successfulSources.filter(r =>
    recommendedSources.includes(r.source.type)
  );

  if (availableRecommended.length > 0) {
    console.log(colors.green('推荐使用以下可用的数据源:'));
    availableRecommended.forEach((result, index) => {
      console.log(colors.green(`  ${index + 1}. ${result.source.name} (${result.responseTime}ms)`));
    });
  } else {
    console.log(colors.yellow('推荐的数据源暂不可用，请检查配置或启动后端服务'));
  }

  console.log(colors.gray('\n💡 提示:'));
  console.log(colors.gray('  - 如果后端数据源失败，请确保运行了 npm run dev'));
  console.log(colors.gray('  - 推荐优先使用增强版数据源（无需后端）'));
  console.log(colors.gray('  - 查看详细修复指南: docs/data-source-troubleshooting.md'));

  // 退出码
  process.exit(failedCount > 0 ? 1 : 0);
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
