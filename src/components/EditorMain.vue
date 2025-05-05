<template>
    <div class="editor-container" @keydown.ctrl.s.stop.prevent="save_article">
        <div class="article-title bg-auto">
            <input type="text" v-model="article.title" placeholder="我的文章" class="bg-auto">
            <el-button @click="save_article" style="margin-left: 0.5em;">救</el-button>
        </div>

        <div class="art-info">
            <div class="info-item">
                <el-icon>
                    <User />
                </el-icon>
                <span>作者:</span>
                <el-input placeholder="请输入作者" v-model="article.author" clearable />
            </div>

            <div class="info-item">
                <el-icon>
                    <Clock />
                </el-icon>
                <span>创建时间:</span>
                <ElDatePicker v-model="artCreationTime" type="datetime" style="width: 100%;" />
            </div>

            <div class="info-item">
                <el-icon>
                    <CollectionTag />
                </el-icon>
                <span>标签:</span>
                <el-input-tag v-model="article.tags" placeholder="输入标签" trigger="Space" />
            </div>

            <div class="info-item">
                <el-icon>
                    <Folder />
                </el-icon>
                <span>分类:</span>
                <el-input-tag v-model="article.categories" placeholder="输入分类" trigger="Space" />
            </div>

            <div class="info-item">
                <el-icon>
                    <Lock />
                </el-icon>
                <span>访问控制:</span>
                <el-button size="small" @click="secretManagementDialogOpen = true">管理</el-button>
            </div>
        </div>

        <div class="sep-line" style="margin: 0.5em 0;"></div>

        <div class="floating-toolbar bg-auto" ref="toolbar" @wheel.passive="e => toolbar.scrollBy({ left: e.deltaY, top: 0, behavior: 'smooth' })">
            <div style="display: inline-block; width: 8.5em; color: gray; font-size: small;">{{ save_time ? `${save_time} 已保存` : "文章没有保存" }}</div>
            <el-button><el-icon><Link /></el-icon>&nbsp;链接</el-button>
            <el-button><el-icon><Grid /></el-icon>&nbsp;表格</el-button>
            <el-button><el-icon><Picture2 /></el-icon>&nbsp;插入对象</el-button>
            <el-button><el-icon><Link /></el-icon>&nbsp;添加附件</el-button>
            <el-button @click="insert_html"><el-icon><DocumentAdd /></el-icon>&nbsp;插入<span style="margin: 0 0.2em;">HTML</span>片段</el-button>
            <el-button @click="settingsDialogOpen = true"><el-icon><Setting /></el-icon>&nbsp;高级设置</el-button>
            <el-button><el-icon><Switch /></el-icon>&nbsp;切换到 HTML 编辑器</el-button>
        </div>

        <Tiptap class="tiptap t-el" v-model="article.content" />

        <el-dialog v-model="settingsDialogOpen" title="高级设置" style="min-width: 400px; max-width: 800px;" align-center destroy-on-close draggable>
            <div style="display: flex; overflow: hidden; align-items: center;">
                资源管理: 暂无
            </div>

            <div style="display: flex; overflow: hidden; align-items: center; margin-top: 0.5em;">
                访问控制:&nbsp;<el-button @click="secretManagementDialogOpen = true">管理</el-button>
            </div>
        </el-dialog>

        <el-dialog v-model="secretManagementDialogOpen" title="访问控制" style="min-width: 400px; max-width: 800px;" align-center destroy-on-close draggable>
            <ElCard>
                <template #header>
                    <span>Secret 管理</span>
                </template>

                <div style="display: flex; overflow: hidden; align-items: center;">
                    <span>使用 ID 为</span>
                    <ElSelect v-model="secret_id_buffer" style="flex: 1; margin: 0 0.5em;" placeholder="选择 Secret">
                        <ElOption v-for="(id) in secrets_list" :key="id" :label="id" :value="id" />
                    </ElSelect>
                    <span>的 Secret</span>
                </div>

                <hr>

                <div v-if="secret_id_Edit?.secret_name" style="word-break: break-all; margin: 0.5em 0">Secret: {{ secret_id_Edit?.secret_name }}</div>

                <div v-if="secret_id_Edit?.secret_name"><a href="javascript:" @click="updateSecretEncryption">{{ 
                    article.id ? "更新 Secret" : "使用此 Secret 创建文章"
                }}</a></div>
            </ElCard>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Tiptap from './Tiptap.vue'
import { User, CollectionTag, Folder, DocumentAdd, Clock, Lock, Link, Grid, Picture as Picture2, Setting, Switch } from '@element-plus/icons-vue'
import { exportContent } from '../ossapi/filelistapi'
import { ElDatePicker, ElMessage, ElMessageBox } from 'element-plus'

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

const toolbar = ref(null);

const article = ref(initArticle())
const secret_id = ref('');
const secret_id_buffer = ref('');
const secret_id_Edit = ref({ name: '' });
const secret_encryption_key = ref('');
const secrets_list = ref([]);

