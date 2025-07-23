<template>
  <button
    :class="[
      'app-button',
      `app-button--${type}`,
      `app-button--${size}`,
      { 'app-button--block': block, 'app-button--disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
    :aria-busy="loading"
    :aria-disabled="disabled || loading"
    :aria-label="ariaLabel"
    :aria-describedby="ariaDescribedby"
    :role="role || 'button'"
    :tabindex="disabled ? -1 : tabindex"
    v-touch-feedback
  >
    <span v-if="loading" class="app-button__loading" aria-hidden="true"></span>
    <span class="app-button__content">
      <slot></slot>
    </span>
    <span v-if="loading && loadingText" class="sr-only">{{ loadingText }}</span>
  </button>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (value: string) => {
      return ['default', 'primary', 'success', 'warning', 'danger', 'info', 'text'].includes(value)
    }
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => {
      return ['small', 'medium', 'large'].includes(value)
    }
  },
  block: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingText: {
    type: String,
    default: '加载中...'
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  ariaDescribedby: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: ''
  },
  tabindex: {
    type: [Number, String],
    default: 0
  }
})

const emit = defineEmits(['click'])

const handleClick = (event: MouseEvent) => {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<style scoped>
.app-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  outline: none;
  transition: all var(--transition-fast);
  user-select: none;
  font-weight: 500;
  border-radius: var(--border-radius-md);
  position: relative;
  overflow: hidden;
  min-width: 44px; /* WCAG 2.1 AA 要求的最小触摸目标尺寸 */
}

.app-button:focus-visible {
  outline: 3px solid var(--primary-color);
  outline-offset: 2px;
}

.app-button--small {
  padding: 8px 12px; /* 增加垂直内边距以满足触摸目标尺寸要求 */
  font-size: var(--font-size-xs);
  min-height: 36px;
}

.app-button--medium {
  padding: 10px 16px; /* 增加垂直内边距以满足触摸目标尺寸要求 */
  font-size: var(--font-size-sm);
  min-height: 44px;
}

.app-button--large {
  padding: 14px 20px; /* 增加垂直内边距以满足触摸目标尺寸要求 */
  font-size: var(--font-size-md);
  min-height: 48px;
}

.app-button--default {
  color: var(--text-primary);
  background-color: var(--bg-primary);
  border-color: var(--border-regular);
}

.app-button--default:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.app-button--primary {
  color: #fff;
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.app-button--primary:hover {
  background-color: color-mix(in srgb, var(--primary-color) 80%, white);
  border-color: color-mix(in srgb, var(--primary-color) 80%, white);
}

.app-button--success {
  color: #fff;
  background-color: var(--success-color);
  border-color: var(--success-color);
}

.app-button--success:hover {
  background-color: color-mix(in srgb, var(--success-color) 80%, white);
  border-color: color-mix(in srgb, var(--success-color) 80%, white);
}

.app-button--warning {
  color: #fff;
  background-color: var(--warning-color);
  border-color: var(--warning-color);
}

.app-button--warning:hover {
  background-color: color-mix(in srgb, var(--warning-color) 80%, white);
  border-color: color-mix(in srgb, var(--warning-color) 80%, white);
}

.app-button--danger {
  color: #fff;
  background-color: var(--danger-color);
  border-color: var(--danger-color);
}

.app-button--danger:hover {
  background-color: color-mix(in srgb, var(--danger-color) 80%, white);
  border-color: color-mix(in srgb, var(--danger-color) 80%, white);
}

.app-button--info {
  color: #fff;
  background-color: var(--info-color);
  border-color: var(--info-color);
}

.app-button--info:hover {
  background-color: color-mix(in srgb, var(--info-color) 80%, white);
  border-color: color-mix(in srgb, var(--info-color) 80%, white);
}

.app-button--text {
  color: var(--primary-color);
  background-color: transparent;
  border-color: transparent;
  padding-left: 0;
  padding-right: 0;
}

.app-button--text:hover {
  color: color-mix(in srgb, var(--primary-color) 80%, white);
}

.app-button--block {
  display: flex;
  width: 100%;
}

.app-button--disabled,
.app-button--disabled:hover {
  color: var(--text-disabled);
  background-color: var(--bg-tertiary);
  border-color: var(--border-light);
  cursor: not-allowed;
}

.app-button__loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: button-loading-spin 1s linear infinite;
  margin-right: 6px;
}

.app-button--default .app-button__loading {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color);
}

.app-button--text .app-button__loading {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--primary-color);
}

@keyframes button-loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>