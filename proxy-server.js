// 简单的代理服务器，用于转发请求到 Tushare API
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// 启用 CORS
app.use(cors());
// 解析 JSON 请求体
app.use(bodyParser.json());

// 代理 Tushare API 请求
app.post('/api/tushare', function (req, res) {
  console.log('收到代理请求:', req.body);

  axios.post('https://api.tushare.pro', req.body, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    }
  })
    .then(function (response) {
      console.log('Tushare API 响应状态码:', response.status);
      res.json(response.data);
    })
    .catch(function (error) {
      console.error('代理请求错误:', error.message);
      if (error.response) {
        console.error('错误响应:', error.response.data);
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: error.message });
      }
    });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`Tushare API 代理端点: http://localhost:${PORT}/api/tushare`);
});
