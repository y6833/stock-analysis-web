<template>
  <div class="accessibility-settings">
    <h2 class="accessibility-settings__title">辅助功能设置</h2>
    <p class="accessibility-settings__description">
      调整这些设置以提高应用程序的可访问性和易用性。
    </p>
    
    <div class="accessibility-settings__options">
      <div class="setting-item">
        <div class="setting-item__content">
          <h3 class="setting-item__title">高对比度模式</h3>
          <p class="setting-item__description">
            增强文本和背景之间的对比度，使内容更易阅读。
          </p>
        </div>
        <div class="setting-item__control">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="settings.highContrast"
              @change="updateSetting('highContrast', settings.highContrast)"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-item__content">
          <h3 class="setting-item__title">大文本模式</h3>
          <p class="setting-item__description">
            增大文本大小，提高可读性。
          </p>
        </div>
        <div class="setting-item__control">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="settings.largeText"
              @change="updateSetting('largeText', settings.largeText)"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-item__content">
          <h3 class="setting-item__title">减少动画</h3>
          <p class="setting-item__description">
            减少或移除界面动画和过渡效果。
          </p>
        </div>
        <div class="setting-item__control">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="settings.reducedMotion"
              @change="updateSetting('reducedMotion', settings.reducedMotion)"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-item__content">
          <h3 class="setting-item__title">屏幕阅读器优化</h3>
          <p class="setting-item__description">
            优化界面以更好地与屏幕阅读器配合使用。
          </p>
        </div>
        <div class="setting-item__control">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="settings.screenReader"
              @change="updateSetting('screenReader', settings.screenReader)"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-item__content">
          <h3 class="setting-item__title">焦点指示器</h3>
          <p class="setting-item__description">
            显示清晰的焦点指示器，便于键盘导航。
          </p>
        </div>
        <div class="setting-item__control">
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              v-model="settings.focusIndicators"
              @change="updateSetting('focusIndicators', settings.focusIndicators)"
            >
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
    
    <div class="accessibility-settings__actions">
      <button 
        class="app-button app-button--default"
        @click="resetToDefaults"
        aria-label="重置所有辅助功能设置为默认值"
      >
        重置为默认值
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAccessibility } from '@/composables/useAccessibility';

const { settings, updateSetting, resetToDefaults } = useAccessibility();
</script>

<style scoped>
.accessibility-settings {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.accessibility-settings__title {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
}

.accessibility-settings__description {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.accessibility-settings__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--border-light);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item__content {
  flex: 1;
}

.setting-item__title {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xs) 0;
}

.setting-item__description {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin: 0;
}

.setting-item__control {
  margin-left: var(--spacing-md);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: var(--transition-fast);
  border-radius: 34px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: var(--transition-fast);
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

input:focus + .toggle-slider {
  box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.accessibility-settings__actions {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .setting-item__control {
    margin-left: 0;
    margin-top: var(--spacing-sm);
  }
  
  .toggle-switch {
    width: 50px;
    height: 28px;
  }
  
  .toggle-slider:before {
    height: 20px;
    width: 20px;
  }
  
  input:checked + .toggle-slider:before {
    transform: translateX(22px);
  }
}
</style>