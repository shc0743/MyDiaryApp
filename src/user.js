import { decrypt_data, encrypt_data, get_random_bytes, hexlify } from 'simple-data-crypto/builder';
import { db } from './userdata.js';

let user_pin = null, pin_rejected = false;
const u = {
    get(key) { return db.get('config', key) },
    set(key, value) { return db.put('config', value, key) },
    async delete(keys) {
        if (arguments.length < 1) throw new TypeError('key(s) is required');
        if (arguments.length > 1) {
            for (const i of arguments) this.delete(i);
            return true;
        }
        if (typeof keys === 'string') return await db.delete('config', keys);
        else if ((!keys) || (!Array.isArray(keys) && typeof keys[Symbol.iterator] !== 'function'))
            throw new TypeError('Bad argument');
        for (const i of keys) this.delete(i);
        return true;
    },
    async getx(key) {
        const data = await u.get(key);
        if (!await IsPINSet()) return data;
        if (pin_rejected) throw new Error('Access denied.');
        if (!user_pin) if (!await askPIN()) return undefined;
        if (!data) return data; // 假值，说明此属性本就不存在
        try {
            return JSON.parse(await decrypt_data(data, user_pin));
        } catch { return undefined };
    },
    async setx(key, value) {
        if (!await IsPINSet()) return await u.set(key, value);
        if (pin_rejected) throw new Error('Access denied.');
        if (!user_pin) if (!await askPIN()) throw new Error('Cancelled');
        return await u.set(key, await encrypt_data(JSON.stringify(value), user_pin, undefined, 65536));
    },
};

export { u };
    
export const PINProtected = [
    'saved_passwords', // 包含密码
    'saved_secret_passwords', // 包含 secret 密码
    'LogonData', // 包含OSS的AK/SK
];

export async function IsPINSet() {
    return !!(await u.get('pin'));
}
export async function SetPIN(pin) {
    if (!pin) throw new TypeError('pin is required');
    if (typeof pin !== 'string') throw new TypeError('pin must be a string');
    if (await IsPINSet()) throw new Error('PIN is already set');
    user_pin = hexlify(get_random_bytes(128));
    await u.set('pin', await encrypt_data(user_pin, pin)); // 默认的 262144 已经足够安全（scrypt）
    for (const i of PINProtected) {
        await u.setx(i, await u.get(i));
    }
}
export async function askPIN() {
    if (user_pin) return true; // 已经验证过了
    try {
        let user = null;
        try {
            const { value } = await globalThis.appComponent.requestInputPasswd([], false, '请输入 PIN。');
            user = value;
        } catch {
            pin_rejected = true;
            return false;
        }
        const pin = await u.get('pin');
        if (!pin) throw new Error('PIN is not set');
        user_pin = await decrypt_data(pin, user);
        return true;
    }
    catch { return false; }
}
export async function ClearPIN() {
    if (!await IsPINSet()) throw new Error('PIN is not set');
    if (!user_pin) if (!await askPIN()) throw new Error('Access denied.');
    for (const i of PINProtected) {
        const original = await u.getx(i);
        if (original) {
            await u.set(i, original);
        }
    }
    await u.delete('pin');
    user_pin = null;
}
export async function ChangePIN(new_pin) {
    if (!user_pin) if (!await askPIN()) throw new Error('Access denied.');
    const new_pin_encrypted = await encrypt_data(user_pin, new_pin);
    await u.set('pin', new_pin_encrypted);
}
