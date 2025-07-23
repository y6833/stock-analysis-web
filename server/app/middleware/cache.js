'use strict';

/**
 * 缓存中间件
 * 处理客户端缓存控制和条件请求
 */
module.exports = (options = {}) => {
  return async function cache(ctx, next) {
    // 获取缓存管理器
    const cacheManager = ctx.app.cacheManager;

    // 如果缓存管理器不可用或缓存被禁用，直接跳过
    if (!cacheManager || !cacheManager.enabled) {
      return next();
    }

    // 确定缓存类型
    let cacheType = 'api';
    const path = ctx.path;

    if (
      path.startsWith('/public/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.svg')
    ) {
      cacheType = 'static';
    } else if (path.includes('/user/') || path.includes('/auth/')) {
      cacheType = 'user';
    }

    // 处理条件请求
    const ifNoneMatch = ctx.get('If-None-Match');
    const ifModifiedSince = ctx.get('If-Modified-Since');

    // 保存原始的响应方法
    const originalBody = ctx.body;
    const originalStatus = ctx.status;

    // 继续处理请求
    await next();

    // 只对成功的GET请求应用缓存控制
    if (ctx.method === 'GET' && ctx.status >= 200 && ctx.status < 300) {
      // 获取响应数据的ETag（如果有）
      let etag = ctx.response.get('ETag');

      // 如果没有ETag，生成一个
      if (!etag && ctx.body) {
        let content = ctx.body;
        if (typeof content === 'object') {
          content = JSON.stringify(content);
        }

        // 简单的ETag生成
        const hash = require('crypto')
          .createHash('md5')
          .update(content)
          .digest('hex')
          .substring(0, 8);

        etag = `W/"${hash}"`;
        ctx.set('ETag', etag);
      }

      // 处理条件请求
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        ctx.status = 304;
        ctx.body = null;
        return;
      }

      // 设置缓存控制头
      const isPublic = !path.includes('/user/') && !path.includes('/auth/');
      const cacheHeaders = cacheManager.getClientCacheHeaders(cacheType, isPublic);

      for (const [key, value] of Object.entries(cacheHeaders)) {
        ctx.set(key, value);
      }

      // 添加缓存状态头
      ctx.set('X-Cache-Status', 'MISS');
      ctx.set('X-Cache-Type', cacheType);
      ctx.set('X-Cache-Layer', 'server');

      // 添加缓存策略信息
      if (cacheManager.layers && cacheManager.layers.server) {
        const ttl =
          cacheManager.layers.server.ttl[cacheType.split(':')[0]] || cacheManager.defaultTTL;
        ctx.set('X-Cache-TTL', ttl.toString());
      }
    }
  };
};
