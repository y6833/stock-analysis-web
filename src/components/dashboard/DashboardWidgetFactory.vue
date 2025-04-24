<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { DashboardWidget } from '@/stores/dashboardStore'

// 异步加载组件
const MarketOverviewWidget = defineAsyncComponent(() => import('./MarketOverviewWidget.vue'))
const WatchlistWidget = defineAsyncComponent(() => import('./WatchlistWidget.vue'))
const NewsWidget = defineAsyncComponent(() => import('./NewsWidget.vue'))
const PopularStocksWidget = defineAsyncComponent(() => import('./PopularStocksWidget.vue'))
const QuickActionsWidget = defineAsyncComponent(() => import('./QuickActionsWidget.vue'))
const IndustryOverviewWidget = defineAsyncComponent(() => import('./IndustryOverviewWidget.vue'))

// 组件映射
const widgetComponents = {
  'market-overview': MarketOverviewWidget,
  'watchlist': WatchlistWidget,
  'news': NewsWidget,
  'popular-stocks': PopularStocksWidget,
  'quick-actions': QuickActionsWidget,
  'industry-overview': IndustryOverviewWidget
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
