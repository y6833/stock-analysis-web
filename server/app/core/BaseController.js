/**
 * 基础控制器类
 * 提供统一的控制器基础功能和响应格式
 */

'use strict';

const { Controller } = require('egg');

/**
 * 标准API响应格式
 */
const API_RESPONSE = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};

/**
 * HTTP状态码常量
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * 基础控制器类
 * 所有控制器都应该继承此类以获得统一的功能
 */
class BaseController extends Controller {
  
  /**
   * 构造函数
   */
  constructor(ctx) {
    super(ctx);
    this.startTime = Date.now();
  }

  /**
   * 成功响应
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {object} meta - 元数据
   */
  success(data = null, message = '操作成功', meta = {}) {
    const response = {
      success: true,
      code: HTTP_STATUS.OK,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: this.ctx.requestId || this.generateRequestId(),
      ...meta
    };

    // 添加性能信息（开发环境）
    if (this.app.config.env === 'local') {
      response.performance = {
        duration: Date.now() - this.startTime,
        memory: process.memoryUsage()
      };
    }

    this.ctx.status = HTTP_STATUS.OK;
    this.ctx.body = response;
    
    // 记录成功日志
    this.ctx.logger.info(`API Success: ${this.ctx.method} ${this.ctx.url}`, {
      duration: Date.now() - this.startTime,
      response: response
    });
  }

  /**
   * 错误响应
   * @param {string} message - 错误消息
   * @param {number} code - 错误代码
   * @param {*} details - 错误详情
   * @param {number} httpStatus - HTTP状态码
   */
  error(message = '操作失败', code = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null, httpStatus = null) {
    const response = {
      success: false,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: this.ctx.requestId || this.generateRequestId(),
      path: this.ctx.url,
      method: this.ctx.method
    };

    this.ctx.status = httpStatus || this.getHttpStatusFromCode(code);
    this.ctx.body = response;
    
    // 记录错误日志
    this.ctx.logger.error(`API Error: ${this.ctx.method} ${this.ctx.url}`, {
      duration: Date.now() - this.startTime,
      error: response
    });
  }

