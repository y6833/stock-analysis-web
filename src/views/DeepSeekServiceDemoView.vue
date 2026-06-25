<template>
    <AiPageLayout title="DeepSeek AI 服务演示" subtitle="测试股票分析、推荐生成和综合分析功能">
        <el-tabs v-model="activeTab" type="card">
            <!-- 股票分析标签页 -->
            <el-tab-pane label="股票分析" name="analysis">
                <div class="demo-section">
                    <h3>股票分析演示</h3>

                    <el-form :model="analysisForm" label-width="120px">
                        <el-form-item label="股票代码">
                            <el-input v-model="analysisForm.symbol" placeholder="例如: 000001.SZ" />
                        </el-form-item>

                        <el-form-item label="股票名称">
                            <el-input v-model="analysisForm.name" placeholder="例如: 平安银行" />
                        </el-form-item>

                        <el-form-item label="当前价格">
                            <el-input-number v-model="analysisForm.currentPrice" :precision="2" :step="0.01" />
                        </el-form-item>

                        <el-form-item label="分析类型">
                            <el-select v-model="analysisForm.analysisType">
                                <el-option label="基础分析" value="basic" />
                                <el-option label="详细分析" value="detailed" />
                                <el-option label="全面分析" value="comprehensive" />
                            </el-select>
                        </el-form-item>

                        <el-form-item label="风险等级">
                            <el-select v-model="analysisForm.riskLevel">
                                <el-option label="低风险" value="low" />
                                <el-option label="中等风险" value="medium" />
                                <el-option label="高风险" value="high" />
                            </el-select>
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="analyzeStock" :loading="analysisLoading"
                                :disabled="!analysisForm.symbol || !analysisForm.name">
                                开始分析
                            </el-button>
                            <el-button @click="clearAnalysisResult">清除结果</el-button>
                        </el-form-item>
                    </el-form>

                    <!-- 分析结果 -->
                    <div v-if="analysisResult" class="result-section">
                        <h4>分析结果</h4>
                        <el-card>
                            <template #header>
                                <div class="result-header">
                                    <span>{{ analysisResult.symbol }} - AI分析报告</span>
                                    <el-tag :type="getRecommendationTagType(analysisResult.analysis.recommendation)">
                                        {{ getRecommendationText(analysisResult.analysis.recommendation) }}
                                    </el-tag>
                                </div>
                            </template>

                            <el-descriptions :column="2" border>
                                <el-descriptions-item label="置信度分数">
                                    {{ analysisResult.analysis.confidenceScore }}%
                                </el-descriptions-item>
                                <el-descriptions-item label="目标价格">
                                    {{ analysisResult.analysis.targetPrice || '未设定' }}
                                </el-descriptions-item>
                                <el-descriptions-item label="止损价格">
                                    {{ analysisResult.analysis.stopLoss || '未设定' }}
                                </el-descriptions-item>
                                <el-descriptions-item label="使用Token">
                                    {{ analysisResult.metadata.tokensUsed }}
                                </el-descriptions-item>
                            </el-descriptions>

                            <div class="analysis-content">
                                <h5>分析摘要</h5>
                                <p>{{ analysisResult.analysis.summary }}</p>

                                <h5>技术分析</h5>
                                <p>{{ analysisResult.analysis.technicalAnalysis }}</p>

                                <h5>基本面分析</h5>
                                <p>{{ analysisResult.analysis.fundamentalAnalysis }}</p>

                                <h5>风险评估</h5>
                                <p>{{ analysisResult.analysis.riskAssessment }}</p>

                                <h5>推荐理由</h5>
                                <ul>
                                    <li v-for="reason in analysisResult.analysis.reasoning" :key="reason">
                                        {{ reason }}
                                    </li>
                                </ul>
                            </div>
                        </el-card>
                    </div>
                </div>
            </el-tab-pane>

            <!-- 推荐生成标签页 -->
            <el-tab-pane label="推荐生成" name="recommendation">
                <div class="demo-section">
                    <h3>股票推荐演示</h3>

                    <el-form :model="recommendationForm" label-width="120px">
                        <el-form-item label="风险等级">
                            <el-select v-model="recommendationForm.riskLevel">
                                <el-option label="低风险" value="low" />
                                <el-option label="中等风险" value="medium" />
                                <el-option label="高风险" value="high" />
                            </el-select>
                        </el-form-item>

                        <el-form-item label="预期收益">
                            <el-input-number v-model="recommendationForm.expectedReturn" :precision="3" :step="0.001"
                                :min="0" :max="1" />
                            <span class="form-help">{{ (recommendationForm.expectedReturn * 100).toFixed(1) }}%</span>
                        </el-form-item>

                        <el-form-item label="投资期限">
                            <el-input-number v-model="recommendationForm.timeHorizon" :min="1" :max="365" />
                            <span class="form-help">天</span>
                        </el-form-item>

                        <el-form-item label="推荐数量">
                            <el-input-number v-model="recommendationForm.maxRecommendations" :min="1" :max="10" />
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="generateRecommendations" :loading="recommendationLoading">
                                生成推荐
                            </el-button>
                            <el-button @click="clearRecommendationResult">清除结果</el-button>
                        </el-form-item>
                    </el-form>

                    <!-- 推荐结果 -->
                    <div v-if="recommendationResult" class="result-section">
                        <h4>推荐结果</h4>
                        <div class="recommendations-grid">
                            <el-card v-for="(rec, index) in recommendationResult.recommendations" :key="rec.symbol"
                                class="recommendation-card">
                                <template #header>
                                    <div class="rec-header">
                                        <span>{{ rec.symbol }} - {{ rec.name }}</span>
                                        <el-tag :type="getRecommendationTagType(rec.recommendation)">
                                            {{ getRecommendationText(rec.recommendation) }}
                                        </el-tag>
                                    </div>
                                </template>

                                <el-descriptions :column="1" size="small">
                                    <el-descriptions-item label="置信度">
                                        {{ rec.confidenceScore }}%
                                    </el-descriptions-item>
                                    <el-descriptions-item label="预期收益">
                                        {{ (rec.expectedReturn * 100).toFixed(1) }}%
                                    </el-descriptions-item>
                                    <el-descriptions-item label="风险等级">
                                        <el-tag :type="getRiskTagType(rec.riskLevel)" size="small">
                                            {{ getRiskText(rec.riskLevel) }}
                                        </el-tag>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="目标价格">
                                        ¥{{ rec.targetPrice.toFixed(2) }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="止损价格">
                                        ¥{{ rec.stopLoss.toFixed(2) }}
                                    </el-descriptions-item>
                                </el-descriptions>

                                <div class="reasoning">
                                    <h6>推荐理由：</h6>
                                    <ul>
                                        <li v-for="reason in rec.reasoning" :key="reason">
                                            {{ reason }}
                                        </li>
                                    </ul>
                                </div>
                            </el-card>
                        </div>
                    </div>
                </div>
            </el-tab-pane>

            <!-- 综合分析标签页 -->
            <el-tab-pane label="综合分析" name="comprehensive">
                <div class="demo-section">
                    <h3>综合分析演示</h3>

                    <el-form :model="comprehensiveForm" label-width="120px">
                        <el-form-item label="股票代码">
                            <el-input v-model="comprehensiveForm.symbol" placeholder="例如: 000001.SZ" />
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" @click="performComprehensiveAnalysis"
                                :loading="comprehensiveLoading" :disabled="!comprehensiveForm.symbol">
                                开始综合分析
                            </el-button>
                            <el-button @click="clearComprehensiveResult">清除结果</el-button>
                        </el-form-item>
                    </el-form>

                    <!-- 综合分析结果 -->
                    <div v-if="comprehensiveResult" class="result-section">
                        <h4>综合分析结果</h4>

                        <el-row :gutter="20">
                            <el-col :span="12">
                                <el-card title="技术分析">
                                    <template #header>
                                        <span>技术分析</span>
                                    </template>
                                    <el-descriptions :column="1" size="small">
                                        <el-descriptions-item label="趋势">
                                            <el-tag
                                                :type="getTrendTagType(comprehensiveResult.technicalAnalysis.trend)">
                                                {{ getTrendText(comprehensiveResult.technicalAnalysis.trend) }}
                                            </el-tag>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="强度">
                                            {{ (comprehensiveResult.technicalAnalysis.strength * 100).toFixed(0) }}%
                                        </el-descriptions-item>
                                        <el-descriptions-item label="信号数量">
                                            {{ comprehensiveResult.technicalAnalysis.signals.length }}个
                                        </el-descriptions-item>
                                    </el-descriptions>
                                </el-card>
                            </el-col>

                            <el-col :span="12">
                                <el-card title="基本面分析">
                                    <template #header>
                                        <span>基本面分析</span>
                                    </template>
                                    <el-descriptions :column="1" size="small">
                                        <el-descriptions-item label="估值">
                                            {{ getValuationText(comprehensiveResult.fundamentalAnalysis.valuation) }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="质量">
                                            {{ getQualityText(comprehensiveResult.fundamentalAnalysis.quality) }}
                                        </el-descriptions-item>
                                        <el-descriptions-item label="成长性">
                                            {{ getGrowthText(comprehensiveResult.fundamentalAnalysis.growth) }}
                                        </el-descriptions-item>
                                    </el-descriptions>
                                </el-card>
                            </el-col>
                        </el-row>

                        <el-row :gutter="20" style="margin-top: 20px;">
                            <el-col :span="12">
                                <el-card title="风险评估">
                                    <template #header>
                                        <span>风险评估</span>
                                    </template>
                                    <el-descriptions :column="1" size="small">
                                        <el-descriptions-item label="整体风险">
                                            <el-tag
                                                :type="getRiskTagType(comprehensiveResult.riskAssessment.overall_risk)">
                                                {{ getRiskText(comprehensiveResult.riskAssessment.overall_risk) }}
                                            </el-tag>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="波动性风险">
                                            {{ (comprehensiveResult.riskAssessment.volatility_risk * 100).toFixed(0) }}%
                                        </el-descriptions-item>
                                        <el-descriptions-item label="流动性风险">
                                            {{ (comprehensiveResult.riskAssessment.liquidity_risk * 100).toFixed(0) }}%
                                        </el-descriptions-item>
                                    </el-descriptions>
                                </el-card>
                            </el-col>

                            <el-col :span="12">
                                <el-card title="最终推荐">
                                    <template #header>
                                        <span>最终推荐</span>
                                    </template>
                                    <el-descriptions :column="1" size="small">
                                        <el-descriptions-item label="推荐动作">
                                            <el-tag
                                                :type="getRecommendationTagType(comprehensiveResult.recommendation.action)">
                                                {{ getRecommendationText(comprehensiveResult.recommendation.action) }}
                                            </el-tag>
                                        </el-descriptions-item>
                                        <el-descriptions-item label="置信度">
                                            {{ comprehensiveResult.recommendation.confidence.toFixed(0) }}%
                                        </el-descriptions-item>
                                        <el-descriptions-item label="投资期限">
                                            {{ comprehensiveResult.recommendation.time_horizon }}
                                        </el-descriptions-item>
                                    </el-descriptions>
                                </el-card>
                            </el-col>
                        </el-row>
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
    </AiPageLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import AiPageLayout from '@/components/ai/AiPageLayout.vue'
import { ElMessage } from 'element-plus'
import { deepSeekService, type StockAnalysisResponse, type RecommendationResponse } from '@/services/deepseekService'
import { analysisEngine, type ComprehensiveAnalysisResult } from '@/services/analysisEngine'

// 响应式数据
const activeTab = ref('analysis')

// 股票分析表单
const analysisForm = reactive({
    symbol: '000001.SZ',
    name: '平安银行',
    currentPrice: 12.50,
    analysisType: 'detailed',
    riskLevel: 'medium'
})

const analysisLoading = ref(false)
const analysisResult = ref<StockAnalysisResponse | null>(null)

// 推荐生成表单
const recommendationForm = reactive({
    riskLevel: 'medium',
    expectedReturn: 0.08,
    timeHorizon: 30,
    maxRecommendations: 5
})

const recommendationLoading = ref(false)
const recommendationResult = ref<RecommendationResponse | null>(null)

// 综合分析表单
const comprehensiveForm = reactive({
    symbol: '000001.SZ'
})

const comprehensiveLoading = ref(false)
const comprehensiveResult = ref<ComprehensiveAnalysisResult | null>(null)

// 方法
const analyzeStock = async () => {
    analysisLoading.value = true

    try {
        const request = {
            symbol: analysisForm.symbol,
            name: analysisForm.name,
            currentPrice: analysisForm.currentPrice,
            priceData: generateMockPriceData(analysisForm.currentPrice),
            volumeData: generateMockVolumeData(),
            technicalIndicators: generateMockTechnicalIndicators(),
            analysisType: analysisForm.analysisType as 'basic' | 'detailed' | 'comprehensive',
            userPreferences: {
                riskLevel: analysisForm.riskLevel as 'low' | 'medium' | 'high',
                investmentHorizon: 'medium' as const
            }
        }

        const result = await deepSeekService.analyzeStock(request)
        analysisResult.value = result

        ElMessage.success('股票分析完成！')
    } catch (error) {
        ElMessage.error(`分析失败: ${(error as Error).message}`)
    } finally {
        analysisLoading.value = false
    }
}

const generateRecommendations = async () => {
    recommendationLoading.value = true

    try {
        const request = {
            criteria: {
                riskLevel: recommendationForm.riskLevel as 'low' | 'medium' | 'high',
                expectedReturn: recommendationForm.expectedReturn,
                timeHorizon: recommendationForm.timeHorizon,
                maxRecommendations: recommendationForm.maxRecommendations
            },
            stockPool: generateMockStockPool()
        }

        const result = await deepSeekService.generateRecommendations(request)
        recommendationResult.value = result

        ElMessage.success('推荐生成完成！')
    } catch (error) {
        ElMessage.error(`推荐生成失败: ${(error as Error).message}`)
    } finally {
        recommendationLoading.value = false
    }
}

const performComprehensiveAnalysis = async () => {
    comprehensiveLoading.value = true

    try {
        const technicalData = {
            symbol: comprehensiveForm.symbol,
            priceData: generateMockPriceData(12.50),
            volumeData: generateMockVolumeData(),
            indicators: generateMockTechnicalIndicators()
        }

        const fundamentalData = {
            symbol: comprehensiveForm.symbol,
            financialMetrics: {
                pe: 6.8,
                pb: 0.9,
                roe: 12.5,
                roa: 1.2,
                debtToEquity: 0.3
            },
            valuation: {
                marketCap: 250000000000
            },
            dividends: {
                dividendYield: 0.035
            },
            industry: {
                sector: '金融',
                industry: '银行',
                industryPE: 8.0
            }
        }

        const result = await analysisEngine.comprehensiveAnalysis(
            comprehensiveForm.symbol,
            technicalData,
            fundamentalData,
            undefined,
            {
                riskLevel: 'medium',
                investmentHorizon: 'medium'
            }
        )

        comprehensiveResult.value = result
        ElMessage.success('综合分析完成！')
    } catch (error) {
        ElMessage.error(`综合分析失败: ${(error as Error).message}`)
    } finally {
        comprehensiveLoading.value = false
    }
}

// 清除结果方法
const clearAnalysisResult = () => {
    analysisResult.value = null
}

const clearRecommendationResult = () => {
    recommendationResult.value = null
}

const clearComprehensiveResult = () => {
    comprehensiveResult.value = null
}

// 辅助方法
const generateMockPriceData = (currentPrice: number): number[] => {
    const data = []
    let price = currentPrice * 0.95

    for (let i = 0; i < 20; i++) {
        price += (Math.random() - 0.5) * 0.5
        data.push(Math.max(0.1, price))
    }

    return data
}

const generateMockVolumeData = (): number[] => {
    const data = []
    for (let i = 0; i < 20; i++) {
        data.push(Math.floor(Math.random() * 2000000) + 500000)
    }
    return data
}

const generateMockTechnicalIndicators = () => {
    return {
        sma: {
            sma5: [12.1, 12.2, 12.3, 12.4, 12.5],
            sma10: [12.0, 12.1, 12.2, 12.3, 12.4],
            sma20: [11.9, 12.0, 12.1, 12.2, 12.3]
        },
        rsi: [45, 50, 55, 60, 65],
        macd: {
            macd: [0.1, 0.2, 0.3, 0.4, 0.5],
            signal: [0.05, 0.15, 0.25, 0.35, 0.45],
            histogram: [0.05, 0.05, 0.05, 0.05, 0.05]
        }
    }
}

const generateMockStockPool = () => {
    return [
        {
            symbol: '000001.SZ',
            name: '平安银行',
            currentPrice: 12.50,
            marketData: { pe: 6.8, pb: 0.9 }
        },
        {
            symbol: '000002.SZ',
            name: '万科A',
            currentPrice: 18.50,
            marketData: { pe: 8.2, pb: 1.2 }
        },
        {
            symbol: '600036.SH',
            name: '招商银行',
            currentPrice: 42.50,
            marketData: { pe: 7.5, pb: 1.1 }
        },
        {
            symbol: '600519.SH',
            name: '贵州茅台',
            currentPrice: 1680.00,
            marketData: { pe: 28.5, pb: 12.8 }
        }
    ]
}

// 标签类型辅助方法
const getRecommendationTagType = (recommendation: string) => {
    const typeMap: Record<string, string> = {
        strong_buy: 'success',
        buy: 'success',
        hold: 'warning',
        sell: 'danger',
        strong_sell: 'danger'
    }
    return typeMap[recommendation] || 'info'
}

const getRecommendationText = (recommendation: string) => {
    const textMap: Record<string, string> = {
        strong_buy: '强烈买入',
        buy: '买入',
        hold: '持有',
        sell: '卖出',
        strong_sell: '强烈卖出'
    }
    return textMap[recommendation] || recommendation
}

const getRiskTagType = (risk: string) => {
    const typeMap: Record<string, string> = {
        low: 'success',
        medium: 'warning',
        high: 'danger'
    }
    return typeMap[risk] || 'info'
}

const getRiskText = (risk: string) => {
    const textMap: Record<string, string> = {
        low: '低风险',
        medium: '中等风险',
        high: '高风险'
    }
    return textMap[risk] || risk
}

const getTrendTagType = (trend: string) => {
    const typeMap: Record<string, string> = {
        bullish: 'success',
        neutral: 'warning',
        bearish: 'danger'
    }
    return typeMap[trend] || 'info'
}

const getTrendText = (trend: string) => {
    const textMap: Record<string, string> = {
        bullish: '看涨',
        neutral: '中性',
        bearish: '看跌'
    }
    return textMap[trend] || trend
}

const getValuationText = (valuation: string) => {
    const textMap: Record<string, string> = {
        undervalued: '被低估',
        fairly_valued: '合理估值',
        overvalued: '被高估'
    }
    return textMap[valuation] || valuation
}

const getQualityText = (quality: string) => {
    const textMap: Record<string, string> = {
        high: '高质量',
        medium: '中等质量',
        low: '低质量'
    }
    return textMap[quality] || quality
}

const getGrowthText = (growth: string) => {
    const textMap: Record<string, string> = {
        high: '高成长',
        medium: '中等成长',
        low: '低成长'
    }
    return textMap[growth] || growth
}
</script>

<style scoped>
.demo-section {
    padding: 20px 0;
}

.demo-section h3 {
    color: #2c3e50;
    margin-bottom: 20px;
}

.form-help {
    margin-left: 10px;
    color: #909399;
    font-size: 12px;
}

.result-section {
    margin-top: 30px;
}

.result-section h4 {
    color: #2c3e50;
    margin-bottom: 20px;
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.analysis-content {
    margin-top: 20px;
}

.analysis-content h5 {
    color: #2c3e50;
    margin: 15px 0 10px 0;
    font-size: 14px;
}

.analysis-content p {
    color: #606266;
    line-height: 1.6;
    margin-bottom: 15px;
}

.analysis-content ul {
    color: #606266;
    padding-left: 20px;
}

.analysis-content li {
    margin-bottom: 5px;
}

.recommendations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

.recommendation-card {
    height: fit-content;
}

.rec-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
}

.reasoning {
    margin-top: 15px;
}

.reasoning h6 {
    color: #2c3e50;
    margin-bottom: 8px;
    font-size: 12px;
}

.reasoning ul {
    padding-left: 15px;
    margin: 0;
}

.reasoning li {
    font-size: 12px;
    color: #606266;
    margin-bottom: 3px;
}

:deep(.el-descriptions__label) {
    font-weight: 600;
}

:deep(.el-card__header) {
    padding: 15px 20px;
    background-color: #f8f9fa;
}
</style>