<template>
  <!-- 这是一个无渲染组件，不会显示任何内容 -->
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import pageStatsService from '@/services/pageStatsService'
import pageService from '@/services/pageService'

// 获取路由信息
const route = useRoute()
const userStore = useUserStore()

// 记录访问开始时间和日志ID
const startTime = ref<Date>(new Date())
const logId = ref<number | null>(null)

// 用于存储已记录的页面路径，避免重复记录
const recordedPaths = new Set<string>()

// 记录页面访问
const recordPageAccess = async () => {
  try {
    // 如果当前路径已经记录过，则不再记录
    if (recordedPaths.has(route.path)) {
      console.log('页面已记录，跳过:', route.path)
      return
    }

    // 如果是会员功能页面，不记录访问（避免循环）
    if (route.path === '/membership-features') {
      console.log('会员功能页面，跳过记录')
      return
    }

    // 获取页面ID
    let pageId: number | null = null
    try {
      // 尝试从路由元数据中获取页面ID
      if (route.meta.pageId) {
        pageId = Number(route.meta.pageId)
      } else {
        // 尝试从数据库中查询页面ID，但避免频繁API调用
        // 使用本地存储缓存页面ID映射
        const pageIdMapStr = localStorage.getItem('page_id_map')
        const pageIdMap = pageIdMapStr ? JSON.parse(pageIdMapStr) : {}

        if (pageIdMap[route.path]) {
          pageId = pageIdMap[route.path]
          console.log('从缓存获取页面ID:', pageId)
        } else {
          // 只有在没有缓存时才调用API
          const pages = await pageService.getAllPages({ onlyEnabled: true })
          const page = pages.find((p) => p.path === route.path)
          if (page) {
            pageId = page.id!
            // 缓存页面ID
            pageIdMap[route.path] = pageId
            localStorage.setItem('page_id_map', JSON.stringify(pageIdMap))
          }
        }
      }
    } catch (error) {
      console.error('获取页面ID失败:', error)
    }

    // 如果没有找到页面ID，则不记录
    if (!pageId) {
      console.warn('未找到页面ID，不记录访问:', route.path)
      return
    }

    // 获取用户信息
    const userId = userStore.isAuthenticated ? userStore.userId : undefined
    const membershipLevel = userStore.isAuthenticated ? userStore.membershipLevel : 'free'

    // 获取来源页面
    const referrer = document.referrer

    // 记录页面访问
    logId.value = await pageStatsService.logPageAccess({
      pageId,
      userId,
      path: route.path,
      membershipLevel,
      ipAddress: '', // 服务端会自动获取
      userAgent: navigator.userAgent,
      referrer,
      hasAccess: true, // 能访问到页面就是有权限
      accessResult: 'allowed',
    })

    // 标记该路径已记录
    recordedPaths.add(route.path)

    // 重置开始时间
    startTime.value = new Date()
  } catch (error) {
    console.error('记录页面访问失败:', error)
  }
}

// 更新页面停留时间
const updatePageDuration = async () => {
  try {
    // 如果没有日志ID，则不更新
    if (!logId.value) {
      return
    }

    // 计算停留时间（秒）
    const now = new Date()
    const duration = Math.floor((now.getTime() - startTime.value.getTime()) / 1000)

    // 更新页面停留时间
    await pageStatsService.updatePageDuration(logId.value, duration)
  } catch (error) {
    console.error('更新页面停留时间失败:', error)
  }
}

// 页面加载时记录访问
onMounted(() => {
  // 如果是会员功能页面，不记录访问（避免循环）
  if (route.path === '/membership-features') {
    console.log('会员功能页面，跳过记录访问')
    return
  }

  // 延迟记录访问，避免在路由守卫处理期间调用API
  setTimeout(() => {
    recordPageAccess()
  }, 500)

  // 添加页面可见性变化事件监听器
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

// 页面卸载前更新停留时间
onBeforeUnmount(() => {
  updatePageDuration()

  // 移除页面可见性变化事件监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// 处理页面可见性变化
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    // 页面隐藏时更新停留时间
    updatePageDuration()
  } else if (document.visibilityState === 'visible') {
    // 页面可见时重置开始时间
    startTime.value = new Date()
  }
}
</script>
