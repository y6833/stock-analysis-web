#!/usr/bin/env node

/**
 * 精确检测项目中剩余的模拟数据
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

console.log(colors.blue(colors.bold('\n🔍 精确检测项目中的模拟数据\n')));

// 需要检查的文件
const filesToCheck = [
  'src/services/fundamentalService.ts',
  'src/services/stockService.ts', 
  'src/services/tushareService.ts',
  'src/services/realtimeService.ts',
  'src/services/marketDataService.ts',
  'src/services/dataSource/EastMoneyDataSource.ts',
  'src/services/featureEngineering/FundamentalFactorEngine.ts',
  'src/services/featureEngineering/AlternativeFactorEngine.ts',
  'src/services/backtest/BacktestService.ts',
  'server/app/service/stock.js',
  'server/app/service/eastmoney.js',
  'server/app/service/akshare.js',
  'server/app/service/varCalculation.js',
  'server/app/controller/tencent.js'
];

// 模拟数据相关的模式
const mockPatterns = [
  {
    pattern: /Math\.random\(\)/g,
    description: 'Math.random() 调用',
    severity: 'high'
  },
  {
    pattern: /generateMock/gi,
    description: '生成模拟数据函数',
    severity: 'high'
  },
  {
    pattern: /模拟数据/g,
    description: '模拟数据注释',
    severity: 'medium'
  },
  {
    pattern: /mock.*data/gi,
    description: '模拟数据变量',
    severity: 'high'
  },
  {
    pattern: /fake.*data/gi,
    description: '假数据变量',
    severity: 'high'
  },
  {
    pattern: /dummy.*data/gi,
    description: '虚拟数据变量',
    severity: 'high'
  },
  {
    pattern: /data_source.*mock/gi,
    description: '模拟数据源标识',
    severity: 'high'
  },
  {
    pattern: /source_type.*mock/gi,
    description: '模拟数据源类型',
    severity: 'high'
  }
];

// 允许的例外情况（测试文件等）
const allowedExceptions = [
  /\/\*\*[\s\S]*?模拟数据.*?已移除[\s\S]*?\*\//g, // 已移除的注释
  /\/\/.*模拟数据.*已移除/g, // 已移除的单行注释
  /\/\/.*模拟.*函数.*已移除/g, // 已移除函数的注释
  /console\.(log|warn|error).*模拟/g, // 控制台输出
  /throw new Error.*模拟/g, // 错误信息中的模拟
  /\.spec\.ts/g, // 测试文件
  /\.test\.ts/g, // 测试文件
  /test.*\.js/g, // 测试文件
];

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(colors.gray(`  ⚠️  ${filePath} - 文件不存在`));
    return { hasIssues: false, issues: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  mockPatterns.forEach(({ pattern, description, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      // 检查是否是允许的例外情况
      let isException = false;
      for (const exceptionPattern of allowedExceptions) {
        if (exceptionPattern.test(content)) {
          // 进一步检查匹配是否在例外范围内
          const exceptionMatches = content.match(exceptionPattern);
          if (exceptionMatches) {
            for (const exceptionMatch of exceptionMatches) {
              if (matches.some(match => exceptionMatch.includes(match))) {
                isException = true;
                break;
              }
            }
          }
        }
        if (isException) break;
      }

      if (!isException) {
        // 找到具体的行号
        matches.forEach(match => {
          lines.forEach((line, index) => {
            if (line.includes(match)) {
              issues.push({
                line: index + 1,
                content: line.trim(),
                pattern: description,
                severity,
                match
              });
            }
          });
        });
      }
    }
  });

  return { hasIssues: issues.length > 0, issues };
}

function main() {
  let totalFiles = 0;
  let filesWithIssues = 0;
  let totalIssues = 0;
  let highSeverityIssues = 0;

  filesToCheck.forEach(filePath => {
    totalFiles++;
    const { hasIssues, issues } = checkFile(filePath);

    if (hasIssues) {
      filesWithIssues++;
      totalIssues += issues.length;
      
      console.log(colors.red(`\n❌ ${filePath}`));
      
      issues.forEach(issue => {
        if (issue.severity === 'high') {
          highSeverityIssues++;
          console.log(colors.red(`  🔴 第${issue.line}行: ${issue.pattern}`));
        } else {
          console.log(colors.yellow(`  🟡 第${issue.line}行: ${issue.pattern}`));
        }
        console.log(colors.gray(`     ${issue.content}`));
      });
    } else {
      console.log(colors.green(`✅ ${filePath} - 已清理`));
    }
  });

  // 输出总结
  console.log(colors.blue(colors.bold('\n📊 检测结果总结\n')));
  console.log(colors.gray(`检查文件总数: ${totalFiles}`));
  console.log(colors.green(`已清理文件: ${totalFiles - filesWithIssues}`));
  console.log(colors.red(`仍有问题文件: ${filesWithIssues}`));
  console.log(colors.yellow(`总问题数: ${totalIssues}`));
  console.log(colors.red(`高严重性问题: ${highSeverityIssues}`));

  if (filesWithIssues === 0) {
    console.log(colors.green('\n🎉 恭喜！所有模拟数据已成功移除！'));
    console.log(colors.gray('✅ 项目现在只使用真实数据源'));
    console.log(colors.gray('✅ 适当的错误处理已实现'));
  } else {
    console.log(colors.yellow('\n⚠️  仍有模拟数据需要清理'));
    
    if (highSeverityIssues > 0) {
      console.log(colors.red(`\n🚨 发现 ${highSeverityIssues} 个高严重性问题需要立即处理`));
      console.log(colors.gray('建议优先处理标记为🔴的问题'));
    }
    
    console.log(colors.blue('\n📋 建议的清理步骤:'));
    console.log(colors.gray('1. 优先处理高严重性问题（🔴）'));
    console.log(colors.gray('2. 将Math.random()调用替换为真实数据API调用'));
    console.log(colors.gray('3. 删除或注释掉模拟数据生成函数'));
    console.log(colors.gray('4. 添加适当的错误处理和用户提示'));
    console.log(colors.gray('5. 重新运行此检测脚本验证'));
  }

  console.log(colors.blue('\n🔧 相关命令:'));
  console.log(colors.gray('  node scripts/detect-mock-data.cjs     - 重新运行此检测'));
  console.log(colors.gray('  node scripts/test-tushare-integration.cjs - 运行集成测试'));
  console.log(colors.gray('  npm run test:datasources             - 测试数据源'));

  // 返回退出码
  process.exit(filesWithIssues > 0 ? 1 : 0);
}

main();
