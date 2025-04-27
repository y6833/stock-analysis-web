'use strict';

const Controller = require('egg').Controller;

class FundamentalController extends Controller {
  // 获取股票基本面分析数据
  async getFundamentalAnalysis() {
    const { ctx, service } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getFundamentalAnalysis(symbol);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取基本面分析数据失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}基本面分析数据失败:`, error);
    }
  }

  // 获取财务摘要
  async getFinancialSummary() {
    const { ctx, service } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getFinancialSummary(symbol);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取财务摘要失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}财务摘要失败:`, error);
    }
  }

  // 获取财务报表
  async getFinancialStatements() {
    const { ctx, service } = this;
    const { symbol, type, period } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getFinancialStatements(symbol, type, period);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取财务报表失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}财务报表失败:`, error);
    }
  }

  // 获取估值分析
  async getValuationAnalysis() {
    const { ctx, service } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getValuationAnalysis(symbol);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取估值分析失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}估值分析失败:`, error);
    }
  }

  // 获取行业对比
  async getIndustryComparison() {
    const { ctx, service } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getIndustryComparison(symbol);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取行业对比失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}行业对比失败:`, error);
    }
  }

  // 获取财报解读
  async getFinancialReportAnalysis() {
    const { ctx, service } = this;
    const { symbol } = ctx.query;

    if (!symbol) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少股票代码参数'
      };
      return;
    }

    try {
      const data = await service.fundamental.getFinancialReportAnalysis(symbol);
      ctx.body = {
        success: true,
        data
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取财报解读失败',
        error: error.message
      };
      ctx.logger.error(`获取股票${symbol}财报解读失败:`, error);
    }
  }
}

module.exports = FundamentalController;
