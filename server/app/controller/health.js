'use strict';

const Controller = require('egg').Controller;

class HealthController extends Controller {
  // 检查数据库连接
  async database() {
    const { ctx, app } = this;
    
    try {
      // 测试数据库连接
      await app.model.query('SELECT 1 as test');
      
      ctx.body = {
        success: true,
        message: '数据库连接正常',
        database: app.config.sequelize.database,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '数据库连接失败',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 检查用户表
  async userTable() {
    const { ctx } = this;
    
    try {
      // 检查用户表是否存在并获取用户数量
      const userCount = await ctx.model.User.count();
      
      // 检查表结构
      const tableInfo = await ctx.model.query(
        "DESCRIBE users",
        { type: ctx.model.QueryTypes.SELECT }
      );
      
      ctx.body = {
        success: true,
        message: '用户表检查正常',
        userCount: userCount,
        tableFields: tableInfo.map(field => field.Field),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '用户表检查失败',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 检查JWT配置
  async jwt() {
    const { ctx, app } = this;
    
    try {
      // 检查JWT配置
      const jwtConfig = app.config.jwt;
      
      if (!jwtConfig || !jwtConfig.secret) {
        throw new Error('JWT配置缺失');
      }
      
      // 测试JWT生成和验证
      const testPayload = { test: true, timestamp: Date.now() };
      const token = app.jwt.sign(testPayload, jwtConfig.secret, { expiresIn: '1m' });
      const decoded = app.jwt.verify(token, jwtConfig.secret);
      
      if (decoded.test !== true) {
        throw new Error('JWT验证失败');
      }
      
      ctx.body = {
        success: true,
        message: 'JWT配置正常',
        algorithm: 'HS256',
        expiresIn: '24h',
        secretLength: jwtConfig.secret.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'JWT配置异常',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 系统整体健康检查
  async system() {
    const { ctx, app } = this;
    
    try {
      const checks = {
        database: false,
        userTable: false,
        jwt: false,
        memory: false,
        uptime: false
      };
      
      const errors = [];
      
      // 检查数据库
      try {
        await app.model.query('SELECT 1 as test');
        checks.database = true;
      } catch (error) {
        errors.push(`数据库: ${error.message}`);
      }
      
      // 检查用户表
      try {
        await ctx.model.User.count();
        checks.userTable = true;
      } catch (error) {
        errors.push(`用户表: ${error.message}`);
      }
      
      // 检查JWT
      try {
        const jwtConfig = app.config.jwt;
        if (jwtConfig && jwtConfig.secret) {
          const testToken = app.jwt.sign({ test: true }, jwtConfig.secret, { expiresIn: '1m' });
          app.jwt.verify(testToken, jwtConfig.secret);
          checks.jwt = true;
        } else {
          errors.push('JWT: 配置缺失');
        }
      } catch (error) {
        errors.push(`JWT: ${error.message}`);
      }
      
      // 检查内存使用
      const memUsage = process.memoryUsage();
      checks.memory = memUsage.heapUsed < 500 * 1024 * 1024; // 小于500MB
      if (!checks.memory) {
        errors.push(`内存: 使用过高 ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
      
      // 检查运行时间
      const uptime = process.uptime();
      checks.uptime = uptime > 0;
      
      const allHealthy = Object.values(checks).every(check => check === true);
      
      ctx.status = allHealthy ? 200 : 503;
      ctx.body = {
        success: allHealthy,
        message: allHealthy ? '系统健康' : '系统存在问题',
        checks: checks,
        errors: errors,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: Math.round(uptime),
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '系统健康检查失败',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 创建测试用户
  async createTestUser() {
    const { ctx } = this;
    
    try {
      const testUsers = [
        {
          username: 'admin',
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin'
        },
        {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'user'
        },
        {
          username: 'demo',
          email: 'demo@example.com',
          password: 'demo123',
          role: 'user'
        }
      ];
      
      const createdUsers = [];
      const existingUsers = [];
      
      for (const userData of testUsers) {
        try {
          // 检查用户是否已存在
          const existingUser = await ctx.model.User.findOne({
            where: {
              [ctx.app.Sequelize.Op.or]: [
                { username: userData.username },
                { email: userData.email }
              ]
            }
          });
          
          if (existingUser) {
            existingUsers.push(userData.username);
            continue;
          }
          
          // 创建用户
          const user = await ctx.service.user.create(userData);
          createdUsers.push(user.username);
          
        } catch (error) {
          console.error(`创建用户 ${userData.username} 失败:`, error);
        }
      }
      
      ctx.body = {
        success: true,
        message: '测试用户处理完成',
        created: createdUsers,
        existing: existingUsers,
        testAccounts: testUsers.map(user => ({
          username: user.username,
          password: user.password,
          role: user.role
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '创建测试用户失败',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 重置测试用户密码
  async resetTestPasswords() {
    const { ctx } = this;
    
    try {
      const testUsers = ['admin', 'testuser', 'demo'];
      const resetResults = [];
      
      for (const username of testUsers) {
        try {
          const user = await ctx.model.User.findOne({
            where: { username: username }
          });
          
          if (user) {
            // 重置密码
            const newPassword = username === 'admin' ? 'admin123' : 'password123';
            const hashedPassword = ctx.service.user.hashPassword(newPassword);
            
            await user.update({
              password: hashedPassword,
              updatedAt: new Date()
            });
            
            resetResults.push({
              username: username,
              success: true,
              newPassword: newPassword
            });
          } else {
            resetResults.push({
              username: username,
              success: false,
              error: '用户不存在'
            });
          }
        } catch (error) {
          resetResults.push({
            username: username,
            success: false,
            error: error.message
          });
        }
      }
      
      ctx.body = {
        success: true,
        message: '密码重置处理完成',
        results: resetResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '密码重置失败',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = HealthController;
