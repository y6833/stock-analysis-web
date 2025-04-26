'use strict';

module.exports = {
  /**
   * 判断当前是否为开发环境
   * @return {boolean} 是否为开发环境
   */
  isDev() {
    const env = this.app.config.env;
    return env === 'local' || env === 'development';
  },

  /**
   * 判断当前是否为生产环境
   * @return {boolean} 是否为生产环境
   */
  isProd() {
    return this.app.config.env === 'prod';
  },

  /**
   * 判断当前是否为测试环境
   * @return {boolean} 是否为测试环境
   */
  isTest() {
    return this.app.config.env === 'unittest';
  },

  /**
   * 获取当前环境名称
   * @return {string} 环境名称
   */
  getEnv() {
    return this.app.config.env;
  },

  /**
   * 根据环境返回不同的值
   * @param {Object} options 不同环境对应的值
   * @param {*} options.dev 开发环境的值
   * @param {*} options.prod 生产环境的值
   * @param {*} options.test 测试环境的值
   * @param {*} options.default 默认值
   * @return {*} 当前环境对应的值
   */
  envValue(options) {
    const env = this.getEnv();
    if (env === 'local' || env === 'development') {
      return options.dev !== undefined ? options.dev : options.default;
    } else if (env === 'prod') {
      return options.prod !== undefined ? options.prod : options.default;
    } else if (env === 'unittest') {
      return options.test !== undefined ? options.test : options.default;
    }
    return options.default;
  }
};
