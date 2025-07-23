'use strict';

/**
 * API版本控制中间件
 * 支持通过URL路径、查询参数或请求头指定API版本
 * 增强版本控制和错误处理
 */
module.exports = (options = {}) => {
  const defaultVersion = options.defaultVersion || 'v1';
  const supportedVersions = options.supportedVersions || ['v1'];
  const deprecatedVersions = options.deprecatedVersions || [];
  const sunsetDate = options.sunsetDate || null;

  return async function apiVersion(ctx, next) {
    let version = defaultVersion;
    let versionSource = 'default';

    // 1. 从URL路径中提取版本 (优先级最高)
    const pathMatch = ctx.path.match(/^\/api\/(v\d+)\//);
    if (pathMatch) {
      version = pathMatch[1];
      versionSource = 'url-path';
    }
    // 2. 从查询参数中获取版本
    else if (ctx.query.version) {
      version = ctx.query.version.startsWith('v') ? ctx.query.version : `v${ctx.query.version}`;
      versionSource = 'query-parameter';
    }
    // 3. 从请求头中获取版本
    else if (ctx.headers['api-version']) {
      const headerVersion = ctx.headers['api-version'];
      version = headerVersion.startsWith('v') ? headerVersion : `v${headerVersion}`;
      versionSource = 'header';
    }
    // 4. 从Accept头中获取版本
    else if (ctx.headers.accept) {
      const acceptMatch = ctx.headers.accept.match(/application\/vnd\.stockanalysis\.(v\d+)\+json/);
      if (acceptMatch) {
        version = acceptMatch[1];
        versionSource = 'accept-header';
      }
    }

    // 验证版本是否支持
    if (!supportedVersions.includes(version)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `不支持的API版本: ${version}`,
          supportedVersions,
          requestedVersion: version,
          timestamp: new Date().toISOString(),
        },
      };
      return;
    }

    // 将版本信息添加到上下文
    ctx.apiVersion = version;
    ctx.apiVersionSource = versionSource;
    ctx.set('API-Version', version);

    // 添加版本信息到响应头
    ctx.set('X-API-Version', version);
    ctx.set('X-API-Version-Source', versionSource);
    ctx.set('X-Supported-Versions', supportedVersions.join(', '));

    // 如果使用的是已弃用的版本，添加弃用警告
    if (deprecatedVersions.includes(version)) {
      ctx.set('Deprecation', 'true');

      // 如果设置了日落日期，添加日落头
      if (sunsetDate) {
        ctx.set('Sunset', new Date(sunsetDate).toUTCString());
      }

      // 添加替代版本信息
      const latestVersion = supportedVersions[supportedVersions.length - 1];
      const linkHeader = `</api/${latestVersion}/${ctx.path.replace(
        /^\/api\/v\d+\//,
        ''
      )}>; rel="successor-version"`;
      ctx.set('Link', linkHeader);
    }

    await next();
  };
};
