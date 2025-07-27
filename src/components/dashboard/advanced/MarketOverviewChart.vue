<template>
    <div class="market-overview-chart">
        <div class="chart-header">
            <h3 class="chart-title">市场概览</h3>
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
                <el-empty description="暂无市场数据" />
            </div>

            <div v-else class="chart-container">
                <!-- 这里可以集成实际的图表库，如 ECharts -->
                <div class="chart-placeholder">
                    <div class="chart-info">
                        <div class="info-item">
                            <span class="label">上证指数</span>
                            <span class="value">3,123.45</span>
                            <span class="change up">+12.34 (+0.40%)</span>
                        </div>
                        <div class="info-item">
                            <span class="label">深证成指</span>
                            <span class="value">10,234.56</span>
                            <span class="change down">-23.45 (-0.23%)</span>
                        </div>
                        <div class="info-item">
                            <span class="label">创业板指</span>
                            <span class="value">2,345.67</span>
                            <span class="change up">+5.67 (+0.24%)</span>
                        </div>
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
.market-overview-chart {
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
}

.chart-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    padding: 20px;
}

.chart-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--el-bg-color);
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter);
}

.label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    font-weight: 500;
}

.value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.change {
    font-size: 14px;
    font-weight: 500;
}

.change.up {
    color: var(--el-color-success);
}

.change.down {
    color: var(--el-color-danger);
}
</style>