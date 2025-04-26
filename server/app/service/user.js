'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');

class UserService extends Service {
  /**
   * 创建用户
   * @param {Object} data - 用户数据
   * @return {Object} 创建的用户（不包含密码）
   */
  async create(data) {
    const { ctx, app } = this;
    const { username, email, password } = data;

    // 哈希密码
    const hashedPassword = this.hashPassword(password);

    // 创建用户
    const user = await ctx.model.User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 创建用户偏好设置
    await ctx.model.UserPreference.create({
      userId: user.id,
      theme: 'light',
      language: 'zh-CN',
      defaultDashboardLayout: 'default',
      emailNotifications: true,
      pushNotifications: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * 验证用户
   * @param {string} usernameOrEmail - 用户名或邮箱
   * @param {string} password - 密码
   * @return {Object|null} 验证成功返回用户（不包含密码），失败返回null
   */
  async verify(usernameOrEmail, password) {
    const { ctx } = this;

    // 查找用户
    const user = await ctx.model.User.findOne({
      where: {
        [ctx.app.Sequelize.Op.or]: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      },
    });

    if (!user) {
      return null;
    }

    // 验证密码
    const hashedPassword = this.hashPassword(password);
    if (hashedPassword !== user.password) {
      return null;
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * 根据ID查找用户
   * @param {number} id - 用户ID
   * @return {Object|null} 用户（不包含密码）
   */
  async findById(id) {
    const { ctx } = this;

    // 查找用户
    const user = await ctx.model.User.findByPk(id, {
      include: [{ model: ctx.model.UserPreference }],
    });

    if (!user) {
      return null;
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * 更新用户最后登录时间
   * @param {number} id - 用户ID
   */
  async updateLastLogin(id) {
    const { ctx } = this;
    await ctx.model.User.update(
      { lastLogin: new Date() },
      { where: { id } }
    );
  }

  /**
   * 更新用户资料
   * @param {number} id - 用户ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的用户（不包含密码）
   */
  async updateProfile(id, data) {
    const { ctx } = this;
    const { nickname, bio, phone, location, website, avatar } = data;

    // 更新用户
    await ctx.model.User.update(
      {
        nickname,
        bio,
        phone,
        location,
        website,
        avatar,
        updatedAt: new Date(),
      },
      { where: { id } }
    );

    // 返回更新后的用户
    return this.findById(id);
  }

  /**
   * 更新用户偏好设置
   * @param {number} id - 用户ID
   * @param {Object} data - 更新数据
   * @return {Object|null} 更新后的偏好设置
   */
  async updatePreferences(id, data) {
    const { ctx } = this;

    // 查找用户偏好设置
    const preference = await ctx.model.UserPreference.findOne({
      where: { userId: id },
    });

    if (!preference) {
      return null;
    }

    // 更新偏好设置
    await preference.update({
      ...data,
      updatedAt: new Date(),
    });

    return preference.toJSON();
  }

  /**
   * 更新用户密码
   * @param {number} id - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @return {boolean} 更新成功返回true，失败返回false
   */
  async updatePassword(id, oldPassword, newPassword) {
    const { ctx } = this;

    // 查找用户
    const user = await ctx.model.User.findByPk(id);
    if (!user) {
      return false;
    }

    // 验证旧密码
    const hashedOldPassword = this.hashPassword(oldPassword);
    if (hashedOldPassword !== user.password) {
      return false;
    }

    // 哈希新密码
    const hashedNewPassword = this.hashPassword(newPassword);

    // 更新密码
    await user.update({
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * 请求密码重置
   * @param {string} email - 用户邮箱
   */
  async requestPasswordReset(email) {
    const { ctx } = this;

    // 查找用户
    const user = await ctx.model.User.findOne({
      where: { email },
    });

    if (!user) {
      // 出于安全考虑，即使用户不存在也不返回错误
      return;
    }

    // 在实际应用中，这里应该生成重置令牌并发送邮件
    // 这里仅做演示，不实际发送邮件
    ctx.logger.info(`为用户 ${user.username} (${email}) 请求密码重置`);
  }

  /**
   * 哈希密码
   * @param {string} password - 原始密码
   * @return {string} 哈希后的密码
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}

module.exports = UserService;
