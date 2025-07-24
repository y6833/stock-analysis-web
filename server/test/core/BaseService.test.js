/**
 * BaseService 单元测试
 */

const assert = require('assert');
const { mock, spy, stub } = require('sinon');
const { BaseService } = require('../../app/core/BaseService');

describe('BaseService', () => {
  let ctx;
  let service;
  
  beforeEach(() => {
    // 模拟 Egg.js 的 ctx 对象
    ctx = {
      app: {
        config: {
          env: 'unittest',
          baseService: {
            defaultPageSize: 20,
            maxPageSize: 100
          }
        },
        redis: {
          get: stub(),
          set: stub(),
          del: stub()
        },
        mysql: {
          query: stub()
        },
        logger: {
          info: spy(),
          error: spy(),
          warn: spy(),
          debug: spy()
        }
      },
      helper: {
        formatDate: (date) => date instanceof Date ? date.toISOString() : date
      },
      service: {}
    };
    
    // 创建测试服务
    service = new BaseService(ctx, 'test');
  });
  
  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.strictEqual(service.serviceName, 'test');
    });
    
    it('should have access to app and config', () => {
      assert.strictEqual(service.app, ctx.app);
      assert.strictEqual(service.config, ctx.app.config);
    });
  });
  
  describe('success', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'test' };
      const result = service.success(data);
      
      assert.deepStrictEqual(result, {
        success: true,
        data,
        message: 'Success'
      });
    });
    
    it('should create success response with custom message', () => {
      const data = { id: 1 };
      const message = 'Custom success message';
      const result = service.success(data, message);
      
      assert.deepStrictEqual(result, {
        success: true,
        data,
        message
      });
    });
  });
  
  describe('error', () => {
    it('should create error response with message', () => {
      const result = service.error('Error message');
      
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Error message'
      });
    });
    
    it('should create error response with code', () => {
      const result = service.error('Error message', 'ERR_CODE');
      
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Error message',
        code: 'ERR_CODE'
      });
    });
    
    it('should create error response with details', () => {
      const details = { field: 'username', message: 'Required' };
      const result = service.error('Validation Error', 'VALIDATION_ERROR', details);
      
      assert.deepStrictEqual(result, {
        success: false,
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details
      });
    });
  });
  
  describe('getPagination', () => {
    it('should get pagination parameters with defaults', () => {
      const { page, pageSize } = service.getPagination({});
      
      assert.strictEqual(page, 1);
      assert.strictEqual(pageSize, 20);
    });
    
    it('should get pagination parameters from params', () => {
      const params = { page: 2, pageSize: 50 };
      const { page, pageSize } = service.getPagination(params);
      
      assert.strictEqual(page, 2);
      assert.strictEqual(pageSize, 50);
    });
    
    it('should handle string parameters', () => {
      const params = { page: '2', pageSize: '50' };
      const { page, pageSize } = service.getPagination(params);
      
      assert.strictEqual(page, 2);
      assert.strictEqual(pageSize, 50);
    });
    
    it('should handle invalid pagination parameters', () => {
      const params = { page: 'invalid', pageSize: -10 };
      const { page, pageSize } = service.getPagination(params);
      
      assert.strictEqual(page, 1);
      assert.strictEqual(pageSize, 20);
    });
    
    it('should respect max page size', () => {
      const params = { pageSize: 1000 };
      const { pageSize } = service.getPagination(params);
      
      assert.strictEqual(pageSize, 100); // Max page size
    });
  });
  
  describe('getSorting', () => {
    it('should get sorting parameters with defaults', () => {
      const { sortBy, sortOrder } = service.getSorting({});
      
      assert.strictEqual(sortBy, 'createdAt');
      assert.strictEqual(sortOrder, 'DESC');
    });
    
    it('should get sorting parameters from params', () => {
      const params = { sortBy: 'name', sortOrder: 'asc' };
      const { sortBy, sortOrder } = service.getSorting(params);
      
      assert.strictEqual(sortBy, 'name');
      assert.strictEqual(sortOrder, 'ASC');
    });
    
    it('should handle invalid sort order', () => {
      const params = { sortBy: 'name', sortOrder: 'invalid' };
      const { sortOrder } = service.getSorting(params);
      
      assert.strictEqual(sortOrder, 'DESC'); // Default
    });
    
    it('should use custom defaults', () => {
      const params = {};
      const { sortBy, sortOrder } = service.getSorting(params, 'id', 'asc');
      
      assert.strictEqual(sortBy, 'id');
      assert.strictEqual(sortOrder, 'ASC');
    });
    
    it('should normalize sort order to uppercase', () => {
      const params = { sortOrder: 'asc' };
      const { sortOrder } = service.getSorting(params);
      
      assert.strictEqual(sortOrder, 'ASC');
    });
  });
  
  describe('buildWhereClause', () => {
    it('should build WHERE clause from filters', () => {
      const filters = {
        status: 'active',
        category: 'test'
      };
      
      const { where, params } = service.buildWhereClause(filters);
      
      assert.strictEqual(where, 'WHERE status = ? AND category = ?');
      assert.deepStrictEqual(params, ['active', 'test']);
    });
    
    it('should handle empty filters', () => {
      const { where, params } = service.buildWhereClause({});
      
      assert.strictEqual(where, '');
      assert.deepStrictEqual(params, []);
    });
    
    it('should handle null and undefined values', () => {
      const filters = {
        status: 'active',
        category: null,
        tags: undefined
      };
      
      const { where, params } = service.buildWhereClause(filters);
      
      assert.strictEqual(where, 'WHERE status = ? AND category IS NULL');
      assert.deepStrictEqual(params, ['active']);
    });
    
    it('should handle array values for IN clause', () => {
      const filters = {
        status: 'active',
        category: ['test', 'demo']
      };
      
      const { where, params } = service.buildWhereClause(filters);
      
      assert.strictEqual(where, 'WHERE status = ? AND category IN (?,?)');
      assert.deepStrictEqual(params, ['active', 'test', 'demo']);
    });
    
    it('should handle custom operators', () => {
      const filters = {
        'price >': 100,
        'createdAt <=': '2023-01-01'
      };
      
      const { where, params } = service.buildWhereClause(filters);
      
      assert.strictEqual(where, 'WHERE price > ? AND createdAt <= ?');
      assert.deepStrictEqual(params, [100, '2023-01-01']);
    });
    
    it('should handle LIKE operator', () => {
      const filters = {
        'name LIKE': '%test%'
      };
      
      const { where, params } = service.buildWhereClause(filters);
      
      assert.strictEqual(where, 'WHERE name LIKE ?');
      assert.deepStrictEqual(params, ['%test%']);
    });
  });
  
  describe('buildOrderClause', () => {
    it('should build ORDER BY clause', () => {
      const sortBy = 'name';
      const sortOrder = 'ASC';
      
      const orderBy = service.buildOrderClause(sortBy, sortOrder);
      
      assert.strictEqual(orderBy, 'ORDER BY name ASC');
    });
    
    it('should handle multiple sort fields', () => {
      const sortBy = ['name', 'createdAt'];
      const sortOrder = ['ASC', 'DESC'];
      
      const orderBy = service.buildOrderClause(sortBy, sortOrder);
      
      assert.strictEqual(orderBy, 'ORDER BY name ASC, createdAt DESC');
    });
    
    it('should handle multiple sort fields with single order', () => {
      const sortBy = ['name', 'createdAt'];
      const sortOrder = 'ASC';
      
      const orderBy = service.buildOrderClause(sortBy, sortOrder);
      
      assert.strictEqual(orderBy, 'ORDER BY name ASC, createdAt ASC');
    });
  });
  
  describe('buildLimitClause', () => {
    it('should build LIMIT clause', () => {
      const page = 2;
      const pageSize = 10;
      
      const { limit, offset } = service.buildLimitClause(page, pageSize);
      
      assert.strictEqual(limit, 'LIMIT 10 OFFSET 10');
      assert.strictEqual(offset, 10);
    });
    
    it('should handle first page', () => {
      const page = 1;
      const pageSize = 20;
      
      const { limit, offset } = service.buildLimitClause(page, pageSize);
      
      assert.strictEqual(limit, 'LIMIT 20 OFFSET 0');
      assert.strictEqual(offset, 0);
    });
  });
  
  describe('buildQuery', () => {
    it('should build complete SQL query', () => {
      const table = 'users';
      const filters = { status: 'active' };
      const sortBy = 'name';
      const sortOrder = 'ASC';
      const page = 2;
      const pageSize = 10;
      
      const { sql, params, countSql, countParams } = service.buildQuery({
        table,
        filters,
        sortBy,
        sortOrder,
        page,
        pageSize
      });
      
      assert.strictEqual(sql, 'SELECT * FROM users WHERE status = ? ORDER BY name ASC LIMIT 10 OFFSET 10');
      assert.deepStrictEqual(params, ['active']);
      assert.strictEqual(countSql, 'SELECT COUNT(*) as total FROM users WHERE status = ?');
      assert.deepStrictEqual(countParams, ['active']);
    });
    
    it('should build query with custom fields', () => {
      const table = 'users';
      const fields = ['id', 'name', 'email'];
      
      const { sql } = service.buildQuery({
        table,
        fields
      });
      
      assert.strictEqual(sql, 'SELECT id, name, email FROM users');
    });
    
    it('should build query with joins', () => {
      const table = 'users u';
      const joins = [
        'LEFT JOIN profiles p ON u.id = p.user_id',
        'LEFT JOIN roles r ON u.role_id = r.id'
      ];
      
      const { sql } = service.buildQuery({
        table,
        joins
      });
      
      assert.strictEqual(sql, 'SELECT * FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN roles r ON u.role_id = r.id');
    });
    
    it('should build query with group by', () => {
      const table = 'orders';
      const groupBy = 'user_id';
      
      const { sql } = service.buildQuery({
        table,
        groupBy
      });
      
      assert.strictEqual(sql, 'SELECT * FROM orders GROUP BY user_id');
    });
    
    it('should build query with having', () => {
      const table = 'orders';
      const fields = ['user_id', 'SUM(amount) as total'];
      const groupBy = 'user_id';
      const having = 'total > 1000';
      
      const { sql } = service.buildQuery({
        table,
        fields,
        groupBy,
        having
      });
      
      assert.strictEqual(sql, 'SELECT user_id, SUM(amount) as total FROM orders GROUP BY user_id HAVING total > 1000');
    });
  });
  
  describe('query', () => {
    it('should execute SQL query', async () => {
      const sql = 'SELECT * FROM users WHERE status = ?';
      const params = ['active'];
      const mockResults = [{ id: 1, name: 'test' }];
      
      ctx.app.mysql.query.resolves(mockResults);
      
      const results = await service.query(sql, params);
      
      assert.deepStrictEqual(results, mockResults);
      assert(ctx.app.mysql.query.calledWith(sql, params));
    });
    
    it('should handle query errors', async () => {
      const sql = 'SELECT * FROM invalid_table';
      const error = new Error('Table not found');
      
      ctx.app.mysql.query.rejects(error);
      
      try {
        await service.query(sql);
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.strictEqual(err, error);
      }
      
      assert(ctx.app.logger.error.called);
    });
  });
  
  describe('findById', () => {
    it('should find record by id', async () => {
      const table = 'users';
      const id = 1;
      const mockResult = { id: 1, name: 'test' };
      
      ctx.app.mysql.query.resolves([mockResult]);
      
      const result = await service.findById(table, id);
      
      assert.deepStrictEqual(result, mockResult);
      assert(ctx.app.mysql.query.calledWith(
        'SELECT * FROM users WHERE id = ?',
        [id]
      ));
    });
    
    it('should return null when record not found', async () => {
      const table = 'users';
      const id = 999;
      
      ctx.app.mysql.query.resolves([]);
      
      const result = await service.findById(table, id);
      
      assert.strictEqual(result, null);
    });
    
    it('should use custom id field', async () => {
      const table = 'users';
      const id = 'user123';
      const idField = 'user_id';
      
      ctx.app.mysql.query.resolves([]);
      
      await service.findById(table, id, idField);
      
      assert(ctx.app.mysql.query.calledWith(
        'SELECT * FROM users WHERE user_id = ?',
        [id]
      ));
    });
  });
  
  describe('findOne', () => {
    it('should find one record by conditions', async () => {
      const table = 'users';
      const conditions = { email: 'test@example.com' };
      const mockResult = { id: 1, email: 'test@example.com' };
      
      ctx.app.mysql.query.resolves([mockResult]);
      
      const result = await service.findOne(table, conditions);
      
      assert.deepStrictEqual(result, mockResult);
      assert(ctx.app.mysql.query.calledWith(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        ['test@example.com']
      ));
    });
    
    it('should return null when no record found', async () => {
      const table = 'users';
      const conditions = { email: 'notfound@example.com' };
      
      ctx.app.mysql.query.resolves([]);
      
      const result = await service.findOne(table, conditions);
      
      assert.strictEqual(result, null);
    });
  });
  
  describe('findAll', () => {
    it('should find all records with pagination', async () => {
      const table = 'users';
      const mockResults = [{ id: 1 }, { id: 2 }];
      const mockCount = [{ total: 10 }];
      
      ctx.app.mysql.query.onFirstCall().resolves(mockResults);
      ctx.app.mysql.query.onSecondCall().resolves(mockCount);
      
      const result = await service.findAll(table);
      
      assert.deepStrictEqual(result, {
        items: mockResults,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 10,
          totalPages: 1,
          hasMore: false
        }
      });
    });
    
    it('should apply filters and sorting', async () => {
      const table = 'users';
      const options = {
        filters: { status: 'active' },
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        pageSize: 5
      };
      
      ctx.app.mysql.query.onFirstCall().resolves([]);
      ctx.app.mysql.query.onSecondCall().resolves([{ total: 0 }]);
      
      await service.findAll(table, options);
      
      // Check that the correct SQL was generated
      const firstCall = ctx.app.mysql.query.getCall(0);
      assert(firstCall.args[0].includes('WHERE status = ?'));
      assert(firstCall.args[0].includes('ORDER BY name ASC'));
      assert(firstCall.args[0].includes('LIMIT 5 OFFSET 5'));
    });
  });
  
  describe('create', () => {
    it('should insert a new record', async () => {
      const table = 'users';
      const data = { name: 'test', email: 'test@example.com' };
      const mockResult = { insertId: 1, affectedRows: 1 };
      
      ctx.app.mysql.query.resolves(mockResult);
      
      const result = await service.create(table, data);
      
      assert.strictEqual(result, 1);
      assert(ctx.app.mysql.query.calledWith(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['test', 'test@example.com']
      ));
    });
    
    it('should handle creation errors', async () => {
      const table = 'users';
      const data = { email: 'duplicate@example.com' };
      const error = new Error('Duplicate entry');
      
      ctx.app.mysql.query.rejects(error);
      
      try {
        await service.create(table, data);
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.strictEqual(err, error);
      }
    });
  });
  
  describe('update', () => {
    it('should update a record by id', async () => {
      const table = 'users';
      const id = 1;
      const data = { name: 'updated' };
      const mockResult = { affectedRows: 1 };
      
      ctx.app.mysql.query.resolves(mockResult);
      
      const result = await service.update(table, id, data);
      
      assert.strictEqual(result, true);
      assert(ctx.app.mysql.query.calledWith(
        'UPDATE users SET name = ? WHERE id = ?',
        ['updated', 1]
      ));
    });
    
    it('should return false when no rows affected', async () => {
      const table = 'users';
      const id = 999;
      const data = { name: 'updated' };
      const mockResult = { affectedRows: 0 };
      
      ctx.app.mysql.query.resolves(mockResult);
      
      const result = await service.update(table, id, data);
      
      assert.strictEqual(result, false);
    });
    
    it('should use custom id field', async () => {
      const table = 'users';
      const id = 'user123';
      const data = { name: 'updated' };
      const idField = 'user_id';
      
      ctx.app.mysql.query.resolves({ affectedRows: 1 });
      
      await service.update(table, id, data, idField);
      
      assert(ctx.app.mysql.query.calledWith(
        'UPDATE users SET name = ? WHERE user_id = ?',
        ['updated', 'user123']
      ));
    });
  });
  
  describe('delete', () => {
    it('should delete a record by id', async () => {
      const table = 'users';
      const id = 1;
      const mockResult = { affectedRows: 1 };
      
      ctx.app.mysql.query.resolves(mockResult);
      
      const result = await service.delete(table, id);
      
      assert.strictEqual(result, true);
      assert(ctx.app.mysql.query.calledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      ));
    });
    
    it('should return false when no rows affected', async () => {
      const table = 'users';
      const id = 999;
      const mockResult = { affectedRows: 0 };
      
      ctx.app.mysql.query.resolves(mockResult);
      
      const result = await service.delete(table, id);
      
      assert.strictEqual(result, false);
    });
  });
  
  describe('transaction', () => {
    it('should execute operations in a transaction', async () => {
      const mockConnection = {
        beginTransaction: stub().resolves(),
        query: stub().resolves({ insertId: 1 }),
        commit: stub().resolves(),
        rollback: stub().resolves(),
        release: stub().resolves()
      };
      
      ctx.app.mysql.beginTransaction = stub().resolves(mockConnection);
      
      const callback = async (conn) => {
        await conn.query('INSERT INTO users (name) VALUES (?)', ['test']);
        return 'success';
      };
      
      const result = await service.transaction(callback);
      
      assert.strictEqual(result, 'success');
      assert(mockConnection.beginTransaction.called);
      assert(mockConnection.query.called);
      assert(mockConnection.commit.called);
      assert(mockConnection.release.called);
    });
    
    it('should rollback on error', async () => {
      const mockConnection = {
        beginTransaction: stub().resolves(),
        query: stub().rejects(new Error('Query error')),
        commit: stub().resolves(),
        rollback: stub().resolves(),
        release: stub().resolves()
      };
      
      ctx.app.mysql.beginTransaction = stub().resolves(mockConnection);
      
      const callback = async (conn) => {
        await conn.query('INSERT INTO users (name) VALUES (?)', ['test']);
        return 'success';
      };
      
      try {
        await service.transaction(callback);
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.strictEqual(err.message, 'Query error');
      }
      
      assert(mockConnection.rollback.called);
      assert(mockConnection.release.called);
      assert(!mockConnection.commit.called);
    });
  });
  
  describe('cache', () => {
    it('should get data from cache if available', async () => {
      const key = 'test:cache:key';
      const cachedData = JSON.stringify({ id: 1, name: 'cached' });
      
      ctx.app.redis.get.resolves(cachedData);
      
      const getData = stub().resolves({ id: 1, name: 'fresh' });
      
      const result = await service.cache(key, getData, 60);
      
      assert.deepStrictEqual(result, { id: 1, name: 'cached' });
      assert(ctx.app.redis.get.calledWith(key));
      assert(!getData.called);
    });
    
    it('should fetch and cache data if not in cache', async () => {
      const key = 'test:cache:key';
      const freshData = { id: 1, name: 'fresh' };
      
      ctx.app.redis.get.resolves(null);
      ctx.app.redis.set.resolves('OK');
      
      const getData = stub().resolves(freshData);
      
      const result = await service.cache(key, getData, 60);
      
      assert.deepStrictEqual(result, freshData);
      assert(getData.called);
      assert(ctx.app.redis.set.calledWith(
        key,
        JSON.stringify(freshData),
        'EX',
        60
      ));
    });
    
    it('should bypass cache when forced', async () => {
      const key = 'test:cache:key';
      const freshData = { id: 1, name: 'fresh' };
      
      const getData = stub().resolves(freshData);
      
      const result = await service.cache(key, getData, 60, true);
      
      assert.deepStrictEqual(result, freshData);
      assert(getData.called);
      assert(!ctx.app.redis.get.called);
    });
    
    it('should handle cache errors gracefully', async () => {
      const key = 'test:cache:key';
      const freshData = { id: 1, name: 'fresh' };
      
      ctx.app.redis.get.rejects(new Error('Redis error'));
      
      const getData = stub().resolves(freshData);
      
      const result = await service.cache(key, getData, 60);
      
      assert.deepStrictEqual(result, freshData);
      assert(getData.called);
    });
  });
  
  describe('clearCache', () => {
    it('should delete cache key', async () => {
      const key = 'test:cache:key';
      
      ctx.app.redis.del.resolves(1);
      
      const result = await service.clearCache(key);
      
      assert.strictEqual(result, true);
      assert(ctx.app.redis.del.calledWith(key));
    });
    
    it('should handle cache deletion errors', async () => {
      const key = 'test:cache:key';
      
      ctx.app.redis.del.rejects(new Error('Redis error'));
      
      const result = await service.clearCache(key);
      
      assert.strictEqual(result, false);
    });
  });
});