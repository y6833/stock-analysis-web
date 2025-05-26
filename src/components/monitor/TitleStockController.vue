<template>
  <div class="title-stock-controller">
    <div class="controller-header">
      <h3 class="header-title">
        <span class="title-icon">📺</span>
        标题栏股价显示
      </h3>
      <div class="header-status">
        <span class="status-indicator" :class="{ active: isEnabled }"></span>
        <span class="status-text">{{ isEnabled ? '已启用' : '已禁用' }}</span>
      </div>
    </div>

    <div class="controller-content">
      <!-- 快速启用区域 -->
      <div class="quick-enable-section">
        <div class="section-title">快速启用</div>
        <div class="preset-stocks">
          <button
            v-for="preset in presetConfigs"
            :key="preset.symbol"
            @click="enableWithPreset(preset)"
            class="preset-btn"
            :class="{ active: currentStock?.symbol === preset.symbol }"
          >
            <div class="preset-symbol">{{ preset.symbol }}</div>
            <div class="preset-name">{{ preset.name }}</div>
          </button>
        </div>
      </div>

      <!-- 自定义配置区域 -->
      <div class="custom-config-section">
        <div class="section-title">自定义配置</div>
        <div class="config-form">
          <div class="form-row">
            <div class="form-group">
              <label>股票代码:</label>
              <input
                v-model="customConfig.symbol"
                type="text"
                placeholder="如: 000001"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>股票名称:</label>
              <input
                v-model="customConfig.name"
                type="text"
                placeholder="如: 平安银行"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" v-model="customConfig.showChange" />
                显示涨跌额
              </label>
            </div>
            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" v-model="customConfig.showPercent" />
                显示涨跌幅
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>更新间隔:</label>
              <select v-model="customConfig.updateInterval" class="form-select">
                <option value="1000">1秒</option>
                <option value="3000">3秒</option>
                <option value="5000">5秒</option>
                <option value="10000">10秒</option>
                <option value="30000">30秒</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button
          @click="enableCustom"
          class="btn btn-primary"
          :disabled="!customConfig.symbol.trim()"
        >
          <span class="btn-icon">🚀</span>
          启用自定义配置
        </button>
        <button
          @click="disable"
          class="btn btn-secondary"
          :disabled="!isEnabled"
        >
          <span class="btn-icon">⏹️</span>
          停止显示
        </button>
      </div>

      <!-- 当前状态显示 -->
      <div class="current-status" v-if="isEnabled && currentStock">
        <div class="status-title">当前显示</div>
        <div class="status-info">
          <div class="status-row">
            <span class="label">股票:</span>
            <span class="value">{{ currentStock.symbol }} - {{ currentStock.name }}</span>
          </div>
          <div class="status-row">
            <span class="label">显示:</span>
            <span class="value">
              价格
              <span v-if="currentStock.showChange"> + 涨跌额</span>
              <span v-if="currentStock.showPercent"> + 涨跌幅</span>
            </span>
          </div>
          <div class="status-row">
            <span class="label">更新:</span>
            <span class="value">每{{ currentStock.updateInterval / 1000 }}秒</span>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="usage-tips">
        <div class="tips-title">💡 使用说明</div>
        <ul class="tips-list">
          <li>启用后，浏览器标题栏将显示选中股票的实时价格</li>
          <li>即使切换到其他标签页，也能看到股价变化</li>
          <li>支持显示涨跌额和涨跌幅，可自定义更新频率</li>
          <li>配置会自动保存，下次打开页面时自动恢复</li>
          <li>页面隐藏时会暂停更新以节省资源</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { titleStockService, type TitleStockConfig } from '@/services/titleStockService'

// 响应式数据
const isEnabled = ref(false)
const currentStock = ref<TitleStockConfig | null>(null)
const presetConfigs = ref<TitleStockConfig[]>([])

// 自定义配置
const customConfig = ref<TitleStockConfig>({
  symbol: '',
  name: '',
  showChange: true,
  showPercent: true,
  updateInterval: 3000
})

// 方法
const enableWithPreset = (preset: TitleStockConfig) => {
  titleStockService.enable(preset)
  updateStatus()
}

const enableCustom = () => {
  if (!customConfig.value.symbol.trim()) return
  
  titleStockService.enable({ ...customConfig.value })
  titleStockService.saveConfig(customConfig.value)
  updateStatus()
}

const disable = () => {
  titleStockService.disable()
  updateStatus()
}

const updateStatus = () => {
  const status = titleStockService.getStatus()
  isEnabled.value = status.isEnabled
  currentStock.value = status.currentStock
}

// 生命周期
onMounted(() => {
  // 获取预设配置
  presetConfigs.value = titleStockService.getPresetConfigs()
  
  // 更新当前状态
  updateStatus()
  
  // 加载保存的自定义配置
  const savedConfig = titleStockService.loadConfig()
  if (savedConfig) {
    customConfig.value = { ...savedConfig }
  }
})
</script>

<style scoped>
.title-stock-controller {
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.controller-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.title-icon {
  font-size: 1.2em;
}

.header-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: background var(--transition-normal);
}

.status-indicator.active {
  background: #2ecc71;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: var(--font-size-sm);
  opacity: 0.9;
}

.controller-content {
  padding: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--accent-color);
  border-radius: 2px;
}

.quick-enable-section {
  margin-bottom: var(--spacing-xl);
}

.preset-stocks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
}

.preset-btn {
  background: var(--bg-secondary);
  border: 2px solid var(--border-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  text-align: center;
}

.preset-btn:hover {
  border-color: var(--accent-light);
  transform: translateY(-2px);
}

.preset-btn.active {
  border-color: var(--accent-color);
  background: var(--accent-light);
}

.preset-symbol {
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: var(--spacing-xs);
}

.preset-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.custom-config-section {
  margin-bottom: var(--spacing-xl);
}

.config-form {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group.checkbox-group {
  flex-direction: row;
  align-items: center;
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.form-input,
.form-select {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  transition: border-color var(--transition-fast);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.control-buttons {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-dark);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-light);
}

.btn-icon {
  font-size: 1.1em;
}

.current-status {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  border-left: 4px solid var(--accent-color);
}

.status-title {
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);
}

.status-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.status-row:last-child {
  margin-bottom: 0;
}

.status-row .label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.status-row .value {
  color: var(--text-primary);
  font-weight: 500;
  font-size: var(--font-size-sm);
}

.usage-tips {
  background: rgba(66, 185, 131, 0.1);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--accent-light);
}

.tips-title {
  font-weight: 600;
  color: var(--accent-color);
  margin-bottom: var(--spacing-md);
}

.tips-list {
  margin: 0;
  padding-left: var(--spacing-lg);
  color: var(--text-secondary);
}

.tips-list li {
  margin-bottom: var(--spacing-xs);
  line-height: 1.5;
}

.tips-list li:last-child {
  margin-bottom: 0;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .preset-stocks {
    grid-template-columns: 1fr 1fr;
  }
  
  .control-buttons {
    flex-direction: column;
  }
}
</style>
