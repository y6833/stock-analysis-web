<template>
  <div class="ai-stock-selection-config">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <h3>AI 选股参数配置</h3>
          <el-button 
            type="primary" 
            :loading="saving"
            @click="savePreferences"
          >
            保存设置
          </el-button>
        </div>
      </template>

      <el-form
        ref="configForm"
        :model="preferences"
        :rules="rules"
        label-width="120px"
        class="config-form"
      >
        <!-- 基础投资偏好 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <h4>基础投资偏好</h4>
          </template>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="风险承受能力" prop="riskTolerance">
                <el-select 
                  v-model="preferences.riskTolerance" 
                  placeholder="请选择风险承受能力"
                  class="full-width"
                >
                  <el-option
                    v-for="option in riskToleranceOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  >
                    <span>{{ option.label }}</span>
                    <span class="option-desc">{{ option.description }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="投资期限" prop="investmentHorizon">
                <el-select 
                  v-model="preferences.investmentHorizon" 
                  placeholder="请选择投资期限"
                  class="full-width"
                >
                  <el-option
                    v-for="option in investmentHorizonOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  >
                    <span>{{ option.label }}</span>
                    <span class="option-desc">{{ option.description }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="预期收益率" prop="expectedReturn">
                <el-slider
                  v-model="expectedReturnPercent"
                  :min="3"
                  :max="30"
                  :step="0.5"
                  :format-tooltip="formatReturnTooltip"
                  show-input
                  input-size="small"
                  class="return-slider"
                />
                <div class="slider-desc">年化收益率期望</div>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="单股最大仓位" prop="maxPositionSize">
                <el-slider
                  v-model="maxPositionPercent"
                  :min="5"
                  :max="50"
                  :step="1"
                  :format-tooltip="formatPositionTooltip"
                  show-input
                  input-size="small"
                  class="position-slider"
                />
                <div class="slider-desc">单只股票最大占比</div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <!-- 投资风格偏好 -->
        <el-card class="section-card" shadow="never">
          <template #header>
            <h4>投资风格偏好</h4>
          </template>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="交易风格" prop="tradingStyle">
                <el-select 
                  v-model="preferences.tradingStyle" 
                  placeholder="请选择交易风格"
                 