#!/usr/bin/env node

/**
 * 登录问题快速修复脚本
 * 自动修复常见的登录问题
 */

const axios = require('axios');
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
    name: '检查并创建环境配置文件',
    check: async () => {
      return fs.existsSync(path.join(__dirname, '../server/.env'));
    },
    fix: async () => {
      const envExamplePath = path.join(__dirname, '../server/.env.example');
      const envPath = path.join(__dirname, '../server/.env');
      
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log(colors.green('✅ 已创建 server/.env 配置文件'));
        
        // 生成随机JWT密钥
        const jwtSecret = require('crypto').randomBytes(32).toString('hex');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
        fs.writeFileSync(envPath, envContent);
        
        console.log(colors.green('✅ 已生成JWT密钥'));
        return true;
      } else {
        console.log(colors.red('❌ 找不到 server/.env.example 文件'));
        return false;
      }
    }
  },
  {
    name: '安装后端依赖',
    check: async () => {
      return fs.existsSync(path.join(__dirname, '../server/node_modules'));
    },
    fix: async () => {
      console.log(colors.yellow('正在安装后端依赖...'));
      try {
        await execAsync('cd server && npm install', { timeout: 120000 });
        console.log(colors.green('✅ 后端依赖安装成功'));
        return true;
      } catch (error) {
        console.log(colors.red('❌ 后端依赖安装失败'));
        console.log(colors.yellow('请手动运行: cd server && npm install'));
        return false;
      }
    }
  },
  {
    name: '创建测试用户',
    check: async () => {
      try {
        const response = await axios.get('http://localhost:7001/api/health/user-table', {
          timeout: 5000
        });
        return response.data.success && response.data.userCount > 0;
      } catch {
        return false;
      }
    },
    fix: async () => {
      try {
        const response = await axios.post('http://localhost:7001/api/health/create-test-user', {}, {
          timeout: 10000
        });
        
        if (response.data.success) {
          console.log(colors.green('✅ 测试用户创建成功'));
          console.log(colors.gray('可用账号:'));
          response.data.testAccounts.forEach(account => {
            console.log(colors.gray(`  ${account.username} / ${account.password} (${account.role})`));
          });
          return true;
        } else {
          console.log(colors.red('❌ 测试用户创建失败'));
          return false;
        }
      } catch (error) {
        console.log(colors.red('❌ 无法连接后端服务创建测试用户'));
        console.log(colors.yellow('请确保后端服务正在运行'));
        return false;
      }
    }
  },
  {
    name: '重置测试用户密码',
    check: async () => {
      // 总是执行密码重置
      return false;
    },
    fix: async () => {
      try {
        const response = await axios.post('http://localhost:7001/api/health/reset-test-passwords', {}, {
          timeout: 10000
        });
        
        if (response.data.success) {
          console.log(colors.green('✅ 测试用户密码重置成功'));
          response.data.results.forEach(result => {
            if (result.success) {
              console.log(colors.gray(`  ${result.username}: ${result.newPassword}`));
            }
          });
          return true;
        } else {
          console.log(colors.red('❌ 密码重置失败'));
          return false;
        }
      } catch (error) {
        console.log(colors.red('❌ 无法连接后端服务重置密码'));
        return false;
      }
    }
  }
];

// 主函数
async function main() {
  console.log(colors.blue(colors.bold('\n🔧 登录问题快速修复工具\n')));
  
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
    console.log(colors.gray('现在可以运行登录诊断: npm run diagnose-login'));
  } else if (fixedCount === totalIssues) {
    console.log(colors.green('🎉 所有问题都已修复！'));
    console.log(colors.gray('建议按以下顺序启动服务:'));
    console.log(colors.gray('1. 启动后端: cd server && npm run dev'));
    console.log(colors.gray('2. 启动前端: npm run dev'));
    console.log(colors.gray('3. 运行诊断: npm run diagnose-login'));
  } else {
    console.log(colors.yellow('⚠️ 还有一些问题需要手动处理:'));
    console.log(colors.gray('1. 检查MySQL服务是否启动'));
    console.log(colors.gray('2. 验证数据库配置 (server/.env)'));
    console.log(colors.gray('3. 确保数据库存在: CREATE DATABASE stock_analysis;'));
    console.log(colors.gray('4. 运行数据库迁移'));
  }
  
  console.log(colors.blue(colors.bold('\n🎯 推荐的测试账号\n')));
  console.log(colors.green('管理员账号:'));
  console.log(colors.gray('  用户名: admin'));
  console.log(colors.gray('  密码: admin123'));
  console.log(colors.green('普通用户账号:'));
  console.log(colors.gray('  用户名: testuser'));
  console.log(colors.gray('  密码: password123'));
  console.log(colors.green('演示账号:'));
  console.log(colors.gray('  用户名: demo'));
  console.log(colors.gray('  密码: demo123'));
  
  console.log(colors.blue(colors.bold('\n💡 常见问题解决方案\n')));
  console.log(colors.yellow('如果登录仍然失败:'));
  console.log(colors.gray('1. 检查浏览器控制台错误'));
  console.log(colors.gray('2. 检查网络请求是否到达后端'));
  console.log(colors.gray('3. 查看后端日志输出'));
  console.log(colors.gray('4. 验证数据库中用户数据'));
  console.log(colors.gray('5. 运行完整诊断: npm run diagnose-login'));
  
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
