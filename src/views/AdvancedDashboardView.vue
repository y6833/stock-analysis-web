<template>
  <div class="advanced-dashboard-view">
    <AdvancedDashboard />
  </div>
</template>

<script setup lang="ts">
import AdvancedDashboard from '@/components/dashboard/AdvancedDashboard.vue'
</script>

<style scoped>
.advanced-dashboard-view {
  min-height: 100vh;
  background: var(--bg-secondary);
}
</style>
