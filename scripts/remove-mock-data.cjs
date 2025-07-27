#!/usr/bin/env node

/**
 * 移除模拟数据脚本
 * 在开发环境启动前清理可能存在的模拟数据
 */

const fs = require('fs');
const path = require('path');

console.log('清理模拟数据...');

// 定义需要清理的模拟数据目录和文件
const mockDataPaths = [
  'src/data/mock',
  'public/mock-data',
  'temp/mock',
];

// 清理函数
function cleanMockData() {
  mockDataPaths.forEach(mockPath => {
    const fullPath = path.resolve(process.cwd(), mockPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`已清理: ${mockPath}`);
      } catch (error) {
        console.warn(`清理失败 ${mockPath}:`, error.message);
      }
    } else {
      console.log(`路径不存在，跳过: ${mockPath}`);
    }
  });
}

// 执行清理
try {
  cleanMockData();
  console.log('模拟数据清理完成');
  process.exit(0);
} catch (error) {
  console.error('清理过程中出错:', error);
  process.exit(1);
}
