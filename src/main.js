import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './tailwind-output.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from './router'
import { sign_url } from '../lib/util/sign.js'

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

globalThis.load_entries_index = async (credits, purge = false) => {
    if (!purge && load_entries_index.__cache__) {
        return load_entries_index.__cache__;
    }

    const url = new URL('./data/entries.json', credits.oss_url);
    const signed_url = await sign_url(url, {
        access_key_id: credits.ak,
        access_key_secret: credits.sk,
        bucket: credits.bucket,
        region: credits.region,
        expires: 30,
    });
    const resp = await fetch(signed_url);
    switch (resp.status) {
        case 200: {
            const data = await resp.json();
            // 检查返回的JSON数据是否符合指定格式
            if (!data || typeof data !== 'object' || data.version !== 1 || data.schema_version !== 1 || data.type !== 'x-my-diary-app-entries-list' || !Array.isArray(data.entries)) {
                return [];
            }
            // 解析数据
            load_entries_index.__cache__ = data.entries;
            return data.entries;
            break;
        }
        case 404: {
            // 创建文章列表
            const head = {
                'Content-Type': 'application/json',
            };
            const signed_url = await sign_url(url, {
                access_key_id: credits.ak,
                access_key_secret: credits.sk,
                bucket: credits.bucket,
                region: credits.region,
                expires: 30,
                method: 'PUT',
                additionalHeadersList: head,
            })
            const resp = await fetch(signed_url, {
                method: 'PUT',
                headers: head,
                body: JSON.stringify({
                    version: 1,
                    schema_version: 1,
                    type: 'x-my-diary-app-entries-list',
                    entries: [],
                }),
            });
            if (resp.ok == false) throw -1;
            return await new Promise((resolve, reject) => {
                queueMicrotask(() => load_entries_index(credits).then(resolve).catch(reject));
            });
            break;
        }
        default: {
            throw `HTTP Error ${resp.status}: ${await resp.text()}`;
        }
    }
}
globalThis.save_entries_index = async (credits, entry) => {
    // 自动注入元数据
    entry.modified = String(new Date().getTime());
    // 获取最新索引
    const latest_index = await load_entries_index(credits, true);
    // 添加到索引
    let is_edited = false, _i = 0;
    for (const i of latest_index) {
        ++_i;
        if (!i || i.id !== entry.id) continue;
        is_edited = true;
        latest_index.splice(_i - 1, 1, entry);
        break;
    }
    if (!is_edited) latest_index.push(entry);
    // 保存索引
    const head = {
        'Content-Type': 'application/json',
    };
    const url = new URL('./data/entries.json', credits.oss_url);
    const signed_url = await sign_url(url, {
        access_key_id: credits.ak,
        access_key_secret: credits.sk,
        bucket: credits.bucket,
        region: credits.region,
        expires: 30,
        method: 'PUT',
        additionalHeadersList: head,
    })
    const resp = await fetch(signed_url, {
        method: 'PUT',
        headers: head,
        body: JSON.stringify({
            version: 1,
            schema_version: 1,
            type: 'x-my-diary-app-entries-list',
            entries: latest_index,
        }, null, 2),
    });
    if (resp.ok == false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
    return true
}

const app = createApp(App)
app.use(ElementPlus, {
    locale: zhCn,
})
app.use(router)
app.mount('#app')
