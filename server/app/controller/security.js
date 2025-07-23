'use strict';

const Controller = require('egg').Controller;
const crypto = require('crypto');

/**
 * 安全控制器
 * 处理CSRF令牌和其他安全相关的请求
 */
class SecurityController extends Controller {
  /**
   * 生成CSRF令牌
   */
  async generateCsrfToken() {
    const { ctx } = this;
    
    // 生成随机令牌
    const token = crypto.randomBytes(16).toString('hex');
    
    // 设置CSRF Cookie
    ctx.cookies.set('csrfToken', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.app.config.env !== 'local',
      maxAge: 24 * 60 * 60 * 1000, // 24小时
    });
    
    // 返回令牌
    ctx.body = {
      success: true,
      token,
    };
  }
  
  /**
   * 验证CSRF令牌
   */
  async validateCsrfToken() {
    const { ctx } = this;
    
    // 获取令牌
    const cookieToken = ctx.cookies.get('csrfToken');
    const headerToken = ctx.get('x-csrf-token');
    
    // 验证令牌
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        error: 'invalid_csrf_token',
        message: 'CSRF令牌无效',
      };
      return;
    }
    
    ctx.body = {
      success: true,
      message: 'CSRF令牌有效',
    };
  }
  
  /**
   * 获取安全配置
   */
  async getSecurityConfig() {
    const { ctx } = this;
    
    // 返回客户端可见的安全配置
    ctx.body = {
      success: true,
      config: {
        csrfEnabled: this.app.config.security.csrf.enable,
        xssProtectionEnabled: true,
        contentSecurityPolicy: true,
        rateLimitEnabled: true,
      },
    };
  }
}

module.exports = SecurityController;