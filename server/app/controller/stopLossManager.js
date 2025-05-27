'use strict';

const Controller = require('egg').Controller;

class StopLossManagerController extends Controller {

  /**
   * 创建止损止盈配置
   */
  async createConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const configData = ctx.request.body;
      
      // 验证必填字段
      if (!configData.configName || !configData.stopLossType || !configData.takeProfitType) {
        ctx.body = {
          success: false,
          message: '配置名称、止损类型和止盈类型为必填项'
        };
        return;
      }

      const result = await ctx.service.stopLossManager.createStopLossConfig(user.id, configData);
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: '止损止盈配置创建成功',
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('创建止损止盈配置失败:', error);
      ctx.body = {
        success: false,
        message: '创建配置失败: ' + error.message
      };
    }
  }

  /**
   * 获取止损止盈配置列表
   */
  async getConfigs() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioId, symbol, isActive } = ctx.query;
      
      const options = {};
      if (portfolioId) options.portfolioId = parseInt(portfolioId);
      if (symbol) options.symbol = symbol;
      if (isActive !== undefined) options.isActive = isActive === 'true';

      const result = await ctx.service.stopLossManager.getStopLossConfigs(user.id, options);
      
      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('获取止损止盈配置失败:', error);
      ctx.body = {
        success: false,
        message: '获取配置失败: ' + error.message
      };
    }
  }

  /**
   * 更新止损止盈配置
   */
  async updateConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    const configId = parseInt(ctx.params.id);
    
    try {
      const updateData = ctx.request.body;
      
      // 验证配置权限
      const config = await ctx.model.StopLossConfig.findOne({
        where: { id: configId, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '配置不存在或无权限'
        };
        return;
      }

      // 更新配置
      await config.update(updateData);

      ctx.body = {
        success: true,
        message: '配置更新成功',
        data: config
      };

    } catch (error) {
      ctx.logger.error('更新止损止盈配置失败:', error);
      ctx.body = {
        success: false,
        message: '更新配置失败: ' + error.message
      };
    }
  }

  /**
   * 删除止损止盈配置
   */
  async deleteConfig() {
    const { ctx } = this;
    const { user } = ctx.state;
    const configId = parseInt(ctx.params.id);
    
    try {
      // 验证配置权限
      const config = await ctx.model.StopLossConfig.findOne({
        where: { id: configId, userId: user.id }
      });

      if (!config) {
        ctx.body = {
          success: false,
          message: '配置不存在或无权限'
        };
        return;
      }

      // 检查是否有关联的活跃订单
      const activeOrders = await ctx.model.StopLossOrder.count({
        where: {
          configId: configId,
          status: ['pending', 'triggered']
        }
      });

      if (activeOrders > 0) {
        ctx.body = {
          success: false,
          message: '该配置下还有活跃订单，无法删除'
        };
        return;
      }

      // 删除配置
      await config.destroy();

      ctx.body = {
        success: true,
        message: '配置删除成功'
      };

    } catch (error) {
      ctx.logger.error('删除止损止盈配置失败:', error);
      ctx.body = {
        success: false,
        message: '删除配置失败: ' + error.message
      };
    }
  }

  /**
   * 创建止损止盈订单
   */
  async createOrder() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const orderData = ctx.request.body;
      
      // 验证必填字段
      if (!orderData.symbol || !orderData.orderType || !orderData.triggerPrice || !orderData.quantity) {
        ctx.body = {
          success: false,
          message: '股票代码、订单类型、触发价格和数量为必填项'
        };
        return;
      }

      const result = await ctx.service.stopLossManager.createStopLossOrder(user.id, orderData);
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: '止损止盈订单创建成功',
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('创建止损止盈订单失败:', error);
      ctx.body = {
        success: false,
        message: '创建订单失败: ' + error.message
      };
    }
  }

  /**
   * 获取止损止盈订单列表
   */
  async getOrders() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { portfolioId, symbol, status, orderType, limit } = ctx.query;
      
      const options = {};
      if (portfolioId) options.portfolioId = parseInt(portfolioId);
      if (symbol) options.symbol = symbol;
      if (status) options.status = status;
      if (orderType) options.orderType = orderType;
      if (limit) options.limit = parseInt(limit);

      const result = await ctx.service.stopLossManager.getStopLossOrders(user.id, options);
      
      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('获取止损止盈订单失败:', error);
      ctx.body = {
        success: false,
        message: '获取订单失败: ' + error.message
      };
    }
  }

  /**
   * 取消止损止盈订单
   */
  async cancelOrder() {
    const { ctx } = this;
    const { user } = ctx.state;
    const orderId = parseInt(ctx.params.id);
    
    try {
      const { cancelReason } = ctx.request.body;
      
      // 验证订单权限
      const order = await ctx.model.StopLossOrder.findOne({
        where: { id: orderId, userId: user.id }
      });

      if (!order) {
        ctx.body = {
          success: false,
          message: '订单不存在或无权限'
        };
        return;
      }

      if (order.status !== 'pending') {
        ctx.body = {
          success: false,
          message: '只能取消待执行状态的订单'
        };
        return;
      }

      // 更新订单状态
      await order.update({
        status: 'cancelled',
        cancelTime: new Date(),
        cancelReason: cancelReason || '用户手动取消'
      });

      ctx.body = {
        success: true,
        message: '订单取消成功',
        data: order
      };

    } catch (error) {
      ctx.logger.error('取消止损止盈订单失败:', error);
      ctx.body = {
        success: false,
        message: '取消订单失败: ' + error.message
      };
    }
  }

  /**
   * 检查并触发止损止盈订单
   */
  async checkTriggers() {
    const { ctx } = this;
    const { user } = ctx.state;
    
    try {
      const { currentPrices } = ctx.request.body;
      
      if (!currentPrices || typeof currentPrices !== 'object') {
        ctx.body = {
          success: false,
          message: '当前价格数据格式不正确'
        };
        return;
      }

      const result = await ctx.service.stopLossManager.checkAndTriggerOrders(user.id, currentPrices);
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: `检查完成，触发了 ${result.data.triggeredCount} 个订单`,
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('检查止损止盈触发失败:', error);
      ctx.body = {
        success: false,
        message: '检查触发失败: ' + error.message
      };
    }
  }

  /**
   * 执行止损止盈订单
   */
  async executeOrder() {
    const { ctx } = this;
    const { user } = ctx.state;
    const orderId = parseInt(ctx.params.id);
    
    try {
      const executionData = ctx.request.body;
      
      // 验证必填字段
      if (!executionData.executionPrice || !executionData.executedQuantity) {
        ctx.body = {
          success: false,
          message: '执行价格和执行数量为必填项'
        };
        return;
      }

      const result = await ctx.service.stopLossManager.executeStopLossOrder(user.id, orderId, executionData);
      
      if (result.success) {
        ctx.body = {
          success: true,
          message: '订单执行成功',
          data: result.data
        };
      } else {
        ctx.body = {
          success: false,
          message: result.error
        };
      }

    } catch (error) {
      ctx.logger.error('执行止损止盈订单失败:', error);
      ctx.body = {
        success: false,
        message: '执行订单失败: ' + error.message
      };
    }
  }
}

module.exports = StopLossManagerController;
