'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  // 用户注册
  async register() {
    const { ctx, service } = this;
    const data = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   username: { type: 'string', required: true },
    //   email: { type: 'string', required: true, format: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    //   password: { type: 'string', required: true, min: 6 },
    //   confirmPassword: { type: 'string', required: true },
    // }, data);

    // 手动验证
    if (!data.username) {
      ctx.status = 400;
      ctx.body = { message: '用户名不能为空' };
      return;
    }
    if (!data.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email)) {
      ctx.status = 400;
      ctx.body = { message: '请输入有效的邮箱地址' };
      return;
    }
    if (!data.password || data.password.length < 6) {
      ctx.status = 400;
      ctx.body = { message: '密码长度不能少于6个字符' };
      return;
    }
    if (!data.confirmPassword) {
      ctx.status = 400;
      ctx.body = { message: '请确认密码' };
      return;
    }

    // 检查密码是否匹配
    if (data.password !== data.confirmPassword) {
      ctx.status = 400;
      ctx.body = { message: '两次输入的密码不一致' };
      return;
    }

    try {
      // 创建用户
      const user = await service.user.create(data);
      // 返回用户信息（不包含密码）
      ctx.status = 201;
      ctx.body = user;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // 处理唯一约束错误
        ctx.status = 400;
        if (error.errors[0].path === 'username') {
          ctx.body = { message: '用户名已存在' };
        } else if (error.errors[0].path === 'email') {
          ctx.body = { message: '邮箱已存在' };
        } else {
          ctx.body = { message: '注册失败，请稍后再试' };
        }
      } else {
        // 处理其他错误
        ctx.status = 500;
        ctx.body = { message: '注册失败，请稍后再试' };
        // 记录错误日志
        ctx.logger.error(error);
      }
    }
  }

  // 用户登录
  async login() {
    const { ctx, service, app } = this;
    const data = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   username: { type: 'string', required: true },
    //   password: { type: 'string', required: true },
    // }, data);

    // 手动验证
    if (!data.username) {
      ctx.status = 400;
      ctx.body = { message: '用户名不能为空' };
      return;
    }
    if (!data.password) {
      ctx.status = 400;
      ctx.body = { message: '密码不能为空' };
      return;
    }

    try {
      // 验证用户
      const user = await service.user.verify(data.username, data.password);

      if (!user) {
        ctx.status = 401;
        ctx.body = { message: '用户名或密码错误' };
        return;
      }

      // 生成 JWT 令牌
      const token = app.jwt.sign({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }, app.config.jwt.secret, {
        expiresIn: '24h',
      });

      // 更新最后登录时间
      await service.user.updateLastLogin(user.id);

      // 返回用户信息和令牌
      ctx.body = {
        user,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '登录失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 获取当前用户信息
  async getCurrentUser() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID

    try {
      const user = await service.user.findById(userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = { message: '用户不存在' };
        return;
      }

      ctx.body = user;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '获取用户信息失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 更新用户资料
  async updateProfile() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const data = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   nickname: { type: 'string', required: false, allowEmpty: true },
    //   bio: { type: 'string', required: false, allowEmpty: true },
    //   phone: { type: 'string', required: false, allowEmpty: true },
    //   location: { type: 'string', required: false, allowEmpty: true },
    //   website: { type: 'string', required: false, allowEmpty: true },
    //   avatar: { type: 'string', required: false, allowEmpty: true },
    // }, data);

    try {
      const user = await service.user.updateProfile(userId, data);
      if (!user) {
        ctx.status = 404;
        ctx.body = { message: '用户不存在' };
        return;
      }

      ctx.body = user;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新用户资料失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 更新用户偏好设置
  async updatePreferences() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const data = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   theme: { type: 'enum', values: ['light', 'dark', 'auto'], required: false },
    //   language: { type: 'enum', values: ['zh-CN', 'en-US'], required: false },
    //   defaultDashboardLayout: { type: 'string', required: false, allowEmpty: true },
    //   emailNotifications: { type: 'boolean', required: false },
    //   pushNotifications: { type: 'boolean', required: false },
    //   defaultStockSymbol: { type: 'string', required: false, allowEmpty: true },
    //   defaultTimeframe: { type: 'string', required: false, allowEmpty: true },
    //   defaultChartType: { type: 'string', required: false, allowEmpty: true },
    // }, data);

    // 手动验证
    if (data.theme && !['light', 'dark', 'auto'].includes(data.theme)) {
      ctx.status = 400;
      ctx.body = { message: '主题值无效' };
      return;
    }
    if (data.language && !['zh-CN', 'en-US'].includes(data.language)) {
      ctx.status = 400;
      ctx.body = { message: '语言值无效' };
      return;
    }

    try {
      const preferences = await service.user.updatePreferences(userId, data);
      if (!preferences) {
        ctx.status = 404;
        ctx.body = { message: '用户不存在' };
        return;
      }

      ctx.body = preferences;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新偏好设置失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 更新用户密码
  async updatePassword() {
    const { ctx, service } = this;
    const userId = ctx.user ? ctx.user.id : 1; // 如果没有用户信息，使用默认用户ID
    const data = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   oldPassword: { type: 'string', required: true },
    //   newPassword: { type: 'string', required: true, min: 6 },
    //   confirmPassword: { type: 'string', required: true },
    // }, data);

    // 手动验证
    if (!data.oldPassword) {
      ctx.status = 400;
      ctx.body = { message: '请输入当前密码' };
      return;
    }
    if (!data.newPassword || data.newPassword.length < 6) {
      ctx.status = 400;
      ctx.body = { message: '新密码长度不能少于6个字符' };
      return;
    }
    if (!data.confirmPassword) {
      ctx.status = 400;
      ctx.body = { message: '请确认新密码' };
      return;
    }

    // 检查新密码是否匹配
    if (data.newPassword !== data.confirmPassword) {
      ctx.status = 400;
      ctx.body = { message: '两次输入的新密码不一致' };
      return;
    }

    try {
      const success = await service.user.updatePassword(userId, data.oldPassword, data.newPassword);
      if (!success) {
        ctx.status = 401;
        ctx.body = { message: '当前密码错误' };
        return;
      }

      ctx.body = { message: '密码已成功更新' };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '更新密码失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 请求密码重置
  async requestPasswordReset() {
    const { ctx, service } = this;
    const { email } = ctx.request.body;

    // 参数验证
    // 暂时注释掉，因为我们禁用了 egg-validate 插件
    // ctx.validate({
    //   email: { type: 'string', required: true, format: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    // }, { email });

    // 手动验证
    if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      ctx.status = 400;
      ctx.body = { message: '请输入有效的邮箱地址' };
      return;
    }

    try {
      await service.user.requestPasswordReset(email);
      // 出于安全考虑，无论邮箱是否存在都返回成功
      ctx.body = { message: '如果该邮箱存在，我们已发送密码重置链接' };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { message: '请求密码重置失败，请稍后再试' };
      // 记录错误日志
      ctx.logger.error(error);
    }
  }

  // 验证令牌
  async validateToken() {
    const { ctx } = this;
    // 如果能到达这个控制器方法，说明令牌已经通过了中间件的验证
    ctx.body = { valid: true };
  }
}

module.exports = UserController;
