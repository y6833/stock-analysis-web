<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { DashboardWidget } from '@/stores/dashboardStore'

// 异步加载组件 - 只保留有实际功能的组件
const ModernMarketOverview = defineAsyncComponent(() => import('./ModernMarketOverview.vue'))
const ModernWatchlistWidget = defineAsyncComponent(() => import('./ModernWatchlistWidget.vue'))
const ModernNewsWidget = defineAsyncComponent(() => import('./ModernNewsWidget.vue'))
const ModernPopularStocks = defineAsyncComponent(() => import('./ModernPopularStocks.vue'))
const ModernQuickActions = defineAsyncComponent(() => import('./ModernQuickActions.vue'))
const ModernTradingSignals = defineAsyncComponent(() => import('./ModernTradingSignals.vue'))

// 组件映射 - 只包含有真实数据的组件
const widgetComponents = {
  'market-overview': ModernMarketOverview,
  'watchlist': ModernWatchlistWidget,
  'news': ModernNewsWidget,
  'popular-stocks': ModernPopularStocks,
  'quick-actions': ModernQuickActions,
  'trading-signals': ModernTradingSignals
}

const props = defineProps<{
  widget: DashboardWidget
}>()

// 根据组件类型获取组件
const getComponent = () => {
  return widgetComponents[props.widget.type as keyof typeof widgetComponents]
}
</script>

<template>
  <component :is="getComponent()" />
</template>
