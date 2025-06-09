const css = new CSSStyleSheet();
css.replace(`
:host {
    display: flex;
    flex-direction: column;
}
a {
    color: blue;
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
* {
    box-sizing: border-box;
    word-break: break-all;
}
simple-data-crypto-file-preview {
    border: 1px solid rgb(204, 204, 204);
    max-height: 70vh;
    height: 50vh;
    overflow: auto;
}
simple-data-crypto-file-preview.video {
    max-width: 80vw;
    margin: auto;
    height: 50vh;
    overflow: revert;
}
simple-data-crypto-file-preview.image {
    display: flex;
    flex-direction: column;
}
`)

const fixImgPreviewCss = new CSSStyleSheet();
fixImgPreviewCss.replace(`
img { overflow: hidden }
img.scale { overflow: revert }
`);

const fixSelectedNoteCss = new CSSStyleSheet();
fixSelectedNoteCss.replace(`x-my-diary-app-file-reference.ProseMirror-selectednode {
    --snode: green;
}`);
document.adoptedStyleSheets.push(fixSelectedNoteCss);

import 'simple-data-crypto-file-preview';
import { ask_secret_key_by_id, signit } from './entries';

const scm = Object.create(null); // Security Context Manager
function getscm() {
    return scm.value;
}
export function setscm(value) {
    scm.value = value;
}
const conf = Object.create(null); // Config Manager
/**
 * @param {string} key 
 * @param {any} value 
 */
export function setconf(key, value) {
    conf[key] = value;
}

