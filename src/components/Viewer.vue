<template>
    <div class="viewer-container" @keydown.ctrl.s.stop.prevent="save_article">
        <div class="article-title bg-auto">
            {{ article.title }}
        </div>

        <div class="art-info">
            <div class="info-item">
                <el-icon>
                    <User />
                </el-icon>
                <span>作者:</span>
                <span>{{ article.author }}</span>
            </div>

            <div class="info-item">
                <el-icon>
                    <Clock />
                </el-icon>
                <span>创建时间:</span>
                <span>{{ new Date(+article.created).toLocaleString() }}</span>
            </div>

            <div class="info-item">
                <el-icon>
                    <CollectionTag />
                </el-icon>
                <span>标签:</span>
                <el-tag v-if="article.tags.length" v-for="tag in article.tags" :key="tag" size="small"
                    style="margin-right: 0.5em;">{{ tag }}</el-tag>
            </div>

            <div class="info-item">
                <el-icon>
                    <Folder />
                </el-icon>
                <span>分类:</span>
                <el-tag v-if="article.tags.length" v-for="tag in article.tags" :key="tag" size="small" type="info"
                    style="margin-right: 0.5em;">{{ tag }}</el-tag>
            </div>
        </div>

        <div class="sep-line" style="margin-top: 0.5em;"></div>

        <div class="t-el" v-html="safe_html" @click="filterLinks"></div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, CollectionTag, Folder, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import purifier from 'dompurify';

import { setscm } from '../secret-elementary.js';

const safe_html = computed(() => {
    return purifier.sanitize(
        article.value.content, {
            ADD_TAGS: ['x-my-diary-app-file-reference'],
            ADD_ATTR: ['style', 'src', 'data-id', 'data-type', 'data-name'],
        },
    )
});

const router = useRouter()
const emit = defineEmits(['update-title'])

const props = defineProps({
    articleId: { 
        type: String,
        default: '',
    },
    credits: {
        type: Object,
        required: true
    },
})
// 初始化文章数据
const initArticle = () => ({
    title: '',
    content: '',
    author: '',
    tags: [],
    categories: [],
    tmpArticleId: '',
});
const OLEArticle = ref({});

const article = ref(initArticle())
const secret_id = ref('');
const secret_id_buffer = ref('');
const secret_encryption_key = ref('');

async function setupSecretId() {
    console.trace('setupSecretId')
}

async function getSecretEncKey() {
    const info = await get_secret_info(secret_id.value);
    if (!info) {
        ElMessage.error('没有找到 Secret, 无法解密。');
        return; // 终止执行，避免后续错误
    }
    // 尝试解密
    const saved = await u.get("saved_secret_passwords");
    secret_encryption_key.value = null;
    if (saved && saved[secret_id.value]) try {
        // 使用指定密码解密
        secret_encryption_key.value = await get_secret_key(secret_id.value, saved[secret_id.value].passphrase, saved[secret_id.value].name);
    } catch { }
    // 继续尝试解密
    if (!secret_encryption_key.value) try {
        // 弹出密码输入框
        const { value, save, option } = await globalThis.appComponent.requestInputPasswd(Reflect.ownKeys(info.primary_key));
        // 尝试解密
        const optRef = {};
        secret_encryption_key.value = await get_secret_key(secret_id.value, value, option, optRef);
        if (!secret_encryption_key.value) throw 1;
        // 如果解密成功，并且用户选择了保存密码，保存密码
        if (save) {
            const saved = (await u.get("saved_secret_passwords")) || {};
            saved[secret_id.value] = { name: option || optRef.name, passphrase: value };
            await u.set("saved_secret_passwords", saved);
        }
        // 不需要try catch，因为如果没有密码，会直接抛出错误
    } catch {
        ElMessage.error('解密失败。密码不正确。');
        return; // 终止执行，避免后续错误
    }
    return true;
}

// 文章相关数据
const fontList = ref([]); // 字体列表
const attachments = ref([]); // 附件列表
// 文章元数据是否更改
const changes_list = ref({
    secret_id: false,
    fontList: false,
    attachmentsList: false,
});

