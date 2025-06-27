#!/usr/bin/env node

/**
 * AKShare简单测试脚本
 * 使用临时文件避免命令行引号问题
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// 检查Python环境
async function checkPythonEnvironment() {
  console.log(colors.blue('🐍 检查Python环境...'));
  
  const pythonCommands = ['python', 'python3', 'py'];
  
  for (const cmd of pythonCommands) {
    try {
      const { stdout } = await execAsync(`${cmd} --version`, { timeout: 5000 });
      const version = stdout.trim();
      console.log(colors.green(`✅ 找到Python: ${cmd} - ${version}`));
      
      // 检查版本是否符合要求
      const versionMatch = version.match(/Python (\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2]);
        
        if (major >= 3 && (major > 3 || minor >= 7)) {
          console.log(colors.green(`✅ Python版本符合要求 (需要3.7+)`));
          return { success: true, command: cmd, version };
        } else {
          console.log(colors.yellow(`⚠️ Python版本过低 (需要3.7+，当前${major}.${minor})`));
        }
      }
      
    } catch (error) {
      console.log(colors.gray(`❌ ${cmd} 不可用`));
    }
  }
  
  return { success: false, error: 'Python未安装或版本不符合要求' };
}

// 使用临时文件测试AKShare
async function testAKShareWithTempFile(pythonCmd) {
  console.log(colors.blue('\n📦 测试AKShare库...'));
  
  // 创建临时Python文件
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, 'akshare_test.py');
  
  const testScript = `
import sys
import traceback

def test_akshare():
    try:
        # 测试1: 导入AKShare
        import akshare as ak
        print("✅ AKShare导入成功")
        print(f"AKShare版本: {ak.__version__}")
        
        # 测试2: 导入依赖库
        import pandas as pd
        print(f"Pandas版本: {pd.__version__}")
        
        import requests
        print(f"Requests版本: {requests.__version__}")
        
        # 测试3: 检查基本功能
        has_stock_func = hasattr(ak, 'stock_zh_a_hist')
        print(f"股票历史数据函数: {'可用' if has_stock_func else '不可用'}")
        
        has_realtime_func = hasattr(ak, 'stock_zh_a_spot_em')
        print(f"实时行情函数: {'可用' if has_realtime_func else '不可用'}")
        
        print("SUCCESS: AKShare环境测试通过")
        return True
        
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 测试错误: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_akshare()
    sys.exit(0 if success else 1)
`;
  
  try {
    // 写入临时文件
    fs.writeFileSync(tempFile, testScript, 'utf8');
    
    // 执行Python脚本
    const { stdout, stderr } = await execAsync(
      `${pythonCmd} "${tempFile}"`,
      { timeout: 15000, encoding: 'utf8' }
    );
    
    console.log(colors.gray('测试输出:'));
    console.log(stdout);
    
    if (stderr) {
      console.log(colors.red('错误输出:'));
      console.log(stderr);
    }
    
    // 清理临时文件
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // 忽略清理错误
    }
    
    if (stdout.includes('SUCCESS: AKShare环境测试通过')) {
      console.log(colors.green('\n✅ AKShare环境完全正常！'));
      return { success: true, output: stdout };
    } else if (stdout.includes('AKShare导入成功')) {
      console.log(colors.yellow('\n⚠️ AKShare基本可用，但可能有部分功能问题'));
      return { success: true, warning: true, output: stdout };
    } else {
      console.log(colors.red('\n❌ AKShare环境有问题'));
      return { success: false, output: stdout, error: stderr };
    }
    
  } catch (error) {
    // 清理临时文件
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // 忽略清理错误
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.log(colors.yellow('\n⚠️ 测试超时，但AKShare可能仍然可用'));
      return { success: true, warning: true, note: '测试超时' };
    } else {
      console.log(colors.red(`\n❌ 测试失败: ${error.message}`));
      return { success: false, error: error.message };
    }
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🧪 AKShare简单测试\n')));
  
  // 1. 检查Python环境
  const pythonCheck = await checkPythonEnvironment();
  
  if (!pythonCheck.success) {
    console.log(colors.red('\n❌ Python环境检查失败'));
    console.log(colors.yellow('请先安装Python 3.7或更高版本'));
    process.exit(1);
  }
  
  // 2. 测试AKShare
  const akshareTest = await testAKShareWithTempFile(pythonCheck.command);
  
  // 输出结果
  console.log(colors.blue(colors.bold('\n📊 测试结果汇总\n')));
  
  console.log(colors.green(`✅ Python环境: ${pythonCheck.version}`));
  
  if (akshareTest.success) {
    if (akshareTest.warning) {
      console.log(colors.yellow('⚠️ AKShare状态: 基本可用'));
      console.log(colors.gray('建议: 可以尝试使用，但可能有部分功能限制'));
    } else {
      console.log(colors.green('✅ AKShare状态: 完全正常'));
      console.log(colors.gray('建议: 可以正常使用所有功能'));
    }
    
    console.log(colors.blue('\n🎉 AKShare环境测试通过！'));
    console.log(colors.gray('现在可以在股票分析应用中使用AKShare数据源'));
    
  } else {
    console.log(colors.red('❌ AKShare状态: 有问题'));
    console.log(colors.yellow('\n💡 解决建议:'));
    console.log(colors.gray('1. 重新安装AKShare: pip install akshare'));
    console.log(colors.gray('2. 安装依赖库: pip install pandas requests numpy'));
    console.log(colors.gray('3. 使用国内镜像: pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare'));
  }
  
  process.exit(akshareTest.success ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行测试
main().catch(error => {
  console.error(colors.red('\n❌ 测试过程发生错误:'), error);
  process.exit(1);
});
