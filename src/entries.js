import { sign_url } from "alioss-sign-v4-util";
import { decrypt_data, encrypt_blob, decrypt_blob } from "simple-data-crypto/builder";
import { u } from './user.js';
import { app_event } from './eventing.js';

let this_time_password = null;
let is_entries_encrypted_ = false;
export function is_entries_encrypted() { return is_entries_encrypted_; }

const dynamic_decrypt = async (data) => {
    const possible = (await u.getx('saved_passwords')) || [];
    if (this_time_password && !possible.includes(this_time_password)) possible.splice(0, 0, this_time_password); // 优先使用上次输入的密码
    for (const i of possible) try {
        const r = await (await decrypt_blob(data, i)).text();
        this_time_password = i;
        return r;
    } catch {}
    const p = await globalThis.appComponent.requestInputPasswd(undefined, true, '请输入索引文件的密码。');
    const d = await (await decrypt_blob(data, p.value)).text();
    if (p.save) {
        possible.push(p.value);
        u.setx('saved_passwords', possible);
    }
    this_time_password = p.value;
    return d;
};
export { dynamic_decrypt };
export function set_this_time_password(p) { this_time_password = p; }

function notify_entries_updated() {
    app_event.dispatch('entries_updated');
}


export async function load_entries_index(credits, purge = false) {
    if (!credits.loaded) await credits.prom;

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
            let data = await resp.blob();
            if ((await data.slice(0, 13).text()) === 'MyEncryption/') {
                data = await dynamic_decrypt(data);
                is_entries_encrypted_ = true;
            } else {
                data = await data.text();
                is_entries_encrypted_ = false;
            }
            // 检查返回的JSON数据是否符合指定格式
            data = JSON.parse(data);
            notify_entries_updated();
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
            notify_entries_updated();
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
export async function save_entries_index(credits, entry) {
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

    let body = JSON.stringify({
        version: 1,
        schema_version: 1,
        type: 'x-my-diary-app-entries-list',
        entries: latest_index,
    });
    if (this_time_password) {
        body = (await encrypt_blob(new Blob([body]), this_time_password));
    }

    const resp = await fetch(await signit(url, 'PUT', head), {
        method: 'PUT',
        headers: head,
        body,
    });
    if (resp.ok == false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
    notify_entries_updated();
    return true
}

export function signit(url, method = 'GET', headers = {}) {
    return sign_url(url, {
        access_key_id: globalThis.appComponent.get_credit().ak,
        access_key_secret: globalThis.appComponent.get_credit().sk,
        bucket: globalThis.appComponent.get_credit().bucket,
        region: globalThis.appComponent.get_credit().region,
        expires: 30,
        method,
        additionalHeadersList: headers
    })
}

/**
 * 获取secret信息
 * @param {string} id secret id
 */
export async function get_secret_info(id) {
    try {
        const url = new URL(`./secrets/data/${id}`, globalThis.appComponent.get_credit().oss_url);
        const signedUrl = await signit(url);
        const response = await fetch(signedUrl);
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}
/**
 * 获取用于加密操作的secret key
 * @param {string} id secret id
 * @param {string} password secret password
 * @param {null|string} [name] 密码的name
 * @param {null|object} [name_ref] 如果没有提供name,则会把正确的name设置到name_ref.name上
 * @returns {Promise<string|null>} key
 */
export async function get_secret_key(id, password, name = null, name_ref = null) {
    const secretInfo = await get_secret_info(id);
    if (!secretInfo) return null;
    
    try {
        if (name) {
            if (!secretInfo.primary_key || !secretInfo.primary_key[name]) return null;
            return await decrypt_data(secretInfo.primary_key[name], password);
        } else {
            if (!secretInfo.primary_key) return null;
            for (const key of Reflect.ownKeys(secretInfo.primary_key)) {
                try {
                    const data = await decrypt_data(secretInfo.primary_key[key], password);
                    if (name_ref) name_ref.name = key;
                    return data;
                } catch {}
            }
            return null;
        }
    } catch {
        return null;
    }
}
/**
 * 获取默认id
 * @returns {Promise<string|null>} id，可能没有
 */
export async function get_secret_default_id() {
    try {
        const url = new URL('./secrets/default', globalThis.appComponent.get_credit().oss_url);
        const signed = await signit(url);
        const resp = await fetch(signed);
        if (!resp.ok) throw 404;
        return await resp.text();
    } catch { return null; }
}

const cached_secret_keys = new Map();
/**
 * @param {string} id secret id
 * @param {boolean} dont_cache 是否不缓存
 */
export async function ask_secret_key_by_id(id, dont_cache = false) {
    // 先尝试从缓存中获取
    if (!dont_cache && cached_secret_keys.has(id)) return cached_secret_keys.get(id);
    const info = await get_secret_info(id);
    if (!info) {
        ElMessage.error('没有找到 Secret, 无法解密。');
        return false; // 终止执行，避免后续错误
    }
    // 尝试解密
    const saved = await u.getx("saved_secret_passwords");
    const secret_encryption_key = { value: null };
    secret_encryption_key.value = null;
    if (saved && saved[id]) try {
        // 使用指定密码解密
        secret_encryption_key.value = await get_secret_key(id, saved[id].passphrase, saved[id].name);
    } catch { }
    // 继续尝试解密
    if (!secret_encryption_key.value) try {
        // 弹出密码输入框
        const { value, save, option } = await globalThis.appComponent.requestInputPasswd(Reflect.ownKeys(info.primary_key));
        // 尝试解密
        const optRef = {};
        secret_encryption_key.value = await get_secret_key(id, value, option, optRef);
        if (!secret_encryption_key.value) throw 1;
        // 如果解密成功，并且用户选择了保存密码，保存密码
        if (save) {
            const saved = (await u.getx("saved_secret_passwords")) || {};
            saved[id] = { name: option || optRef.name, passphrase: value };
            await u.setx("saved_secret_passwords", saved);
        }
        // 不需要try catch，因为如果没有密码，会直接抛出错误
        if (!dont_cache) cached_secret_keys.set(id, secret_encryption_key.value);
    } catch {
        ElMessage.error('解密失败。密码不正确。');
        return false; // 终止执行，避免后续错误
    }
    return secret_encryption_key.value;
}
