import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './tailwind-output.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from './router'
import './entries.js'

const PROJECT_IDENTIFIER = 'Project:MyDiaryApp;Type:User;Key:';
globalThis.u = {
    get(key) { return localStorage.getItem(PROJECT_IDENTIFIER + key) },
    set(key, value) { return localStorage.setItem(PROJECT_IDENTIFIER + key, value) },
    delete(keys) {
        if (arguments.length < 1) throw new TypeError('key(s) is required');
        if (arguments.length > 1) {
            for (const i of arguments) this.delete(i);
            return true;
        }
        if (typeof keys === 'string') return localStorage.removeItem(PROJECT_IDENTIFIER + keys);
        else if ((!keys) || (!Array.isArray(keys) && typeof keys[Symbol.iterator] !== 'function'))
            throw new TypeError('Bad argument');
        for (const i of keys) this.delete(i);
        return true;
    },
}

import { registerResizableWidget } from '../lib/util/BindMove.js';
registerResizableWidget();

const app = createApp(App)
app.use(ElementPlus, {
    locale: zhCn,
})
app.use(router)
app.mount('#app')
