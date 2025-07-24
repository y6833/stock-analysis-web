/**
 * BaseController 单元测试
 */

const assert = require('assert');
const { mock, spy } = require('sinon');
const { BaseController } = require('../../app/core/BaseController');

describe('BaseController', () => {
  let ctx;
  let controller;
  
  beforeEach(() => {
    // 模拟 Egg.js 的 ctx 对象
    ctx = {
      request: {
        body: {},
        query: {}
      },
      params: {},
      service: {},
      body: null,
      status: 200,
      logger: {
        info: spy(),
        error: spy(),
        warn: spy(),
        debug: spy()
      },
      throw: spy((status, message) => {
        const error = new Error(message);
        error.status = status;
        throw error;
      })
    };
    
    // 创建测试控制器
    controller = new BaseController(ctx);
  });
  
  describe('success', () => {
    it('should return success response with data', () => {
      const data = { id: 1, name: 'test' };
      controller.success(data);
      
      assert.deepStrictEqual(ctx.body, {
        success: true,
        data,
        message: 'Success'
      });
      assert.strictEqual(ctx.status, 200);
    });
    
    it('should return success response with custom message', () => {
      const data = { id: 1 };
      const message = 'Custom success message';
      controller.success(data, message);
      
      assert.deepStrictEqual(ctx.body, {
        success: true,
        data,
        message
      });
    });
    
    it('should return success response with custom status', () => {
      const data = { id: 1 };
      controller.success(data, 'Created', 201);
      
      assert.strictEqual(ctx.status, 201);
    });
  });
  
  describe('fail', () => {
    it('should return error response with message', () => {
      controller.fail('Error message');
      
      assert.deepStrictEqual(ctx.body, {
        success: false,
        message: 'Error message'
      });
      assert.strictEqual(ctx.status, 400);
    });
    
    it('should return error response with custom status', () => {
      controller.fail('Not Found', 404);
      
      assert.strictEqual(ctx.status, 404);
    });
    
    it('should return error response with error details', () => {
      const details = { field: 'username', message: 'Required' };
      controller.fail('Validation Error', 400, details);
      
      assert.deepStrictEqual(ctx.body, {
        success: false,
        message: 'Validation Error',
        details
      });
    });
  });
  
  describe('notFound', () => {
    it('should throw 404 error with default message', () => {
      try {
        controller.notFound();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.status, 404);
        assert.strictEqual(error.message, 'Resource not found');
      }
      
      assert(ctx.throw.calledWith(404, 'Resource not found'));
    });
    
    it('should throw 404 error with custom message', () => {
      try {
        controller.notFound('User not found');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.message, 'User not found');
      }
      
      assert(ctx.throw.calledWith(404, 'User not found'));
    });
  });
  
  describe('forbidden', () => {
    it('should throw 403 error with default message', () => {
      try {
        controller.forbidden();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.status, 403);
        assert.strictEqual(error.message, 'Forbidden');
      }
      
      assert(ctx.throw.calledWith(403, 'Forbidden'));
    });
    
    it('should throw 403 error with custom message', () => {
      try {
        controller.forbidden('No permission');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.message, 'No permission');
      }
      
      assert(ctx.throw.calledWith(403, 'No permission'));
    });
  });
  
  describe('unauthorized', () => {
    it('should throw 401 error with default message', () => {
      try {
        controller.unauthorized();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.status, 401);
        assert.strictEqual(error.message, 'Unauthorized');
      }
      
      assert(ctx.throw.calledWith(401, 'Unauthorized'));
    });
    
    it('should throw 401 error with custom message', () => {
      try {
        controller.unauthorized('Login required');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.message, 'Login required');
      }
      
      assert(ctx.throw.calledWith(401, 'Login required'));
    });
  });
  
  describe('badRequest', () => {
    it('should throw 400 error with default message', () => {
      try {
        controller.badRequest();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.status, 400);
        assert.strictEqual(error.message, 'Bad Request');
      }
      
      assert(ctx.throw.calledWith(400, 'Bad Request'));
    });
    
    it('should throw 400 error with custom message', () => {
      try {
        controller.badRequest('Invalid parameters');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.message, 'Invalid parameters');
      }
      
      assert(ctx.throw.calledWith(400, 'Invalid parameters'));
    });
  });
  
  describe('validate', () => {
    it('should pass validation when all required fields are present', () => {
      ctx.request.body = { name: 'test', age: 30 };
      const result = controller.validate(['name', 'age']);
      
      assert.strictEqual(result, true);
    });
    
    it('should throw error when required fields are missing', () => {
      ctx.request.body = { name: 'test' };
      
      try {
        controller.validate(['name', 'age']);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.strictEqual(error.status, 400);
        assert.strictEqual(error.message, 'Missing required fields: age');
      }
    });
    
    it('should validate query parameters', () => {
      ctx.request.query = { page: '1', limit: '10' };
      const result = controller.validate(['page', 'limit'], 'query');
      
      assert.strictEqual(result, true);
    });
    
    it('should validate URL parameters', () => {
      ctx.params = { id: '123' };
      const result = controller.validate(['id'], 'params');
      
      assert.strictEqual(result, true);
    });
  });
  
  describe('getRequestData', () => {
    it('should get data from request body', () => {
      ctx.request.body = { name: 'test', age: 30 };
      const data = controller.getRequestData();
      
      assert.deepStrictEqual(data, { name: 'test', age: 30 });
    });
    
    it('should get data from query parameters', () => {
      ctx.request.query = { page: '1', limit: '10' };
      const data = controller.getRequestData('query');
      
      assert.deepStrictEqual(data, { page: '1', limit: '10' });
    });
    
    it('should get data from URL parameters', () => {
      ctx.params = { id: '123' };
      const data = controller.getRequestData('params');
      
      assert.deepStrictEqual(data, { id: '123' });
    });
    
    it('should return empty object for unknown source', () => {
      const data = controller.getRequestData('unknown');
      
      assert.deepStrictEqual(data, {});
    });
  });
  
  describe('getPagination', () => {
    it('should get pagination parameters with defaults', () => {
      ctx.request.query = {};
      const { page, pageSize } = controller.getPagination();
      
      assert.strictEqual(page, 1);
      assert.strictEqual(pageSize, 20);
    });
    
    it('should get pagination parameters from query', () => {
      ctx.request.query = { page: '2', pageSize: '50' };
      const { page, pageSize } = controller.getPagination();
      
      assert.strictEqual(page, 2);
      assert.strictEqual(pageSize, 50);
    });
    
    it('should handle invalid pagination parameters', () => {
      ctx.request.query = { page: 'invalid', pageSize: -10 };
      const { page, pageSize } = controller.getPagination();
      
      assert.strictEqual(page, 1);
      assert.strictEqual(pageSize, 20);
    });
    
    it('should respect max page size', () => {
      ctx.request.query = { pageSize: '1000' };
      const { pageSize } = controller.getPagination();
      
      assert.strictEqual(pageSize, 100); // Max page size
    });
  });
  
  describe('getSorting', () => {
    it('should get sorting parameters with defaults', () => {
      ctx.request.query = {};
      const { sortBy, sortOrder } = controller.getSorting();
      
      assert.strictEqual(sortBy, 'createdAt');
      assert.strictEqual(sortOrder, 'desc');
    });
    
    it('should get sorting parameters from query', () => {
      ctx.request.query = { sortBy: 'name', sortOrder: 'asc' };
      const { sortBy, sortOrder } = controller.getSorting();
      
      assert.strictEqual(sortBy, 'name');
      assert.strictEqual(sortOrder, 'asc');
    });
    
    it('should handle invalid sort order', () => {
      ctx.request.query = { sortBy: 'name', sortOrder: 'invalid' };
      const { sortOrder } = controller.getSorting();
      
      assert.strictEqual(sortOrder, 'desc'); // Default
    });
    
    it('should use custom defaults', () => {
      ctx.request.query = {};
      const { sortBy, sortOrder } = controller.getSorting('id', 'asc');
      
      assert.strictEqual(sortBy, 'id');
      assert.strictEqual(sortOrder, 'asc');
    });
  });
  
  describe('getFilters', () => {
    it('should extract filter parameters from query', () => {
      ctx.request.query = {
        page: '1',
        pageSize: '20',
        sortBy: 'name',
        category: 'test',
        status: 'active'
      };
      
      const filters = controller.getFilters(['category', 'status']);
      
      assert.deepStrictEqual(filters, {
        category: 'test',
        status: 'active'
      });
    });
    
    it('should handle missing filter parameters', () => {
      ctx.request.query = {
        page: '1',
        category: 'test'
      };
      
      const filters = controller.getFilters(['category', 'status']);
      
      assert.deepStrictEqual(filters, {
        category: 'test'
      });
    });
    
    it('should ignore non-specified parameters', () => {
      ctx.request.query = {
        category: 'test',
        unknown: 'value'
      };
      
      const filters = controller.getFilters(['category']);
      
      assert.deepStrictEqual(filters, {
        category: 'test'
      });
      assert.strictEqual(filters.unknown, undefined);
    });
  });
  
  describe('formatPaginatedResponse', () => {
    it('should format paginated response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const page = 1;
      const pageSize = 2;
      
      controller.formatPaginatedResponse(items, total, page, pageSize);
      
      assert.deepStrictEqual(ctx.body, {
        success: true,
        data: {
          items,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: 5,
            hasMore: true
          }
        },
        message: 'Success'
      });
    });
    
    it('should calculate hasMore correctly', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 2;
      const page = 1;
      const pageSize = 2;
      
      controller.formatPaginatedResponse(items, total, page, pageSize);
      
      assert.strictEqual(ctx.body.data.pagination.hasMore, false);
    });
    
    it('should handle empty results', () => {
      const items = [];
      const total = 0;
      
      controller.formatPaginatedResponse(items, total);
      
      assert.deepStrictEqual(ctx.body.data.items, []);
      assert.strictEqual(ctx.body.data.pagination.total, 0);
      assert.strictEqual(ctx.body.data.pagination.totalPages, 0);
      assert.strictEqual(ctx.body.data.pagination.hasMore, false);
    });
  });
});