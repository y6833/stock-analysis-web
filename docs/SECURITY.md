# 安全增强措施

本文档描述了股票分析网站项目中实施的安全增强措施，包括CSRF保护、XSS防护、速率限制和敏感数据处理。

## 1. CSRF保护

跨站请求伪造（CSRF）是一种攻击，迫使用户在已认证的Web应用程序中执行不需要的操作。我们实施了以下CSRF保护措施：

### 服务器端
- 使用双重提交Cookie模式验证CSRF令牌
- 为每个会话生成唯一的CSRF令牌
- 在所有非GET请求中验证CSRF令牌
- 提供API端点用于获取新的CSRF令牌

### 客户端
- 自动将CSRF令牌添加到所有非GET请求
- 在令牌无效时自动刷新令牌
- 提供`useSecurity`组合式API用于在组件中获取和刷新令牌

## 2. XSS防护

跨站脚本（XSS）是一种注入攻击，攻击者可以在网页中注入恶意脚本。我们实施了以下XSS防护措施：

### 服务器端
- 使用`xss`库清理所有用户输入
- 在响应中设置适当的内容安全策略（CSP）头
- 设置`X-XSS-Protection`头启用浏览器内置的XSS过滤器

### 客户端
- 使用`DOMPurify`库清理HTML内容
- 提供`v-sanitize`和`v-safe-html`指令用于安全渲染HTML
- 实现恶意内容检测，阻止潜在的XSS攻击

## 3. 速率限制和防暴力攻击

为了防止暴力攻击和API滥用，我们实施了以下措施：

### 服务器端
- 基于IP地址和路径的API请求速率限制
- 登录尝试限制（5次失败后锁定15分钟）
- 在响应中设置适当的速率限制头（X-RateLimit-*）

### 客户端
- 实现本地速率限制，防止过多的UI操作
- 提供`v-rate-limit`指令用于限制按钮点击频率
- 在速率限制触发时提供用户反馈

## 4. 敏感数据处理

为了保护敏感数据，我们实施了以下措施：

### 服务器端
- 使用bcrypt哈希存储密码
- 实施数据库字段加密
- 审计日志记录敏感操作
- 实施适当的数据访问控制

### 客户端
- 提供数据掩码功能，用于显示敏感信息
- 安全存储本地敏感数据
- 提供`v-mask-data`指令用于掩码显示敏感数据

## 5. 安全审计和监控

为了监控和审计安全事件，我们实施了以下措施：

### 服务器端
- 记录所有安全相关事件
- 记录所有API请求
- 记录所有登录尝试
- 提供安全事件查询API

### 客户端
- 记录客户端安全事件
- 在检测到安全问题时通知用户

## 6. 安全配置

### 内容安全策略（CSP）
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self';
```

### HTTP安全头
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`（非开发环境）

## 7. 使用指南

### CSRF保护
```typescript
// 获取CSRF令牌
const { getCsrfToken } = useSecurity();
const token = getCsrfToken();

// 刷新CSRF令牌
await securityService.refreshCsrfToken();
```

### XSS防护
```html
<!-- 安全渲染HTML -->
<div v-sanitize="htmlContent"></div>

<!-- 检测并清理HTML -->
<div v-safe-html="htmlContent"></div>
```

### 敏感数据掩码
```html
<!-- 掩码电话号码 -->
<span v-mask-data:phone="phoneNumber"></span>

<!-- 掩码邮箱 -->
<span v-mask-data:email="emailAddress"></span>
```

### 速率限制
```html
<!-- 限制按钮点击频率 -->
<button v-rate-limit="{ key: 'submit-form', limit: 3, window: 60000 }" @click="submitForm">
  提交
</button>
```

## 8. 安全最佳实践

1. 始终验证用户输入
2. 使用参数化查询防止SQL注入
3. 实施最小权限原则
4. 保持依赖项更新
5. 定期进行安全审计
6. 实施适当的错误处理
7. 使用HTTPS加密所有通信
8. 实施强密码策略
9. 定期备份数据
10. 提供安全培训