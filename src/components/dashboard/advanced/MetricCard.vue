<template>
    <div class="metric-card" :class="{ 'is-loading': loading }" @click="$emit('click', metric)">
        <div class="metric-header">
            <div class="metric-icon">
                <el-icon :size="24">
                    <Money v-if="metric.icon === 'money'" />
                    <TrendCharts v-else-if="metric.icon === 'trend'" />
                    <DataAnalysis v-else-if="metric.icon === 'chart'" />
                    <Warning v-else />
                </el-icon>
            </div>
            <div class="metric-title">{{ metric.title }}</div>
        </div>

        <div class="metric-content">
            <div class="metric-value" :class="metric.trend">
                {{ formatValue(metric.value) }}
            </div>

            <div class="metric-change" :class="metric.trend">
                <el-icon v-if="metric.change > 0">
                    <ArrowUp />
                </el-icon>
                <el-icon v-else-if="metric.change < 0">
                    <ArrowDown />
                </el-icon>
                <span class="change-value">
                    {{ formatChange(metric.change) }}
                </span>
                <span class="change-percent">
                    ({{ formatPercent(metric.changePercent) }})
                </span>
            </div>
        </div>

        <div class="metric-footer">
            <div class="metric-trend" :class="metric.trend">
                <span class="trend-text">
                    {{ getTrendText(metric.trend) }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown, Money, TrendCharts, DataAnalysis, Warning } from '@element-plus/icons-vue'

interface KeyMetric {
    id: string
    title: string
    value: string | number
    change: number
    changePercent: number
    icon: string
    color: string
    trend: 'up' | 'down' | 'neutral'
}

interface Props {
    metric: KeyMetric
    loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
})

const emit = defineEmits<{
    click: [metric: KeyMetric]
}>()

// 格式化数值
function formatValue(value: string | number): string {
    if (typeof value === 'number') {
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(2) + 'B'
        } else if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M'
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K'
        }
        return value.toFixed(2)
    }
    return String(value)
}

// 格式化变化值
function formatChange(change: number): string {
    const absChange = Math.abs(change)
    if (absChange >= 1000000000) {
        return (absChange / 1000000000).toFixed(2) + 'B'
    } else if (absChange >= 1000000) {
        return (absChange / 1000000).toFixed(2) + 'M'
    } else if (absChange >= 1000) {
        return (absChange / 1000).toFixed(2) + 'K'
    }
    return absChange.toFixed(2)
}

// 格式化百分比
function formatPercent(percent: number): string {
    return Math.abs(percent).toFixed(2) + '%'
}

// 获取趋势文本
function getTrendText(trend: 'up' | 'down' | 'neutral'): string {
    switch (trend) {
        case 'up':
            return '上升趋势'
        case 'down':
            return '下降趋势'
        default:
            return '平稳'
    }
}
</script>

<style scoped>
.metric-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: var(--el-color-primary);
}

.metric-card.is-loading {
    opacity: 0.7;
    pointer-events: none;
}

.metric-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
}

.metric-icon {
    margin-right: 12px;
    color: var(--el-color-primary);
}

.metric-title {
    font-size: 14px;
    color: var(--el-text-color-regular);
    font-weight: 500;
}

.metric-content {
    margin-bottom: 16px;
}

.metric-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
}

.metric-change {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
}

.metric-change.up {
    color: var(--el-color-success);
}

.metric-change.down {
    color: var(--el-color-danger);
}

.metric-change.neutral {
    color: var(--el-text-color-regular);
}

.change-value {
    margin: 0 4px;
}

.change-percent {
    opacity: 0.8;
}

.metric-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.metric-trend {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
}

.metric-trend.up {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
}

.metric-trend.down {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
}

.metric-trend.neutral {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
}

.trend-text {
    font-size: 12px;
}
</style>