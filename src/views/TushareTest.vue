<template>
  <div class="tushare-test">
    <h1>Tushare API 测试</h1>

    <el-card class="test-card">
      <div slot="header" style="cursor: pointer" @click="gotoTest">
        <span>连接测试</span>
      </div>
      <div class="card-content">
        <el-button type="primary" @click="testConnection" :loading="testLoading"
          >测试连接</el-button
        >
        <div v-if="testResult" class="result-box">
          <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
        </div>
      </div>
    </el-card>

    <el-card class="test-card">
      <div slot="header">
        <span>数据库操作</span>
      </div>
      <div class="card-content">
        <el-button type="primary" @click="updateStockBasic" :loading="updateLoading"
          >更新股票基本信息</el-button
        >
        <el-button type="success" @click="getStockBasic" :loading="getDataLoading"
          >获取股票基本信息</el-button
        >
        <div v-if="updateResult" class="result-box">
          <h3>更新结果</h3>
          <pre>{{ JSON.stringify(updateResult, null, 2) }}</pre>
        </div>
        <div v-if="stockData" class="result-box">
          <h3>股票基本信息 ({{ stockData.length }} 条记录)</h3>
          <el-table :data="stockData.slice(0, 10)" style="width: 100%" border stripe height="400">
            <el-table-column prop="ts_code" label="TS代码" width="120"></el-table-column>
            <el-table-column prop="symbol" label="股票代码" width="120"></el-table-column>
            <el-table-column prop="name" label="股票名称" width="150"></el-table-column>
            <el-table-column prop="area" label="地区" width="100"></el-table-column>
            <el-table-column prop="industry" label="行业" width="120"></el-table-column>
            <el-table-column prop="market" label="市场" width="120"></el-table-column>
            <el-table-column prop="list_date" label="上市日期" width="120"></el-table-column>
          </el-table>
          <div class="note">注: 仅显示前10条记录</div>
        </div>
      </div>
    </el-card>

    <el-card class="test-card">
      <div slot="header">
        <span>说明</span>
      </div>
      <div class="card-content">
        <h3>数据获取策略</h3>
        <p>1. 每次请求股票数据时，系统会先尝试从 Tushare API 获取最新数据</p>
        <p>2. 如果 API 请求成功，系统会自动将数据更新到数据库</p>
        <p>3. 如果 API 请求失败（如频率限制），系统会从数据库读取缓存的数据</p>
        <p>4. 您可以使用"更新股票基本信息"按钮主动触发数据更新</p>

        <h3>Tushare API 限制</h3>
        <p>免费账户有 API 访问频率限制，如 stock_basic 接口每分钟最多访问1次</p>
        <p>如需更高的访问频率，请考虑升级到付费账户</p>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'TushareTest',
  data() {
    return {
      testLoading: false,
      testResult: null,
      updateLoading: false,
      updateResult: null,
      getDataLoading: false,
      stockData: null,
      dataSource: null,
    }
  },
  methods: {
    gotoTest() {
      this.$router.push({ name: 'tushare-test2' })
    },
    async testConnection() {
      this.testLoading = true
      this.testResult = null

      try {
        const response = await axios.get('/api/tushare/test')
        this.testResult = response.data
      } catch (error) {
        this.testResult = {
          success: false,
          message: '请求失败',
          error: error.message,
        }
      } finally {
        this.testLoading = false
      }
    },

    async updateStockBasic() {
      this.updateLoading = true
      this.updateResult = null

      try {
        const response = await axios.post('/api/tushare/update-stock-basic')
        this.updateResult = response.data

        // 如果更新成功，刷新股票数据
        if (response.data.success) {
          this.$message.success('股票基本信息更新成功')
          await this.getStockBasic()
        } else {
          this.$message.error(`更新失败: ${response.data.message}`)
        }
      } catch (error) {
        this.updateResult = {
          success: false,
          message: '请求失败',
          error: error.message,
        }
        this.$message.error(`请求失败: ${error.message}`)
      } finally {
        this.updateLoading = false
      }
    },

    async getStockBasic() {
      this.getDataLoading = true
      this.stockData = null

      try {
        const response = await axios.get('/api/tushare/stock-basic')

        if (response.data.success) {
          this.stockData = response.data.data
          this.$message.success(
            `成功获取 ${this.stockData.length} 条股票基本信息 (来源: ${
              response.data.source === 'api' ? 'Tushare API' : '数据库'
            })`
          )
        } else {
          this.$message.error(`获取失败: ${response.data.message}`)
        }
      } catch (error) {
        this.$message.error(`请求失败: ${error.message}`)
      } finally {
        this.getDataLoading = false
      }
    },
  },
  mounted() {
    // 不再自动获取股票基本信息，避免频繁的API调用
    // this.getStockBasic()
    console.log('TushareTest页面已加载，请手动点击按钮获取数据')
  },
}
</script>

<style scoped>
.tushare-test {
  padding: 20px;
}

.test-card {
  margin-bottom: 20px;
}

.card-content {
  padding: 10px 0;
}

.result-box {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: auto;
  max-height: 500px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
}

.note {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
