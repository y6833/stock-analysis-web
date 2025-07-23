<template>
  <div class="error-container">
    <el-result icon="error" title="加载失败" sub-title="组件加载失败，请刷新页面重试">
      <template #extra>
        <el-button type="primary" @click="reload">刷新页面</el-button>
      </template>
    </el-result>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ErrorView',
  methods: {
    reload() {
      window.location.reload()
    },
  },
})
</script>

<style scoped>
.error-container {
  padding: 20px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
</style>
