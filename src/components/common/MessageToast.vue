<template>
  <div class="message-toast-container">
    <transition-group name="toast">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-toast"
        :class="message.type"
      >
        <div class="message-icon">
          <span v-if="message.type === 'success'">✓</span>
          <span v-else-if="message.type === 'error'">✗</span>
          <span v-else-if="message.type === 'warning'">⚠</span>
          <span v-else>ℹ</span>
        </div>
        <div class="message-content">{{ message.text }}</div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 消息类型
type MessageType = 'info' | 'success' | 'warning' | 'error'

// 消息接口
interface Message {
  id: number
  text: string
  type: MessageType
  timeout: number
}

// 消息列表
const messages = ref<Message[]>([])

// 消息计数器
let messageCounter = 0

// 添加消息
const addMessage = (text: string, type: MessageType = 'info', timeout: number = 3000) => {
  const id = messageCounter++
  
  messages.value.push({
    id,
    text,
    type,
    timeout
  })
  
  // 设置自动移除
  setTimeout(() => {
    removeMessage(id)
  }, timeout)
}

// 移除消息
const removeMessage = (id: number) => {
  const index = messages.value.findIndex(msg => msg.id === id)
  if (index !== -1) {
    messages.value.splice(index, 1)
  }
}

// 创建全局消息服务
const createMessageService = () => {
  const messageService = {
    info: (text: string, timeout?: number) => addMessage(text, 'info', timeout),
    success: (text: string, timeout?: number) => addMessage(text, 'success', timeout),
    warning: (text: string, timeout?: number) => addMessage(text, 'warning', timeout),
    error: (text: string, timeout?: number) => addMessage(text, 'error', timeout)
  }
  
  // 添加到全局
  window.$message = messageService
  
  return messageService
}

// 在组件挂载时创建消息服务
let messageService: any = null
onMounted(() => {
  messageService = createMessageService()
})

// 在组件卸载时清理
onUnmounted(() => {
  window.$message = undefined
})

// 导出消息服务
defineExpose({
  addMessage,
  removeMessage
})
</script>

<style scoped>
.message-toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.message-toast {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  animation: slide-in 0.3s ease;
}

.message-toast.info {
  border-left: 4px solid var(--primary-color);
}

.message-toast.success {
  border-left: 4px solid var(--success-color);
}

.message-toast.warning {
  border-left: 4px solid var(--warning-color);
}

.message-toast.error {
  border-left: 4px solid var(--danger-color);
}

.message-icon {
  margin-right: 12px;
  font-size: 18px;
}

.message-toast.info .message-icon {
  color: var(--primary-color);
}

.message-toast.success .message-icon {
  color: var(--success-color);
}

.message-toast.warning .message-icon {
  color: var(--warning-color);
}

.message-toast.error .message-icon {
  color: var(--danger-color);
}

.message-content {
  flex: 1;
  font-size: 14px;
}

/* 动画 */
.toast-enter-active {
  animation: slide-in 0.3s ease;
}

.toast-leave-active {
  animation: slide-out 0.3s ease;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
