#!/usr/bin/env node

// 简单的测试运行器，用于运行特定的测试文件
const { spawn } = require('child_process');
const path = require('path');

// 设置环境变量来解决 crypto 问题
process.env.NODE_OPTIONS = '--experimental-global-webcrypto';

// 要运行的测试文件
const testFiles = [
    'src/tests/technical-analysis/DojiPatternDetector.comprehensive.test.ts',
    'src/tests/technical-analysis/DojiPatternScreener.test.ts'
];

console.log('启动测试运行器...');
console.log('测试文件:', testFiles);

// 运行 vitest
const vitest = spawn('npx', ['vitest', 'run', ...testFiles, '--run'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-global-webcrypto'
    }
});

vitest.on('close', (code) => {
    console.log(`测试运行完成，退出码: ${code}`);
    process.exit(code);
});

vitest.on('error', (err) => {
    console.error('测试运行错误:', err);
    process.exit(1);
}); 