'use strict';

const Service = require('egg').Service;
const { ClickHouse } = require('clickhouse');

/**
 * ClickHouse 数据库服务
 * 用于高性能时序数据存储和查询
 */
class ClickHouseService extends Service {
  constructor(ctx) {
    super(ctx);
    
    // 初始化 ClickHouse 客户端
    this.clickhouse = new ClickHouse({
      url: this.config.clickhouse.url || 'http://localhost',
      port: this.config.clickhouse.port || 8123,
      debug: this.config.clickhouse.debug || false,
      basicAuth: this.config.clickhouse.basicAuth || null,
      isUseGzip: true,
      format: 'json',
      config: {
        session_timeout: 60,
        output_format_json_quote_64bit_integers: 0,
        enable_http_compression: 1,
        database: this.config.clickhouse.database || 'stock_data',
      },
    });
  }

  /**
   * 初始化数据库表结构
   */
  async initTables() {
    const { ctx } = this;
    
    try {
      // 创建数据库
      await this.clickhouse.query(`
        CREATE DATABASE IF NOT EXISTS stock_data
      `).toPromise();

      // 创建日线数据表
      await this.clickhouse.query(`
        CREATE TABLE IF NOT EXISTS stock_data.daily_data (
          symbol String,
          date Date,
          datetime DateTime,
          open Float64,
          high Float64,
          low Float64,
          close Float64,
          volume UInt64,
          amount Float64,
          change Float64,
          pct_change Float64,
          data_source String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (symbol, date)
        SETTINGS index_granularity = 8192
      `).toPromise();

      // 创建分钟级数据表
      await this.clickhouse.query(`
        CREATE TABLE IF NOT EXISTS stock_data.minute_data (
          symbol String,
          datetime DateTime,
          open Float64,
          high Float64,
          low Float64,
          close Float64,
          volume UInt64,
          amount Float64,
          data_source String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(datetime)
        ORDER BY (symbol, datetime)
        SETTINGS index_granularity = 8192
      `).toPromise();

      // 创建tick级数据表
      await this.clickhouse.query(`
        CREATE TABLE IF NOT EXISTS stock_data.tick_data (
          symbol String,
          datetime DateTime64(3),
          price Float64,
          volume UInt32,
          direction Int8,
          bid_price Float64,
          ask_price Float64,
          bid_volume UInt32,
          ask_volume UInt32,
          data_source String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(datetime)
        ORDER BY (symbol, datetime)
        SETTINGS index_granularity = 8192
      `).toPromise();

      // 创建财务数据表
      await this.clickhouse.query(`
        CREATE TABLE IF NOT EXISTS stock_data.financial_data (
          symbol String,
          report_date Date,
          period String,
          revenue Float64,
          net_profit Float64,
          total_assets Float64,
          total_equity Float64,
          roe Float64,
          roa Float64,
          eps Float64,
          bps Float64,
          pe_ratio Float64,
          pb_ratio Float64,
          data_source String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(report_date)
        ORDER BY (symbol, report_date)
        SETTINGS index_granularity = 8192
      `).toPromise();

      // 创建指标数据表
      await this.clickhouse.query(`
        CREATE TABLE IF NOT EXISTS stock_data.indicator_data (
          symbol String,
          date Date,
          indicator_name String,
          indicator_value Float64,
          data_source String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (symbol, date, indicator_name)
        SETTINGS index_granularity = 8192
      `).toPromise();

      ctx.logger.info('ClickHouse 表结构初始化完成');
      return { success: true };

    } catch (error) {
      ctx.logger.error('ClickHouse 表结构初始化失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入日线数据
   */
  async insertDailyData(dataList) {
    const { ctx } = this;
    
    try {
      if (!dataList || dataList.length === 0) {
        return { success: true, count: 0 };
      }

      const query = `
        INSERT INTO stock_data.daily_data 
        (symbol, date, datetime, open, high, low, close, volume, amount, change, pct_change, data_source)
        VALUES
      `;

      const values = dataList.map(data => [
        data.symbol,
        data.date,
        data.datetime || data.date,
        data.open,
        data.high,
        data.low,
        data.close,
        data.volume,
        data.amount || 0,
        data.change || 0,
        data.pct_change || 0,
        data.data_source || 'unknown'
      ]);

      await this.clickhouse.insert(query, values).toPromise();

      ctx.logger.info(`成功插入 ${dataList.length} 条日线数据到 ClickHouse`);
      return { success: true, count: dataList.length };

    } catch (error) {
      ctx.logger.error('插入日线数据到 ClickHouse 失败:', error);
      throw error;
    }
  }

  /**
   * 批量插入分钟级数据
   */
  async insertMinuteData(dataList) {
    const { ctx } = this;
    
    try {
      if (!dataList || dataList.length === 0) {
        return { success: true, count: 0 };
      }

      const query = `
        INSERT INTO stock_data.minute_data 
        (symbol, datetime, open, high, low, close, volume, amount, data_source)
        VALUES
      `;

      const values = dataList.map(data => [
        data.symbol,
        data.datetime,
        data.open,
        data.high,
        data.low,
        data.close,
        data.volume,
        data.amount || 0,
        data.data_source || 'unknown'
      ]);

      await this.clickhouse.insert(query, values).toPromise();

      ctx.logger.info(`成功插入 ${dataList.length} 条分钟数据到 ClickHouse`);
      return { success: true, count: dataList.length };

    } catch (error) {
      ctx.logger.error('插入分钟数据到 ClickHouse 失败:', error);
      throw error;
    }
  }

  /**
   * 查询日线数据
   */
  async queryDailyData(symbol, startDate, endDate, limit = 1000) {
    const { ctx } = this;
    
    try {
      const query = `
        SELECT 
          symbol,
          date,
          datetime,
          open,
          high,
          low,
          close,
          volume,
          amount,
          change,
          pct_change,
          data_source
        FROM stock_data.daily_data
        WHERE symbol = '${symbol}'
        ${startDate ? `AND date >= '${startDate}'` : ''}
        ${endDate ? `AND date <= '${endDate}'` : ''}
        ORDER BY date DESC
        LIMIT ${limit}
      `;

      const result = await this.clickhouse.query(query).toPromise();
      
      ctx.logger.info(`从 ClickHouse 查询到 ${result.length} 条日线数据`);
      return result;

    } catch (error) {
      ctx.logger.error('从 ClickHouse 查询日线数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询分钟级数据
   */
  async queryMinuteData(symbol, startTime, endTime, limit = 1000) {
    const { ctx } = this;
    
    try {
      const query = `
        SELECT 
          symbol,
          datetime,
          open,
          high,
          low,
          close,
          volume,
          amount,
          data_source
        FROM stock_data.minute_data
        WHERE symbol = '${symbol}'
        ${startTime ? `AND datetime >= '${startTime}'` : ''}
        ${endTime ? `AND datetime <= '${endTime}'` : ''}
        ORDER BY datetime DESC
        LIMIT ${limit}
      `;

      const result = await this.clickhouse.query(query).toPromise();
      
      ctx.logger.info(`从 ClickHouse 查询到 ${result.length} 条分钟数据`);
      return result;

    } catch (error) {
      ctx.logger.error('从 ClickHouse 查询分钟数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据统计信息
   */
  async getDataStatistics() {
    const { ctx } = this;
    
    try {
      // 日线数据统计
      const dailyStats = await this.clickhouse.query(`
        SELECT 
          count() as total_records,
          uniq(symbol) as unique_symbols,
          min(date) as earliest_date,
          max(date) as latest_date
        FROM stock_data.daily_data
      `).toPromise();

      // 分钟数据统计
      const minuteStats = await this.clickhouse.query(`
        SELECT 
          count() as total_records,
          uniq(symbol) as unique_symbols,
          min(datetime) as earliest_datetime,
          max(datetime) as latest_datetime
        FROM stock_data.minute_data
      `).toPromise();

      return {
        daily: dailyStats[0] || {},
        minute: minuteStats[0] || {}
      };

    } catch (error) {
      ctx.logger.error('获取 ClickHouse 数据统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(daysToKeep = 365) {
    const { ctx } = this;
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // 清理日线数据
      await this.clickhouse.query(`
        ALTER TABLE stock_data.daily_data 
        DELETE WHERE date < '${cutoffDateStr}'
      `).toPromise();

      // 清理分钟数据
      await this.clickhouse.query(`
        ALTER TABLE stock_data.minute_data 
        DELETE WHERE toDate(datetime) < '${cutoffDateStr}'
      `).toPromise();

      ctx.logger.info(`清理了 ${cutoffDateStr} 之前的历史数据`);
      return { success: true };

    } catch (error) {
      ctx.logger.error('清理 ClickHouse 历史数据失败:', error);
      throw error;
    }
  }

  /**
   * 优化表性能
   */
  async optimizeTables() {
    const { ctx } = this;
    
    try {
      // 优化日线数据表
      await this.clickhouse.query(`
        OPTIMIZE TABLE stock_data.daily_data FINAL
      `).toPromise();

      // 优化分钟数据表
      await this.clickhouse.query(`
        OPTIMIZE TABLE stock_data.minute_data FINAL
      `).toPromise();

      ctx.logger.info('ClickHouse 表优化完成');
      return { success: true };

    } catch (error) {
      ctx.logger.error('ClickHouse 表优化失败:', error);
      throw error;
    }
  }
}

module.exports = ClickHouseService;
