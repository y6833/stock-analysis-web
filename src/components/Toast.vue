<template>
  <transition name="toast-fade">
    <div v-if="visible" class="toast" :class="type">
      {{ message }}
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  message: string
  duration?: number
  type?: 'success' | 'error' | 'warning' | 'info'
}>()

const visible = ref(false)
let timer: number | null = null

onMounted(() => {
  visible.value = true
  
  // 自动关闭
  timer = window.setTimeout(() => {
    visible.value = false
  }, props.duration || 3000)
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  min-width: 200px;
  text-align: center;
}

.success {
  background-color: #67c23a;
}

.error {
  background-color: #f56c6c;
}

.warning {
  background-color: #e6a23c;
}

.info {
  background-color: #909399;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
