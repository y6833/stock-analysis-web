'use strict';

const Controller = require('egg').Controller;
const crypto = require('crypto');
const xss = require('xss');

/**
 * 认证控制器
 * 处理用户认证、授权和会话管理
 */
class AuthController extends Controller {
  /**
   * 用户注册
   */
  async register() {
    const { ctx, service } = this;
    const { username, email, password, confirmPassword } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        username: { type: 'string', required: true, min: 3, max: 30 },
        email: { type: 'email', required: true },
        password: { type: 'string', required: true, min: 8 },
        confirmPassword: { type: 'string', required: true },
      });
      
      // 检查密码确认
      if (password !== confirmPassword) {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '密码和确认密码不匹配',
        };
        return;
      }
      
      // 清理输入，防止XSS攻击
      const sanitizedUsername = xss(username);
      const sanitizedEmail = xss(email);
      
      // 检查用户名和邮箱是否已存在
      const existingUser = await service.user.findByUsernameOrEmail(sanitizedUsername, sanitizedEmail);
      if (existingUser) {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '用户名或邮箱已被使用',
        };
        return;
      }
      
      // 创建用户
      const user = await service.user.create({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password,
      });
      
      // 记录安全事件
      await service.securityAudit.logSecurityEvent({
        eventType: 'user_registered',
        eventDetails: { userId: user.id, username: sanitizedUsername, email: sanitizedEmail },
        severity: 'info',
        userId: user.id,
      });
      
      // 返回成功响应
      ctx.status = 201;
      ctx.body = {
        success: true,
        message: '注册成功',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '注册失败',
      };
      
      // 记录错误
      ctx.logger.error('用户注册失败:', error);
    }
  }
  
  /**
   * 用户登录
   */
  async login() {
    const { ctx, service, app } = this;
    const { email, password } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        email: { type: 'email', required: true },
        password: { type: 'string', required: true },
      });
      
      // 清理输入，防止XSS攻击
      const sanitizedEmail = xss(email);
      
      // 检查是否应该阻止登录尝试
      const { shouldBlock, remainingAttempts } = await service.securityAudit.shouldBlockLoginAttempt({
        email: sanitizedEmail,
      });
      
      if (shouldBlock) {
        ctx.status = 429;
        ctx.body = {
          success: false,
          message: '登录尝试次数过多，请稍后再试',
          retryAfter: Math.ceil(this.config.security.bruteForce.blockDuration / 1000),
        };
        
        // 设置Retry-After头
        ctx.set('Retry-After', Math.ceil(this.config.security.bruteForce.blockDuration / 1000).toString());
        return;
      }
      
      // 查找用户
      const user = await service.user.findByEmail(sanitizedEmail);
      
      // 如果用户不存在或密码不正确
      if (!user || !(await service.user.verifyPassword(user, password))) {
        // 记录失败的登录尝试
        await service.securityAudit.logLoginAttempt({
          email: sanitizedEmail,
          success: false,
          userId: user ? user.id : null,
        });
        
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '邮箱或密码不正确',
          remainingAttempts,
        };
        return;
      }
      
      // 检查用户状态
      if (!user.isActive) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '账户已被禁用',
        };
        return;
      }
      
      // 生成JWT令牌
      const token = app.jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        app.config.jwt.secret,
        {
          expiresIn: app.config.jwt.expiresIn,
        }
      );
      
      // 生成刷新令牌
      const refreshToken = crypto.randomBytes(32).toString('hex');
      
      // 计算过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
      
      // 保存刷新令牌
      await service.user.saveRefreshToken(user.id, refreshToken, expiresAt);
      
      // 更新最后登录时间
      await service.user.updateLastLogin(user.id);
      
      // 记录成功的登录尝试
      await service.securityAudit.logLoginAttempt({
        email: sanitizedEmail,
        success: true,
        userId: user.id,
      });
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '登录成功',
        token,
        refreshToken,
        expiresAt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '登录失败',
      };
      
      // 记录错误
      ctx.logger.error('用户登录失败:', error);
    }
  }
  
  /**
   * 用户登出
   */
  async logout() {
    const { ctx, service } = this;
    
    try {
      // 获取用户ID
      const userId = ctx.user ? ctx.user.id : null;
      
      if (userId) {
        // 清除刷新令牌
        await service.user.clearRefreshTokens(userId);
        
        // 记录安全事件
        await service.securityAudit.logSecurityEvent({
          eventType: 'user_logout',
          eventDetails: { userId },
          severity: 'info',
          userId,
        });
      }
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '登出成功',
      };
    } catch (error) {
      // 处理错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '登出失败',
      };
      
      // 记录错误
      ctx.logger.error('用户登出失败:', error);
    }
  }
  
  /**
   * 刷新令牌
   */
  async refreshToken() {
    const { ctx, service, app } = this;
    const { refreshToken } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        refreshToken: { type: 'string', required: true },
      });
      
      // 验证刷新令牌
      const user = await service.user.findByRefreshToken(refreshToken);
      
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '无效的刷新令牌',
        };
        return;
      }
      
      // 检查用户状态
      if (!user.isActive) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '账户已被禁用',
        };
        return;
      }
      
      // 生成新的JWT令牌
      const token = app.jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        app.config.jwt.secret,
        {
          expiresIn: app.config.jwt.expiresIn,
        }
      );
      
      // 计算过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期
      
      // 记录安全事件
      await service.securityAudit.logSecurityEvent({
        eventType: 'token_refreshed',
        eventDetails: { userId: user.id },
        severity: 'info',
        userId: user.id,
      });
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '令牌刷新成功',
        token,
        expiresAt,
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '令牌刷新失败',
      };
      
      // 记录错误
      ctx.logger.error('令牌刷新失败:', error);
    }
  }
  
  /**
   * 验证令牌
   */
  async validateToken() {
    const { ctx } = this;
    
    // 令牌验证由JWT中间件处理，如果到达这里，令牌有效
    ctx.body = {
      success: true,
      message: '令牌有效',
      user: ctx.user,
    };
  }
  
  /**
   * 请求密码重置
   */
  async requestPasswordReset() {
    const { ctx, service } = this;
    const { email } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        email: { type: 'email', required: true },
      });
      
      // 清理输入，防止XSS攻击
      const sanitizedEmail = xss(email);
      
      // 查找用户
      const user = await service.user.findByEmail(sanitizedEmail);
      
      // 即使用户不存在，也返回成功响应，以防止用户枚举
      if (!user) {
        ctx.body = {
          success: true,
          message: '如果邮箱存在，重置链接将发送到该邮箱',
        };
        return;
      }
      
      // 生成重置令牌
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // 计算过期时间（1小时后）
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // 保存重置令牌
      await service.user.savePasswordResetToken(user.id, resetToken, expiresAt);
      
      // 发送重置邮件
      await service.email.sendPasswordResetEmail(user.email, resetToken);
      
      // 记录安全事件
      await service.securityAudit.logSecurityEvent({
        eventType: 'password_reset_requested',
        eventDetails: { userId: user.id, email: user.email },
        severity: 'info',
        userId: user.id,
      });
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '如果邮箱存在，重置链接将发送到该邮箱',
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '请求密码重置失败',
      };
      
      // 记录错误
      ctx.logger.error('请求密码重置失败:', error);
    }
  }
  
  /**
   * 重置密码
   */
  async resetPassword() {
    const { ctx, service } = this;
    const { token, newPassword } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        token: { type: 'string', required: true },
        newPassword: { type: 'string', required: true, min: 8 },
      });
      
      // 验证重置令牌
      const user = await service.user.findByPasswordResetToken(token);
      
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '无效或已过期的重置令牌',
        };
        return;
      }
      
      // 更新密码
      await service.user.updatePassword(user.id, newPassword);
      
      // 清除重置令牌
      await service.user.clearPasswordResetToken(user.id);
      
      // 清除所有刷新令牌，强制用户重新登录
      await service.user.clearRefreshTokens(user.id);
      
      // 记录安全事件
      await service.securityAudit.logSecurityEvent({
        eventType: 'password_reset_completed',
        eventDetails: { userId: user.id },
        severity: 'info',
        userId: user.id,
      });
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '密码重置成功，请使用新密码登录',
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '密码重置失败',
      };
      
      // 记录错误
      ctx.logger.error('密码重置失败:', error);
    }
  }
  
  /**
   * 更新密码
   */
  async updatePassword() {
    const { ctx, service } = this;
    const { currentPassword, newPassword } = ctx.request.body;
    
    try {
      // 验证输入
      ctx.validate({
        currentPassword: { type: 'string', required: true },
        newPassword: { type: 'string', required: true, min: 8 },
      });
      
      // 获取当前用户
      const userId = ctx.user.id;
      const user = await service.user.findById(userId);
      
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '用户不存在',
        };
        return;
      }
      
      // 验证当前密码
      const isPasswordValid = await service.user.verifyPassword(user, currentPassword);
      
      if (!isPasswordValid) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '当前密码不正确',
        };
        return;
      }
      
      // 更新密码
      await service.user.updatePassword(userId, newPassword);
      
      // 记录安全事件
      await service.securityAudit.logSecurityEvent({
        eventType: 'password_changed',
        eventDetails: { userId },
        severity: 'info',
        userId,
      });
      
      // 返回成功响应
      ctx.body = {
        success: true,
        message: '密码更新成功',
      };
    } catch (error) {
      // 处理验证错误
      if (error.name === 'ValidationError') {
        ctx.status = 422;
        ctx.body = {
          success: false,
          message: '输入验证失败',
          errors: error.errors,
        };
        return;
      }
      
      // 处理其他错误
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '密码更新失败',
      };
      
      // 记录错误
      ctx.logger.error('密码更新失败:', error);
    }
  }
}

module.exports = AuthController;