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

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(membershipPlugin)

app.mount('#app')
