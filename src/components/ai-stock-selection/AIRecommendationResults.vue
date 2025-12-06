<template>
  <div class="ai-recommendation-results">
    <!-- 结果概览 -->
    <div class="results-header">
      <div class="header-info">
        <h3>AI 智能推荐结果</h3>
        <div class="metadata">
          <el-tag v-if="metadata.aiEnhanced" type="success" size="small">
            <el-icon><Robot /></el-icon>
            AI 增强分析
          </el-tag>
          <span class="timestamp">
            更新时间: {{ formatTime(metadata.timestamp) }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="refreshRecommendations" :loading="loading" size="small">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportResults" size="small">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 推荐统计 -->
    <div class="recommendation-stats" v-if="recommendations.length > 0">
      <div class="stat-item">
        <div class="stat-value">{{ recommendations.length }}</div>
        <div class="stat-label">推荐股票</div>
      </div>
      <div class="stat-item">
        <div class="stat-value