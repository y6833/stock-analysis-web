'use strict';

const Service = require('egg').Service;
const moment = require('moment');

/**
 * 页面管理服务
 * 处理系统页面和页面权限相关的逻辑
 */
class PageService extends Service {
  /**
   * 获取所有系统页面
   * @param {Object} options - 查询选项
   * @return {Array} 页面列表
   */
  async getAllPages(options = {}) {
    const { ctx } = this;
    const { withPermissions = false, onlyEnabled = false, onlyMenu = false } = options;

    // 构建查询条件
    const where = {};
    if (onlyEnabled) {
      where.isEnabled = true;
    }
    if (onlyMenu) {
      where.isMenu = true;
    }

    // 构建查询选项
    const queryOptions = {
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    };

    // 是否包含权限信息
    if (withPermissions) {
      queryOptions.include = [
        {
          model: ctx.model.PagePermission,
          as: 'permissions',
        },
      ];
    }

    // 查询页面
    const pages = await ctx.model.SystemPage.findAll(queryOptions);
    return pages;
  }

  /**
   * 获取页面详情
   * @param {number} id - 页面ID
   * @return {Object} 页面详情
   */
  async getPageById(id) {
    const { ctx } = this;

    // 查询页面
    const page = await ctx.model.SystemPage.findByPk(id, {
      include: [
        {
          model: ctx.model.PagePermission,
          as: 'permissions',
        },
      ],
    });

    if (!page) {
      throw new Error(`页面不存在: ${id}`);
    }

    return page;
  }

  /**
   * 获取页面详情（通过路径）
   * @param {string} path - 页面路径
   * @return {Object} 页面详情
   */
  async getPageByPath(path) {
    const { ctx } = this;

    // 查询页面
    const page = await ctx.model.SystemPage.findOne({
      where: { path },
      include: [
        {
          model: ctx.model.PagePermission,
          as: 'permissions',
        },
      ],
    });

    if (!page) {
      throw new Error(`页面不存在: ${path}`);
    }

    return page;
  }

