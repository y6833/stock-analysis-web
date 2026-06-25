<template>
    <AiPageLayout title="DeepSeek API 测试" subtitle="测试和验证 DeepSeek API 集成功能">
        <div class="test-controls">
            <el-button type="primary" @click="runTests" :loading="testing" :disabled="testing">
                {{ testing ? '测试中...' : '运行所有测试' }}
            </el-button>

            <el-button @click="clearResults" :disabled="testing || results.length === 0">
                清除结果
            </el-button>

            <el-button @click="showStats" type="info">
                查看统计
            </el-button>
        </div>

        <div class="test-results" v-if="results.length > 0">
            <h2>测试结果</h2>

            <div class="results-summary">
                <el-statistic title="通过测试" :value="passedTests" suffix="/ {{ totalTests }}" />
                <el-statistic title="成功率" :value="successRate" suffix="%" :precision="1" />
                <el-statistic title="总耗时" :value="totalDuration" suffix="ms" />
            </div>

            <div class="results-list">
                <el-card v-for="(result, index) in results" :key="index" class="result-card"
                    :class="{ 'success': result.success, 'failed': !result.success }">
                    <template #header>
                        <div class="result-header">
                            <span class="result-name">{{ result.name }}</span>
                            <el-tag :type="result.success ? 'success' : 'danger'" size="small">
                                {{ result.success ? '通过' : '失败' }}
                            </el-tag>
                        </div>
                    </template>

                    <div class="result-content">
                        <p class="result-message">{{ result.message }}</p>

                        <div class="result-meta" v-if="result.duration">
                            <span>耗时: {{ result.duration }}ms</span>
                        </div>

                        <div class="result-data" v-if="result.data">
                            <el-collapse>
                                <el-collapse-item title="详细数据" name="data">
                                    <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
                                </el-collapse-item>
                            </el-collapse>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>

        <div class="config-info">
            <h2>配置信息</h2>
            <el-descriptions :column="2" border>
                <el-descriptions-item label="API Key">
                    {{ maskedApiKey }}
                </el-descriptions-item>
                <el-descriptions-item label="Base URL">
                    {{ config.baseUrl }}
                </el-descriptions-item>
                <el-descriptions-item label="模型">
                    {{ config.model }}
                </el-descriptions-item>
                <el-descriptions-item label="最大Tokens">
                    {{ config.maxTokens }}
                </el-descriptions-item>
                <el-descriptions-item label="Temperature">
                    {{ config.temperature }}
                </el-descriptions-item>
                <el-descriptions-item label="速率限制">
                    {{ config.rateLimit }}/分钟
                </el-descriptions-item>
                <el-descriptions-item label="每日限制">
                    {{ config.dailyLimit }}/天
                </el-descriptions-item>
                <el-descriptions-item label="配置状态">
                    <el-tag :type="configValid ? 'success' : 'danger'">
                        {{ configValid ? '有效' : '无效' }}
                    </el-tag>
                </el-descriptions-item>
            </el-descriptions>
        </div>

        <!-- 统计信息对话框 -->
        <el-dialog v-model="statsDialogVisible" title="API使用统计" width="600px">
            <div class="stats-content" v-if="usageStats">
                <h3>请求统计</h3>
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="总请求数">
                        {{ usageStats.requests.totalRequests }}
                    </el-descriptions-item>
                    <el-descriptions-item label="成功请求">
                        {{ usageStats.requests.successfulRequests }}
                    </el-descriptions-item>
                    <el-descriptions-item label="失败请求">
                        {{ usageStats.requests.failedRequests }}
                    </el-descriptions-item>
                    <el-descriptions-item label="今日请求">
                        {{ usageStats.requests.requestsToday }}
                    </el-descriptions-item>
                    <el-descriptions-item label="剩余每日请求">
                        {{ usageStats.requests.remainingDailyRequests }}
                    </el-descriptions-item>
                    <el-descriptions-item label="剩余每分钟请求">
                        {{ usageStats.requests.remainingMinuteRequests }}
                    </el-descriptions-item>
                </el-descriptions>

                <h3>成本统计</h3>
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="总成本(USD)">
                        ${{ usageStats.costs.totalCostUSD.toFixed(4) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="总成本(CNY)">
                        ¥{{ usageStats.costs.totalCostCNY.toFixed(4) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="日均成本">
                        ¥{{ usageStats.costs.dailyAverage.toFixed(4) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Token使用量">
                        {{ usageStats.costs.tokenUsage }}
                    </el-descriptions-item>
                </el-descriptions>
            </div>
        </el-dialog>
    </AiPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'
import { ElMessage } from 'element-plus'
import { runAllTests, getUsageStats, resetStats, type TestResult } from '@/utils/deepseekTest'
import {
    getDeepSeekConfig,
    isDeepSeekConfigValid,
    getDeepSeekConfigErrors
} from '@/config/deepseekConfig'

// 响应式数据
const testing = ref(false)
const results = ref<TestResult[]>([])
const statsDialogVisible = ref(false)
const usageStats = ref<any>(null)

// 配置信息
const config = getDeepSeekConfig()
const configValid = isDeepSeekConfigValid()
const configErrors = getDeepSeekConfigErrors()

// 计算属性
const maskedApiKey = computed(() => {
    if (!config.apiKey) return '未配置'
    return config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4)
})

const passedTests = computed(() => {
    return results.value.filter(r => r.success).length
})

const totalTests = computed(() => {
    return results.value.length
})

const successRate = computed(() => {
    if (totalTests.value === 0) return 0
    return (passedTests.value / totalTests.value) * 100
})

const totalDuration = computed(() => {
    return results.value.reduce((sum, r) => sum + (r.duration || 0), 0)
})

// 方法
const runTests = async () => {
    if (!configValid) {
        ElMessage.error(`配置无效: ${configErrors.join(', ')}`)
        return
    }

    testing.value = true
    results.value = []

    try {
        const testResults = await runAllTests()
        results.value = testResults

        const passed = testResults.filter(r => r.success).length
        const total = testResults.length

        if (passed === total) {
            ElMessage.success(`所有测试通过！(${passed}/${total})`)
        } else {
            ElMessage.warning(`部分测试失败 (${passed}/${total})`)
        }
    } catch (error) {
        ElMessage.error(`测试执行失败: ${(error as Error).message}`)
    } finally {
        testing.value = false
    }
}

const clearResults = () => {
    results.value = []
    ElMessage.info('测试结果已清除')
}

const showStats = () => {
    usageStats.value = getUsageStats()
    statsDialogVisible.value = true
}

// 生命周期
onMounted(() => {
    if (!configValid) {
        ElMessage.warning('DeepSeek API 配置无效，请检查配置')
    }
})
</script>

<style scoped>
.deepseek-test-view {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.header {
    text-align: center;
    margin-bottom: 30px;
}

.header h1 {
    color: #2c3e50;
    margin-bottom: 10px;
}

.header p {
    color: #7f8c8d;
    font-size: 16px;
}

.test-controls {
    text-align: center;
    margin-bottom: 30px;
}

.test-controls .el-button {
    margin: 0 10px;
}

.test-results {
    margin-bottom: 40px;
}

.test-results h2 {
    color: #2c3e50;
    margin-bottom: 20px;
}

.results-summary {
    display: flex;
    justify-content: space-around;
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.results-list {
    display: grid;
    gap: 16px;
}

.result-card {
    transition: all 0.3s ease;
}

.result-card.success {
    border-left: 4px solid #67c23a;
}

.result-card.failed {
    border-left: 4px solid #f56c6c;
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.result-name {
    font-weight: 600;
    color: #2c3e50;
}

.result-content {
    padding-top: 10px;
}

.result-message {
    margin-bottom: 10px;
    color: #606266;
}

.result-meta {
    font-size: 12px;
    color: #909399;
    margin-bottom: 10px;
}

.result-data pre {
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    overflow-x: auto;
}

.config-info h2 {
    color: #2c3e50;
    margin-bottom: 20px;
}

.stats-content h3 {
    color: #2c3e50;
    margin: 20px 0 10px 0;
}

.stats-content h3:first-child {
    margin-top: 0;
}
</style>