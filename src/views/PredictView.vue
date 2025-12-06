<template>
  <div class="predict-container">
    <el-card>
      <h2>Kronos 股票预测</h2>
      <el-form :inline="true" @submit.prevent="onPredict">
        <el-form-item label="股票代码">
          <el-input v-model="symbol" placeholder="如 600977" style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onPredict">预测</el-button>
        </el-form-item>
      </el-form>
      <div v-if="error" class="error">{{ error }}</div>
      <el-table v-if="resultRows.length" :data="resultRows" style="margin-top: 20px">
        <el-table-column v-for="col in columns" :key="col" :prop="col" :label="col" />
      </el-table>
      <div v-else-if="resultChecked">无预测结果</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const symbol = ref('')
const error = ref('')
const result = ref({})
const resultRows = ref([])
const columns = ref([])
const resultChecked = ref(false)

function onPredict() {
  error.value = ''
  result.value = {}
  resultRows.value = []
  columns.value = []
  resultChecked.value = false
  if (!symbol.value) {
    error.value = '请输入股票代码'
    return
  }
  fetch(`/api/predict?symbol=${symbol.value}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        error.value = data.error
        resultChecked.value = true
        return
      }
      const prediction = data.prediction || data
      if (!prediction || Object.keys(prediction).length === 0) {
        resultChecked.value = true
        return
      }
      columns.value = Object.keys(prediction)
      // 转换为表格行
      const len = prediction[columns.value[0]].length || Object.values(prediction[columns.value[0]]).length
      for (let i = 0; i < len; i++) {
        const row = {}
        columns.value.forEach(k => {
          row[k] = Array.isArray(prediction[k]) ? prediction[k][i] : Object.values(prediction[k])[i]
        })
        resultRows.value.push(row)
      }
      resultChecked.value = true
    })
    .catch(err => {
      error.value = '请求失败：' + err
      resultChecked.value = true
    })
}
</script>

<style scoped>
.predict-container {
  max-width: 600px;
  margin: 40px auto;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>
