#!/usr/bin/env node

/**
 * Tushare数据源集成测试脚本
 * 验证Tushare数据源是否正确集成到测试套件中
 */

const { exec } = require('child_process');
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

console.log(colors.blue(colors.bold('\n🧪 Tushare数据源集成测试\n')));

// 检查测试文件是否存在
function checkTestFiles() {
  console.log(colors.blue('[检查] 验证Tushare测试文件...'));
  
  const testFiles = [
    'src/tests/services/tushareDataSource.spec.ts',
    'src/tests/services/dataSourceManager.spec.ts',
    'src/tests/services/stockService.spec.ts'
  ];
  
  let allFilesExist = true;
  
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(colors.green(`  ✅ ${file} - 存在`));
    } else {
      console.log(colors.red(`  ❌ ${file} - 不存在`));
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// 检查package.json中的测试脚本
function checkPackageScripts() {
  console.log(colors.blue('\n[检查] 验证package.json测试脚本...'));
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const expectedScripts = [
      'test:tushare',
      'test:datasources'
    ];
    
    let allScriptsExist = true;
    
    expectedScripts.forEach(script => {
      if (scripts[script]) {
        console.log(colors.green(`  ✅ ${script} - 已配置`));
        console.log(colors.gray(`     命令: ${scripts[script]}`));
      } else {
        console.log(colors.red(`  ❌ ${script} - 未配置`));
        allScriptsExist = false;
      }
    });
    
    return allScriptsExist;
  } catch (error) {
    console.log(colors.red(`  ❌ 读取package.json失败: ${error.message}`));
    return false;
  }
}

// 检查系统测试脚本
function checkSystemTestScript() {
  console.log(colors.blue('\n[检查] 验证系统测试脚本...'));
  
  try {
    const scriptPath = 'scripts/test-system.sh';
    if (!fs.existsSync(scriptPath)) {
      console.log(colors.red(`  ❌ ${scriptPath} - 不存在`));
      return false;
    }
    
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    const tushareChecks = [
      'test_api_endpoint "/api/tushare/test"',
      'test_api_endpoint "/api/tushare/stock-basic"'
    ];
    
    let allChecksExist = true;
    
    tushareChecks.forEach(check => {
      if (content.includes(check)) {
        console.log(colors.green(`  ✅ Tushare测试已包含: ${check}`));
      } else {
        console.log(colors.red(`  ❌ Tushare测试缺失: ${check}`));
        allChecksExist = false;
      }
    });
    
    return allChecksExist;
  } catch (error) {
    console.log(colors.red(`  ❌ 检查系统测试脚本失败: ${error.message}`));
    return false;
  }
}

// 运行Tushare特定测试
function runTushareTests() {
  return new Promise((resolve) => {
    console.log(colors.blue('\n[测试] 运行Tushare数据源测试...'));
    
    exec('npm run test:tushare', (error, stdout, stderr) => {
      if (error) {
        console.log(colors.red(`  ❌ 测试执行失败: ${error.message}`));
        if (stderr) {
          console.log(colors.gray(`  错误输出: ${stderr}`));
        }
        resolve(false);
        return;
      }
      
      console.log(colors.green('  ✅ Tushare测试执行成功'));
      if (stdout) {
        console.log(colors.gray(`  测试输出:\n${stdout}`));
      }
      resolve(true);
    });
  });
}

// 检查模拟数据移除情况
function checkMockDataRemoval() {
  console.log(colors.blue('\n[检查] 验证模拟数据移除情况...'));
  
  const filesToCheck = [
    'src/services/fundamentalService.ts',
    'src/services/stockService.ts',
    'src/services/tushareService.ts'
  ];
  
  let mockDataFound = false;
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // 检查是否还有模拟数据相关的代码
      const mockPatterns = [
        /Math\.random\(\)/g,
        /generateMock/g,
        /模拟数据/g,
        /mock.*data/gi
      ];
      
      let fileHasMockData = false;
      mockPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          fileHasMockData = true;
          mockDataFound = true;
        }
      });
      
      if (fileHasMockData) {
        console.log(colors.yellow(`  ⚠️  ${file} - 可能仍包含模拟数据`));
      } else {
        console.log(colors.green(`  ✅ ${file} - 模拟数据已清理`));
      }
    }
  });
  
  return !mockDataFound;
}

// 主测试函数
async function runIntegrationTest() {
  let totalChecks = 0;
  let passedChecks = 0;
  
  // 1. 检查测试文件
  totalChecks++;
  if (checkTestFiles()) {
    passedChecks++;
  }
  
  // 2. 检查package.json脚本
  totalChecks++;
  if (checkPackageScripts()) {
    passedChecks++;
  }
  
  // 3. 检查系统测试脚本
  totalChecks++;
  if (checkSystemTestScript()) {
    passedChecks++;
  }
  
  // 4. 检查模拟数据移除
  totalChecks++;
  if (checkMockDataRemoval()) {
    passedChecks++;
  }
  
  // 5. 运行Tushare测试
  totalChecks++;
  if (await runTushareTests()) {
    passedChecks++;
  }
  
  // 输出结果
  console.log(colors.blue(colors.bold('\n📊 集成测试结果\n')));
  console.log(colors.gray(`总检查项: ${totalChecks}`));
  console.log(colors.green(`通过: ${passedChecks}`));
  console.log(colors.red(`失败: ${totalChecks - passedChecks}`));
  console.log(colors.blue(`成功率: ${Math.round((passedChecks / totalChecks) * 100)}%`));
  
  if (passedChecks === totalChecks) {
    console.log(colors.green('\n🎉 所有检查通过！Tushare数据源已成功集成到测试套件中。'));
    console.log(colors.gray('✅ 模拟数据已移除'));
    console.log(colors.gray('✅ 测试文件已创建'));
    console.log(colors.gray('✅ 测试脚本已配置'));
    console.log(colors.gray('✅ 系统测试已更新'));
  } else {
    console.log(colors.yellow('\n⚠️  部分检查失败，请查看上述详细信息。'));
    
    if (passedChecks > totalChecks / 2) {
      console.log(colors.blue('\n📋 建议的下一步操作:'));
      console.log(colors.gray('1. 修复失败的检查项'));
      console.log(colors.gray('2. 重新运行此测试脚本'));
      console.log(colors.gray('3. 运行完整的测试套件验证'));
    }
  }
  
  console.log(colors.blue('\n🔧 可用的测试命令:'));
  console.log(colors.gray('  npm run test:tushare        - 运行Tushare专项测试'));
  console.log(colors.gray('  npm run test:datasources    - 运行所有数据源测试'));
  console.log(colors.gray('  npm run test               - 运行完整测试套件'));
  console.log(colors.gray('  node scripts/test-tushare-api.cjs - 运行Tushare API测试'));
}

// 运行测试
runIntegrationTest().catch(error => {
  console.error(colors.red(`\n❌ 集成测试执行失败: ${error.message}`));
  process.exit(1);
});
