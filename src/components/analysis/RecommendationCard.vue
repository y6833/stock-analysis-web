<template>
  <div class="recommendation-card" :class="getCardClass(stock)">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="stock-info">
        <h3 class="stock-name">{{ stock.name }}</h3>
        <span class="stock-symbol">{{ stock.symbol }}</span>
      </div>
      <div class="recommendation-badge" :style="{ backgroundColor: getRecommendationColor(stock.recommendation) }">
        {{ formatRecommendationLevel(stock.recommendation).text }}
      </div>
    </div>

    <!-- 价格信息 -->
    <div class="price-section">
      <div class="current-price">
        <span class="price-label">当前价格</span>
        <span class="price-value">¥{{ formatPrice(stock.currentPrice) }}</span>
      </div>
      <div class="target-price">
        <span class="price-label">目标价格</span>
        <span class="price-value target">¥{{ formatPrice(stock.targetPrice.target) }}</span>
        <span class="upside" :class="{ positive: stock.targetPrice.upside > 0 }">
          +{{ stock.targetPrice.upside }}%
        </span>
      </div>
    </div>

    <!-- 评分信息 -->
    <div class="scores-section">
      <div class="total-score">
        <div class="score-circle" :style="{ borderColor: getScoreColor(stock.totalScore) }">
          <span class="score-value">{{ stock.totalScore }}</span>
        </div>
        <span class="score-label">综合评分</span>
      </div>
      <div class="detailed-scores">
        <div class="score-item">
          <span class="score-name">技术面</span>
          <div class="score-bar">
            <div class="score-fill" :style="{ width: stock.technicalScore + '%', backgroundColor: getScoreColor(stock.technicalScore) }"></div>
          </div>
          <span class="score-num">{{ stock.technicalScore }}</span>
        </div>
        <div class="score-item">
          <span class="score-name">量价面</span>
          <div class="score-bar">
            <div class="score-fill" :style="{ width: stock.volumePriceScore + '%', backgroundColor: getScoreColor(stock.volumePriceScore) }"></div>
          </div>
          <span class="score-num">{{ stock.volumePriceScore }}</span>
        </div>
        <div class="score-item">
          <span class="score-name">趋势面</span>
          <div class="score-bar">
            <div class="score-fill" :style="{ width: stock.trendScore + '%', backgroundColor: getScoreColor(stock.trendScore) }"></div>
          </div>
          <span class="score-num">{{ stock.trendScore }}</span>
        </div>
      </div>
    </div>

    <!-- 推荐理由 -->
    <div class="reasons-section">
      <h4>推荐理由</h4>
      <ul class="reasons-list">
        <li v-for="(reason, index) in stock.reasons.slice(0, 3)" :key="index">
          {{ reason }}
        </li>
      </ul>
    </div>

    <!-- 交易建议 -->
    <div class="trading-advice">
      <div class="advice-row">
        <span class="advice-label">建议买入价</span>
        <span class="advice-value">
          ¥{{ formatPrice(stock.tradingAdvice.buyPriceRange.min) }} - 
          ¥{{ formatPrice(stock.tradingAdvice.buyPriceRange.max) }}
        </span>
      </div>
      <div class="advice-row">
        <span class="advice-label">止损价位</span>
        <span class="advice-value stop-loss">¥{{ formatPrice(stock.tradingAdvice.stopLoss) }}</span>
      </div>
      <div class="advice-row">
        <span class="advice-label">持有周期</span>
        <span class="advice-value">{{ stock.tradingAdvice.holdingPeriod }}</span>
      </div>
    </div>

    <!-- 风险标识 -->
    <div class="risk-indicator" :class="stock.riskLevel">
      <span class="risk-icon">{{ formatRiskLevel(stock.riskLevel).icon }}</span>
      <span class="risk-text">{{ formatRiskLevel(stock.riskLevel).text }}</span>
    </div>

    <!-- 卡片底部 -->
    <div class="card-footer">
      <span class="generated-time">
        生成时间: {{ formatTime(stock.generatedAt) }}
      </span>
      <el-button size="small" @click="$emit('analyze', stock.symbol)">
        详细分析
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { smartRecommendationService } from '@/services/smartRecommendationService'
import type { StockRecommendation } from '@/services/smartRecommendationService'

