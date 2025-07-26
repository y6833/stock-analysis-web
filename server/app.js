'use strict';

/**
 * 应用启动文件
 */
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  /**
   * 配置文件加载完成，用于初始化工作
   */
  async configWillLoad() {
    // 此时配置文件已经被读取并合并，但是还未生效
    // 这是应用层修改配置的最后时机
    // 注意：此函数只支持同步调用
  }

  /**
   * 所有的配置已经加载完毕
   */
  async configDidLoad() {
    // 所有的配置已经加载完毕
    // 可以用来加载应用自定义的文件，启动自定义的服务
  }

  /**
   * 所有的插件都已启动完毕，但是应用整体还未 ready
   */
  async didLoad() {
    // 所有的插件都已启动完毕，可以用来加载应用自定义的文件，启动自定义的服务
  }

  /**
   * 所有的插件启动完毕，应用已经可以正常访问
   */
  async willReady() {
    // 所有的插件启动完毕，但是应用整体还未 ready
    // 可以做一些数据初始化等操作，这些操作成功才会启动应用
  }

  /**
   * 应用已经启动完毕
   */
  async didReady() {
    // 应用已经启动完毕
    const app = this.app;

    // 初始化数据验证器
    if (app.dataValidator) {
      await app.dataValidator.init();
      app.logger.info('[App] 数据验证器初始化完成');
    }

    // 初始化数据转换器
    if (app.dataTransformer) {
      await app.dataTransformer.init();
      app.logger.info('[App] 数据转换器初始化完成');
    }

    // 初始化数据源管理器
    if (!app.dataSourceManager) {
      const DataSourceManager = require('./app/util/data_source_manager');
      app.dataSourceManager = new DataSourceManager(app);
      await app.dataSourceManager.init();
      app.logger.info('[App] 数据源管理器初始化完成');
    }

    // 初始化缓存管理器
    if (!app.cacheManager) {
      const CacheManager = require('./app/util/cache_manager');
      app.cacheManager = new CacheManager(app);
      await app.cacheManager.init();
      app.logger.info('[App] 缓存管理器初始化完成');
    }
  }

  /**
   * 应用即将关闭
   */
  async beforeClose() {
    // 应用即将关闭
    const app = this.app;

    // 关闭数据验证器
    if (app.dataValidator) {
      await app.dataValidator.shutdown();
      app.logger.info('[App] 数据验证器已关闭');
    }

    // 关闭数据转换器
    if (app.dataTransformer) {
      await app.dataTransformer.shutdown();
      app.logger.info('[App] 数据转换器已关闭');
    }

    // 关闭数据源管理器
    if (app.dataSourceManager) {
      await app.dataSourceManager.shutdown();
      app.logger.info('[App] 数据源管理器已关闭');
    }

    // 关闭缓存管理器
    if (app.cacheManager) {
      await app.cacheManager.shutdown();
      app.logger.info('[App] 缓存管理器已关闭');
    }
  }
}

module.exports = AppBootHook;
