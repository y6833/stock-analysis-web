<template>
  <div class="doji-pattern-alert-create-view">
    <div class="page-header">
      <h2>创建十字星形态提醒</h2>
      <div class="page-actions">
        <el-button @click="navigateBack">返回提醒管理</el-button>
      </div>
    </div>

    <el-card class="create-alert-card">
      <el-form 
        ref="alertFormRef" 
        :model="alertForm" 
        :rules="alertFormRules" 
        label-width="120px"
        label-position="top"
      >
        <el-form-item label="股票代码" prop="stockCode">
          <el-input 
            v-model="alertForm.stockCode" 
            placeholder="输入股票代码，如：600000" 
            clearable
          >
            <template #append>
              <el-button @click="openStockSelector">选择</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="股票名称" prop="stockName">
          <el-input 
            v-model="alertForm.stockName" 
            placeholder="股票名称将自动填充" 
            disabled
          ></el-input>
        </el-form-item>

        <el-form-item label="形态类型" prop="patternType">
          <el-select 
            v-model="alertForm.patternType" 
            placeholder="选择十字星形态类型" 
            style="width: 100%"
          >
            <el-option label="标准十字星" value="standard" />
            <el-option label="墓碑十字星" value="gravestone" />
            <el-option label="蜻蜓十字星" value="dragonfly" />
            <el-option label="长腿十字星" value="longLegged" />
          </el-select>
        </el-form-item>

        <el-form-item label="提醒条件" prop="condition">
          <el-select 
            v-model="alertForm.condition" 
            placeholder="选择提醒触发条件" 
            style="width: 100%"
          >
            <el-option label="形态出现" value="pattern_appears" />
            <el-option label="形态伴随成交量变化" value="pattern_with_volume" />
            <el-option label="形态接近支撑位" value="pattern_near_support" />
            <el-option label="形态接近阻力位" value="pattern_near_resistance" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select 
            v-model="alertForm.priority" 
            placeholder="选择提醒优先级" 
            style="width: 100%"
          >
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="l