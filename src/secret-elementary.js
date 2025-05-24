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

import 'simple-data-crypto-file-preview';
import { Wrappers } from 'simple-data-crypto/builder';
import { signit } from './entries';

const scm = Object.create(null); // Security Context Manager
function getscm() {
    return scm.value;
}
export function setscm(value) {
    scm.value = value;
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
        return ['data-id', 'data-type']; // 监听属性变化
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
    #load() {
        if (this.#loaded) return;
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        const name = this.getAttribute('data-name');
        if (!id || !type || !name) return;

        this.#loaded = true;
        this.#info.innerText = `对象: ${name} (ID: ${id})`;
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
        await this.#preview.load(await Wrappers.createReaderForRemoteObject(await signit(target)), key, file_size, type, name);
        this.#shadow.append(this.#preview); // 添加预览元素到DOM
        this.#preview.title = `${name} (${id})`
        if (type.startsWith('video')) {
            this.#preview.classList.add('video');
        }
        if (type.startsWith('image')) {
            this.#preview.classList.add('image');
            // 需要处理图片的大小/比例问题，我们需要穿透多层shadowDOM；因此，做好准备！
            requestAnimationFrame(() => {
                const img_container = this.#preview.shadowRoot?.querySelector('common-file-preview')?.shadowRoot;
                if (!img_container) return;
                img_container.adoptedStyleSheets.push(fixImgPreviewCss);
            })
        }
    }
}
customElements.define('x-my-diary-app-file-reference', HTMLXMyDiaryAppFileReferenceElement);

