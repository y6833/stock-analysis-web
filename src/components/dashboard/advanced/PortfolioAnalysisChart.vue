<template>
    <div class="portfolio-analysis-chart">
        <div class="chart-header">
            <h3 class="chart-title">投资组合分析</h3>
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

            <div v-else-if="!data || Object.keys(data).length === 0" class="empty-state">
                <el-empty description="暂无投资组合数据" />
            </div>

            <div v-else class="chart-container">
                <div class="portfolio-summary">
                    <div class="summary-item">
                        <span class="label">总资产</span>
                        <span class="value">¥123,456.78</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">今日收益</span>
                        <span class="value up">+¥1,234.56 (+1.02%)</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">持仓数量</span>
                        <span class="value">12只</span>
                    </div>
                </div>

                <div class="portfolio-distribution">
                    <h4>资产分布</h4>
                    <div class="distribution-list">
                        <div class="distribution-item">
                            <span class="stock-name">贵州茅台</span>
                            <span class="percentage">25.6%</span>
                            <span class="amount">¥31,234.56</span>
                        </div>
                        <div class="distribution-item">
                            <span class="stock-name">腾讯控股</span>
                            <span class="percentage">18.3%</span>
                            <span class="amount">¥22,345.67</span>
                        </div>
                        <div class="distribution-item">
                            <span class="stock-name">平安银行</span>
                            <span class="percentage">15.2%</span>
                            <span class="amount">¥18,765.43</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    data?: any
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
.portfolio-analysis-chart {
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

.portfolio-summary {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.label {
    font-size: 14px;
    color: var(--el-text-color-regular);
}

.value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.value.up {
    color: var(--el-color-success);
}

.portfolio-distribution {
    flex: 1;
}

.portfolio-distribution h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.distribution-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.distribution-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

.stock-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.percentage {
    font-size: 14px;
    color: var(--el-color-primary);
    font-weight: 600;
}

.amount {
    font-size: 14px;
    color: var(--el-text-color-regular);
}
</style>