// 加载文章数据
const load_article = async (id) => {
    OLEArticle.value = {};
    fontList.value.length = 0;
    attachments.value.length = 0;
    for (const i in changes_list.value) changes_list.value[i] = false;
    if (id === 'new' || id === '') {
        article.value = initArticle();
        await setupSecretId();
        return;
    }
    try {
        // const data = await load_entries_index(props.credits);
        // const article_data = data.find(item => item.id === id);
        article.value = Object.assign(initArticle(), {
            content: '<p>正在加载文章，请稍候...</p>',
            title: "正在加载...",
        });
        let url;
        // 获取文件元数据
        url = new URL(`./entries/${id}`, props.credits.oss_url);
        const resp_meta = await fetch(await signit(url));
        if (404 === resp_meta.status) {
            ElMessageBox.alert('文章不存在。', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
            return;            
        }
        if (!resp_meta.ok) throw `HTTP Error ${resp_meta.status}: ${resp_meta.statusText}`;
        const meta = await resp_meta.json();
        // 处理加密相关内容
        if (meta.version !== 1 || meta.schema_version !== 2 || meta.appid !== appid || meta.uuid !== uuid) {
            ElMessage.error('文章数据异常。是否遭到了意外的外部更改？');
            history.back();
            return; // 终止执行，避免后续错误
        }
        // 获取secret_id
        secret_id.value = meta.content.secret_id;
        secret_id_buffer.value = secret_id.value;
        // 获取加密密钥
        if (!await getSecretEncKey()) {
            history.back();
            return;
        }
        // 获取元数据
        const article_data = JSON.parse(await decrypt_data(meta.metadata, secret_encryption_key.value))
        if (!article_data) {
            requestIdleCallback(() => {
                ElMessageBox.alert('文章不存在。', '错误', {
                    confirmButtonText: '返回上一页',
                    type: 'error',
                }).then(() => { }).catch(() => { }).finally(() => history.back())
            }); return;
        }
        article.value = Object.assign(article_data, {
            content: '<p>正在加载文章内容，请稍候...</p>',
        });
        // 获取文件内容
        url = new URL(`./content/${id}`, props.credits.oss_url);
        const resp = await fetch(await signit(url));
        if (404 === resp.status) {
            ElMessageBox.alert('文章数据异常。是否遭到了意外的外部更改？', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
            return;
        }
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
        OLEArticle.value = JSON.parse(JSON.stringify(article.value));
        const blob = await resp.blob();
        // 解密文件内容
        const decrypted = await (await decrypt_blob(blob, secret_encryption_key.value)).text()
        // 加载文章内容
        article.value.content = decrypted;
        // 需要把密码同步到<x-my-diary-app-file-reference>组件
        setscm({
            key: secret_encryption_key.value,
            credits: props.credits,
        });
    }
    catch (error) {
        ElMessageBox.alert('加载文章失败，请稍后重试。' + error?.stack || error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}

onMounted(async () => {
    await props.credits.prom; // wait for credits to be setup
    if (props.articleId) load_article(props.articleId);
    else {
        ElMessage.error("404 - 文章不存在。")
        router.replace('/') // 重定向到首页
    }
})

import { watch } from 'vue'
import { get_secret_info, get_secret_key, signit } from '../entries'
import { decrypt_blob, decrypt_data } from 'simple-data-crypto/builder'

watch(() => props.articleId, async () => {
    if (!(props.articleId === article.value.id)) 
        await load_article(props.articleId);
})

// =======================
// Viewer.vue 新增的功能
// =======================

/**
 * @param event {Event} event
 */
const filterLinks = (event) => {
    // 判断是不是点击了链接
    const composedPath = event.composedPath();
    // 遍历 composedPath 数组，查找是否有 a 标签
    for (const element of composedPath) {
        if (element.tagName === 'A') {
            // 如果有，就阻止默认行为
            event.preventDefault();
            // 调用 tryOpenLink 方法
            tryOpenLink(event);
            return false;
        }
    }
}

const tryOpenLink = function (event) {
    // ctrl + click
    let target = event.target
    if (target.tagName !== 'A') {
        target = target.parentElement
        if (target.tagName !== 'A') {
            target = target.parentElement
            if (target.tagName !== 'A') return;
        }
    }
    const href = target.href
    if (href && href.startsWith('http')) {
        window.open(href, '_blank').focus();
    } else {
        ElMessage.error("不支持的链接: " + href);
    }
};
</script>

<style scoped>
.viewer-container {
    display: flex;
    flex-direction: column;
    overflow: auto;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}
.viewer-container > ::v-deep(.t-el) {
    flex: 1;
    padding: 10px 0;
}
.viewer-container > ::v-deep(.t-el) > div {
    outline: 0 !important;
    height: 100%;
}
.article-title {
    display: flex;
    align-items: center;
    border-bottom: 1px solid gray;
    padding: 10px;
    font-size: 1.5em;
    font-family: NSimsun, Simsun, "宋体", sans-serif;
    word-break: break-all;
    white-space: normal;
}
.bg-auto {
    background: var(--bg);
    color: var(--text-color);
    --bg: #ffffff;
    --text-color: #000000;
}
.sep-line {
    height: 1px;
    border-bottom: 1px solid #ccc;
}
@media (prefers-color-scheme: dark) {
    .bg-auto {
        --bg: #222222;
        --text-color: #ffffff;
    }
    .article-title {
        border-bottom: 1px solid #111;
    }
   .sep-line {
        border-bottom: 1px solid #444;
    }
}
.art-info {
    display: flex;
    flex-direction: column;
    word-break: break-all;
}
.art-info>.info-item {
    display: flex;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
}
.art-info>.info-item>span {
    white-space: nowrap;
    margin: 0 0.5em 0 0.25em;
}
.art-info>.info-item  {
    margin-top: 0.5em;
}
</style>

<style>
.app-container > .content:has(.viewer-container) {
    overflow: hidden;
}
</style>