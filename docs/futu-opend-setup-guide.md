# 富途OpenD安装配置指南

## 概述

OpenD是富途OpenAPI的网关程序，负责处理客户端与富途服务器之间的通信。本指南将帮助您完成OpenD的安装、配置和测试。

## 🔧 环境要求

### 系统要求
- **Windows**: Windows 7 及以上版本
- **macOS**: macOS 10.12 及以上版本
- **Linux**: Ubuntu 16.04 及以上版本

### 网络要求
- 稳定的互联网连接
- 防火墙允许OpenD程序访问网络
- 端口11111可用（默认端口）

### 账号要求
- 有效的富途账号
- 已完成实名认证
- 具备相应的行情权限

## 📥 下载安装

### 1. 下载OpenD程序

访问富途官方下载页面：
https://www.futunn.com/download/openAPI

选择适合您操作系统的版本：
- Windows: `FutuOpenD_x.x.x_Win.exe`
- macOS: `FutuOpenD_x.x.x_Mac.dmg`
- Linux: `FutuOpenD_x.x.x_Linux.tar.gz`

### 2. 安装步骤

#### Windows
1. 双击下载的 `.exe` 文件
2. 按照安装向导完成安装
3. 默认安装路径：`C:\Program Files\Futu\FutuOpenD`

#### macOS
1. 双击下载的 `.dmg` 文件
2. 将FutuOpenD拖拽到Applications文件夹
3. 首次运行时允许来自未知开发者的应用

#### Linux
1. 解压下载的 `.tar.gz` 文件
2. 进入解压目录
3. 运行 `./FutuOpenD` 启动程序

## ⚙️ 配置设置

### 1. 启动OpenD

#### Windows
- 从开始菜单启动：`开始菜单 > Futu > FutuOpenD`
- 或直接运行安装目录下的 `FutuOpenD.exe`

#### macOS
- 从Applications文件夹启动FutuOpenD
- 或使用Spotlight搜索"FutuOpenD"

#### Linux
```bash
cd /path/to/FutuOpenD
./FutuOpenD
```

### 2. 登录富途账号

1. 启动OpenD后，会出现登录界面
2. 输入您的富途账号和密码
3. 完成二次验证（如果启用）
4. 登录成功后，OpenD会显示"已连接"状态

### 3. 配置网络设置

#### 默认配置
- **监听地址**: 127.0.0.1
- **监听端口**: 11111
- **SSL**: 关闭

#### 自定义配置
如需修改配置，可以编辑配置文件：
- Windows: `%APPDATA%\Futu\FutuOpenD\FutuOpenD.xml`
- macOS: `~/Library/Application Support/Futu/FutuOpenD/FutuOpenD.xml`
- Linux: `~/.futu/FutuOpenD/FutuOpenD.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Config>
    <Common>
        <ListenIP>127.0.0.1</ListenIP>
        <ListenPort>11111</ListenPort>
        <EnableSSL>false</EnableSSL>
    </Common>
</Config>
```

## 🧪 连接测试

### 1. 使用我们的测试脚本

```bash
# 测试OpenD连接
node scripts/test-futu-real-api.cjs

# 测试富途数据源
node scripts/test-futu-datasource.cjs
```

### 2. 手动测试连接

#### 使用telnet测试
```bash
telnet 127.0.0.1 11111
```

如果连接成功，说明OpenD正在运行并监听端口。

#### 使用浏览器测试
访问：`http://127.0.0.1:11111`

如果看到富途OpenAPI的响应，说明连接正常。

### 3. 使用富途API测试

```javascript
// Node.js测试代码
const { FutuAPI } = require('futu-api');

const futu = new FutuAPI({
  ip: '127.0.0.1',
  port: 11111
});

futu.connect().then(() => {
  console.log('✅ 连接成功');
}).catch(error => {
  console.log('❌ 连接失败:', error.message);
});
```

## 🔍 故障排除

### 常见问题

#### 1. 连接被拒绝 (ECONNREFUSED)
**症状**: `connect ECONNREFUSED 127.0.0.1:11111`

**解决方案**:
- 确认OpenD程序已启动
- 检查端口11111是否被其他程序占用
- 确认防火墙设置允许连接

#### 2. 登录失败
**症状**: OpenD显示登录错误

**解决方案**:
- 检查账号密码是否正确
- 确认账号已完成实名认证
- 检查网络连接是否正常
- 尝试重新登录

#### 3. 权限不足
**症状**: 无法获取某些市场的数据

**解决方案**:
- 确认账号具备相应的行情权限
- 联系富途客服开通权限
- 检查账号状态是否正常

#### 4. 端口占用
**症状**: OpenD启动失败，提示端口被占用

**解决方案**:
```bash
# Windows - 查看端口占用
netstat -ano | findstr :11111

# macOS/Linux - 查看端口占用
lsof -i :11111

# 修改OpenD配置使用其他端口
```

### 日志查看

#### OpenD日志位置
- Windows: `%APPDATA%\Futu\FutuOpenD\Log`
- macOS: `~/Library/Application Support/Futu/FutuOpenD/Log`
- Linux: `~/.futu/FutuOpenD/Log`

#### 常用日志文件
- `FutuOpenD.log`: 主程序日志
- `Protocol.log`: 协议通信日志
- `Error.log`: 错误日志

## 🚀 使用建议

### 1. 开发环境
- 使用默认配置（127.0.0.1:11111）
- 启用详细日志记录
- 定期检查连接状态

### 2. 生产环境
- 考虑使用专用服务器运行OpenD
- 配置自动重启机制
- 监控OpenD运行状态
- 定期备份配置文件

### 3. 安全建议
- 不要在公网暴露OpenD端口
- 使用防火墙限制访问
- 定期更新OpenD版本
- 保护账号密码安全

## 📋 检查清单

在开始使用富途数据源之前，请确认：

- [ ] OpenD程序已下载并安装
- [ ] OpenD程序已启动并运行
- [ ] 富途账号已登录成功
- [ ] 端口11111可正常访问
- [ ] 网络连接稳定
- [ ] 具备所需的行情权限
- [ ] 测试脚本运行正常

## 🔗 相关资源

### 官方文档
- [富途OpenAPI官网](https://www.futunn.com/OpenAPI)
- [OpenD下载页面](https://www.futunn.com/download/openAPI)
- [API文档](https://openapi.futunn.com/futu-api-doc/)

### 社区支持
- [富途开发者社区](https://q.futunn.com/)
- [GitHub Issues](https://github.com/FutunnOpen/futu-api-doc/issues)

### 联系支持
- 客服热线：400-886-8886
- 邮箱：openapi@futunn.com

## 📝 更新日志

- **2024-01-XX**: 创建OpenD安装配置指南
- **2024-01-XX**: 添加故障排除章节
- **2024-01-XX**: 完善测试验证步骤

---

完成OpenD的安装配置后，您就可以在股票分析系统中使用富途数据源了！
