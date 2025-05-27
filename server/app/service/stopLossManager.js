'use strict';

const Service = require('egg').Service;

class StopLossManagerService extends Service {
  
  /**
   * 创建止损止盈配置
   */
  async createStopLossConfig(userId, configData) {
    const { ctx } = this;
    
    try {
      // 验证投资组合权限
      if (configData.portfolioId) {
        const portfolio = await ctx.model.UserPortfolio.findOne({
          where: { id: configData.portfolioId, userId }
        });
        
        if (!portfolio) {
          return {
            success: false,
            error: '投资组合不存在或无权限'
          };
        }
      }

      // 创建配置
      const config = await ctx.model.StopLossConfig.create({
        userId,
        portfolioId: configData.portfolioId,
        symbol: configData.symbol,
        configName: configData.configName,
        stopLossType: configData.stopLossType,
        stopLossPercentage: configData.stopLossPercentage,
        trailingDistance: configData.trailingDistance,
        atrMultiplier: configData.atrMultiplier,
        volatilityMultiplier: configData.volatilityMultiplier,
        timeLimit: configData.timeLimit,
        takeProfitType: configData.takeProfitType,
        takeProfitLevels: configData.takeProfitLevels,
        trailingActivation: configData.trailingActivation,
        trailingTakeProfitDistance: configData.trailingTakeProfitDistance,
        isStopLossEnabled: configData.isStopLossEnabled,
        isTakeProfitEnabled: configData.isTakeProfitEnabled,
        isActive: configData.isActive !== false
      });

      return {
        success: true,
        data: config
      };

    } catch (error) {
      ctx.logger.error('创建止损止盈配置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户的止损止盈配置列表
   */
  async getStopLossConfigs(userId, options = {}) {
    const { ctx } = this;
    
    try {
      const whereCondition = { userId };
      
      if (options.portfolioId) {
        whereCondition.portfolioId = options.portfolioId;
      }
      
      if (options.symbol) {
        whereCondition.symbol = options.symbol;
      }
      
      if (options.isActive !== undefined) {
        whereCondition.isActive = options.isActive;
      }

      const configs = await ctx.model.StopLossConfig.findAll({
        where: whereCondition,
        include: [{
          model: ctx.model.UserPortfolio,
          as: 'portfolio',
          attributes: ['id', 'name']
        }],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: configs
      };

    } catch (error) {
      ctx.logger.error('获取止损止盈配置失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 创建止损止盈订单
   */
  async createStopLossOrder(userId, orderData) {
    const { ctx } = this;
    
    try {
      // 验证配置权限
      if (orderData.configId) {
        const config = await ctx.model.StopLossConfig.findOne({
          where: { id: orderData.configId, userId }
        });
        
        if (!config) {
          return {
            success: false,
            error: '配置不存在或无权限'
          };
        }
      }

      // 创建订单
      const order = await ctx.model.StopLossOrder.create({
        userId,
        portfolioId: orderData.portfolioId,
        configId: orderData.configId,
        symbol: orderData.symbol,
        stockName: orderData.stockName,
        orderType: orderData.orderType,
        triggerPrice: orderData.triggerPrice,
        quantity: orderData.quantity,
        executionType: orderData.executionType || 'market',
        limitPrice: orderData.limitPrice,
        reason: orderData.reason,
        urgency: orderData.urgency || 'medium',
        confidence: orderData.confidence,
        expectedLoss: orderData.expectedLoss,
        expectedProfit: orderData.expectedProfit,
        notes: orderData.notes
      });

      return {
        success: true,
        data: order
      };

    } catch (error) {
      ctx.logger.error('创建止损止盈订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取用户的止损止盈订单列表
   */
  async getStopLossOrders(userId, options = {}) {
    const { ctx } = this;
    
    try {
      const whereCondition = { userId };
      
      if (options.portfolioId) {
        whereCondition.portfolioId = options.portfolioId;
      }
      
      if (options.symbol) {
        whereCondition.symbol = options.symbol;
      }
      
      if (options.status) {
        whereCondition.status = options.status;
      }
      
      if (options.orderType) {
        whereCondition.orderType = options.orderType;
      }

      const orders = await ctx.model.StopLossOrder.findAll({
        where: whereCondition,
        include: [
          {
            model: ctx.model.UserPortfolio,
            as: 'portfolio',
            attributes: ['id', 'name']
          },
          {
            model: ctx.model.StopLossConfig,
            as: 'config',
            attributes: ['id', 'configName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: options.limit || 100
      });

      return {
        success: true,
        data: orders
      };

    } catch (error) {
      ctx.logger.error('获取止损止盈订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查并触发止损止盈订单
   */
  async checkAndTriggerOrders(userId, currentPrices) {
    const { ctx } = this;
    
    try {
      // 获取待执行的订单
      const pendingOrders = await ctx.model.StopLossOrder.findAll({
        where: {
          userId,
          status: 'pending'
        }
      });

      const triggeredOrders = [];

      for (const order of pendingOrders) {
        const currentPrice = currentPrices[order.symbol];
        
        if (!currentPrice) continue;

        let shouldTrigger = false;

        // 检查触发条件
        if (order.orderType === 'stop_loss') {
          // 止损：当前价格低于或等于触发价格
          shouldTrigger = currentPrice <= order.triggerPrice;
        } else if (order.orderType === 'take_profit') {
          // 止盈：当前价格高于或等于触发价格
          shouldTrigger = currentPrice >= order.triggerPrice;
        }

        if (shouldTrigger) {
          // 更新订单状态为已触发
          await order.update({
            status: 'triggered',
            triggerTime: new Date()
          });

          triggeredOrders.push({
            orderId: order.id,
            symbol: order.symbol,
            orderType: order.orderType,
            triggerPrice: order.triggerPrice,
            currentPrice,
            quantity: order.quantity
          });
        }
      }

      return {
        success: true,
        data: {
          triggeredCount: triggeredOrders.length,
          triggeredOrders
        }
      };

    } catch (error) {
      ctx.logger.error('检查止损止盈订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行止损止盈订单
   */
  async executeStopLossOrder(userId, orderId, executionData) {
    const { ctx } = this;
    
    try {
      // 获取订单
      const order = await ctx.model.StopLossOrder.findOne({
        where: { id: orderId, userId }
      });

      if (!order) {
        return {
          success: false,
          error: '订单不存在或无权限'
        };
      }

      if (order.status !== 'triggered') {
        return {
          success: false,
          error: '订单状态不正确，无法执行'
        };
      }

      // 更新订单状态为已执行
      await order.update({
        status: 'executed',
        actualPrice: executionData.executionPrice,
        actualQuantity: executionData.executedQuantity,
        actualLoss: executionData.realizedPnl < 0 ? Math.abs(executionData.realizedPnl) : null,
        actualProfit: executionData.realizedPnl > 0 ? executionData.realizedPnl : null,
        executionTime: new Date()
      });

      // 创建执行记录
      const execution = await ctx.model.StopLossExecution.create({
        userId,
        orderId: order.id,
        symbol: order.symbol,
        executionType: order.orderType,
        triggerPrice: order.triggerPrice,
        executionPrice: executionData.executionPrice,
        quantity: executionData.executedQuantity,
        originalQuantity: executionData.originalQuantity,
        remainingQuantity: executionData.remainingQuantity,
        averageCost: executionData.averageCost,
        realizedPnl: executionData.realizedPnl,
        realizedPnlPercentage: executionData.realizedPnlPercentage,
        commission: executionData.commission || 0,
        slippage: executionData.slippage,
        executionMethod: executionData.executionMethod || 'automatic',
        isSuccessful: true,
        marketConditions: executionData.marketConditions,
        performanceMetrics: executionData.performanceMetrics,
        executionTime: new Date(),
        notes: executionData.notes
      });

      return {
        success: true,
        data: {
          order,
          execution
        }
      };

    } catch (error) {
      ctx.logger.error('执行止损止盈订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = StopLossManagerService;
