#!/usr/bin/env node

/**
 * 清除 Vite 缓存脚本
 * 用于解决依赖预构建缓存过期的问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDirs = [
  path.join(__dirname, '../node_modules/.vite'),
  path.join(__dirname, '../.vite'),
];

console.log('正在清除 Vite 缓存...');

cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✓ 已清除: ${dir}`);
    } catch (error) {
      console.error(`✗ 清除失败: ${dir}`, error.message);
    }
  } else {
    console.log(`- 目录不存在: ${dir}`);
  }
});

console.log('\n缓存清除完成！请重启开发服务器。');

