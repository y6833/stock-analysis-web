<script setup lang="ts">
// RouterLink 和 RouterView 组件在模板中自动导入
</script>

<template>
  <header>
    <div class="logo-container">
      <img alt="Stock Analysis logo" class="logo" src="@/image/logo/logo.png" />
    </div>

    <div class="wrapper">
      <h1 class="app-title">股票分析系统</h1>

      <nav>
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/stock">股票分析</RouterLink>
        <RouterLink to="/portfolio">仓位管理</RouterLink>
        <RouterLink to="/tushare-test">API测试</RouterLink>
        <RouterLink to="/about">关于</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.app-title {
  font-size: 1.8rem;
  color: #42b983;
  margin: 0;
  font-weight: 600;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 2rem;
  background: transparent;
  padding: 10px;
  border-radius: 50%;
}

.logo {
  display: block;
  width: 180px; /* 放大logo */
  height: auto;
  object-fit: contain;
  background: transparent; /* 确保背景透明 */
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.1)); /* 添加轻微阴影增强显示效果 */
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo-container {
    margin: 0 2rem 0 0;
  }

  .logo {
    width: 200px; /* 在大屏幕上设置更大的尺寸 */
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
