<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  params: {
    type: Object,
    required: true
  },
  strategies: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:params', 'run-backtest', 'reset'])

// 获取当前策略的参数字段
const strategyParameters = computed(() => {
  switch (props.params.strategy) {
    case 'ma_crossover':
      return [
        { id: 'shortPeriod', name: '短期均线周期', type: 'number', min: 1, max: 100 },
        { id: 'longPeriod', name: '长期均线周期', type: 'number', min: 2, max: 200 }
      ]
    case 'rsi':
      return [
        { id: 'rsiPeriod', name: 'RSI周期', type: 'number', min: 1, max: 100 },
        { id: 'rsiOverbought', name: 'RSI超买阈值', type: 'number', min: 50, max: 100 },
        { id: 'rsiOversold', name: 'RSI超卖阈值', type: 'number', min: 0, max: 50 }
      ]
    case 'macd':
      return [
        { id: 'macdFastPeriod', name: '快线周期', type: 'number', min: 1, max: 100 },
        { id: 'macdSlowPeriod', name: '慢线周期', type: 'number', min: 1, max: 100 },
        { id: 'macdSignalPeriod', name: '信号线周期', type: 'number', min: 1, max: 100 }
      ]
    case 'bollinger':
      return [
        { id: 'bollingerPeriod', name: '布林带周期', type: 'number', min: 1, max: 100 },
        { id: 'bollingerStdDev', name: '标准差倍数', type: 'number', min: 0.5, max: 5 }
      ]
    default:
      return []
  }
})

// 更新参数
const updateParam = (key, value) => {
  const newParams = { ...props.params }
  newParams[key] = value
  emit('update:params', newParams)
}

// 更新策略参数
const updateStrategyParam = (key, value) => {
  const newParams = { ...props.params }
  newParams.parameters[key] = value
  emit('update:params', newParams)
}
</script>

<template>
  <div class="strategy-form">
    <div class="form-group">
      <label for="strategy">交易策略</label>
      <select 
        id="strategy" 
        :value="params.strategy" 
        @change="updateParam('strategy', $event.target.value)" 
        class="form-control"
      >
        <option v-for="strategy in strategies" :key="strategy.id" :value="strategy.id">
          {{ strategy.name }}
        </option>
      </select>
      <p class="strategy-description">
        {{ strategies.find(s => s.id === params.strategy)?.description }}
      </p>
    </div>
    
    <h3>策略参数</h3>
    <div class="strategy-parameters">
      <div 
        v-for="param in strategyParameters" 
        :key="param.id" 
        class="form-group"
      >
        <label :for="param.id">{{ param.name }}</label>
        <input 
          :type="param.type" 
          :id="param.id" 
          :value="params.parameters[param.id]" 
          @input="updateStrategyParam(param.id, $event.target.value)" 
          class="form-control"
          :min="param.min"
          :max="param.max"
          step="1"
        >
      </div>
    </div>
    
    <div class="form-actions">
      <button 
        class="btn btn-primary" 
        @click="emit('run-backtest')"
      >
        运行回测
      </button>
      <button 
        class="btn btn-outline" 
        @click="emit('reset')"
      >
        重置
      </button>
    </div>
  </div>
</template>

<style scoped>
.strategy-form {
  margin-bottom: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.strategy-description {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-style: italic;
}

h3 {
  font-size: var(--font-size-md);
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}
</style>
