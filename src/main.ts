import './assets/main.css'
import './assets/theme.css'
import './assets/payment.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import membershipPlugin from './plugins/membershipPlugin'
import dojiPatternAlertPlugin from './plugins/dojiPatternAlertPlugin'

// 导入服务
import { StockDataService } from './services/StockDataService'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(membershipPlugin)

// 获取股票数据服务实例
const stockDataService = new StockDataService()

// 注册十字星形态提醒插件
app.use(dojiPatternAlertPlugin, {
    stockDataService
})

app.mount('#app')
