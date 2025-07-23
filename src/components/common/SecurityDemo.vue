<template>
  <div class="security-demo">
    <h3>安全功能演示</h3>
    
    <div class="demo-section">
      <h4>XSS防护</h4>
      <div class="input-group">
        <label>输入HTML内容：</label>
        <textarea v-model="htmlInput" placeholder="输入HTML内容，包括潜在的XSS攻击"></textarea>
      </div>
      
      <div class="output-group">
        <div class="output-item">
          <h5>原始输出（不安全）：</h5>
          <div class="output-box" v-html="htmlInput"></div>
        </div>
        
        <div class="output-item">
          <h5>使用v-sanitize指令（安全）：</h5>
          <div class="output-box" v-sanitize="htmlInput"></div>
        </div>
        
        <div class="output-item">
          <h5>使用v-safe-html指令（安全+检测）：</h5>
          <div class="output-box" v-safe-html="htmlInput"></div>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h4>敏感数据掩码</h4>
      <div class="input-group">
        <label>输入敏感数据：</label>
        <input v-model="sensitiveData" placeholder="输入敏感数据，如电话号码、邮箱等">
      </div>
      
      <div class="output-group">
        <div class="output-item">
          <h5>电话号码掩码：</h5>
          <div class="output-box" v-mask-data:phone="sensitiveData"></div>
        </div>
        
        <div class="output-item">
          <h5>邮箱掩码：</h5>
          <div class="output-box" v-mask-data:email="sensitiveData"></div>
        </div>
        
        <div class="output-item">
          <h5>身份证号掩码：</h5>
          <div class="output-box" v-mask-data:idcard="sensitiveData"></div>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h4>速率限制</h4>
      <p>点击下面的按钮，每分钟最多点击3次</p>
      <button 
        v-rate-limit="{ key: 'demo-button', limit: 3, window: 60000 }" 
        @click="handleButtonClick"
        class="rate-limit-button"
      >
        测试按钮
      </button>
      <p v-if="clickMessage" class="click-message">{{ clickMessage }}</p>
    </div>
    
    <div class="demo-section">
      <h4>CSRF保护</h4>
      <p>当前CSRF令牌：{{ csrfToken || '未获取' }}</p>
      <button @click="refreshCsrfToken" class="csrf-button">刷新CSRF令牌</button>
      <button @click="testCsrfProtection" class="csrf-button">测试CSRF保护</button>
      <p v-if="csrfMessage" class="csrf-message">{{ csrfMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSecurity } from '@/composables/useSecurity';
import { securityService } from '@/services/securityService';
import axios from 'axios';

// 使用安全组合式API
const { getCsrfToken } = useSecurity();

// 状态
const htmlInput = ref('<p>这是正常HTML</p><script>alert("XSS攻击")</script><img src="x" onerror="alert(\'XSS\')">');
const sensitiveData = ref('13812345678');
const clickMessage = ref('');
const csrfToken = ref('');
const csrfMessage = ref('');

// 按钮点击处理
const handleButtonClick = () => {
  clickMessage.value = `按钮点击成功：${new Date().toLocaleTimeString()}`;
};

// 刷新CSRF令牌
const refreshCsrfToken = async () => {
  try {
    await securityService.refreshCsrfToken();
    csrfToken.value = securityService.getCsrfToken() || '';
    csrfMessage.value = 'CSRF令牌刷新成功';
  } catch (error) {
    csrfMessage.value = `CSRF令牌刷新失败: ${error instanceof Error ? error.message : String(error)}`;
  }
};

// 测试CSRF保护
const testCsrfProtection = async () => {
  try {
    // 不带CSRF令牌的请求
    await axios.post('/api/v1/test-csrf', { data: 'test' });
    csrfMessage.value = '请求成功（不应该发生，因为应该被CSRF保护拦截）';
  } catch (error: any) {
    if (error.response && error.response.status === 403) {
      csrfMessage.value = 'CSRF保护正常工作：请求被拦截';
    } else {
      csrfMessage.value = `请求失败: ${error.message || String(error)}`;
    }
  }
};

// 组件挂载时获取CSRF令牌
onMounted(async () => {
  csrfToken.value = getCsrfToken() || '';
  if (!csrfToken.value) {
    await refreshCsrfToken();
  }
});
</script>

<style scoped>
.security-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group textarea,
.input-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-group textarea {
  height: 80px;
}

.output-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.output-item {
  flex: 1;
  min-width: 200px;
}

.output-box {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  min-height: 60px;
  overflow-wrap: break-word;
}

.rate-limit-button,
.csrf-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.rate-limit-button:hover,
.csrf-button:hover {
  background-color: #45a049;
}

.click-message,
.csrf-message {
  margin-top: 10px;
  padding: 8px;
  border-radius: 4px;
}

.click-message {
  background-color: #e7f3fe;
  border-left: 6px solid #2196F3;
}

.csrf-message {
  background-color: #ddffdd;
  border-left: 6px solid #4CAF50;
}
</style>