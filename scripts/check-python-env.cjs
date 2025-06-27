#!/usr/bin/env node

/**
 * Python环境检查脚本
 * 检查Python环境和所需的库
 */

const { exec } = require('child_process');
const { promisify } = require('util');
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

const execAsync = promisify(exec);

// 检查Python版本
async function checkPythonVersion() {
  console.log(colors.blue('🐍 检查Python版本...\n'));

  const pythonCommands = ['python', 'python3', 'py'];
  let workingCommand = null;

  for (const cmd of pythonCommands) {
    try {
      const { stdout } = await execAsync(`${cmd} --version`, { timeout: 5000 });
      const version = stdout.trim();
      console.log(colors.green(`✅ ${cmd}: ${version}`));

      // 检查版本是否符合要求
      const versionMatch = version.match(/Python (\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2]);

        if (major >= 3 && (major > 3 || minor >= 7)) {
          if (!workingCommand) {
            workingCommand = cmd;
            console.log(colors.green(`✅ 推荐使用: ${cmd}`));
          }
        } else {
          console.log(colors.yellow(`⚠️ 版本过低: ${cmd} (需要3.7+)`));
        }
      }
    } catch (error) {
      console.log(colors.gray(`❌ ${cmd}: 不可用`));
    }
  }

  return workingCommand;
}

// 检查必需的Python库
async function checkPythonLibraries(pythonCmd) {
  console.log(colors.blue('\n📦 检查Python库...\n'));

  const requiredLibraries = [
    { name: 'tushare', import: 'tushare', alias: 'ts' },
    { name: 'akshare', import: 'akshare', alias: 'ak' },
    { name: 'pandas', import: 'pandas', alias: 'pd' },
    { name: 'numpy', import: 'numpy', alias: 'np' },
    { name: 'requests', import: 'requests', alias: null },
    { name: 'sqlalchemy', import: 'sqlalchemy', alias: null },
    { name: 'pymysql', import: 'pymysql', alias: null },
    { name: 'lxml', import: 'lxml', alias: null },
    { name: 'beautifulsoup4', import: 'bs4', alias: null }
  ];

  const results = {};

  for (const lib of requiredLibraries) {
    try {
      const importStatement = lib.alias ?
        `import ${lib.import} as ${lib.alias}; print(${lib.alias}.__version__)` :
        `import ${lib.import}; print(${lib.import}.__version__)`;

      const { stdout } = await execAsync(
        `${pythonCmd} -c "${importStatement}"`,
        { timeout: 10000 }
      );

      const version = stdout.trim();
      console.log(colors.green(`✅ ${lib.name}: ${version}`));
      results[lib.name] = { installed: true, version };

    } catch (error) {
      console.log(colors.red(`❌ ${lib.name}: 未安装`));
      results[lib.name] = { installed: false, error: error.message };
    }
  }

  return results;
}

// 检查后端Python脚本
async function checkBackendPythonScripts() {
  console.log(colors.blue('\n📄 检查后端Python脚本...\n'));

  const scriptPaths = [
    'server/scripts/tushare_api.py',
    'server/scripts/akshare_api.py'
  ];

  for (const scriptPath of scriptPaths) {
    const fullPath = path.join(__dirname, '..', scriptPath);
    if (fs.existsSync(fullPath)) {
      console.log(colors.green(`✅ ${scriptPath}`));

      // 检查脚本内容
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('import tushare') || content.includes('import akshare')) {
          console.log(colors.gray(`   包含必要的导入语句`));
        }
      } catch (error) {
        console.log(colors.yellow(`   ⚠️ 无法读取文件内容`));
      }
    } else {
      console.log(colors.red(`❌ ${scriptPath}: 文件不存在`));
    }
  }
}

// 测试后端Python脚本执行
async function testBackendScripts(pythonCmd) {
  console.log(colors.blue('\n🧪 测试后端Python脚本执行...\n'));

  const tushareScript = path.join(__dirname, '../server/scripts/tushare_api.py');

  if (fs.existsSync(tushareScript)) {
    try {
      console.log(colors.yellow('测试Tushare脚本...'));
      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${tushareScript}" test`,
        { timeout: 15000 }
      );

      console.log(colors.green('✅ Tushare脚本执行成功'));
      if (stdout) {
        console.log(colors.gray('输出:'), stdout.substring(0, 200));
      }

    } catch (error) {
      console.log(colors.red('❌ Tushare脚本执行失败'));
      console.log(colors.gray('错误:'), error.message.substring(0, 200));
    }
  } else {
    console.log(colors.yellow('⚠️ Tushare脚本不存在，跳过测试'));
  }
}