async function setupSecretId() {
    secret_id.value = await get_secret_default_id();
    if (!secret_id.value) {
        ElMessageBox.alert("没有找到默认 Secret，无法加密。", '加密异常', {
            confirmButtonText: "前往设置",
            type: "error"
        }).catch(() => { }).finally(() => {
            router.push("/secret/management");
        })
    }
    secret_id_buffer.value = secret_id.value;
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

// secret管理相关内容
const secretManagementDialogOpen = ref(false)

// 文章相关数据
const settingsDialogOpen = ref(false)
const artCreationTime = ref(new Date());
const fontList = ref([]); // 字体列表
const attachments = ref([]); // 附件列表

// 加载文章数据
const load_article = async (id) => {
    OLEArticle.value = {};
    fontList.value.length = 0;
    attachments.value.length = 0;
    secret_id_Edit.value = {};
    if (id === 'new' || id === '') {
        article.value = initArticle();
        await setupSecretId();
        return;
    }
    try {
        const data = await load_entries_index(props.credits);
        const article_data = data.find(item => item.id === id);
        if (!article_data) { requestIdleCallback(() => {
            ElMessageBox.alert('文章不存在。', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
        }); return; }
        article.value = Object.assign({
            content: '<p>正在加载文章，请稍候...</p>',
        }, article_data);
        artCreationTime.value = new Date(+article.value.created);
        let url;
        // 获取文件元数据
        url = new URL(`./entries/${article_data.id}`, props.credits.oss_url);
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
        // 获取文件内容
        url = new URL(`./content/${article_data.id}`, props.credits.oss_url);
        const resp = await fetch(await signit(url));
        if (404 === resp.status) {
            ElMessageBox.alert('文章数据异常。是否遭到了意外的外部更改？', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
            return;
        }
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
        OLEArticle.value = article.value;
        const blob = await resp.blob();
        // 解密文件内容
        const decrypted = await file_inmemory_decrypt(blob, secret_encryption_key.value);
        // 加载文章内容
        article.value.content = decrypted;
    }
    catch (error) {
        ElMessageBox.alert('加载文章失败，请稍后重试。' + error?.stack || error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}

const hasUnsavedChanges = () => {
    return !!article.value.title || !!article.value.content
}
defineExpose({ hasUnsavedChanges })

const update_title = (() => {
    let t = article.value?.title || ''
    if (t.length > 10) t = t.substring(0, 10) + '…'
    emit('update-title', `文章编辑器 - [${t || '新文章'}]`)
});
onMounted(async () => {
    update_title();
    await props.credits.prom; // wait for credits to be setup
    if (props.articleId) load_article(props.articleId);
    else {
        await setupSecretId();
    }
})

import { watch } from 'vue'
import { file_inmemory_decrypt, file_inmemory_encrypt, get_secret_default_id, get_secret_info, get_secret_key, signit } from '../entries'

// 监听 article.value.title 的变化，变化时调用 update_title 函数
watch(() => article.value.title, () => {
    update_title()
})

watch(() => props.articleId, async () => {
    if (!(props.articleId === article.value.id)) 
        await load_article(props.articleId);
})

watch(() => secretManagementDialogOpen.value, async (value) => {
    if (!value) return;
    // 使用 ListObjectV2 列出所有的 Secret ID，用于下拉框
    const url = new URL('./secrets/data/', props.credits.oss_url);
    const data = [];
    exportContent(url.pathname, data, {
        username: props.credits.ak,
        usersecret: props.credits.sk,
        bucket: props.credits.bucket,
        region: props.credits.region,
        oss: props.credits.oss_url,
    }).then(() => {
        secrets_list.value.length = 0;
        for (const i of data) {
            const secret_id = i.Key.includes('/') ? (i.Key.split('/').pop()) : (i.Key);
            if (secret_id) secrets_list.value.push(secret_id);
        }
    }).catch(() => {
        ElMessage.warning("无法获取 Secret 列表，将只能使用默认 Secret。")
    })
})

watch(() => secret_id_buffer.value, async () => {
    if (!secret_id_buffer.value) return;
    // 加载 Secret 信息
    const info = await get_secret_info(secret_id_buffer.value);
    secret_id_Edit.value = info;
})


const save_time = ref(0);
const save_article_core = async () => {
    // 创建文章逻辑
    if (!props.articleId) try {
        // 创建文章。
        const article_id_allocated = (() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}-${crypto.randomUUID()}`;
        })();
        article.value.id = article_id_allocated;
        // 解密主密钥
        if (!secret_encryption_key.value) {
            if (!await getSecretEncKey()) throw '解密失败。';
        }
        // 
        OLEArticle.value = {}
    } catch (e) {
        ElMessage.error(`文章创建失败! ${e}`)
        return;
    }
    
    // 保存文章逻辑
    try {
        article.value.created = String(artCreationTime.value.getTime());
        const item = {
            id: article.value.id,
            title: article.value.title,
            author: article.value.author,
            tags: article.value.tags,
            categories: article.value.categories,
            created: article.value.created,
        };
        // 判断是否需要更新索引
        if (article.value.title !== OLEArticle.value.title ||
            article.value.author !== OLEArticle.value.author ||
            article.value.tags.join('') !== OLEArticle.value.tags.join('') ||
            article.value.categories.join('') !== OLEArticle.value.categories.join('') ||
            article.value.created !== OLEArticle.value.created
        ) {
            // 添加到索引
            await save_entries_index(props.credits, item);

            OLEArticle.value = {
                title: article.value.title,
                author: article.value.author,
                tags: article.value.tags,
                categories: article.value.categories,
                created: article.value.created,
            }
        }

        let url, head, resp;
        // 保存索引
        url = new URL(`./entries/${article.value.id}`, props.credits.oss_url);
        head = {
            'Content-Type': 'application/json; charset=utf-8',
        };
        const entry_data = {
            version: 1,
            schema_version: 2,
            appid: appid,
            uuid: uuid,
            // metadata: item, // 由于entry数据明文存储，我们不保存元数据，以保护用户隐私。
            content: {
                secret_id: secret_id.value,
            },
            content_policy: {
                frames: {
                    allow: true,
                    allowed_domains: [],
                    blocked_domains: [],
                    policy: 'blacklist'
                },
                resources: {
                    allow: true,
                },
            },
            resources: {
                fonts: fontList.value,
                attachments: attachments.value,
            },
        };
        resp = await fetch(await signit(url, 'PUT', head), {
            method: 'PUT',
            headers: head,
            body: JSON.stringify(entry_data)
        });
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        // 加密并保存文章内容
        url = new URL(`./content/${article.value.id}`, props.credits.oss_url);
        head = {
            'Content-Type': 'application/x-encrypted',
        };
        resp = await fetch(await signit(url, 'PUT', head), {
            method: 'PUT',
            headers: head,
            body: await file_inmemory_encrypt(new Blob([article.value.content]), secret_encryption_key.value),
        });
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        if (!props.articleId) {
            router.replace(`/editor/${article.value.id}`);
        }
        // ElMessage.success('文章保存成功');
        const d = new Date();
        save_time.value = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
    }
    catch (error) {
        ElMessageBox.alert('加载文章列表失败，请稍后重试。' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}
const is_saving = ref(false)
const save_article = async () => {
    // 防止重复调用
    if (is_saving.value) return;
    is_saving.value = true;
    try {
        await save_article_core();
    }
    finally {
        is_saving.value = false;
    }
}

async function updateSecretEncryption() {
    if (!secret_id_buffer.value) {
        ElMessage.error('请选择一个 Secret。');
        return;
    }
    // 检查是否是新建文章（没有ID）
    if (!!article.value.id) 
    try { await ElMessageBox.confirm('更新 Secret 将需要重新加密文章内容以及所有附件。是否继续？', '更新 Secret', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
    }) } catch { return };
    // 更新 Secret ID
    const ori = secret_id.value;
    secret_id.value = secret_id_buffer.value;
    try {
        await getSecretEncKey();
    } catch (e) {
        secret_id.value = ori; // 恢复原始 Secret ID
        ElMessage.error(`Secret 更新失败: ${e}`);
        return; // 终止执行，避免后续错误
    }
    // 更新附件内容（待实现）

    // 重新加密文章内容
    save_article().then(() => {
        ElMessage.success('Secret 更新成功。');
    }).catch((e) => {
        ElMessage.error(`Secret 更新失败: ${e}`);
    })
    secretManagementDialogOpen.value = false; // 关闭对话框
}


const insert_html = () => {
    
}
</script>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    overflow: auto;
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}
.editor-container > ::v-deep(.tiptap) {
    flex: 1;
    padding: 10px 0;
}
.editor-container > ::v-deep(.tiptap) > div {
    outline: 0 !important;
    height: 100%;
}
.article-title {
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 21;
    border-bottom: 1px solid gray;
}
.article-title > input  {
    border: 0;
    margin: 0;
    flex: 1;
    outline: 0 !important;
    padding: 10px;
    font-size: 1.5em;
    font-family: NSimsun, Simsun, "宋体", sans-serif;
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
.floating-toolbar {
    border-bottom: 1px solid #ccc;
    padding: 0 5px 0.5em 5px;
    position: sticky;
    top: calc(1.5em + 10px + 10px + 4px);
    z-index: 20;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
}
.floating-toolbar::-webkit-scrollbar {
    width: 0; height: 0;
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
}
.art-info>.info-item {
    display: flex;
    align-items: center;
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
.app-container > .content:has(.editor-container) {
    overflow: hidden;
}
</style>