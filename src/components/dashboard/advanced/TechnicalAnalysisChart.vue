<template>
    <div class="technical-analysis-chart">
        <div class="chart-header">
            <h3 class="chart-title">技术分析</h3>
            <div class="chart-actions">
                <el-button size="small" @click="$emit('refresh')" :loading="loading">
                    刷新
                </el-button>
            </div>
        </div>

        <div class="chart-content">
            <div v-if="loading" class="loading-placeholder">
                <el-skeleton :rows="3" animated />
            </div>

            <div v-else-if="!data || data.length === 0" class="empty-state">
                <el-empty description="暂无技术分析数据" />
            </div>

            <div v-else class="chart-container">
                <div class="technical-indicators">
                    <div class="indicator-group">
                        <h4>趋势指标</h4>
                        <div class="indicator-list">
                            <div class="indicator-item">
                                <span class="indicator-name">MA20</span>
                                <span class="indicator-value">3,125.67</span>
                                <span class="indicator-status up">上升</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-name">MA60</span>
                                <span class="indicator-value">3,098.34</span>
                                <span class="indicator-status up">上升</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-name">MACD</span>
                                <span class="indicator-value">12.45</span>
                                <span class="indicator-status up">金叉</span>
                            </div>
                        </div>
                    </div>

                    <div class="indicator-group">
                        <h4>震荡指标</h4>
                        <div class="indicator-list">
                            <div class="indicator-item">
                                <span class="indicator-name">RSI</span>
                                <span class="indicator-value">65.4</span>
                                <span class="indicator-status neutral">中性</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-name">KDJ</span>
                                <span class="indicator-value">78.2</span>
                                <span class="indicator-status down">超买</span>
                            </div>
                            <div class="indicator-item">
                                <span class="indicator-name">BOLL</span>
                                <span class="indicator-value">3,145.23</span>
                                <span class="indicator-status neutral">中轨</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="signal-summary">
                    <div class="signal-item buy">
                        <span class="signal-type">买入信号</span>
                        <span class="signal-count">3个</span>
                    </div>
                    <div class="signal-item sell">
                        <span class="signal-type">卖出信号</span>
                        <span class="signal-count">1个</span>
                    </div>
                    <div class="signal-item hold">
                        <span class="signal-type">持有信号</span>
                        <span class="signal-count">8个</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    data?: any[]
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    refresh: []
}>()
</script>

<style scoped>
.technical-analysis-chart {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.chart-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0;
}

.chart-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.loading-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.technical-indicators {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.indicator-group h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.indicator-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.indicator-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
}

.indicator-name {
    font-size: 13px;
    color: var(--el-text-color-regular);
    font-weight: 500;
}

.indicator-value {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.indicator-status {
    font-size: 12px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
}

.indicator-status.up {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
}

.indicator-status.down {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
}

.indicator-status.neutral {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
}

.signal-summary {
    display: flex;
    gap: 12px;
    margin-top: auto;
}

.signal-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
}

.signal-item.buy {
    background: var(--el-color-success-light-9);
    border: 1px solid var(--el-color-success-light-7);
}

.signal-item.sell {
    background: var(--el-color-danger-light-9);
    border: 1px solid var(--el-color-danger-light-7);
}

.signal-item.hold {
    background: var(--el-color-info-light-9);
    border: 1px solid var(--el-color-info-light-7);
}

.signal-type {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
}

.signal-count {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.signal-item.buy .signal-count {
    color: var(--el-color-success);
}

.signal-item.sell .signal-count {
    color: var(--el-color-danger);
}

.signal-item.hold .signal-count {
    color: var(--el-color-info);
}
</style>