  /**
   * 分页响应
   * @param {Array} items - 数据项
   * @param {number} total - 总数
   * @param {number} page - 当前页
   * @param {number} pageSize - 页大小
   * @param {string} message - 响应消息
   */
  paginated(items = [], total = 0, page = 1, pageSize = 20, message = '获取成功') {
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.success({
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext,
        hasPrev
      }
    }, message);
  }

  /**
   * 验证请求参数
   * @param {object} rules - 验证规则
   * @param {object} data - 要验证的数据
   */
  validate(rules, data = null) {
    try {
      const validateData = data || this.ctx.request.body;
      this.ctx.validate(rules, validateData);
      return validateData;
    } catch (err) {
      this.error('参数验证失败', HTTP_STATUS.BAD_REQUEST, err.errors);
      return null;
    }
  }

  /**
   * 获取分页参数
   * @param {number} defaultPageSize - 默认页大小
   */
  getPaginationParams(defaultPageSize = 20) {
    const { page = 1, pageSize = defaultPageSize, sortBy, sortOrder = 'asc' } = this.ctx.query;
    
    return {
      page: Math.max(1, parseInt(page)),
      pageSize: Math.min(100, Math.max(1, parseInt(pageSize))), // 限制最大页大小
      offset: (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(pageSize))),
      sortBy,
      sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'asc'
    };
  }

  /**
   * 获取搜索参数
   */
  getSearchParams() {
    const { q, query, keyword, search } = this.ctx.query;
    return {
      query: q || query || keyword || search || '',
      filters: this.getFilters()
    };
  }

  /**
   * 获取过滤参数
   */
  getFilters() {
    const filters = {};
    const query = this.ctx.query;
    
    // 排除分页和搜索参数
    const excludeKeys = ['page', 'pageSize', 'sortBy', 'sortOrder', 'q', 'query', 'keyword', 'search'];
    
    Object.keys(query).forEach(key => {
      if (!excludeKeys.includes(key) && query[key] !== undefined && query[key] !== '') {
        filters[key] = query[key];
      }
    });
    
    return filters;
  }

  /**
   * 异步操作包装器
   * @param {Function} operation - 异步操作函数
   * @param {string} errorMessage - 错误消息
   */
  async withAsyncOperation(operation, errorMessage = '操作失败') {
    try {
      return await operation();
    } catch (err) {
      this.ctx.logger.error(`Async operation failed: ${errorMessage}`, err);
      
      // 根据错误类型返回不同的响应
      if (err.name === 'ValidationError') {
        this.error('数据验证失败', HTTP_STATUS.BAD_REQUEST, err.message);
      } else if (err.name === 'UnauthorizedError') {
        this.error('未授权访问', HTTP_STATUS.UNAUTHORIZED, err.message);
      } else if (err.name === 'ForbiddenError') {
        this.error('禁止访问', HTTP_STATUS.FORBIDDEN, err.message);
      } else if (err.name === 'NotFoundError') {
        this.error('资源未找到', HTTP_STATUS.NOT_FOUND, err.message);
      } else {
        this.error(errorMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR, err.message);
      }
      
      return null;
    }
  }

  /**
   * 检查必需参数
   * @param {Array} requiredFields - 必需字段列表
   * @param {object} data - 数据对象
   */
  checkRequired(requiredFields, data = null) {
    const checkData = data || this.ctx.request.body;
    const missing = [];
    
    requiredFields.forEach(field => {
      if (checkData[field] === undefined || checkData[field] === null || checkData[field] === '') {
        missing.push(field);
      }
    });
    
    if (missing.length > 0) {
      this.error(`缺少必需参数: ${missing.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
      return false;
    }
    
    return true;
  }

  /**
   * 获取用户信息
   */
  getCurrentUser() {
    return this.ctx.user || null;
  }

  /**
   * 检查用户权限
   * @param {string} permission - 权限名称
   */
  checkPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) {
      this.error('未登录', HTTP_STATUS.UNAUTHORIZED);
      return false;
    }
    
    // 这里可以实现具体的权限检查逻辑
    if (!this.hasPermission(user, permission)) {
      this.error('权限不足', HTTP_STATUS.FORBIDDEN);
      return false;
    }
    
    return true;
  }

  /**
   * 判断用户是否有指定权限
   * @param {object} user - 用户对象
   * @param {string} permission - 权限名称
   */
  hasPermission(user, permission) {
    // 管理员拥有所有权限
    if (user.role === 'admin') {
      return true;
    }
    
    // 检查用户权限列表
    return user.permissions && user.permissions.includes(permission);
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 根据错误代码获取HTTP状态码
   * @param {number} code - 错误代码
   */
  getHttpStatusFromCode(code) {
    const codeMap = {
      400: HTTP_STATUS.BAD_REQUEST,
      401: HTTP_STATUS.UNAUTHORIZED,
      403: HTTP_STATUS.FORBIDDEN,
      404: HTTP_STATUS.NOT_FOUND,
      500: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      503: HTTP_STATUS.SERVICE_UNAVAILABLE
    };
    
    return codeMap[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  /**
   * 设置缓存头
   * @param {number} maxAge - 缓存时间（秒）
   * @param {boolean} isPublic - 是否为公共缓存
   */
  setCache(maxAge = 300, isPublic = true) {
    const cacheControl = isPublic ? 'public' : 'private';
    this.ctx.set('Cache-Control', `${cacheControl}, max-age=${maxAge}`);
    this.ctx.set('ETag', this.generateETag());
  }

  /**
   * 生成ETag
   */
  generateETag() {
    const content = JSON.stringify(this.ctx.body || '');
    return `"${require('crypto').createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * 记录API调用统计
   * @param {string} action - 操作名称
   * @param {object} metadata - 元数据
   */
  logApiCall(action, metadata = {}) {
    this.ctx.logger.info(`API Call: ${action}`, {
      method: this.ctx.method,
      url: this.ctx.url,
      userAgent: this.ctx.get('User-Agent'),
      ip: this.ctx.ip,
      duration: Date.now() - this.startTime,
      ...metadata
    });
  }

  /**
   * 获取客户端信息
   */
  getClientInfo() {
    return {
      ip: this.ctx.ip,
      userAgent: this.ctx.get('User-Agent'),
      referer: this.ctx.get('Referer'),
      origin: this.ctx.get('Origin')
    };
  }
}

// 导出常量
BaseController.HTTP_STATUS = HTTP_STATUS;
BaseController.API_RESPONSE = API_RESPONSE;

module.exports = BaseController;