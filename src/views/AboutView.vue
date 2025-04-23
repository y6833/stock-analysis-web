<template>
  <div class="about">
    <div class="about-content">
      <h1>关于股票分析系统</h1>

      <section class="about-section">
        <h2>项目简介</h2>
        <p>
          股票分析系统是一个全面的股票市场分析工具，旨在帮助投资者做出更明智的投资决策。系统提供了股票走势分析、技术指标计算、交易信号提示以及仓位管理等功能。
        </p>
        <p>无论您是初学者还是资深交易者，本系统都能为您提供有价值的分析工具和数据支持。</p>
      </section>

      <section class="about-section">
        <h2>数据来源</h2>
        <p>
          本系统使用
          <a href="https://tushare.pro" target="_blank">Tushare Pro</a>
          作为数据源，提供实时和历史股票数据。Tushare
          是一个免费、开放的金融数据接口，提供了丰富的金融数据和分析工具。
        </p>
      </section>

      <section class="about-section">
        <h2>技术栈</h2>
        <p>本系统使用以下技术开发：</p>
        <ul class="tech-list">
          <li><strong>Vue 3</strong> - 前端框架</li>
          <li><strong>TypeScript</strong> - 类型安全的 JavaScript 超集</li>
          <li><strong>Vite</strong> - 现代前端构建工具</li>
          <li><strong>ECharts</strong> - 专业的数据可视化库</li>
          <li><strong>Pinia</strong> - Vue 的状态管理库</li>
          <li><strong>Axios</strong> - 基于 Promise 的 HTTP 客户端</li>
        </ul>
      </section>

      <section class="about-section">
        <h2>免责声明</h2>
        <p>
          本系统提供的数据和分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。用户应自行承担所有投资决策和风险。
        </p>
      </section>

      <section class="about-section">
        <h2>联系我们</h2>
        <p>如果您有任何问题或建议，请通过以下方式联系我们：</p>
        <p>邮箱：<a href="mailto:1819503703@qq.com">1819503703@qq.com</a></p>
      </section>

      <footer class="about-footer">
        <p>&copy; 2025 股票分析系统. 保留所有权利。</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.about {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.about-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 40px;
}

.about h1 {
  font-size: 2.5rem;
  color: #42b983;
  margin-bottom: 30px;
  text-align: center;
}

.about-section {
  margin-bottom: 40px;
}

.about-section h2 {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.about-section p {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #555;
  margin-bottom: 15px;
}

.tech-list {
  list-style-type: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.tech-list li {
  background-color: #f8f8f8;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.tech-list li:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.tech-list strong {
  color: #42b983;
}

a {
  color: #42b983;
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: #3aa876;
  text-decoration: underline;
}

.about-footer {
  margin-top: 60px;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

@media (max-width: 768px) {
  .about-content {
    padding: 20px;
  }

  .about h1 {
    font-size: 2rem;
  }

  .about-section h2 {
    font-size: 1.5rem;
  }

  .tech-list {
    grid-template-columns: 1fr;
  }
}
</style>
