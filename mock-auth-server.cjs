// 简单的模拟认证服务器，用于处理用户认证请求
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key'; // 在实际应用中，这应该是一个环境变量

// 启用 CORS
app.use(cors());
// 解析 JSON 请求体
app.use(bodyParser.json());

// 模拟用户数据库
const users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: hashPassword('admin123'), // 密码: admin123
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    avatar: null,
    nickname: '管理员',
    bio: '系统管理员',
    phone: '13800138000',
    location: '北京',
    website: 'https://example.com',
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      defaultDashboardLayout: 'default',
      emailNotifications: true,
      pushNotifications: true,
      defaultStockSymbol: '000001.SZ',
      defaultTimeframe: 'day',
      defaultChartType: 'candle'
    }
  },
  {
    id: '2',
    username: 'user',
    email: 'user@example.com',
    password: hashPassword('user123'), // 密码: user123
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    avatar: null,
    nickname: '普通用户',
    bio: '我是一名股票爱好者',
    phone: '13900139000',
    location: '上海',
    website: '',
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      defaultDashboardLayout: 'default',
      emailNotifications: true,
      pushNotifications: true,
      defaultStockSymbol: '',
      defaultTimeframe: '',
      defaultChartType: ''
    }
  }
];

// 哈希密码函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 验证密码函数
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// 生成 JWT 令牌
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// 验证 JWT 令牌中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '令牌无效或已过期' });
    }
    
    req.user = user;
    next();
  });
}

// 用户注册
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  // 验证请求数据
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: '所有字段都是必填的' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: '两次输入的密码不一致' });
  }
  
  // 检查用户名和邮箱是否已存在
  if (users.some(user => user.username === username)) {
    return res.status(400).json({ message: '用户名已存在' });
  }
  
  if (users.some(user => user.email === email)) {
    return res.status(400).json({ message: '邮箱已存在' });
  }
  
  // 创建新用户
  const newUser = {
    id: (users.length + 1).toString(),
    username,
    email,
    password: hashPassword(password),
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    avatar: null,
    nickname: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      defaultDashboardLayout: 'default',
      emailNotifications: true,
      pushNotifications: true,
      defaultStockSymbol: '',
      defaultTimeframe: '',
      defaultChartType: ''
    }
  };
  
  users.push(newUser);
  
  // 返回用户信息（不包含密码）
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // 验证请求数据
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码是必填的' });
  }
  
  // 查找用户
  const user = users.find(u => u.username === username || u.email === username);
  
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  // 验证密码
  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  
  // 更新最后登录时间
  user.lastLogin = new Date().toISOString();
  
  // 生成令牌
  const token = generateToken(user);
  
  // 返回用户信息和令牌（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    user: userWithoutPassword,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

// 验证令牌
app.get('/api/auth/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ valid: true });
});

// 获取用户资料
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  // 返回用户资料（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// 更新用户资料
app.put('/api/users/profile', authenticateToken, (req, res) => {
  const { nickname, bio, phone, location, website, avatar } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  // 更新用户资料
  if (nickname !== undefined) user.nickname = nickname;
  if (bio !== undefined) user.bio = bio;
  if (phone !== undefined) user.phone = phone;
  if (location !== undefined) user.location = location;
  if (website !== undefined) user.website = website;
  if (avatar !== undefined) user.avatar = avatar;
  
  // 返回更新后的用户资料（不包含密码）
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// 更新用户偏好设置
app.put('/api/users/preferences', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  // 更新用户偏好设置
  user.preferences = { ...user.preferences, ...req.body };
  
  // 返回更新后的偏好设置
  res.json(user.preferences);
});

// 更新用户密码
app.put('/api/users/password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  // 验证请求数据
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: '所有字段都是必填的' });
  }
  
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: '两次输入的新密码不一致' });
  }
  
  // 验证旧密码
  if (!verifyPassword(oldPassword, user.password)) {
    return res.status(401).json({ message: '当前密码错误' });
  }
  
  // 更新密码
  user.password = hashPassword(newPassword);
  
  res.status(200).json({ message: '密码已成功更新' });
});

// 请求密码重置
app.post('/api/auth/password-reset-request', (req, res) => {
  const { email } = req.body;
  
  // 验证请求数据
  if (!email) {
    return res.status(400).json({ message: '邮箱是必填的' });
  }
  
  // 查找用户
  const user = users.find(u => u.email === email);
  
  if (!user) {
    // 出于安全考虑，即使用户不存在也返回成功
    return res.status(200).json({ message: '如果该邮箱存在，我们已发送密码重置链接' });
  }
  
  // 在实际应用中，这里应该发送包含重置链接的邮件
  // 这里仅做演示，直接返回成功
  res.status(200).json({ message: '如果该邮箱存在，我们已发送密码重置链接' });
});

// 添加根路径处理
app.get('/', (req, res) => {
  console.log('收到根路径请求');
  res.send('认证服务器正在运行，请使用 API 端点访问服务');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`认证服务器运行在 http://localhost:${PORT}`);
  console.log('可用的测试账户:');
  console.log('- 管理员: 用户名 admin, 密码 admin123');
  console.log('- 普通用户: 用户名 user, 密码 user123');
});
