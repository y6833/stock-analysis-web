/**
 * 路由配置测试工具
 * 用于验证路由配置的正确性
 */

import router from '@/router'

// 需要测试的路由路径
const testRoutes = [
  '/',
  '/dashboard',
  '/advanced-dashboard',
  '/risk-monitoring',
  '/stock',
  '/portfolio',
  '/market/heatmap',
  '/alerts',
  '/auth/login',
  '/user/profile'
]

// 新增的路由路径
const newRoutes = [
  '/advanced-dashboard',
  '/risk-monitoring'
]

/**
 * 测试路由是否存在
 */
export function testRouteExists(path: string): boolean {
  try {
    const resolved = router.resolve(path)
    return resolved.name !== 'not-found'
  } catch (error) {
    console.error(`路由测试失败: ${path}`, error)
    return false
  }
}

/**
 * 测试所有路由
 */
export function testAllRoutes(): { passed: string[], failed: string[] } {
  const passed: string[] = []
  const failed: string[] = []

  testRoutes.forEach(route => {
    if (testRouteExists(route)) {
      passed.push(route)
    } else {
      failed.push(route)
    }
  })

  return { passed, failed }
}

/**
 * 测试新增路由
 */
export function testNewRoutes(): { passed: string[], failed: string[] } {
  const passed: string[] = []
  const failed: string[] = []

  newRoutes.forEach(route => {
    if (testRouteExists(route)) {
      passed.push(route)
    } else {
      failed.push(route)
    }
  })

  return { passed, failed }
}

/**
 * 获取路由信息
 */
export function getRouteInfo(path: string) {
  try {
    const resolved = router.resolve(path)
    return {
      name: resolved.name,
      path: resolved.path,
      meta: resolved.meta,
      matched: resolved.matched.map(record => ({
        name: record.name,
        path: record.path,
        meta: record.meta
      }))
    }
  } catch (error) {
    console.error(`获取路由信息失败: ${path}`, error)
    return null
  }
}

/**
 * 打印路由测试结果
 */
export function printRouteTestResults() {
  console.log('=== 路由配置测试 ===')
  
  const allResults = testAllRoutes()
  console.log('\n所有路由测试结果:')
  console.log('✅ 通过:', allResults.passed)
  console.log('❌ 失败:', allResults.failed)
  
  const newResults = testNewRoutes()
  console.log('\n新增路由测试结果:')
  console.log('✅ 通过:', newResults.passed)
  console.log('❌ 失败:', newResults.failed)
  
  // 详细信息
  console.log('\n=== 新增路由详细信息 ===')
  newRoutes.forEach(route => {
    const info = getRouteInfo(route)
    console.log(`\n路由: ${route}`)
    console.log('信息:', info)
  })
}

/**
 * 验证组件文件是否存在
 */
export async function validateComponentFiles(): Promise<{ valid: string[], invalid: string[] }> {
  const valid: string[] = []
  const invalid: string[] = []
  
  const componentTests = [
    {
      path: '/advanced-dashboard',
      component: () => import('@/views/AdvancedDashboardView.vue')
    },
    {
      path: '/risk-monitoring',
      component: () => import('@/views/RiskMonitoringView.vue')
    }
  ]
  
  for (const test of componentTests) {
    try {
      await test.component()
      valid.push(test.path)
    } catch (error) {
      console.error(`组件加载失败: ${test.path}`, error)
      invalid.push(test.path)
    }
  }
  
  return { valid, invalid }
}

/**
 * 完整的路由健康检查
 */
export async function routeHealthCheck() {
  console.log('🔍 开始路由健康检查...')
  
  // 1. 测试路由配置
  printRouteTestResults()
  
  // 2. 验证组件文件
  console.log('\n=== 组件文件验证 ===')
  const componentResults = await validateComponentFiles()
  console.log('✅ 有效组件:', componentResults.valid)
  console.log('❌ 无效组件:', componentResults.invalid)
  
  // 3. 总结
  const allRouteResults = testAllRoutes()
  const newRouteResults = testNewRoutes()
  
  const totalRoutes = testRoutes.length
  const passedRoutes = allRouteResults.passed.length
  const newRoutesCount = newRoutes.length
  const newRoutesPassed = newRouteResults.passed.length
  
  console.log('\n=== 健康检查总结 ===')
  console.log(`总路由数: ${totalRoutes}`)
  console.log(`通过路由数: ${passedRoutes}`)
  console.log(`路由通过率: ${((passedRoutes / totalRoutes) * 100).toFixed(1)}%`)
  console.log(`新增路由数: ${newRoutesCount}`)
  console.log(`新增路由通过数: ${newRoutesPassed}`)
  console.log(`新增路由通过率: ${((newRoutesPassed / newRoutesCount) * 100).toFixed(1)}%`)
  
  const isHealthy = allRouteResults.failed.length === 0 && 
                   newRouteResults.failed.length === 0 && 
                   componentResults.invalid.length === 0
  
  console.log(`\n🎯 路由健康状态: ${isHealthy ? '✅ 健康' : '❌ 存在问题'}`)
  
  return {
    isHealthy,
    totalRoutes,
    passedRoutes,
    newRoutesCount,
    newRoutesPassed,
    failedRoutes: allRouteResults.failed,
    invalidComponents: componentResults.invalid
  }
}

// 开发环境下自动运行健康检查
if (import.meta.env.DEV) {
  // 延迟执行，确保路由已初始化
  setTimeout(() => {
    routeHealthCheck().catch(console.error)
  }, 1000)
}
