// 简单的测试脚本，用于执行 Tushare API 测试
import { exec } from 'child_process';

console.log('开始编译并运行 Tushare API 测试...');

// 使用 ts-node 运行测试文件
exec('npx ts-node --esm src/utils/tushareTest.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`);
    return;
  }
  
  if (stderr) {
    console.error(`标准错误: ${stderr}`);
  }
  
  console.log(`测试输出:\n${stdout}`);
});
