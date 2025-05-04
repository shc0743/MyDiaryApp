import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './tailwind-output.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from './router'
import './entries.js'
import './userdata.js'

globalThis.u = {
    get(key) { return userdata.get('config', key) },
    set(key, value) { return userdata.put('config', value, key) },
    async delete(keys) {
        if (arguments.length < 1) throw new TypeError('key(s) is required');
        if (arguments.length > 1) {
            for (const i of arguments) this.delete(i);
            return true;
        }
        if (typeof keys === 'string') return await userdata.delete('config', keys);
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
