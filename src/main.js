import { createApp } from 'vue'
import { zIndexManager } from 'resizable-widget';
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './tailwind-output.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from './router'
import './entries.js'
import './user.js'
import './drv.js'
import './secret-elementary.js'
import './webmanifest.js'

globalThis.appid = 'com.mydiary.mydiaryapp'
globalThis.uuid = 'fddd697a-d914-4e6b-82f4-52bf7bab296b'

zIndexManager.config(3001, 3300);


const app = createApp(App)
app.use(ElementPlus, {
    locale: zhCn,
})
app.use(router)
app.mount('#app')