export class HTMLXMyDiaryAppFileReferenceElement extends HTMLElement {
    #shadow;
    #introduction;
    #info;
    #preview;
    constructor() {
        super();
        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#shadow.adoptedStyleSheets.push(css);
        this.#introduction = document.createElement('div');
        this.#preview = document.createElement('simple-data-crypto-file-preview');
        // 暂时不添加预览元素到DOM，直到用户点击时再加载
        this.#shadow.append(this.#introduction);

        this.#introduction.setAttribute('style', 'padding: 10px; border: 1px solid #ccc;');
        this.#info = document.createElement('span');
        this.#info.append("对象: 没有加载");
        this.#introduction.append(this.#info);
    }
    static get observedAttributes() {
        return ['data-id', 'data-type', 'data-name', 'data-size', 'data-secret-id', 'data-config'];
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal !== newVal) {
            this.#load();
        }
    }
    connectedCallback() {
        this.#load();
    }
    disconnectedCallback() {
        this.#preview.remove(); // 需要手动remove才能确保子组件的清理函数被调用
    }
    #loaded = false;
    #load_designmode() {
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        const name = this.getAttribute('data-name');
        const size = this.getAttribute('data-size');

        const app = document.createElement('div');
        app.id = 'app';
        app.innerHTML = `
        <div id=object_name></div>
        <hr hidden>
        <div id=config hidden>
            <div id=config_title>对象设置</div>
            <div class=cfg-item>
                <input type=checkbox id=autoload>
                <label for=autoload>自动加载</label>
            </div>
        </div>
        
        <style>
        .cfg-item {
            display: flex;
            align-items: center;
        }
        .cfg-item input[type=checkbox] {
            margin-right: 0.5em;
        }
        .cfg-item + .cfg-item {
            margin-top: 0.5em;
        }
        #object_name {
            color: var(--snode, revert);
        }
        :host {
            --snode: revert;
        }
        </style>`;
        this.#info.replaceWith(app);

        const s = e => (['Enter', ' '].includes(e.key)) && (e.stopPropagation() + e.preventDefault());
        app.addEventListener('keydown', s);
        app.addEventListener('keyup', s);
        app.addEventListener('input', s);

        const object_name = app.querySelector('#object_name');
        const autoload = app.querySelector('#autoload');

        const config = new Proxy((() => {
            const config = this.getAttribute('data-config');
            if (!config) return {};
            try {
                return JSON.parse(config);
            } catch {
                return {};
            }
        })(), {
            set: (target, p, value, receiver) => {
                const r = Reflect.set(target, p, value, receiver);
                if (r) {
                    this.setAttribute('data-config', JSON.stringify(target));
                }
                return r;
            }
        });

        object_name.innerText = `对象: ${name} (ID: ${id}${size ? ', 大小: ' + size : ''})`;
        autoload.checked = !!config.autoload;
        autoload.addEventListener('change', () => {
            config.autoload = !!autoload.checked;
        });
    }
    #load() {
        if (this.#loaded) return;
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        const name = this.getAttribute('data-name');
        const size = this.getAttribute('data-size');
        if (!id || !type || !name) return;

        if (conf.design) return this.#load_designmode();

        this.#loaded = true;
        this.#info.innerText = `对象: ${name} (ID: ${id}${size ? ', 大小: '+ size : ''})`;
        const load_btn = document.createElement('a');
        load_btn.href = 'javascript:void(0)';
        load_btn.innerText = '加载';
        load_btn.style.marginLeft = '0.5em';
        load_btn.addEventListener('click', async () => {
            load_btn.innerText = '加载中...';
            try {
                await this.#fetchData();
                this.#introduction.remove();
            }
            catch (e) {
                load_btn.innerText = '加载失败: ' + e;
            }
        });
        this.#info.after(load_btn);

        const config = (() => {
            const config = this.getAttribute('data-config');
            if (!config) return {};
            try { return JSON.parse(config) } catch { return {} }
        })();
        if (config.autoload) {
            requestAnimationFrame(() => load_btn.click());
        }
    }

    async #fetchData() {
        // 实际业务逻辑... 
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        const name = this.getAttribute('data-name');
        if (!id || !type || !name) throw new Error('缺少必要参数（这个错误是意料之外的！）'); // 实际上除非被非法篡改，这个错误是不会出现的
        const userCredentials = getscm();
        if (!userCredentials) throw '未登录';
        const { key, credits } = userCredentials;
        if (!key || !credits) throw '未登录';
        const target = new URL(`./attachments/${id}`, credits.oss_url);
        const user_key = (this.getAttribute('data-secret-id')) ?
            (await ask_secret_key_by_id(this.getAttribute('data-secret-id'))) :
            key;
        const file_size = await (async () => {
            const signed = await signit(target, 'HEAD');
            const resp = await fetch(signed, { method: 'HEAD' });
            if (!resp.ok) throw `HTTP Error: ${resp.status} ${resp.statusText}`;
            const size = resp.headers.get('Content-Length');
            if (!size) throw '无法获取文件大小。';
            const i = parseInt(size);
            if (isNaN(i)) throw '文件大小不是一个有效的数字。';
            return i;
        })();
        if (file_size > 100 * 1024 * 1024 && (!type.startsWith('video'))) {
            throw '文件过大，无法预览。';
        }
        await this.#preview.load(async (/** @type {number} */ start, /** @type {number} */ end) => {
            const resp = await fetch(await signit(target), {
                headers: { Range: `bytes=${start}-${end - 1}` }
            });
            if (!resp.ok) throw new Error(`Network Error: HTTP ${resp.status} : ${resp.statusText}`);
            return new Uint8Array(await resp.arrayBuffer());
        }, user_key, file_size, type, name);
        this.#shadow.append(this.#preview); // 添加预览元素到DOM
        this.#preview.title = `${name} (${id})`
        if (type.startsWith('video')) {
            this.#preview.classList.add('video');
        }
        if (type.startsWith('image')) {
            this.#preview.classList.add('image');
            // 需要处理图片的大小/比例问题，我们需要穿透多层shadowDOM
            requestAnimationFrame(() => {
                const img_container = this.#preview.shadowRoot?.querySelector('common-file-preview')?.shadowRoot;
                if (!img_container) return;
                img_container.adoptedStyleSheets.push(fixImgPreviewCss);
            })
        }
    }
}
customElements.define('x-my-diary-app-file-reference', HTMLXMyDiaryAppFileReferenceElement);

