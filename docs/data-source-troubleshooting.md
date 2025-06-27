# 数据源故障排除指南

## 🚨 常见问题及解决方案

### 1. 网易财经 (netease) 连接失败

**问题症状**：
- 测试连接失败
- 返回网络错误或超时

**解决方案**：
```bash
# 1. 检查网易财经API是否可访问
curl -I "http://quotes.money.163.com/service/chddata.html"

# 2. 使用网易财经增强版替代
# 在数据源设置中切换到 "网易财经增强版"
```

**替代方案**：
- ✅ **推荐**：使用 `netease_enhanced` (网易财经增强版)
- ✅ 备选：使用 `tencent_enhanced` (腾讯财经增强版)

### 2. AKShare (akshare) 连接失败

**问题症状**：
- Python环境检查失败
- AKShare库未安装

**解决方案**：
```bash
# 1. 检查Python环境
python --version
# 或
python3 --version

# 2. 安装AKShare库
pip install akshare pandas requests
# 或
pip3 install akshare pandas requests

# 3. 验证安装
python -c "import akshare as ak; print(ak.__version__)"

# 4. 重启服务器
npm run dev
```

**环境要求**：
- Python 3.7+
- pandas >= 1.0.0
- requests >= 2.25.0
- akshare >= 1.8.0

### 3. 智兔数服 (zhitu) 连接失败

**问题症状**：
- API Key未配置
- 配置验证失败

**解决方案**：
```bash
# 1. 获取API Key
# 访问 https://www.zhitudata.com/ 注册账号并申请API Key

# 2. 配置环境变量
echo "ZHITU_API_KEY=your_api_key_here" >> .env
echo "ZHITU_BASE_URL=https://api.zhitudata.com" >> .env

# 3. 重启服务器
npm run dev
```

### 4. Yahoo Finance (yahoo_finance) 连接失败

**问题症状**：
- API已废弃或访问受限

**解决方案**：
```
Yahoo Finance API已不再免费提供，建议使用替代方案：
```

**替代方案**：
- ✅ **推荐**：使用 `alphavantage` (Alpha Vantage)
- ✅ 备选：使用 `tencent_enhanced` (腾讯财经增强版)

### 5. Google Finance (google_finance) 连接失败

**问题症状**：
- API已废弃

**解决方案**：
```
Google Finance API已于2018年停止服务，无法修复。
```

**替代方案**：
- ✅ **推荐**：使用 `alphavantage` (Alpha Vantage)
- ✅ 备选：使用 `tencent_enhanced` (腾讯财经增强版)

### 6. 聚合数据 (juhe) 连接失败

**问题症状**：
- API Key未配置
- API调用失败

**解决方案**：
```bash
# 1. 获取API Key
# 访问 https://www.juhe.cn/ 注册账号并申请股票数据API

# 2. 配置环境变量
echo "JUHE_API_KEY=your_api_key_here" >> .env

# 3. 重启服务器
npm run dev
```

## 🔧 通用解决方案

### 1. 网络连接问题

```bash
# 检查网络连接
ping www.baidu.com

# 检查DNS解析
nslookup api.example.com

# 检查防火墙设置
# Windows: 检查Windows防火墙
# Linux: 检查iptables或ufw
```

### 2. 代理设置

如果在企业网络环境中，可能需要配置代理：

```bash
# 设置HTTP代理
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=https://proxy.company.com:8080

# 或在.env文件中配置
echo "HTTP_PROXY=http://proxy.company.com:8080" >> .env
echo "HTTPS_PROXY=https://proxy.company.com:8080" >> .env
```

### 3. 超时设置优化

```javascript
// 在数据源配置中增加超时时间
const config = {
  timeout: 30000, // 30秒
  retryCount: 3,
  retryDelay: 2000
}
```

## 📊 推荐的数据源配置

### 最佳实践配置

```javascript
// 推荐的数据源优先级
const recommendedDataSources = [
  'tencent_enhanced',    // 主要 - 腾讯财经增强版
  'netease_enhanced',    // 备用 - 网易财经增强版  
  'alphavantage',        // 国际 - Alpha Vantage
  'eastmoney',           // 备用 - 东方财富
  'sina'                 // 兜底 - 新浪财经
]
```

### 环境变量配置示例

```bash
# .env 文件配置
PRIMARY_DATA_SOURCE=tencent_enhanced
BACKUP_DATA_SOURCES=netease_enhanced,alphavantage,eastmoney

# API配置
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
ZHITU_API_KEY=D564FC55-057B-4F6F-932C-C115E78BFAE4
JUHE_API_KEY=your_juhe_key

# 网络配置
API_REQUEST_TIMEOUT=15000
API_RETRY_COUNT=3
```

## 🚀 性能优化建议

### 1. 数据源选择策略

- **实时行情**：腾讯财经增强版 > 新浪财经
- **历史数据**：网易财经增强版 > 东方财富
- **国际市场**：Alpha Vantage > Yahoo Finance
- **新闻资讯**：东方财富 > 新浪财经

### 2. 缓存策略

```javascript
// 不同数据类型的缓存时间建议
const cacheConfig = {
  realtime: 30000,      // 实时数据 30秒
  history: 3600000,     // 历史数据 1小时
  news: 1800000,        // 新闻数据 30分钟
  stockList: 86400000   // 股票列表 24小时
}
```

### 3. 错误处理和重试

```javascript
// 智能重试策略
const retryConfig = {
  maxRetries: 3,
  retryDelay: [1000, 2000, 5000], // 递增延迟
  retryConditions: [
    'ECONNRESET',
    'ETIMEDOUT', 
    'ECONNREFUSED'
  ]
}
```

## 📞 获取技术支持

如果以上解决方案都无法解决问题，请：

1. **检查日志**：查看浏览器控制台和服务器日志
2. **收集信息**：记录错误信息、网络环境、操作系统版本
3. **尝试替代**：使用推荐的替代数据源
4. **联系支持**：提供详细的错误信息和环境配置

### 日志收集命令

```bash
# 查看服务器日志
npm run dev 2>&1 | tee debug.log

# 查看网络连接
netstat -an | grep :7001

# 查看进程状态
ps aux | grep node
```

通过以上故障排除步骤，应该能够解决大部分数据源连接问题。建议优先使用稳定可靠的增强版数据源。