  /**
   * 创建页面
   * @param {Object} data - 页面数据
   * @return {Object} 创建的页面
   */
  async createPage(data) {
    const { ctx } = this;
    const { permissions = [], ...pageData } = data;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 创建页面
      const page = await ctx.model.SystemPage.create(pageData, { transaction });

      // 创建权限
      if (permissions.length > 0) {
        const permissionData = permissions.map(p => ({
          pageId: page.id,
          membershipLevel: p.membershipLevel,
          hasAccess: p.hasAccess,
        }));
        await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });
      } else {
        // 创建默认权限（所有会员等级都可访问）
        const defaultPermissions = ['free', 'basic', 'premium', 'enterprise'].map(level => ({
          pageId: page.id,
          membershipLevel: level,
          hasAccess: true,
        }));
        await ctx.model.PagePermission.bulkCreate(defaultPermissions, { transaction });
      }

      // 提交事务
      await transaction.commit();

      // 返回创建的页面（包含权限）
      return await this.getPageById(page.id);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 更新页面
   * @param {number} id - 页面ID
   * @param {Object} data - 页面数据
   * @return {Object} 更新后的页面
   */
  async updatePage(id, data) {
    const { ctx } = this;
    const { permissions, ...pageData } = data;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询页面
      const page = await ctx.model.SystemPage.findByPk(id);
      if (!page) {
        throw new Error(`页面不存在: ${id}`);
      }

      // 更新页面
      await page.update(pageData, { transaction });

      // 更新权限
      if (permissions && permissions.length > 0) {
        // 删除现有权限
        await ctx.model.PagePermission.destroy({
          where: { pageId: id },
          transaction,
        });

        // 创建新权限
        const permissionData = permissions.map(p => ({
          pageId: id,
          membershipLevel: p.membershipLevel,
          hasAccess: p.hasAccess,
        }));
        await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });
      }

      // 提交事务
      await transaction.commit();

      // 返回更新后的页面（包含权限）
      return await this.getPageById(id);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 删除页面
   * @param {number} id - 页面ID
   * @return {boolean} 是否成功
   */
  async deletePage(id) {
    const { ctx } = this;

    // 查询页面
    const page = await ctx.model.SystemPage.findByPk(id);
    if (!page) {
      throw new Error(`页面不存在: ${id}`);
    }

    // 检查是否有子页面
    const childCount = await ctx.model.SystemPage.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new Error(`无法删除页面，该页面有 ${childCount} 个子页面`);
    }

    // 删除页面（会级联删除权限）
    await page.destroy();

    return true;
  }

  /**
   * 更新页面权限
   * @param {number} pageId - 页面ID
   * @param {Array} permissions - 权限数据
   * @return {Object} 更新后的页面
   */
  async updatePagePermissions(pageId, permissions) {
    const { ctx } = this;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询页面
      const page = await ctx.model.SystemPage.findByPk(pageId);
      if (!page) {
        throw new Error(`页面不存在: ${pageId}`);
      }

      // 删除现有权限
      await ctx.model.PagePermission.destroy({
        where: { pageId },
        transaction,
      });

      // 创建新权限
      if (permissions && permissions.length > 0) {
        const permissionData = permissions.map(p => ({
          pageId,
          membershipLevel: p.membershipLevel,
          hasAccess: p.hasAccess,
        }));
        await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });
      }

      // 提交事务
      await transaction.commit();

      // 返回更新后的页面（包含权限）
      return await this.getPageById(pageId);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 批量更新页面状态
   * @param {Array} ids - 页面ID数组
   * @param {boolean} isEnabled - 是否启用
   * @return {number} 更新的记录数
   */
  async batchUpdateStatus(ids, isEnabled) {
    const { ctx } = this;

    // 更新页面状态
    const result = await ctx.model.SystemPage.update(
      { isEnabled },
      {
        where: {
          id: {
            [ctx.app.Sequelize.Op.in]: ids,
          },
        },
      }
    );

    return result[0]; // 返回更新的记录数
  }

  /**
   * 检查页面访问权限
   * @param {string} path - 页面路径
   * @param {string} membershipLevel - 会员等级
   * @return {boolean} 是否有权限访问
   */
  async checkPageAccess(path, membershipLevel) {
    const { ctx } = this;

    try {
      // 查询页面
      const page = await ctx.model.SystemPage.findOne({
        where: { path, isEnabled: true },
        include: [
          {
            model: ctx.model.PagePermission,
            as: 'permissions',
            where: { membershipLevel },
            required: false,
          },
        ],
      });

      // 页面不存在或未启用
      if (!page) {
        return false;
      }

      // 检查权限
      if (page.permissions && page.permissions.length > 0) {
        return page.permissions[0].hasAccess;
      }

      // 默认无权限
      return false;
    } catch (error) {
      ctx.logger.error('检查页面访问权限失败:', error);
      return false;
    }
  }

  /**
   * 初始化系统页面
   * 从路由配置中导入页面
   * @return {number} 创建的页面数量
   */
  async initSystemPages() {
    const { ctx } = this;
    const transaction = await ctx.model.transaction();

    try {
      // 获取现有页面路径
      const existingPages = await ctx.model.SystemPage.findAll({
        attributes: ['path'],
      });
      const existingPaths = new Set(existingPages.map(p => p.path));

      // 定义系统页面
      const systemPages = [
        // 公开页面
        {
          path: '/',
          name: '首页',
          description: '系统首页',
          icon: '🏠',
          component: 'HomeView',
          isMenu: true,
          sortOrder: 0,
          requiresAuth: false,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/about',
          name: '关于我们',
          description: '关于我们页面',
          icon: 'ℹ️',
          component: 'AboutView',
          isMenu: true,
          sortOrder: 100,
          requiresAuth: false,
          requiredMembershipLevel: 'free',
        },

        // 认证页面
        {
          path: '/login',
          name: '登录',
          description: '用户登录页面',
          icon: '🔑',
          component: 'auth/LoginView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: false,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/register',
          name: '注册',
          description: '用户注册页面',
          icon: '📝',
          component: 'auth/RegisterView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: false,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/forgot-password',
          name: '忘记密码',
          description: '密码重置页面',
          icon: '🔒',
          component: 'auth/ForgotPasswordView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: false,
          requiredMembershipLevel: 'free',
        },

        // 基础功能页面
        {
          path: '/dashboard',
          name: '仪表盘',
          description: '用户仪表盘',
          icon: '📊',
          component: 'DashboardView',
          isMenu: true,
          sortOrder: 10,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/stock',
          name: '股票分析',
          description: '股票分析工具',
          icon: '📈',
          component: 'StockAnalysisView',
          isMenu: true,
          sortOrder: 20,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/market-heatmap',
          name: '大盘云图',
          description: '市场热力图',
          icon: '🔥',
          component: 'MarketHeatmapView',
          isMenu: true,
          sortOrder: 30,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/industry-analysis',
          name: '行业分析',
          description: '行业分析工具',
          icon: '🏭',
          component: 'IndustryAnalysisView',
          isMenu: true,
          sortOrder: 40,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },

        // 基础会员功能
        {
          path: '/portfolio',
          name: '仓位管理',
          description: '投资组合管理',
          icon: '💼',
          component: 'PortfolioView',
          isMenu: true,
          sortOrder: 50,
          requiresAuth: true,
          requiredMembershipLevel: 'basic',
        },
        {
          path: '/alerts',
          name: '条件提醒',
          description: '股票提醒设置',
          icon: '🔔',
          component: 'AlertsView',
          isMenu: true,
          sortOrder: 60,
          requiresAuth: true,
          requiredMembershipLevel: 'basic',
        },

        // 高级会员功能
        {
          path: '/market-scanner',
          name: '市场扫描器',
          description: '市场扫描工具',
          icon: '🔍',
          component: 'MarketScannerView',
          isMenu: true,
          sortOrder: 70,
          requiresAuth: true,
          requiredMembershipLevel: 'premium',
        },
        {
          path: '/backtest',
          name: '策略回测',
          description: '交易策略回测',
          icon: '🔄',
          component: 'BacktestView',
          isMenu: true,
          sortOrder: 80,
          requiresAuth: true,
          requiredMembershipLevel: 'premium',
        },

        // 设置页面
        {
          path: '/profile',
          name: '个人资料',
          description: '用户个人资料',
          icon: '👤',
          component: 'ProfileView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/settings',
          name: '账户设置',
          description: '用户账户设置',
          icon: '⚙️',
          component: 'SettingsView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/membership',
          name: '会员中心',
          description: '会员管理中心',
          icon: '⭐',
          component: 'MembershipView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/membership-features',
          name: '会员功能',
          description: '会员功能介绍',
          icon: '🌟',
          component: 'MembershipFeaturesView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/settings/data-source',
          name: '数据源设置',
          description: '数据源配置',
          icon: '🔌',
          component: 'DataSourceSettingsView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiredMembershipLevel: 'free',
        },

        // 管理员页面
        {
          path: '/admin',
          name: '用户管理',
          description: '管理员后台 - 用户管理',
          icon: '👑',
          component: 'admin/AdminView',
          isMenu: true,
          sortOrder: 200,
          requiresAuth: true,
          requiresAdmin: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/admin/data-source',
          name: '数据源管理',
          description: '管理员后台 - 数据源管理',
          icon: '🔌',
          component: 'DataSourceManagementView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiresAdmin: true,
          requiredMembershipLevel: 'free',
        },
        {
          path: '/settings/cache',
          name: '缓存管理',
          description: '管理员后台 - 缓存管理',
          icon: '💾',
          component: 'CacheManagementView',
          isMenu: false,
          sortOrder: 0,
          requiresAuth: true,
          requiresAdmin: true,
          requiredMembershipLevel: 'free',
        },
      ];

      // 创建页面
      let createdCount = 0;
      for (const pageData of systemPages) {
        // 跳过已存在的页面
        if (existingPaths.has(pageData.path)) {
          continue;
        }

        // 创建页面
        await ctx.model.SystemPage.create({
          ...pageData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { transaction });

        createdCount++;
      }

      // 提交事务
      await transaction.commit();

      // 返回创建的页面数量
      return createdCount;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取用户可访问的页面
   * @param {string} membershipLevel - 会员等级
   * @param {boolean} isAdmin - 是否是管理员
   * @return {Array} 可访问的页面列表
   */
  async getUserAccessiblePages(membershipLevel, isAdmin) {
    const { ctx } = this;

    // 构建查询条件
    const where = {
      isEnabled: true,
    };

    // 非管理员需要检查权限
    if (!isAdmin) {
      // 查询页面及其权限
      const pages = await ctx.model.SystemPage.findAll({
        where,
        include: [
          {
            model: ctx.model.PagePermission,
            as: 'permissions',
            required: false,
          },
        ],
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      });

      // 过滤出用户可访问的页面
      return pages.filter(page => {
        // 管理员页面，非管理员不可访问
        if (page.requiresAdmin) {
          return false;
        }

        // 查找当前会员等级的权限
        const permission = page.permissions.find(p => p.membershipLevel === membershipLevel);
        return permission ? permission.hasAccess : false;
      });
    }

    // 管理员可以访问所有页面
    return await ctx.model.SystemPage.findAll({
      where,
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
  }

  /**
   * 获取菜单树
   * @param {string} membershipLevel - 会员等级
   * @param {boolean} isAdmin - 是否是管理员
   * @return {Array} 菜单树
   */
  async getMenuTree(membershipLevel, isAdmin) {
    // 获取用户可访问的页面
    const pages = await this.getUserAccessiblePages(membershipLevel, isAdmin);

    // 过滤出菜单项
    const menuItems = pages.filter(page => page.isMenu);

    // 构建菜单树
    const rootMenus = menuItems.filter(item => !item.parentId);
    const childMenus = menuItems.filter(item => item.parentId);

    // 添加子菜单
    rootMenus.forEach(menu => {
      menu.children = childMenus.filter(child => child.parentId === menu.id);
    });

    return rootMenus;
  }

  /**
   * 记录页面访问日志
   * @param {Object} data - 访问数据
   * @return {Object} 创建的日志记录
   */
  async logPageAccess(data) {
    const { ctx } = this;
    const {
      pageId,
      userId,
      path,
      membershipLevel,
      ipAddress,
      userAgent,
      referrer,
      hasAccess,
      accessResult
    } = data;

    try {
      // 创建访问日志
      const log = await ctx.model.PageAccessLog.create({
        pageId,
        userId,
        path,
        membershipLevel,
        ipAddress,
        userAgent,
        referrer,
        hasAccess,
        accessResult,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 更新访问统计
      await this.updateAccessStats({
        pageId,
        userId,
        membershipLevel,
      });

      return log;
    } catch (error) {
      ctx.logger.error('记录页面访问日志失败:', error);
      // 记录日志失败不应影响正常业务流程，所以这里只记录错误，不抛出异常
      return null;
    }
  }

  /**
   * 更新页面访问统计
   * @param {Object} data - 统计数据
   * @return {Object} 更新后的统计记录
   */
  async updateAccessStats(data) {
    const { ctx } = this;
    const { pageId, userId, membershipLevel } = data;
    const now = new Date();

    try {
      // 查找现有统计记录
      let stat = await ctx.model.PageAccessStat.findOne({
        where: {
          pageId,
          userId: userId || null,
        },
      });

      if (stat) {
        // 更新现有记录
        await stat.update({
          accessCount: stat.accessCount + 1,
          lastAccessAt: now,
          membershipLevel, // 更新为最新的会员等级
          updatedAt: now,
        });
      } else {
        // 创建新记录
        stat = await ctx.model.PageAccessStat.create({
          pageId,
          userId,
          membershipLevel,
          accessCount: 1,
          totalDuration: 0,
          lastAccessAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      return stat;
    } catch (error) {
      ctx.logger.error('更新页面访问统计失败:', error);
      // 更新统计失败不应影响正常业务流程，所以这里只记录错误，不抛出异常
      return null;
    }
  }

  /**
   * 更新页面停留时间
   * @param {number} logId - 访问日志ID
   * @param {number} duration - 停留时间（秒）
   * @return {boolean} 是否成功
   */
  async updatePageDuration(logId, duration) {
    const { ctx } = this;

    try {
      // 查找访问日志
      const log = await ctx.model.PageAccessLog.findByPk(logId);
      if (!log) {
        return false;
      }

      // 更新停留时间
      await log.update({
        duration,
        updatedAt: new Date(),
      });

      // 更新统计记录的总停留时间
      const stat = await ctx.model.PageAccessStat.findOne({
        where: {
          pageId: log.pageId,
          userId: log.userId || null,
        },
      });

      if (stat) {
        await stat.update({
          totalDuration: stat.totalDuration + duration,
          updatedAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      ctx.logger.error('更新页面停留时间失败:', error);
      return false;
    }
  }

  /**
   * 获取页面访问统计
   * @param {Object} options - 查询选项
   * @return {Array} 统计数据
   */
  async getPageAccessStats(options = {}) {
    const { ctx } = this;
    const { pageId, userId, startDate, endDate, limit = 10 } = options;

    // 构建查询条件
    const where = {};
    if (pageId) {
      where.pageId = pageId;
    }
    if (userId) {
      where.userId = userId;
    }

    // 时间范围查询
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[ctx.app.Sequelize.Op.gte] = startDate;
      }
      if (endDate) {
        where.createdAt[ctx.app.Sequelize.Op.lte] = endDate;
      }
    }

    // 查询统计数据
    const stats = await ctx.model.PageAccessStat.findAll({
      where,
      include: [
        {
          model: ctx.model.SystemPage,
          as: 'page',
          attributes: ['id', 'name', 'path'],
        },
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [
        ['accessCount', 'DESC'],
      ],
      limit,
    });

    return stats;
  }

  /**
   * 获取页面访问日志
   * @param {Object} options - 查询选项
   * @return {Object} 分页日志数据
   */
  async getPageAccessLogs(options = {}) {
    const { ctx } = this;
    const {
      pageId,
      userId,
      path,
      membershipLevel,
      hasAccess,
      accessResult,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = options;

    // 构建查询条件
    const where = {};
    if (pageId) {
      where.pageId = pageId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (path) {
      where.path = {
        [ctx.app.Sequelize.Op.like]: `%${path}%`,
      };
    }
    if (membershipLevel) {
      where.membershipLevel = membershipLevel;
    }
    if (hasAccess !== undefined) {
      where.hasAccess = hasAccess;
    }
    if (accessResult) {
      where.accessResult = accessResult;
    }

    // 时间范围查询
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[ctx.app.Sequelize.Op.gte] = startDate;
      }
      if (endDate) {
        where.createdAt[ctx.app.Sequelize.Op.lte] = endDate;
      }
    }

    // 查询日志数据
    const { count, rows } = await ctx.model.PageAccessLog.findAndCountAll({
      where,
      include: [
        {
          model: ctx.model.SystemPage,
          as: 'page',
          attributes: ['id', 'name', 'path'],
        },
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [
        ['createdAt', 'DESC'],
      ],
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    return {
      total: count,
      page,
      pageSize,
      list: rows,
    };
  }

  /**
   * 获取页面访问统计摘要
   * @param {Object} options - 查询选项
   * @return {Object} 统计摘要
   */
  async getPageAccessSummary(options = {}) {
    const { ctx } = this;
    const { startDate, endDate } = options;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfThisWeek = moment().startOf('week').toDate();
    const startOfThisMonth = moment().startOf('month').toDate();

    // 构建时间范围查询条件
    const timeRangeWhere = {};
    if (startDate || endDate) {
      timeRangeWhere.createdAt = {};
      if (startDate) {
        timeRangeWhere.createdAt[ctx.app.Sequelize.Op.gte] = startDate;
      }
      if (endDate) {
        timeRangeWhere.createdAt[ctx.app.Sequelize.Op.lte] = endDate;
      }
    }

    // 查询总访问量
    const totalVisits = await ctx.model.PageAccessLog.count({
      where: timeRangeWhere,
    });

    // 查询今日访问量
    const todayVisits = await ctx.model.PageAccessLog.count({
      where: {
        ...timeRangeWhere,
        createdAt: {
          [ctx.app.Sequelize.Op.gte]: startOfToday,
        },
      },
    });

    // 查询昨日访问量
    const yesterdayVisits = await ctx.model.PageAccessLog.count({
      where: {
        ...timeRangeWhere,
        createdAt: {
          [ctx.app.Sequelize.Op.gte]: startOfYesterday,
          [ctx.app.Sequelize.Op.lt]: startOfToday,
        },
      },
    });

    // 查询本周访问量
    const thisWeekVisits = await ctx.model.PageAccessLog.count({
      where: {
        ...timeRangeWhere,
        createdAt: {
          [ctx.app.Sequelize.Op.gte]: startOfThisWeek,
        },
      },
    });

    // 查询本月访问量
    const thisMonthVisits = await ctx.model.PageAccessLog.count({
      where: {
        ...timeRangeWhere,
        createdAt: {
          [ctx.app.Sequelize.Op.gte]: startOfThisMonth,
        },
      },
    });

    // 查询访问量最高的页面
    const topPages = await ctx.model.PageAccessStat.findAll({
      attributes: [
        'pageId',
        [ctx.app.Sequelize.fn('SUM', ctx.app.Sequelize.col('access_count')), 'totalVisits'],
      ],
      include: [
        {
          model: ctx.model.SystemPage,
          as: 'page',
          attributes: ['id', 'name', 'path'],
        },
      ],
      where: timeRangeWhere,
      group: ['pageId'],
      order: [
        [ctx.app.Sequelize.literal('totalVisits'), 'DESC'],
      ],
      limit: 5,
    });

    // 查询访问量最高的用户
    const topUsers = await ctx.model.PageAccessStat.findAll({
      attributes: [
        'userId',
        [ctx.app.Sequelize.fn('SUM', ctx.app.Sequelize.col('access_count')), 'totalVisits'],
      ],
      include: [
        {
          model: ctx.model.User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
      where: {
        ...timeRangeWhere,
        userId: {
          [ctx.app.Sequelize.Op.ne]: null,
        },
      },
      group: ['userId'],
      order: [
        [ctx.app.Sequelize.literal('totalVisits'), 'DESC'],
      ],
      limit: 5,
    });

    // 查询会员等级分布
    const membershipDistribution = await ctx.model.PageAccessLog.findAll({
      attributes: [
        'membershipLevel',
        [ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'count'],
      ],
      where: timeRangeWhere,
      group: ['membershipLevel'],
      order: [
        [ctx.app.Sequelize.literal('count'), 'DESC'],
      ],
    });

    // 查询访问结果分布
    const accessResultDistribution = await ctx.model.PageAccessLog.findAll({
      attributes: [
        'accessResult',
        [ctx.app.Sequelize.fn('COUNT', ctx.app.Sequelize.col('id')), 'count'],
      ],
      where: timeRangeWhere,
      group: ['accessResult'],
      order: [
        [ctx.app.Sequelize.literal('count'), 'DESC'],
      ],
    });

    return {
      totalVisits,
      todayVisits,
      yesterdayVisits,
      thisWeekVisits,
      thisMonthVisits,
      topPages,
      topUsers,
      membershipDistribution,
      accessResultDistribution,
    };
  }

  /**
   * 创建页面组
   * @param {Object} data - 组数据
   * @return {Object} 创建的组
   */
  async createPageGroup(data) {
    const { ctx } = this;
    const { name, description, pageIds = [] } = data;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 创建页面组
      const group = await ctx.model.PageGroup.create({
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { transaction });

      // 添加页面到组
      if (pageIds.length > 0) {
        const mappings = pageIds.map(pageId => ({
          groupId: group.id,
          pageId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await ctx.model.PageGroupMapping.bulkCreate(mappings, { transaction });
      }

      // 提交事务
      await transaction.commit();

      // 返回创建的组（包含页面）
      return await this.getPageGroupById(group.id);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 获取页面组详情
   * @param {number} id - 组ID
   * @return {Object} 组详情
   */
  async getPageGroupById(id) {
    const { ctx } = this;

    // 查询页面组
    const group = await ctx.model.PageGroup.findByPk(id, {
      include: [
        {
          model: ctx.model.SystemPage,
          as: 'pages',
          through: { attributes: [] }, // 不包含中间表字段
        },
      ],
    });

    if (!group) {
      throw new Error(`页面组不存在: ${id}`);
    }

    return group;
  }

  /**
   * 获取所有页面组
   * @return {Array} 页面组列表
   */
  async getAllPageGroups() {
    const { ctx } = this;

    // 查询所有页面组
    const groups = await ctx.model.PageGroup.findAll({
      include: [
        {
          model: ctx.model.SystemPage,
          as: 'pages',
          through: { attributes: [] }, // 不包含中间表字段
        },
      ],
    });

    return groups;
  }

  /**
   * 更新页面组
   * @param {number} id - 组ID
   * @param {Object} data - 组数据
   * @return {Object} 更新后的组
   */
  async updatePageGroup(id, data) {
    const { ctx } = this;
    const { name, description, pageIds } = data;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询页面组
      const group = await ctx.model.PageGroup.findByPk(id);
      if (!group) {
        throw new Error(`页面组不存在: ${id}`);
      }

      // 更新页面组
      await group.update({
        name,
        description,
        updatedAt: new Date(),
      }, { transaction });

      // 更新页面关联
      if (pageIds) {
        // 删除现有关联
        await ctx.model.PageGroupMapping.destroy({
          where: { groupId: id },
          transaction,
        });

        // 创建新关联
        if (pageIds.length > 0) {
          const mappings = pageIds.map(pageId => ({
            groupId: id,
            pageId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          await ctx.model.PageGroupMapping.bulkCreate(mappings, { transaction });
        }
      }

      // 提交事务
      await transaction.commit();

      // 返回更新后的组（包含页面）
      return await this.getPageGroupById(id);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 删除页面组
   * @param {number} id - 组ID
   * @return {boolean} 是否成功
   */
  async deletePageGroup(id) {
    const { ctx } = this;

    // 查询页面组
    const group = await ctx.model.PageGroup.findByPk(id);
    if (!group) {
      throw new Error(`页面组不存在: ${id}`);
    }

    // 删除页面组（会级联删除关联）
    await group.destroy();

    return true;
  }

  /**
   * 批量设置页面组权限
   * @param {number} groupId - 组ID
   * @param {Array} permissions - 权限数据
   * @return {boolean} 是否成功
   */
  async setPageGroupPermissions(groupId, permissions) {
    const { ctx } = this;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询页面组
      const group = await ctx.model.PageGroup.findByPk(groupId, {
        include: [
          {
            model: ctx.model.SystemPage,
            as: 'pages',
            through: { attributes: [] }, // 不包含中间表字段
          },
        ],
      });

      if (!group) {
        throw new Error(`页面组不存在: ${groupId}`);
      }

      // 获取组内所有页面ID
      const pageIds = group.pages.map(page => page.id);

      // 为每个页面设置权限
      for (const pageId of pageIds) {
        // 删除现有权限
        await ctx.model.PagePermission.destroy({
          where: { pageId },
          transaction,
        });

        // 创建新权限
        const permissionData = permissions.map(p => ({
          pageId,
          membershipLevel: p.membershipLevel,
          hasAccess: p.hasAccess,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });
      }

      // 提交事务
      await transaction.commit();

      return true;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 创建权限模板
   * @param {Object} data - 模板数据
   * @return {Object} 创建的模板
   */
  async createPermissionTemplate(data) {
    const { ctx } = this;
    const { name, description, permissions } = data;

    // 创建权限模板
    const template = await ctx.model.PermissionTemplate.create({
      name,
      description,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return template;
  }

  /**
   * 获取所有权限模板
   * @return {Array} 模板列表
   */
  async getAllPermissionTemplates() {
    const { ctx } = this;

    // 查询所有权限模板
    const templates = await ctx.model.PermissionTemplate.findAll();

    return templates;
  }

  /**
   * 获取权限模板详情
   * @param {number} id - 模板ID
   * @return {Object} 模板详情
   */
  async getPermissionTemplateById(id) {
    const { ctx } = this;

    // 查询权限模板
    const template = await ctx.model.PermissionTemplate.findByPk(id);

    if (!template) {
      throw new Error(`权限模板不存在: ${id}`);
    }

    return template;
  }

  /**
   * 更新权限模板
   * @param {number} id - 模板ID
   * @param {Object} data - 模板数据
   * @return {Object} 更新后的模板
   */
  async updatePermissionTemplate(id, data) {
    const { ctx } = this;
    const { name, description, permissions } = data;

    // 查询权限模板
    const template = await ctx.model.PermissionTemplate.findByPk(id);
    if (!template) {
      throw new Error(`权限模板不存在: ${id}`);
    }

    // 更新权限模板
    await template.update({
      name,
      description,
      permissions,
      updatedAt: new Date(),
    });

    return template;
  }

  /**
   * 删除权限模板
   * @param {number} id - 模板ID
   * @return {boolean} 是否成功
   */
  async deletePermissionTemplate(id) {
    const { ctx } = this;

    // 查询权限模板
    const template = await ctx.model.PermissionTemplate.findByPk(id);
    if (!template) {
      throw new Error(`权限模板不存在: ${id}`);
    }

    // 删除权限模板
    await template.destroy();

    return true;
  }

  /**
   * 应用权限模板到页面
   * @param {number} templateId - 模板ID
   * @param {number} pageId - 页面ID
   * @return {boolean} 是否成功
   */
  async applyTemplateToPage(templateId, pageId) {
    const { ctx } = this;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询权限模板
      const template = await ctx.model.PermissionTemplate.findByPk(templateId);
      if (!template) {
        throw new Error(`权限模板不存在: ${templateId}`);
      }

      // 查询页面
      const page = await ctx.model.SystemPage.findByPk(pageId);
      if (!page) {
        throw new Error(`页面不存在: ${pageId}`);
      }

      // 删除现有权限
      await ctx.model.PagePermission.destroy({
        where: { pageId },
        transaction,
      });

      // 创建新权限
      const permissionData = template.permissions.map(p => ({
        pageId,
        membershipLevel: p.membershipLevel,
        hasAccess: p.hasAccess,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });

      // 提交事务
      await transaction.commit();

      return true;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 应用权限模板到页面组
   * @param {number} templateId - 模板ID
   * @param {number} groupId - 组ID
   * @return {boolean} 是否成功
   */
  async applyTemplateToGroup(templateId, groupId) {
    const { ctx } = this;

    // 开启事务
    const transaction = await ctx.model.transaction();

    try {
      // 查询权限模板
      const template = await ctx.model.PermissionTemplate.findByPk(templateId);
      if (!template) {
        throw new Error(`权限模板不存在: ${templateId}`);
      }

      // 查询页面组
      const group = await ctx.model.PageGroup.findByPk(groupId, {
        include: [
          {
            model: ctx.model.SystemPage,
            as: 'pages',
            through: { attributes: [] }, // 不包含中间表字段
          },
        ],
      });

      if (!group) {
        throw new Error(`页面组不存在: ${groupId}`);
      }

      // 获取组内所有页面ID
      const pageIds = group.pages.map(page => page.id);

      // 为每个页面设置权限
      for (const pageId of pageIds) {
        // 删除现有权限
        await ctx.model.PagePermission.destroy({
          where: { pageId },
          transaction,
        });

        // 创建新权限
        const permissionData = template.permissions.map(p => ({
          pageId,
          membershipLevel: p.membershipLevel,
          hasAccess: p.hasAccess,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await ctx.model.PagePermission.bulkCreate(permissionData, { transaction });
      }

      // 提交事务
      await transaction.commit();

      return true;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = PageService;
