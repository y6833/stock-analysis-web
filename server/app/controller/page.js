'use strict';

const Controller = require('egg').Controller;

/**
 * 页面管理控制器
 */
class PageController extends Controller {
  /**
   * 获取所有页面
   */
  async getAllPages() {
    const { ctx, service } = this;
    const { withPermissions, onlyEnabled, onlyMenu } = ctx.query;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 获取所有页面
      const pages = await service.page.getAllPages({
        withPermissions: withPermissions === 'true',
        onlyEnabled: onlyEnabled === 'true',
        onlyMenu: onlyMenu === 'true',
      });

      ctx.body = {
        success: true,
        data: pages,
      };
    } catch (error) {
      ctx.logger.error('获取所有页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取所有页面失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取页面详情
   */
  async getPageById() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 获取页面详情
      const page = await service.page.getPageById(id);

      ctx.body = {
        success: true,
        data: page,
      };
    } catch (error) {
      ctx.logger.error('获取页面详情失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取页面详情失败: ${error.message}`,
      };
    }
  }

  /**
   * 创建页面
   */
  async createPage() {
    const { ctx, service } = this;
    const data = ctx.request.body;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 参数验证
      ctx.validate({
        path: { type: 'string', required: true },
        name: { type: 'string', required: true },
        component: { type: 'string', required: true },
      });

      // 创建页面
      const page = await service.page.createPage(data);

      ctx.body = {
        success: true,
        message: '页面创建成功',
        data: page,
      };
    } catch (error) {
      ctx.logger.error('创建页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `创建页面失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新页面
   */
  async updatePage() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const data = ctx.request.body;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 更新页面
      const page = await service.page.updatePage(id, data);

      ctx.body = {
        success: true,
        message: '页面更新成功',
        data: page,
      };
    } catch (error) {
      ctx.logger.error('更新页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新页面失败: ${error.message}`,
      };
    }
  }

