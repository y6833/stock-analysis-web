<template>
  <div v-if="show" class="error-message" :class="[`type-${type}`, { 'is-dismissible': dismissible }]">
    <div class="error-icon">
      <el-icon>
        <component :is="iconComponent" />
      </el-icon>
    </div>
    <div class="error-content">
      <div v-if="title" class="error-title">{{ title }}</div>
      <div class="error-text">{{ message }}</div>
      <div v-if="details" class="error-details">
        <el-collapse>
          <el-collapse-item title="查看详情">
            <pre>{{ details }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
      <div v-if="suggestion" class="error-suggestion">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ suggestion }}</span>
      </div>
      <div v-if="actions && actions.length > 0" class="error-actions">
        <el-button 
          v-for="(action, index) in actions" 
          :key="index"
          :type="action.type || 'primary'"
          :size="action.size || 'small'"
          @click="action.handler"
        >
          {{ action.text }}
        </el-button>
      </div>
    </div>
    <div v-if="dismissible" class="error-close" @click="handleDismiss">
      <el-icon><Close /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 
  WarningFilled, 
  CircleCloseFilled, 
  InfoFilled, 
  QuestionFilled,
  Close
} from '@element-plus/icons-vue';

interface ErrorAction {
  text: string;
  handler: () => void;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  size?: 'large' | 'default' | 'small';
}

const props = defineProps({
  // 是否显示错误消息
  show: {
    type: Boolean,
    default: true
  },
  // 错误类型：error, warning, info, question
  type: {
    type: String,
    default: 'error',
    validator: (value: string) => ['error', 'warning', 'info', 'question'].includes(value)
  },
  // 错误标题
  title: {
    type: String,
    default: ''
  },
  // 错误消息
  message: {
    type: String,
    required: true
  },
  // 错误详情
  details: {
    type: String,
    default: ''
  },
  // 建议操作
  suggestion: {
    type: String,
    default: ''
  },
  // 是否可关闭
  dismissible: {
    type: Boolean,
    default: true
  },
  // 操作按钮
  actions: {
    type: Array as () => ErrorAction[],
    default: () => []
  }
});

const emit = defineEmits(['dismiss']);

// 根据类型确定图标
const iconComponent = computed(() => {
  switch (props.type) {
    case 'error':
      return CircleCloseFilled;
    case 'warning':
      return WarningFilled;
    case 'info':
      return InfoFilled;
    case 'question':
      return QuestionFilled;
    default:
      return CircleCloseFilled;
  }
});

// 处理关闭
const handleDismiss = () => {
  emit('dismiss');
};
</script>

<style scoped>
.error-message {
  display: flex;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  position: relative;
}

.error-message.type-error {
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
}

.error-message.type-warning {
  background-color: #fdf6ec;
  border: 1px solid #faecd8;
}

.error-message.type-info {
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
}

.error-message.type-question {
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
}

.error-icon {
  margin-right: 12px;
  display: flex;
  align-items: flex-start;
}

.error-message.type-error .error-icon {
  color: #f56c6c;
}

.error-message.type-warning .error-icon {
  color: #e6a23c;
}

.error-message.type-info .error-icon {
  color: #909399;
}

.error-message.type-question .error-icon {
  color: #409eff;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 16px;
}

.error-text {
  margin-bottom: 8px;
  line-height: 1.5;
}

.error-details {
  margin-top: 8px;
  margin-bottom: 8px;
}

.error-details pre {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
}

.error-suggestion {
  display: flex;
  align-items: center;
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 14px;
}

.error-suggestion .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.error-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.error-close {
  position: absolute;
  top: 12px;
  right: 12px;
  cursor: pointer;
  color: #909399;
}

.error-close:hover {
  color: #606266;
}
</style>