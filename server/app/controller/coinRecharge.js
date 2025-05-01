'use strict';

const Controller = require('egg').Controller;

/**
 * 逗币充值控制器
 */
class CoinRechargeController extends Controller {
  /**
   * 创建充值请求
   */
  async createRechargeRequest() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { amount, paymentAmount, paymentMethod, remark } = ctx.request.body;
    
    try {
      // 参数验证
      ctx.validate({
        amount: { type: 'integer', min: 1 },
        paymentAmount: { type: 'number', min: 0.01 },
        paymentMethod: { type: 'string', required: false },
        remark: { type: 'string', required: false },
      });
      
      const result = await ctx.service.coinRecharge.createRechargeRequest({
        userId,
        amount,
        paymentAmount,
        paymentMethod,
        remark,
      });
      
      ctx.body = {
        success: true,
        message: '充值请求已提交，请等待管理员审核',
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '创建充值请求失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 获取用户充值请求列表
   */
  async getUserRechargeRequests() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { page, pageSize, status } = ctx.query;
    
    try {
      const result = await ctx.service.coinRecharge.getUserRechargeRequests(userId, {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        status,
      });
      
      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取充值请求列表失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 获取所有充值请求（管理员）
   */
  async getAllRechargeRequests() {
    const { ctx } = this;
    
    // 检查管理员权限
    if (!ctx.user || ctx.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限执行此操作',
      };
      return;
    }
    
    const { page, pageSize, status, userId } = ctx.query;
    
    try {
      const result = await ctx.service.coinRecharge.getAllRechargeRequests({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        status,
        userId: userId ? parseInt(userId) : undefined,
      });
      
      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取充值请求列表失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 处理充值请求（管理员）
   */
  async processRechargeRequest() {
    const { ctx } = this;
    
    // 检查管理员权限
    if (!ctx.user || ctx.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限执行此操作',
      };
      return;
    }
    
    const { requestId } = ctx.params;
    const { status, adminRemark } = ctx.request.body;
    
    try {
      // 参数验证
      ctx.validate({
        status: { type: 'enum', values: ['completed', 'rejected', 'cancelled'] },
        adminRemark: { type: 'string', required: false },
      });
      
      const result = await ctx.service.coinRecharge.processRechargeRequest(requestId, {
        status,
        adminRemark,
        adminId: ctx.user.id,
      });
      
      ctx.body = {
        success: true,
        message: `充值请求已${status === 'completed' ? '完成' : status === 'rejected' ? '拒绝' : '取消'}`,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '处理充值请求失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 取消充值请求（用户）
   */
  async cancelRechargeRequest() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { requestId } = ctx.params;
    
    try {
      const result = await ctx.service.coinRecharge.cancelRechargeRequest(requestId, userId);
      
      ctx.body = {
        success: true,
        message: '充值请求已取消',
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '取消充值请求失败',
        error: error.message,
      };
    }
  }
  
  /**
   * 获取充值请求详情
   */
  async getRechargeRequestDetail() {
    const { ctx } = this;
    const { requestId } = ctx.params;
    
    try {
      const result = await ctx.service.coinRecharge.getRechargeRequestDetail(requestId);
      
      // 检查权限
      if (ctx.user.role !== 'admin' && result.data.userId !== ctx.user.id) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限查看此充值请求',
        };
        return;
      }
      
      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '获取充值请求详情失败',
        error: error.message,
      };
    }
  }
}

module.exports = CoinRechargeController;
