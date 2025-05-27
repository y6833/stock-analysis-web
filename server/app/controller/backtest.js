'use strict';

const Controller = require('egg').Controller;

class BacktestController extends Controller {
  
  /**
   * 运行专业回测
   */
  async runBacktest() {
    const { ctx, service } = this;
    
    // 确保用户已认证
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const {
      symbol,
      strategyType,
      timeRange,
      frequency,
      initialCapital,
      commissionRate,
      slippageRate,
      customStartDate,
      customEndDate,
      strategyParams
    } = ctx.request.body;

    try {
      // 验证参数
      if (!symbol || !strategyType || !customStartDate || !customEndDate) {
        ctx.body = {
          success: false,
          message: '缺少必要参数'
        };
        return;
      }

      if (initialCapital <= 0) {
        ctx.body = {
          success: false,
          message: '初始资金必须大于0'
        };
        return;
      }

      // 检查会员权限
      const membershipInfo = await service.membership.getUserMembership(userId);
      if (!membershipInfo || membershipInfo.level === 'free') {
        ctx.body = {
          success: false,
          message: '专业回测功能需要高级会员权限',
          requiresUpgrade: true
        };
        return;
      }

      // 获取历史数据
      const historicalData = await service.backtest.getHistoricalData({
        symbol,
        startDate: customStartDate,
        endDate: customEndDate,
        frequency
      });

      if (!historicalData || historicalData.length === 0) {
        ctx.body = {
          success: false,
          message: '无法获取历史数据，请检查股票代码和日期范围'
        };
        return;
      }

      // 执行回测
      const backtestParams = {
        symbol,
        strategyType,
        timeRange,
        frequency,
        initialCapital,
        commissionRate: commissionRate || 0.0003,
        slippageRate: slippageRate || 0.001,
        customStartDate,
        customEndDate,
        strategyParams: strategyParams || {}
      };

      const result = await service.backtest.runProfessionalBacktest(
        backtestParams,
        historicalData
      );

      // 保存回测记录
      await service.backtest.saveBacktestRecord(userId, backtestParams, result);

      ctx.body = {
        success: true,
        data: result,
        message: '回测完成'
      };

    } catch (error) {
      ctx.logger.error('专业回测失败:', error);
      ctx.body = {
        success: false,
        message: '回测失败: ' + error.message
      };
    }
  }

  /**
   * 批量回测（参数优化）
   */
  async runBatchBacktest() {
    const { ctx, service } = this;
    
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { baseParams, parameterGrid } = ctx.request.body;

    try {
      // 检查会员权限
      const membershipInfo = await service.membership.getUserMembership(userId);
      if (!membershipInfo || membershipInfo.level !== 'premium') {
        ctx.body = {
          success: false,
          message: '参数优化功能需要高级会员权限',
          requiresUpgrade: true
        };
        return;
      }

      // 生成参数组合
      const paramCombinations = service.backtest.generateParameterCombinations(parameterGrid);
      
      if (paramCombinations.length > 100) {
        ctx.body = {
          success: false,
          message: '参数组合过多，请减少参数范围'
        };
        return;
      }

      // 获取历史数据
      const historicalData = await service.backtest.getHistoricalData({
        symbol: baseParams.symbol,
        startDate: baseParams.customStartDate,
        endDate: baseParams.customEndDate,
        frequency: baseParams.frequency
      });

      // 批量执行回测
      const results = [];
      for (let i = 0; i < paramCombinations.length; i++) {
        const paramSet = paramCombinations[i];
        const testParams = {
          ...baseParams,
          strategyParams: { ...baseParams.strategyParams, ...paramSet }
        };

        try {
          const result = await service.backtest.runProfessionalBacktest(
            testParams,
            historicalData
          );
          results.push(result);
        } catch (error) {
          ctx.logger.warn(`参数组合 ${i + 1} 回测失败:`, error);
        }
      }

      // 保存批量回测记录
      await service.backtest.saveBatchBacktestRecord(userId, baseParams, parameterGrid, results);

      ctx.body = {
        success: true,
        data: results,
        message: `批量回测完成，共 ${results.length} 个结果`
      };

    } catch (error) {
      ctx.logger.error('批量回测失败:', error);
      ctx.body = {
        success: false,
        message: '批量回测失败: ' + error.message
      };
    }
  }

  /**
   * 获取回测历史
   */
  async getBacktestHistory() {
    const { ctx, service } = this;
    
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { page = 1, pageSize = 20 } = ctx.query;

    try {
      const history = await service.backtest.getBacktestHistory(userId, {
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });

      ctx.body = {
        success: true,
        data: history,
        message: '获取回测历史成功'
      };

    } catch (error) {
      ctx.logger.error('获取回测历史失败:', error);
      ctx.body = {
        success: false,
        message: '获取回测历史失败: ' + error.message
      };
    }
  }

  /**
   * 获取回测详情
   */
  async getBacktestDetail() {
    const { ctx, service } = this;
    
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { id } = ctx.params;

    try {
      const detail = await service.backtest.getBacktestDetail(userId, id);

      if (!detail) {
        ctx.body = {
          success: false,
          message: '回测记录不存在'
        };
        return;
      }

      ctx.body = {
        success: true,
        data: detail,
        message: '获取回测详情成功'
      };

    } catch (error) {
      ctx.logger.error('获取回测详情失败:', error);
      ctx.body = {
        success: false,
        message: '获取回测详情失败: ' + error.message
      };
    }
  }

  /**
   * 删除回测记录
   */
  async deleteBacktest() {
    const { ctx, service } = this;
    
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { id } = ctx.params;

    try {
      const success = await service.backtest.deleteBacktest(userId, id);

      if (!success) {
        ctx.body = {
          success: false,
          message: '回测记录不存在或无权限删除'
        };
        return;
      }

      ctx.body = {
        success: true,
        message: '删除回测记录成功'
      };

    } catch (error) {
      ctx.logger.error('删除回测记录失败:', error);
      ctx.body = {
        success: false,
        message: '删除回测记录失败: ' + error.message
      };
    }
  }

  /**
   * 比较回测结果
   */
  async compareBacktests() {
    const { ctx, service } = this;
    
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未认证，请先登录' };
      return;
    }

    const userId = ctx.user.id;
    const { ids } = ctx.request.body;

    try {
      if (!ids || !Array.isArray(ids) || ids.length < 2) {
        ctx.body = {
          success: false,
          message: '请选择至少2个回测结果进行比较'
        };
        return;
      }

      const comparison = await service.backtest.compareBacktests(userId, ids);

      ctx.body = {
        success: true,
        data: comparison,
        message: '回测结果比较完成'
      };

    } catch (error) {
      ctx.logger.error('回测结果比较失败:', error);
      ctx.body = {
        success: false,
        message: '回测结果比较失败: ' + error.message
      };
    }
  }

  /**
   * 获取策略模板
   */
  async getStrategyTemplates() {
    const { ctx, service } = this;

    try {
      const templates = await service.backtest.getStrategyTemplates();

      ctx.body = {
        success: true,
        data: templates,
        message: '获取策略模板成功'
      };

    } catch (error) {
      ctx.logger.error('获取策略模板失败:', error);
      ctx.body = {
        success: false,
        message: '获取策略模板失败: ' + error.message
      };
    }
  }
}

module.exports = BacktestController;
