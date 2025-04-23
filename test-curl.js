// 使用child_process执行curl命令测试Tushare API
import { exec } from 'child_process';

const curlCommand = `curl "https://api.tushare.pro/" -H "Referer: http://localhost:5173/" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Content-Type: application/json" --data-raw "{\"api_name\":\"stock_basic\",\"token\":\"983b25aa025eee598034c4741dc776dd73356ddc53ddcffbb180cf61\",\"params\":{\"exchange\":\"\",\"list_status\":\"L\",\"fields\":\"ts_code,name,industry,market,list_date\"}}"`;

console.log('执行curl命令测试Tushare API...');
console.log('命令:', curlCommand);

exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`);
    return;
  }

  if (stderr) {
    console.error(`标准错误: ${stderr}`);
  }

  console.log('API响应:');
  try {
    // 尝试格式化JSON输出
    const response = JSON.parse(stdout);
    console.log(JSON.stringify(response, null, 2));

    if (response.code === 0) {
      console.log('API调用成功!');
      console.log(`获取到 ${response.data.items.length} 条数据`);
    } else {
      console.log('API调用失败:', response.msg);
    }
  } catch (e) {
    console.log('无法解析JSON响应:', e.message);
    console.log('原始响应:', stdout);
  }
});
