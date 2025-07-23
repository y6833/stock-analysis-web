<template>
  <div class="accessibility-settings-view">
    <div class="page-header">
      <h1 class="page-title">辅助功能设置</h1>
      <p class="page-description">
        调整这些设置以提高应用程序的可访问性和易用性。这些设置将保存在您的浏览器中。
      </p>
    </div>
    
    <div class="settings-container">
      <AccessibilitySettings />
      
      <div class="additional-resources">
        <h2 class="section-title">辅助功能资源</h2>
        <p>以下资源可以帮助您了解更多关于辅助功能的信息：</p>
        
        <ul class="resource-list">
          <li>
            <a 
              href="https://www.w3.org/WAI/standards-guidelines/wcag/" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="访问 Web 内容无障碍指南 (WCAG) 2.1"
            >
              Web 内容无障碍指南 (WCAG) 2.1
            </a>
          </li>
          <li>
            <a 
              href="https://www.w3.org/WAI/ARIA/apg/" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="访问 ARIA 实践指南"
            >
              ARIA 实践指南
            </a>
          </li>
          <li>
            <a 
              href="https://www.w3.org/WAI/fundamentals/" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="访问 Web 无障碍基础知识"
            >
              Web 无障碍基础知识
            </a>
          </li>
        </ul>
      </div>
      
      <div class="keyboard-shortcuts">
        <h2 class="section-title">键盘快捷键</h2>
        <p>以下键盘快捷键可以帮助您更高效地使用我们的应用程序：</p>
        
        <div class="shortcuts-table-container">
          <table class="shortcuts-table a11y-table">
            <caption class="sr-only">键盘快捷键列表</caption>
            <thead>
              <tr>
                <th scope="col">快捷键</th>
                <th scope="col">功能</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><kbd>?</kbd></td>
                <td>显示键盘快捷键帮助</td>
              </tr>
              <tr>
                <td><kbd>/</kbd></td>
                <td>聚焦搜索框</td>
              </tr>
              <tr>
                <td><kbd>Esc</kbd></td>
                <td>关闭当前对话框或弹出窗口</td>
              </tr>
              <tr>
                <td><kbd>Alt</kbd> + <kbd>1</kbd> 到 <kbd>9</kbd></td>
                <td>导航到主要菜单项</td>
              </tr>
              <tr>
                <td><kbd>Ctrl</kbd> + <kbd>F</kbd></td>
                <td>页内搜索</td>
              </tr>
              <tr>
                <td><kbd>Tab</kbd></td>
                <td>在页面元素之间导航</td>
              </tr>
              <tr>
                <td><kbd>Enter</kbd></td>
                <td>激活当前聚焦的元素</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings.vue';

// 页面加载时设置文档标题
onMounted(() => {
  document.title = '辅助功能设置 - 快乐股市';
});
</script>

<style scoped>
.accessibility-settings-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

.page-header {
  margin-bottom: var(--spacing-xl);
}

.page-title {
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
}

.page-description {
  color: var(--text-secondary);
  font-size: var(--font-size-md);
  max-width: 800px;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--spacing-sm);
}

.additional-resources,
.keyboard-shortcuts {
  background-color: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.resource-list {
  list-style-type: none;
  padding: 0;
  margin: var(--spacing-md) 0;
}

.resource-list li {
  margin-bottom: var(--spacing-sm);
  padding-left: var(--spacing-md);
  position: relative;
}

.resource-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--primary-color);
}

.resource-list a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.resource-list a:hover,
.resource-list a:focus {
  color: color-mix(in srgb, var(--primary-color) 80%, black);
  text-decoration: underline;
}

.shortcuts-table-container {
  overflow-x: auto;
  margin-top: var(--spacing-md);
}

.shortcuts-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.shortcuts-table th,
.shortcuts-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
}

.shortcuts-table th {
  background-color: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.shortcuts-table td {
  border-bottom: 1px solid var(--border-light);
}

.shortcuts-table tr:last-child td {
  border-bottom: none;
}

kbd {
  display: inline-block;
  padding: 3px 5px;
  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-regular);
  border-radius: 3px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  margin: 0 2px;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .accessibility-settings-view {
    padding: var(--spacing-sm);
  }
  
  .page-title {
    font-size: var(--font-size-lg);
  }
  
  .page-description {
    font-size: var(--font-size-sm);
  }
  
  .additional-resources,
  .keyboard-shortcuts {
    padding: var(--spacing-md);
  }
  
  .shortcuts-table th,
  .shortcuts-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
</style>