// Props
interface Props {
  stock: StockRecommendation
}

defineProps<Props>()

// Emits
defineEmits<{
  analyze: [symbol: string]
}>()

// 格式化方法
const formatPrice = smartRecommendationService.formatPrice
const formatRecommendationLevel = smartRecommendationService.formatRecommendationLevel
const formatRiskLevel = smartRecommendationService.formatRiskLevel
const getScoreColor = smartRecommendationService.getScoreColor

/**
 * 获取卡片样式类
 */
const getCardClass = (stock: StockRecommendation) => {
  return {
    'high-score': stock.totalScore >= 85,
    'medium-score': stock.totalScore >= 70 && stock.totalScore < 85,
    'low-score': stock.totalScore < 70,
    'expired': smartRecommendationService.isRecommendationExpired(stock.validUntil)
  }
}

/**
 * 获取推荐等级颜色
 */
const getRecommendationColor = (recommendation: string) => {
  return formatRecommendationLevel(recommendation).color
}

/**
 * 格式化时间
 */
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.recommendation-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #e2e8f0;
}

.recommendation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.recommendation-card.high-score {
  border-left-color: #f56565;
}

.recommendation-card.medium-score {
  border-left-color: #48bb78;
}

.recommendation-card.low-score {
  border-left-color: #ed8936;
}

.recommendation-card.expired {
  opacity: 0.7;
  background: #f7fafc;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stock-info {
  flex: 1;
}

.stock-name {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.stock-symbol {
  font-size: 14px;
  color: #718096;
  font-family: 'Courier New', monospace;
}

.recommendation-badge {
  padding: 4px 12px;
  border-radius: 20px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.price-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f7fafc;
  border-radius: 8px;
}

.price-label {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.price-value {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.price-value.target {
  color: #48bb78;
}

.upside {
  display: block;
  font-size: 12px;
  color: #718096;
  margin-top: 2px;
}

.upside.positive {
  color: #48bb78;
}

.scores-section {
  margin-bottom: 20px;
}

.total-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.score-circle {
  width: 60px;
  height: 60px;
  border: 3px solid;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-value {
  font-size: 18px;
  font-weight: 700;
}

.score-label {
  font-size: 14px;
  color: #718096;
}

.detailed-scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-name {
  width: 60px;
  font-size: 12px;
  color: #718096;
}

.score-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.score-num {
  width: 30px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
}

.reasons-section {
  margin-bottom: 20px;
}

.reasons-section h4 {
  font-size: 14px;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.reasons-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reasons-list li {
  font-size: 12px;
  color: #4a5568;
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
}

.reasons-list li::before {
  content: '•';
  color: #48bb78;
  position: absolute;
  left: 0;
}

.trading-advice {
  margin-bottom: 16px;
  padding: 12px;
  background: #edf2f7;
  border-radius: 6px;
}

.advice-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.advice-row:last-child {
  margin-bottom: 0;
}

.advice-label {
  font-size: 12px;
  color: #718096;
}

.advice-value {
  font-size: 12px;
  font-weight: 500;
  color: #2d3748;
}

.advice-value.stop-loss {
  color: #f56565;
}

.risk-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  margin-bottom: 16px;
  width: fit-content;
}

.risk-indicator.low {
  background: #c6f6d5;
  color: #22543d;
}

.risk-indicator.medium {
  background: #fed7aa;
  color: #9c4221;
}

.risk-indicator.high {
  background: #fed7d7;
  color: #9b2c2c;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.generated-time {
  font-size: 11px;
  color: #a0aec0;
}
</style>
