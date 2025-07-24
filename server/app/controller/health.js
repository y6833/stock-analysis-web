/**
 * Health Check Controller
 * Provides endpoints for system health monitoring
 */

const BaseController = require('../core/BaseController')
const os = require('os')
const fs = require('fs')
const path = require('path')

class HealthController extends BaseController {
  /**
   * Basic health check endpoint
   * Returns 200 OK if the service is running
   */
  async check() {
    this.success({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Detailed health check endpoint
   * Returns detailed system health information
   */
  async detailed() {
    const { ctx, app } = this

    try {
      // Check database connection
      let dbStatus = 'ok'
      let dbError = null

      try {
        await app.mysql.query('SELECT 1')
      } catch (error) {
        dbStatus = 'error'
        dbError = error.message
      }

      // Check Redis connection
      let redisStatus = 'ok'
      let redisError = null

      try {
        await app.redis.ping()
      } catch (error) {
        redisStatus = 'error'
        redisError = error.message
      }

      // Get deployment info
      let deploymentInfo = {}
      try {
        const deploymentInfoPath = path.join(app.baseDir, '../dist/deployment-info.json')
        if (fs.existsSync(deploymentInfoPath)) {
          deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'))
        }
      } catch (error) {
        // Ignore error
      }

      // Get system metrics
      const loadAvg = os.loadavg()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem

      // Get process metrics
      const memoryUsage = process.memoryUsage()

      this.success({
        status: dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        deployment: deploymentInfo,
        services: {
          database: {
            status: dbStatus,
            error: dbError,
          },
          redis: {
            status: redisStatus,
            error: redisError,
          },
        },
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          cpus: os.cpus().length,
          loadAvg: {
            '1m': loadAvg[0],
            '5m': loadAvg[1],
            '15m': loadAvg[2],
          },
          memory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            usedPercent: (usedMem / totalMem) * 100,
          },
        },
        process: {
          pid: process.pid,
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
          },
          env: process.env.NODE_ENV,
        },
      })
    } catch (error) {
      this.error('Health check failed', error)
    }
  }

  /**
   * Readiness probe endpoint
   * Returns 200 OK if the service is ready to accept traffic
   */
  async ready() {
    const { app } = this

    try {
      // Check database connection
      await app.mysql.query('SELECT 1')

      // Check Redis connection
      await app.redis.ping()

      this.success({
        status: 'ready',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 503 // Service Unavailable
      this.error('Service not ready', error)
    }
  }

  /**
   * Liveness probe endpoint
   * Returns 200 OK if the service is alive
   */
  async alive() {
    this.success({
      status: 'alive',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Database health check endpoint
   * Returns database connection status
   */
  async database() {
    const { app } = this

    try {
      // Test database connection
      await app.mysql.query('SELECT 1 as test')

      this.success({
        status: 'ok',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 503
      this.error('Database connection failed', error)
    }
  }

  /**
   * User table health check endpoint
   * Returns user table status
   */
  async userTable() {
    const { app } = this

    try {
      // Test user table access
      const result = await app.mysql.query('SELECT COUNT(*) as count FROM users LIMIT 1')

      this.success({
        status: 'ok',
        message: 'User table accessible',
        userCount: result[0].count,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 503
      this.error('User table access failed', error)
    }
  }

  /**
   * JWT health check endpoint
   * Returns JWT configuration status
   */
  async jwt() {
    const { app } = this

    try {
      // Check JWT configuration
      const jwtConfig = app.config.jwt

      if (!jwtConfig || !jwtConfig.secret) {
        throw new Error('JWT configuration missing')
      }

      this.success({
        status: 'ok',
        message: 'JWT configuration valid',
        algorithm: jwtConfig.algorithm || 'HS256',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 503
      this.error('JWT configuration invalid', error)
    }
  }

  /**
   * System health check endpoint
   * Returns system resource status
   */
  async system() {
    try {
      const loadAvg = os.loadavg()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memoryUsage = process.memoryUsage()

      this.success({
        status: 'ok',
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          uptime: os.uptime(),
          loadAvg: {
            '1m': loadAvg[0],
            '5m': loadAvg[1],
            '15m': loadAvg[2],
          },
          memory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            usedPercent: (usedMem / totalMem) * 100,
          },
          process: {
            pid: process.pid,
            uptime: process.uptime(),
            memory: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external,
            },
          },
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 503
      this.error('System health check failed', error)
    }
  }

  /**
   * Create test user endpoint
   * Creates a test user for health checks
   */
  async createTestUser() {
    const { app } = this

    try {
      // Create test user
      const testUser = {
        username: 'healthcheck_test_user',
        email: 'healthcheck@test.com',
        password: 'test123456',
        role: 'user',
        status: 'active',
      }

      // Check if test user already exists
      const existingUser = await app.mysql.get('users', { username: testUser.username })

      if (existingUser) {
        this.success({
          status: 'ok',
          message: 'Test user already exists',
          userId: existingUser.id,
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Insert test user
      const result = await app.mysql.insert('users', {
        ...testUser,
        created_at: new Date(),
        updated_at: new Date(),
      })

      this.success({
        status: 'ok',
        message: 'Test user created successfully',
        userId: result.insertId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 500
      this.error('Failed to create test user', error)
    }
  }

  /**
   * Reset test passwords endpoint
   * Resets passwords for test users
   */
  async resetTestPasswords() {
    const { app } = this

    try {
      // Reset test user password
      const result = await app.mysql.update(
        'users',
        {
          password: 'test123456',
          updated_at: new Date(),
        },
        {
          where: { username: 'healthcheck_test_user' },
        }
      )

      this.success({
        status: 'ok',
        message: 'Test passwords reset successfully',
        affectedRows: result.affectedRows,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.ctx.status = 500
      this.error('Failed to reset test passwords', error)
    }
  }
}

module.exports = HealthController
