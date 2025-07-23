<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    :type="htmlType"
    @click="handleClick"
  >
    <span v-if="loading" class="btn-loading">
      <svg class="spinner" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-dasharray="60"
          stroke-dashoffset="60"
          stroke-linecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 12 12;360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </span>
    <span v-if="icon && !loading" :class="iconClasses">{{ icon }}</span>
    <span v-if="$slots.default" class="btn-text">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  htmlType?: 'button' | 'submit' | 'reset'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  iconPosition: 'left',
  htmlType: 'button',
  block: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => [
  'base-button',
  `base-button--${props.type}`,
  `base-button--${props.size}`,
  {
    'base-button--disabled': props.disabled,
    'base-button--loading': props.loading,
    'base-button--block': props.block,
    'base-button--icon-only': props.icon && !$slots.default,
  },
])

const iconClasses = computed(() => ['btn-icon', `btn-icon--${props.iconPosition}`])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  outline: none;
}

/* Button Types */
.base-button--primary {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.base-button--primary:hover:not(.base-button--disabled) {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

.base-button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.base-button--secondary:hover:not(.base-button--disabled) {
  background-color: var(--bg-tertiary);
  border-color: var(--border-dark);
}

.base-button--success {
  background-color: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

.base-button--warning {
  background-color: var(--warning-color);
  color: white;
  border-color: var(--warning-color);
}

.base-button--danger {
  background-color: var(--danger-color);
  color: white;
  border-color: var(--danger-color);
}

.base-button--info {
  background-color: var(--info-color);
  color: white;
  border-color: var(--info-color);
}

.base-button--text {
  background-color: transparent;
  color: var(--primary-color);
  border-color: transparent;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.base-button--text:hover:not(.base-button--disabled) {
  background-color: var(--primary-light);
}

/* Button Sizes */
.base-button--small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
}

.base-button--medium {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
}

.base-button--large {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-md);
}

/* Button States */
.base-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-button--loading {
  cursor: wait;
}

.base-button--block {
  width: 100%;
}

.base-button--icon-only {
  padding: var(--spacing-sm);
  width: auto;
  aspect-ratio: 1;
}

/* Loading Spinner */
.btn-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 16px;
  height: 16px;
}

/* Icon */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
}

.btn-icon--right {
  order: 1;
}

.btn-text {
  display: inline-flex;
  align-items: center;
}
</style>
