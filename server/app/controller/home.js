'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = {
      message: 'Hello, Stock Analysis API!',
      status: 'success',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = HomeController;
