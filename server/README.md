# 股票分析系统后端服务

这是股票分析系统的后端服务，基于 Egg.js 框架和 MySQL 数据库开发。

## 功能特点

- 用户认证与授权（JWT）
- 用户资料管理
- 用户偏好设置
- RESTful API
- 数据库迁移和种子数据

## 技术栈

- **框架**: Egg.js
- **数据库**: MySQL
- **ORM**: Sequelize
- **认证**: JWT (JSON Web Token)
- **API 文档**: Swagger/OpenAPI

## 开发环境设置

### 前提条件

- Node.js (>= 16.0.0)
- MySQL (>= 5.7)

### 安装依赖

```bash
cd server
npm install
```

### 配置数据库

1. 创建 MySQL 数据库:

```sql
CREATE DATABASE stock_analysis CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

2. 修改数据库配置:

编辑 `config/config.default.js` 文件中的数据库配置部分，填入你的 MySQL 连接信息:

```js
config.sequelize = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'stock_analysis',
  username: 'root',
  password: 'root',
  // ...
}
```

### 数据库迁移

运行数据库迁移，创建表结构:

```bash
npx sequelize db:migrate
```

### 添加种子数据

添加示例用户数据:

```bash
npx sequelize db:seed:all
```

## 启动服务

### 开发模式

```bash
npm run dev
```

服务将在 http://localhost:7001 上运行。

### 生产模式

```bash
npm start
```

## API 文档

### 认证 API

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/password-reset-request` - 请求密码重置
- `GET /api/auth/validate-token` - 验证令牌 (需要认证)

### 用户 API

- `GET /api/users/profile` - 获取当前用户信息 (需要认证)
- `PUT /api/users/profile` - 更新用户资料 (需要认证)
- `PUT /api/users/preferences` - 更新用户偏好设置 (需要认证)
- `PUT /api/users/password` - 更新用户密码 (需要认证)

## 测试账户

系统预设了两个测试账户:

1. 管理员账户:

   - 用户名: `admin`
   - 密码: `admin123`

2. 普通用户账户:
   - 用户名: `user`
   - 密码: `user123`

## 许可证

MIT