// 提供安装建议
function provideInstallationGuide(pythonCmd, libraryResults) {
  console.log(colors.blue(colors.bold('\n💡 安装建议\n')));

  const missingLibraries = Object.entries(libraryResults)
    .filter(([name, result]) => !result.installed)
    .map(([name]) => name);

  if (missingLibraries.length > 0) {
    console.log(colors.yellow('需要安装的库:'));

    for (const lib of missingLibraries) {
      console.log(colors.blue(`安装 ${lib}:`));

      if (lib === 'tushare') {
        console.log(colors.gray(`  ${pythonCmd} -m pip install tushare`));
        console.log(colors.gray(`  # 或使用国内镜像:`));
        console.log(colors.gray(`  ${pythonCmd} -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ tushare`));
      } else if (lib === 'akshare') {
        console.log(colors.gray(`  ${pythonCmd} -m pip install akshare`));
        console.log(colors.gray(`  # 或使用国内镜像:`));
        console.log(colors.gray(`  ${pythonCmd} -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ akshare`));
      } else {
        console.log(colors.gray(`  ${pythonCmd} -m pip install ${lib}`));
      }
      console.log();
    }

    console.log(colors.blue('批量安装所有库:'));
    console.log(colors.gray(`${pythonCmd} -m pip install tushare akshare pandas numpy requests sqlalchemy pymysql lxml beautifulsoup4`));
    console.log();
    console.log(colors.blue('使用国内镜像批量安装:'));
    console.log(colors.gray(`${pythonCmd} -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple/ tushare akshare pandas numpy requests sqlalchemy pymysql lxml beautifulsoup4`));
  } else {
    console.log(colors.green('🎉 所有必需的库都已安装！'));
  }
}

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔍 Python环境检查工具\n')));

  // 1. 检查Python版本
  const pythonCmd = await checkPythonVersion();

  if (!pythonCmd) {
    console.log(colors.red('\n❌ 未找到可用的Python环境'));
    console.log(colors.yellow('请安装Python 3.7或更高版本'));
    console.log(colors.gray('下载地址: https://www.python.org/downloads/'));
    process.exit(1);
  }

  // 2. 检查Python库
  const libraryResults = await checkPythonLibraries(pythonCmd);

  // 3. 检查后端脚本
  await checkBackendPythonScripts();

  // 4. 测试脚本执行
  await testBackendScripts(pythonCmd);

  // 5. 提供安装建议
  provideInstallationGuide(pythonCmd, libraryResults);

  // 输出结果汇总
  console.log(colors.blue(colors.bold('\n📊 检查结果汇总\n')));

  console.log(colors.green(`✅ Python命令: ${pythonCmd}`));

  const installedCount = Object.values(libraryResults).filter(r => r.installed).length;
  const totalCount = Object.keys(libraryResults).length;

  console.log(`已安装库: ${installedCount}/${totalCount}`);

  Object.entries(libraryResults).forEach(([name, result]) => {
    if (result.installed) {
      console.log(colors.green(`  ✅ ${name}: ${result.version}`));
    } else {
      console.log(colors.red(`  ❌ ${name}: 未安装`));
    }
  });

  // 特别提醒Tushare
  if (!libraryResults.tushare?.installed) {
    console.log(colors.yellow(colors.bold('\n⚠️ 重要提醒\n')));
    console.log(colors.red('Tushare库未安装，这是导致后端错误的主要原因！'));
    console.log(colors.yellow('请立即安装:'));
    console.log(colors.blue(`${pythonCmd} -m pip install tushare`));
  }

  const allInstalled = installedCount === totalCount;

  if (allInstalled) {
    console.log(colors.green(colors.bold('\n🎉 Python环境完全正常！')));
    console.log(colors.gray('现在可以重启后端服务测试功能'));
  } else {
    console.log(colors.red(colors.bold('\n⚠️ Python环境需要完善')));
    console.log(colors.yellow('请按照上述建议安装缺失的库'));
  }

  process.exit(allInstalled ? 0 : 1);
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
