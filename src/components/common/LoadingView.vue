<template>
  <div class="loading-container">
    <el-skeleton :rows="6" animated />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'LoadingView',
})
</script>

<style scoped>
.loading-container {
  padding: 20px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
</style>