  /**
   * 删除页面
   */
  async deletePage() {
    const { ctx, service } = this;
    const { id } = ctx.params;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 删除页面
      await service.page.deletePage(id);

      ctx.body = {
        success: true,
        message: '页面删除成功',
      };
    } catch (error) {
      ctx.logger.error('删除页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `删除页面失败: ${error.message}`,
      };
    }
  }

  /**
   * 更新页面权限
   */
  async updatePagePermissions() {
    const { ctx, service } = this;
    const { id } = ctx.params;
    const { permissions } = ctx.request.body;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 参数验证
      if (!permissions || !Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '权限数据格式不正确',
        };
        return;
      }

      // 更新页面权限
      const page = await service.page.updatePagePermissions(id, permissions);

      ctx.body = {
        success: true,
        message: '页面权限更新成功',
        data: page,
      };
    } catch (error) {
      ctx.logger.error('更新页面权限失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `更新页面权限失败: ${error.message}`,
      };
    }
  }

  /**
   * 批量更新页面状态
   */
  async batchUpdateStatus() {
    const { ctx, service } = this;
    const { ids, isEnabled } = ctx.request.body;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      // 参数验证
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '页面ID列表不能为空',
        };
        return;
      }

      if (typeof isEnabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '状态参数必须是布尔值',
        };
        return;
      }

      // 批量更新页面状态
      const count = await service.page.batchUpdateStatus(ids, isEnabled);

      ctx.body = {
        success: true,
        message: `成功${isEnabled ? '启用' : '禁用'} ${count} 个页面`,
        count,
      };
    } catch (error) {
      ctx.logger.error('批量更新页面状态失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `批量更新页面状态失败: ${error.message}`,
      };
    }
  }

  /**
   * 初始化系统页面
   */
  async initSystemPages() {
    const { ctx, service, app } = this;

    try {
      // 检查管理员权限
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限执行此操作',
        };
        return;
      }

      try {
        // 检查表是否存在
        await app.model.query('SELECT 1 FROM system_pages LIMIT 1');
      } catch (error) {
        // 表不存在，创建表
        if (error.original && error.original.code === 'ER_NO_SUCH_TABLE') {
          ctx.logger.info('system_pages 表不存在，正在创建...');

          try {
            // 创建系统页面表
            await app.model.query(`
              CREATE TABLE IF NOT EXISTS \`system_pages\` (
                \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
                \`path\` varchar(100) NOT NULL COMMENT '页面路径',
                \`name\` varchar(50) NOT NULL COMMENT '页面名称',
                \`description\` text COMMENT '页面描述',
                \`icon\` varchar(50) DEFAULT NULL COMMENT '页面图标',
                \`component\` varchar(100) NOT NULL COMMENT '页面组件路径',
                \`is_menu\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否在菜单中显示',
                \`parent_id\` int(10) unsigned DEFAULT NULL COMMENT '父页面ID',
                \`sort_order\` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序顺序',
                \`is_enabled\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
                \`requires_auth\` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否需要认证',
                \`requires_admin\` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要管理员权限',
                \`required_membership_level\` varchar(20) NOT NULL DEFAULT 'free' COMMENT '所需会员等级',
                \`meta\` json DEFAULT NULL COMMENT '额外元数据',
                \`created_at\` datetime NOT NULL,
                \`updated_at\` datetime NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`path\` (\`path\`)
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            ctx.logger.info('system_pages 表创建成功');

            // 创建页面权限表
            await app.model.query(`
              CREATE TABLE IF NOT EXISTS \`page_permissions\` (
                \`id\` int(10) unsigned NOT NULL AUTO_INCREMENT,
                \`page_id\` int(10) unsigned NOT NULL COMMENT '页面ID',
                \`membership_level\` varchar(20) NOT NULL COMMENT '会员等级',
                \`has_access\` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否有访问权限',
                \`created_at\` datetime NOT NULL,
                \`updated_at\` datetime NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`idx_page_membership\` (\`page_id\`,\`membership_level\`),
                CONSTRAINT \`page_permissions_ibfk_1\` FOREIGN KEY (\`page_id\`) REFERENCES \`system_pages\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
              ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            ctx.logger.info('page_permissions 表创建成功');
          } catch (createError) {
            ctx.logger.error('创建表失败:', createError);
            throw new Error(`创建数据库表失败: ${createError.message}`);
          }
        } else {
          // 其他错误
          throw error;
        }
      }

      // 初始化系统页面
      const count = await service.page.initSystemPages();

      ctx.body = {
        success: true,
        message: `成功初始化 ${count} 个系统页面`,
        count,
      };
    } catch (error) {
      ctx.logger.error('初始化系统页面失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `初始化系统页面失败: ${error.message}`,
        error: error.name,
      };
    }
  }

  /**
   * 获取用户菜单
   */
  async getUserMenu() {
    const { ctx, service } = this;

    try {
      // 检查用户是否登录
      if (!ctx.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请先登录',
        };
        return;
      }

      // 获取用户会员等级
      const membershipInfo = await service.membership.getUserMembership(ctx.user.id);
      const membershipLevel = membershipInfo.effectiveLevel;
      const isAdmin = ctx.user.role === 'admin';

      // 获取菜单树
      const menuTree = await service.page.getMenuTree(membershipLevel, isAdmin);

      ctx.body = {
        success: true,
        data: menuTree,
      };
    } catch (error) {
      ctx.logger.error('获取用户菜单失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取用户菜单失败: ${error.message}`,
      };
    }
  }

  /**
   * 检查页面访问权限
   */
  async checkPageAccess() {
    const { ctx, service } = this;
    const { path } = ctx.query;

    try {
      // 检查用户是否登录
      if (!ctx.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请先登录',
        };
        return;
      }

      // 检查路径参数
      if (!path) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '缺少页面路径参数',
        };
        return;
      }

      // 特殊页面直接允许访问
      const specialPages = [
        '/membership-features', // 会员功能页面（避免循环）
        '/dashboard', // 仪表盘（基础功能，所有用户都可访问）
        '/', // 首页
        '/about', // 关于页面
        '/profile', // 个人资料页面
        '/settings', // 设置页面
        '/notifications', // 通知页面
        '/recharge-records', // 充值记录页面
      ];

      if (specialPages.includes(path)) {
        ctx.body = {
          success: true,
          hasAccess: true,
          membershipLevel: ctx.user.role === 'admin' ? 'admin' : 'free',
          message: '特殊页面直接允许访问',
        };
        return;
      }

      // 管理员拥有所有权限
      if (ctx.user.role === 'admin') {
        ctx.body = {
          success: true,
          hasAccess: true,
          isAdmin: true,
          message: '管理员拥有所有权限',
        };
        return;
      }

      try {
        // 获取用户会员等级
        const membershipInfo = await service.membership.getUserMembership(ctx.user.id);
        const membershipLevel = membershipInfo.effectiveLevel;

        // 基础页面（免费用户可访问）
        const basicPages = [
          '/stock', // 股票分析
          '/market-heatmap', // 市场热图
          '/industry-analysis', // 行业分析
          '/test-dashboard', // 测试仪表盘
        ];

        if (basicPages.includes(path)) {
          ctx.body = {
            success: true,
            hasAccess: true,
            membershipLevel,
            message: '基础页面允许访问',
          };
          return;
        }

        // 高级会员可以访问所有功能
        if (['premium', 'enterprise'].includes(membershipLevel)) {
          ctx.body = {
            success: true,
            hasAccess: true,
            membershipLevel,
            message: '高级会员可以访问所有功能',
          };
          return;
        }

        // 检查页面访问权限
        const hasAccess = await service.page.checkPageAccess(path, membershipLevel);

        ctx.body = {
          success: true,
          hasAccess,
          membershipLevel,
          requiredLevel: hasAccess ? membershipLevel : 'premium',
        };
      } catch (error) {
        // 检查是否是数据库表不存在的错误
        if (error.message && (error.message.includes('doesn\'t exist') || error.message.includes('no such table'))) {
          ctx.logger.warn('页面管理表不存在，默认允许访问:', path);
          // 表不存在时，默认允许访问
          ctx.body = {
            success: true,
            hasAccess: true,
            membershipLevel: 'unknown',
            fallback: true,
            message: '页面管理表不存在，默认允许访问',
          };
        } else {
          // 重新抛出其他错误
          throw error;
        }
      }
    } catch (error) {
      ctx.logger.error('检查页面访问权限失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `检查页面访问权限失败: ${error.message}`,
        error: error.name,
      };
    }
  }
}

module.exports = PageController;
