import { sign_url } from "../lib/util/sign.js";
import { encrypt_file, decrypt_file } from "simple-web-encryption";

export const file_inmemory_encrypt = async (blob, password) => {
    const buffer = [];
    const file_reader = async (start, end) => new Uint8Array(await (blob.slice(start, end).arrayBuffer()));
    const file_writer = (data) => buffer.push(data);
    await encrypt_file(file_reader, file_writer, password);
    return (await new Blob(buffer).text());
}
export const file_inmemory_decrypt = async (blob, password) => {
    const buffer = [];
    const file_reader = async (start, end) => new Uint8Array(await (blob.slice(start, end).arrayBuffer()));
    const file_writer = (data) => buffer.push(data);
    await decrypt_file(file_reader, file_writer, password);
    return (await new Blob(buffer).text());
}

const dynamic_decrypt = async (data) => {
    const possible = (await u.get('saved_passwords')) || [];
    for (const i of possible) try {
        return JSON.parse(await file_inmemory_decrypt(data, i));
    } catch { }
    const p = await globalThis.appComponent.requestInputPasswd();
    const d = JSON.parse(await file_inmemory_decrypt(data, p.value));
    if (p.save) {
        possible.push(p.value);
        u.set('saved_passwords', possible);
    }
    return d;
};


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
            let data = await resp.blob();
            if ((await data.slice(0, 13).text()) === 'MyEncryption') {
                data = await dynamic_decrypt(data);
            } else {
                data = await data.text();
            }
            // 检查返回的JSON数据是否符合指定格式
            data = JSON.parse(data);
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

function signit(url, method = 'GET', headers = {}) {
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
    
}
/**
 * 获取用于加密操作的secret key
 * @param {string} id secret id
 * @param {string} password secret password
 */
export async function get_secret_key(id, password) {
    
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
