#!/usr/bin/env node

/**
 * 数据源快速修复脚本
 * 自动修复常见的数据源连接问题
 */

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

// 修复项目
const fixes = [
  {
    name: '检查后端服务状态',
    check: async () => {
      try {
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          exec('netstat -an | findstr :7001', (error, stdout) => {
            resolve(stdout.includes('7001'));
          });
        });
      } catch {
        return false;
      }
    },
    fix: async () => {
      console.log(colors.yellow('请在另一个终端运行: npm run dev'));
      console.log(colors.gray('或者检查server目录下的服务是否正常启动'));
      return true;
    }
  },
  {
    name: '创建环境变量配置文件',
    check: async () => {
      return fs.existsSync(path.join(process.cwd(), 'server', '.env'));
    },
    fix: async () => {
      const envExamplePath = path.join(process.cwd(), 'server', '.env.example');
      const envPath = path.join(process.cwd(), 'server', '.env');
      
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log(colors.green('✅ 已创建 server/.env 配置文件'));
        console.log(colors.yellow('请编辑 server/.env 文件，配置必要的API Key'));
        return true;
      } else {
        console.log(colors.red('❌ 找不到 server/.env.example 文件'));
        return false;
      }
    }
  },
  {
    name: '检查Python环境',
    check: async () => {
      try {
        await execAsync('python -c "import akshare"');
        return true;
      } catch {
        try {
          await execAsync('python3 -c "import akshare"');
          return true;
        } catch {
          return false;
        }
      }
    },
    fix: async () => {
      console.log(colors.yellow('正在尝试安装AKShare...'));
      try {
        await execAsync('pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests', {
          timeout: 60000
        });
        console.log(colors.green('✅ AKShare安装成功'));
        return true;
      } catch (error) {
        console.log(colors.red('❌ AKShare安装失败'));
        console.log(colors.yellow('请手动运行: pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare pandas requests'));
        return false;
      }
    }
  },
  {
    name: '检查Node.js依赖',
    check: async () => {
      return fs.existsSync(path.join(process.cwd(), 'node_modules'));
    },
    fix: async () => {
      console.log(colors.yellow('正在安装Node.js依赖...'));
      try {
        await execAsync('npm install', { timeout: 120000 });
        console.log(colors.green('✅ Node.js依赖安装成功'));
        return true;
      } catch (error) {
        console.log(colors.red('❌ Node.js依赖安装失败'));
        console.log(colors.yellow('请手动运行: npm install'));
        return false;
      }
    }
  },
  {
    name: '检查服务器依赖',
    check: async () => {
      return fs.existsSync(path.join(process.cwd(), 'server', 'node_modules'));
    },
    fix: async () => {
      console.log(colors.yellow('正在安装服务器依赖...'));
      try {
        await execAsync('cd server && npm install', { timeout: 120000 });
        console.log(colors.green('✅ 服务器依赖安装成功'));
        return true;
      } catch (error) {
        console.log(colors.red('❌ 服务器依赖安装失败'));
        console.log(colors.yellow('请手动运行: cd server && npm install'));
        return false;
      }
    }
  }
];

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 数据源快速修复工具\n')));
  
  let fixedCount = 0;
  let totalIssues = 0;
  
  for (const fix of fixes) {
    console.log(colors.yellow(`🔍 检查: ${fix.name}...`));
    
    const isOk = await fix.check();
    
    if (isOk) {
      console.log(colors.green(`✅ ${fix.name} - 正常`));
    } else {
      totalIssues++;
      console.log(colors.red(`❌ ${fix.name} - 需要修复`));
      
      try {
        const fixed = await fix.fix();
        if (fixed) {
          fixedCount++;
          console.log(colors.green(`✅ ${fix.name} - 已修复`));
        } else {
          console.log(colors.red(`❌ ${fix.name} - 修复失败`));
        }
      } catch (error) {
        console.log(colors.red(`❌ ${fix.name} - 修复异常: ${error.message}`));
      }
    }
    
    console.log();
  }
  
  // 输出修复结果
  console.log(colors.blue(colors.bold('📊 修复结果汇总\n')));
  console.log(colors.gray(`发现问题: ${totalIssues} 个`));
  console.log(colors.green(`已修复: ${fixedCount} 个`));
  console.log(colors.red(`未修复: ${totalIssues - fixedCount} 个\n`));
  
  // 提供下一步建议
  console.log(colors.blue(colors.bold('🚀 下一步操作\n')));
  
  if (totalIssues === 0) {
    console.log(colors.green('🎉 所有检查项都正常！'));
    console.log(colors.gray('现在可以运行: npm run check-datasources'));
  } else if (fixedCount === totalIssues) {
    console.log(colors.green('🎉 所有问题都已修复！'));
    console.log(colors.gray('建议重启服务器后再次测试:'));
    console.log(colors.gray('1. 重启后端服务: npm run dev'));
    console.log(colors.gray('2. 运行检查: npm run check-datasources'));
  } else {
    console.log(colors.yellow('⚠️ 还有一些问题需要手动处理:'));
    console.log(colors.gray('1. 检查上面的错误信息'));
    console.log(colors.gray('2. 参考文档: docs/data-source-troubleshooting.md'));
    console.log(colors.gray('3. 配置API Key: 编辑 server/.env 文件'));
  }
  
  console.log(colors.blue(colors.bold('\n💡 推荐的数据源配置\n')));
  console.log(colors.green('优先使用以下数据源（无需额外配置）:'));
  console.log(colors.green('1. 腾讯财经增强版 - 最稳定'));
  console.log(colors.green('2. 新浪财经 - 需要后端服务'));
  console.log(colors.green('3. 东方财富 - 需要后端服务'));
  console.log(colors.gray('\n可选配置（需要API Key）:'));
  console.log(colors.gray('4. Alpha Vantage - 国际市场'));
  console.log(colors.gray('5. 智兔数服 - 专业数据'));
  console.log(colors.gray('6. 聚合数据 - 实时行情'));
  
  process.exit(totalIssues > fixedCount ? 1 : 0);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(colors.red('\n❌ 未处理的错误:'), error);
  process.exit(1);
});

// 运行修复
main().catch(error => {
  console.error(colors.red('\n❌ 修复过程发生错误:'), error);
  process.exit(1);
});
