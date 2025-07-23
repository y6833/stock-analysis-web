'use strict';

module.exports = {
  /**
   * 成功响应格式化
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {object} meta - 元数据（分页信息等）
   */
  success(data = null, message = 'success', meta = {}) {
    this.status = 200;
    this.body = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.apiVersion || 'v1',
        ...meta,
      },
    };
  },

  /**
   * 创建成功响应格式化
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   */
  created(data = null, message = 'created') {
    this.status = 201;
    this.body = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: this.apiVersion || 'v1',
      },
    };
  },

  /**
   * 错误响应格式化
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {number} status - HTTP状态码
   * @param {*} details - 错误详情
   */
  error(message = 'Internal Server Error', code = 'INTERNAL_ERROR', status = 500, details = null) {
    this.status = status;
    this.body = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        version: this.apiVersion || 'v1',
      },
    };
  },

  /**
   * 验证错误响应
   * @param {string} message - 错误消息
   * @param {*} details - 验证错误详情
   */
  validationError(message = 'Validation Error', details = null) {
    this.error(message, 'VALIDATION_ERROR', 400, details);
  },

  /**
   * 未授权错误响应
   * @param {string} message - 错误消息
   */
  unauthorized(message = 'Unauthorized') {
    this.error(message, 'UNAUTHORIZED', 401);
  },

  /**
   * 禁止访问错误响应
   * @param {string} message - 错误消息
   */
  forbidden(message = 'Forbidden') {
    this.error(message, 'FORBIDDEN', 403);
  },

  /**
   * 资源未找到错误响应
   * @param {string} message - 错误消息
   */
  notFound(message = 'Not Found') {
    this.error(message, 'NOT_FOUND', 404);
  },

  /**
   * 分页响应格式化
   * @param {Array} items - 数据项
   * @param {number} total - 总数
   * @param {number} page - 当前页
   * @param {number} pageSize - 页大小
   * @param {string} message - 响应消息
   */
  paginated(items = [], total = 0, page = 1, pageSize = 20, message = 'success') {
    const totalPages = Math.ceil(total / pageSize);

    this.success(items, message, {
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  },

  /**
   * 获取分页参数
   * @param {number} defaultPage - 默认页码
   * @param {number} defaultPageSize - 默认页大小
   * @param {number} maxPageSize - 最大页大小
   * @returns {object} 分页参数
   */
  getPagination(defaultPage = 1, defaultPageSize = 20, maxPageSize = 100) {
    const page = Math.max(1, parseInt(this.query.page) || defaultPage);
    const pageSize = Math.min(
      maxPageSize,
      Math.max(1, parseInt(this.query.pageSize) || defaultPageSize)
    );
    const offset = (page - 1) * pageSize;

    return {
      page,
      pageSize,
      offset,
      limit: pageSize,
    };
  },

  /**
   * 获取排序参数
   * @param {string} defaultSort - 默认排序字段
   * @param {string} defaultOrder - 默认排序方向
   * @returns {object} 排序参数
   */
  getSort(defaultSort = 'id', defaultOrder = 'DESC') {
    const sort = this.query.sort || defaultSort;
    const order = (this.query.order || defaultOrder).toUpperCase();

    // 验证排序方向
    const validOrders = ['ASC', 'DESC'];
    const finalOrder = validOrders.includes(order) ? order : defaultOrder;

    return {
      sort,
      order: finalOrder,
    };
  },

  /**
   * 获取筛选参数
   * @param {Array} allowedFields - 允许筛选的字段
   * @returns {object} 筛选参数
   */
  getFilters(allowedFields = []) {
    const filters = {};

    allowedFields.forEach((field) => {
      if (this.query[field] !== undefined) {
        filters[field] = this.query[field];
      }
    });

    return filters;
  },

  /**
   * 获取字段选择参数
   * @param {Array} defaultFields - 默认字段
   * @param {Array} allowedFields - 允许的字段
   * @returns {Array} 选择的字段
   */
  getFields(defaultFields = [], allowedFields = []) {
    // 如果没有指定fields参数，返回默认字段
    if (!this.query.fields) {
      return defaultFields;
    }

    // 解析fields参数
    const requestedFields = this.query.fields.split(',').map((field) => field.trim());

    // 如果没有指定允许的字段，返回请求的字段
    if (!allowedFields.length) {
      return requestedFields;
    }

    // 过滤出允许的字段
    return requestedFields.filter((field) => allowedFields.includes(field));
  },

  /**
   * 设置缓存控制头
   * @param {number} maxAge - 最大缓存时间（秒）
   * @param {boolean} isPublic - 是否公共缓存
   */
  setCacheControl(maxAge = 60, isPublic = true) {
    const visibility = isPublic ? 'public' : 'private';
    this.set('Cache-Control', `${visibility}, max-age=${maxAge}`);

    // 设置过期时间
    const expires = new Date(Date.now() + maxAge * 1000);
    this.set('Expires', expires.toUTCString());
  },
};
