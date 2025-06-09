<template>
    <div class="editor-container" @keydown.ctrl.s.stop.prevent="save_article"
        @dragover="(checkIfDragIsAllowed($event) && (($event.dataTransfer.dropEffect = 'copy'), (isDragOver = true)))"
        @keydown.capture.esc="isDragOver = false"
    >
        <Teleport to="body">
            <div v-if="isDragOver" @dragleave.self="isDragOver=isDragOver=false" @dragover="(checkIfDragIsAllowed($event))" @click.self="isDragOver=isDragOver=false" @drop.capture="onDrop" class="cover"><div inert style="pointer-events: none;">Drop</div></div>
        </Teleport>

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
                <el-input-tag v-model="article.tags" placeholder="输入标签" />
            </div>

            <div class="info-item">
                <el-icon>
                    <Folder />
                </el-icon>
                <span>分类:</span>
                <el-input-tag v-model="article.categories" placeholder="输入分类" />
            </div>

            <div class="info-item">
                <el-icon>
                    <Lock />
                </el-icon>
                <span>访问控制:</span>
                <el-button size="small" @click="secretManagementDialogOpen = true">管理</el-button>
            </div>
        </div>

        <div class="sep-line" style="margin-top: 0.5em;"></div>

        <div class="floating-toolbar bg-auto" ref="toolbar" @wheel.passive="e => toolbar.scrollBy({ left: e.deltaY, top: 0, behavior: 'smooth' })">
            <div style="display: inline-block; width: 8.5em; color: gray; font-size: small;">{{ save_time ? `${save_time} 已保存` : "文章没有保存" }}</div>
            <ElPopover placement="bottom" title="设置链接" width="200" :visible="dlgInsertSuperLink">
                <template #reference><el-button @click="showInsertSuperLinkDialog"><el-icon><Link /></el-icon>&nbsp;链接</el-button></template>
                <div style="display: flex; flex-direction: column;">
                    <ElInput v-model="dlgInsertSuperLinkUrl" placeholder="输入链接" clearable />
                    <el-button style="margin-top: 0.5em;" @click="doInsertSuperLink">Apply</el-button>
                </div>
             </ElPopover>
            <el-button v-show="0" @click="ElMessage.error('暂未实现')"><el-icon><Grid /></el-icon>&nbsp;表格</el-button>
            <ElPopover placement="bottom" title="插入对象" width="250" :visible="dlgInsertObjectShow">
                <template #reference><el-button @click="dlgInsertObjectShow = true"><el-icon><Picture2 /></el-icon>&nbsp;插入对象</el-button></template>
                <div style="display: flex; flex-direction: column;">
                    <input type="file" multiple hidden ref=dlgInsertObjectPicker @change="$event => {
                        for (const i of $event.target.files) {
                            dlgInsertObjectObjects.push(i)    
                        }
                    }" />
                    <ElButton @click="doPickAnObject">{{ dlgInsertObjectObjects.length ? `${dlgInsertObjectObjects.length} 个对象` : '选择对象' }}</ElButton>
                    <ElSelect style="margin-top: 0.5em;" v-model="dlgInsertObjectType">
                        <ElOption value="自动检测对象类型">自动检测对象类型</ElOption>
                        <ElOption value="text/plain">文本</ElOption>
                        <ElOption value="image">图片</ElOption>
                        <ElOption value="video">视频</ElOption>
                        <ElOption value="audio">音频</ElOption>
                        <ElOption value="application/pdf">PDF</ElOption>
                        <ElOption value="docx">Microsoft Office 文档</ElOption>
                        <ElOption value="binary">二进制文件</ElOption>
                    </ElSelect>
                    <div style="display: flex;">
                        <el-button type="primary" plain style="flex: 1; margin-top: 0.5em;" @click="doInsertObject(true)">插入对象</el-button>
                        <el-button type="danger" plain style="flex: 1; margin-top: 0.5em;" @click="doInsertObject(false)">取消操作</el-button>
                    </div>
                </div>
             </ElPopover>
            <el-button @click="dlgInsertObjectShow = true"><el-icon><Link /></el-icon>&nbsp;添加附件</el-button>
            <ElPopover placement="bottom" title="设置链接" width="200" trigger="click">
                <template #reference><el-button @click="getLink2ArticleList"><el-icon><Link /></el-icon>&nbsp;链接到文章</el-button></template>
                <div style="display: flex; flex-direction: column;">
                    <ElSelect v-model="link2article_id" @change="link2article_id && doLink2Article()">
                        <ElOption v-for="i in link2article_list" :key="i.id" :label="i.title" :value="i.id" />
                    </ElSelect>
                </div>
             </ElPopover>
            <el-button v-show="0"><el-icon><DocumentAdd /></el-icon>&nbsp;插入<span style="margin: 0 0.2em;">HTML</span>片段</el-button>
            <el-button @click="settingsDialogOpen = true"><el-icon><Setting /></el-icon>&nbsp;高级设置</el-button>
            <el-button v-show="0"><el-icon><Switch /></el-icon>&nbsp;切换到 HTML 编辑器</el-button>
        </div>

        <Tiptap class="tiptap t-el" v-model="article.content" ref="editor" @paste.capture="handle_paste" />

        <el-dialog v-model="settingsDialogOpen" title="高级设置" style="min-width: 400px; max-width: 800px;" align-center destroy-on-close draggable>
            <div style="display: flex; overflow: hidden; align-items: center;">
                资源管理:&nbsp;<el-button @click="attachmentsListDialogOpen = true">附件列表</el-button>
            </div>

            <div style="display: flex; overflow: hidden; align-items: center; margin-top: 0.5em;">
                访问控制:&nbsp;<el-button @click="secretManagementDialogOpen = true">管理</el-button>
            </div>
        </el-dialog>

        <el-dialog v-model="attachmentsListDialogOpen" title="附件列表" style="min-width: 350px; max-width: 400px;" align-center destroy-on-close draggable>
            <div>此文章包括以下附件：</div>
            <div style="margin-top: 0.5em;">您可以<a href="javascript:" @click="cleanupUnusedAttachments">清理未使用的附件。</a></div>
            <div style="display: flex; flex-direction: column; margin-top: 0.5em;">
                <div v-for="(i) in attachments" :key="i.id" class="attachment-item">
                    <div style="color: gray">{{ attname_normalize(i.id) }}</div>
                    <div class="actions">
                        <a href="javascript:" @click="show_filename(i.name)">获取文件名</a>
                        <span>&nbsp;&nbsp;</span>
                        <a href="javascript:" @click="delete_attachment(i.id, i.name)">删除附件</a>
                    </div>
                </div>
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

                <div style="margin-top: 0.5em; color: red;">警告：不允许使用此功能，因为目前还没有完成附件的重加密。强行继续将导致所有附件无法访问。</div>
            </ElCard>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Tiptap from './Tiptap.vue'
import { User, CollectionTag, Folder, DocumentAdd, Clock, Lock, Link, Grid, Picture as Picture2, Setting, Switch } from '@element-plus/icons-vue'
import { exportContent } from '../ossapi/filelistapi'
import { ElDatePicker, ElMessage, ElMessageBox, ElOption, ElPopover } from 'element-plus'
import { u } from '../user.js';
import { get_secret_default_id, get_secret_info, save_entries_index, load_entries_index, signit, ask_secret_key_by_id } from '../entries'
import { decrypt_blob, decrypt_data, encrypt_blob, encrypt_data, encrypt_file, Wrappers } from 'simple-data-crypto/builder'

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


function checkIfDragIsAllowed(ev) {
    const types = ev.dataTransfer.types;
    const checkResult = (() => {
        const typesarr = [
            'application/octet-stream',
        ];
        for (const i of types) {
            if (typesarr.includes(i)) return true;
            if (i === 'Files') return { dropEffect: 'copy' };
        }
    })();
    if (!checkResult) return;
    ev.preventDefault();

    return true;
}

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
    changes_list.value.secret_id = true;
}

async function getSecretEncKey() {
    secret_encryption_key.value = await ask_secret_key_by_id(secret_id.value);
    return !!secret_encryption_key.value;
}

// secret管理相关内容
const secretManagementDialogOpen = ref(false)

// 文章相关数据
const settingsDialogOpen = ref(false)
const artCreationTime = ref(new Date());
const patchSaveLoad = ref(false);
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
    if (patchSaveLoad.value && patchSaveLoad.value === id) {
        patchSaveLoad.value = false;
        return;
    }
    OLEArticle.value = {};
    fontList.value.length = 0;
    attachments.value.length = 0;
    secret_id_Edit.value = {};
    for (const i in changes_list.value) changes_list.value[i] = false;
    if (id === 'new' || id === '') {
        article.value = initArticle();
        await setupSecretId();
        artCreationTime.value = new Date();
        save_time.value = 0;
        return;
    }
    try {
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
            ElMessage.error('获取加密密钥失败。');
            history.back();
            return;
        }
        if (meta?.resources?.attachments) attachments.value = meta.resources.attachments;
        if (meta?.resources?.fonts) fontList.value = meta.resources.fonts;
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
        artCreationTime.value = new Date(+article.value.created);
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
        const decrypted = await (await decrypt_blob(blob, secret_encryption_key.value)).text();
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
    setconf('design', true);
    await props.credits.prom; // wait for credits to be setup
    if (props.articleId && props.articleId !== article.value.id) load_article(props.articleId);
    else {
        await setupSecretId();
    }
    globalThis.myEditor = { save_article };
})
onUnmounted(() => {
    setconf('design', false);
    globalThis.myEditor = null;
})

// 监听 article.value.title 的变化，变化时调用 update_title 函数
watch(() => article.value.title, () => {
    update_title()
})

watch(() => props.articleId, async () => {
    if (!(props.articleId === article.value.id)) try {
        await load_article(props.articleId);
    } catch (e) {
        console.error('[editor]', 'Unexpected exception in user callback: ', e);
    }
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
    // 需要把密码同步到<x-my-diary-app-file-reference>组件
    setscm({
        key: secret_encryption_key.value,
        credits: props.credits,
    });

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
        const metaChanged = article.value.title !== OLEArticle.value.title ||
            article.value.author !== OLEArticle.value.author ||
            article.value.tags.join('') !== OLEArticle.value.tags.join('') ||
            article.value.categories.join('') !== OLEArticle.value.categories.join('') ||
            article.value.created !== OLEArticle.value.created;
        if (metaChanged) {
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
        // 判断是否需要保存索引
        if (
            changes_list.value.secret_id ||
            changes_list.value.fontList ||
            changes_list.value.attachmentsList ||
            metaChanged
        ) {
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
                metadata: await encrypt_data(JSON.stringify(item), secret_encryption_key.value),
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

            for (const i in changes_list.value) changes_list.value[i] = false;
        }
        // 加密并保存文章内容
        url = new URL(`./content/${article.value.id}`, props.credits.oss_url);
        head = {
            'Content-Type': 'application/x-encrypted',
        };
        resp = await fetch(await signit(url, 'PUT', head), {
            method: 'PUT',
            headers: head,
            body: await encrypt_blob(new Blob([article.value.content]), secret_encryption_key.value, null, undefined, 32768),
        });
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        if (!props.articleId) {
            patchSaveLoad.value = article.value.id;
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
    changes_list.value.secret_id = true;
    // 更新附件内容（待实现）

    // 重新加密文章内容
    save_article().then(() => {
        ElMessage.success('Secret 更新成功。');
    }).catch((e) => {
        ElMessage.error(`Secret 更新失败: ${e}`);
    })
    secretManagementDialogOpen.value = false; // 关闭对话框
}


// =================
const editor = ref(null);

// 插入超链接相关内容
const dlgInsertSuperLink = ref(false);
const dlgInsertSuperLinkUrl = ref('');
const showInsertSuperLinkDialog = () => {
    if (dlgInsertSuperLink.value) {
        dlgInsertSuperLink.value = false;
        return;
    }
    dlgInsertSuperLinkUrl.value = String(editor.value.getLink());
    dlgInsertSuperLink.value = true;
}
const doInsertSuperLink = () => {
    if (dlgInsertSuperLinkUrl.value) {
        editor.value.setLink(dlgInsertSuperLinkUrl.value);
    } else {
        editor.value.setLink('');
    }
    dlgInsertSuperLink.value = false; // 关闭对话框
}

// 链接到文章
const link2article_id = ref('');
const link2article_list = ref([]);
const getLink2ArticleList = async () => {
    link2article_list.value.length = 0;
    for (const i of (await load_entries_index(props.credits)).sort((a, b) => +b.created - +a.created)) {
        link2article_list.value.push(i)
    }
}
const doLink2Article = () => {
    if (!link2article_id.value) {
        ElMessage.error('请选择一个文章。');
        return;
    }
    editor.value.setLink(`#/article/${link2article_id.value}`);
    link2article_id.value = ''; // 重置选择
    document.body.dispatchEvent(new PointerEvent('click', { bubbles: true })); // 关闭弹出层
}

// 插入对象
const dlgInsertObjectPicker = ref(null)
const dlgInsertObjectShow = ref(false)
const dlgInsertObjectObjects = ref([])
const dlgInsertObjectType = ref('自动检测对象类型')
const doPickAnObject = function () {
    dlgInsertObjectPicker.value.click()
}
const doInsertObject = function (d) {
    if (!d) {
        (dlgInsertObjectObjects.value.length = 0)
        return dlgInsertObjectShow.value = false
    }
    dlgInsertObjectShow.value = false
    queueMicrotask(async () => {
        const content = document.createElement('div');
        /** @type {HTMLElement} */
        const hwnd = CreateDynamicResizableView(content, "正在上传对象，请勿关闭窗口...", 360, 150);
        try {
            if (!article.value.id) {
                content.innerText = "正在为您保存文章，请稍候...";
                await save_article_core();
                content.innerText = "文章保存成功，正在上传对象...";
            }
            let n = 0, type;
            if (dlgInsertObjectType.value !== '自动检测对象类型') type = dlgInsertObjectType.value;
            // 依次加密并上传附件
            for (const i of dlgInsertObjectObjects.value) {
                const attachment_id = article.value.id + '_' + crypto.randomUUID();
                if (dlgInsertObjectType.value === '自动检测对象类型') {
                    type = await guess_type_by_name(i.name);
                }
                content.innerText = `正在加密并上传 ${++n}/${dlgInsertObjectObjects.value.length} ${i.name}`
                await upload_attachment(attachment_id, i.name, type, i);
                // console.log("JSON(before):", editor.value.editor.getJSON())
                editor.value.editor.commands.insertContent([{
                    type: 'x-my-diary-app-file-reference',
                    attrs: {
                        'data-id': attachment_id,
                        'data-type': type,
                        'data-name': i.name,
                        'data-size': i.size,
                        'data-secret-id': secret_id.value,
                    },
                }, {
                    type: 'paragraph',
                }]);
                // console.log("JSON(after):", editor.value.editor.getJSON())
            }
            await save_article();
            ElMessage.success("对象上传成功！")
        }
        catch (error) {
            console.error(error)

            ElMessageBox.alert("资源处理失败！" + error, '插入对象失败', {
                type: 'error',
                confirmButtonText: "我知道了"
            }).catch(() => { })
        }
        finally {
            doInsertObject(false)
            hwnd.remove()
        }
    })
}
const isDragOver = ref(false)
const onDrop = (event) => {
    const dataTransfer = event.dataTransfer;
    isDragOver.value = false;
    if (!dataTransfer.files.length) return;
    event.preventDefault()
    event.stopPropagation();
    for (const i of dataTransfer.files) {
        dlgInsertObjectObjects.value.push(i)
    }
    dlgInsertObjectShow.value = true
}
const handle_paste = (event) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData.files.length) return;
    event.preventDefault()
    event.stopPropagation();
    const files = clipboardData.files;
    (async () => {
        for (const i of files) {
            dlgInsertObjectObjects.value.push(i);
        }
        doInsertObject(true);
    })();
}


const guess_type_by_name = async function (name = '') {
    if (!name.includes(".")) return 'binary';
    try {
        const ext = name.split(".").pop().toLowerCase();
        let mime_db = await u.get("mime_db");
        if (!mime_db) {
            mime_db = await (await fetch("assets/mime_db-lite.json")).json();
            await u.set("mime_db", mime_db);
        }
        for (const k in mime_db) {
            if (mime_db[k]?.extensions?.includes(ext)) return k;
        }
        return 'binary';
    }
    catch { return 'binary' }
}
import { init_upload, send, post_upload } from '../ossapi/fileupload.js';
import { setconf, setscm } from '../secret-elementary.js'
const upload_attachment = async function(id, raw_name, type, content) {
    if (!secret_encryption_key.value) {
        if (!await getSecretEncKey()) throw '解密失败。';
    }
    const atta_data = {
        id, type,
        name: await encrypt_data(raw_name, secret_encryption_key.value, undefined, 16384),
    };
    const url = new URL(`./attachments/${id}`, props.credits.oss_url);
    const uploadId = await init_upload(new URL(url), props.credits.bucket, props.credits.region, props.credits.ak, props.credits.sk, 'application/x-encrypted');
    const tags = []; let chunk_id = 0;
    const cache = []; let cached_size = 0;
    const doUpload = async () => {
        const tag = (await send(new URL(url), new Blob(cache),
            props.credits.bucket, props.credits.region, props.credits.ak, props.credits.sk,
            ++chunk_id, uploadId
        )).ETag;
        tags.push(tag);
        cache.length = 0;
        cached_size = 0;
    }
    await encrypt_file(await Wrappers.createReaderForLocalFile(content), async chunk => {
        cached_size += chunk.byteLength;
        cache.push(chunk);
        if (cached_size > 1048576) {
            await doUpload();
        }
    }, secret_encryption_key.value, null, null, 32768, 1048576 * 5);
    if (cached_size > 0) await doUpload(); // 上传剩余的内容
    atta_data.etag = await post_upload(url, props.credits.bucket, props.credits.region, props.credits.ak, props.credits.sk, uploadId, tags);
    attachments.value.push(atta_data);
    changes_list.value.attachmentsList = true;
    return true;
}

const attachmentsListDialogOpen = ref(false)
function attname_normalize(name) {
    return name.split("_").pop();
}
function show_filename(filename) {
    decrypt_data(filename, secret_encryption_key.value).then((n) => ElMessage.success("文件名: " + n)).catch(ElMessage.error)
}
async function delete_attachment(id, name) {
    try {
        name = await decrypt_data(name, secret_encryption_key.value);
        await ElMessageBox.confirm('是否确实要删除附件 ' + name + ' ?', '删除附件', {
            confirmButtonText: '确实',
            cancelButtonText: '不行',
            type: 'warning',
        });
    } catch { return }

    try {
        // 删除文件
        const url = new URL(`./attachments/${id}`, props.credits.oss_url);
        const resp = await fetch(await signit(url, 'DELETE'), { method: 'DELETE' });
        if (!resp.ok && (resp.status !== 404)) throw `HTTP Error ${resp.status}: ${resp.statusText}`; // 忽略 404 错误
        // 删除索引
        const index = attachments.value.findIndex(item => item.id === id);
        if (index !== -1) {
            attachments.value.splice(index, 1);
            changes_list.value.attachmentsList = true;
        }
        await save_article();
        ElMessage.success('附件删除成功');
    }
    catch (e) {
        ElMessage.error("删除失败: " + e);
    }
}
async function cleanupUnusedAttachments() {
    const used_ids = new Set();
    const json = editor.value.editor.getJSON();
    for (const i of json.content) {
        if (i.type === 'x-my-diary-app-file-reference') {
            used_ids.add(i.attrs['data-id']);
        }
    }
    const unused = attachments.value.filter(item => !used_ids.has(item.id));
    if (unused.length === 0) {
        ElMessage.success('太棒了！没有发现未使用的附件！');
        return;
    }
    const remove = async id => {
        // 删除文件
        const url = new URL(`./attachments/${id}`, props.credits.oss_url);
        const resp = await fetch(await signit(url, 'DELETE'), { method: 'DELETE' });
        if (!resp.ok && (resp.status !== 404)) throw `HTTP Error ${resp.status}: ${resp.statusText}`; // 忽略 404 错误
        // 删除索引
        const index = attachments.value.findIndex(item => item.id === id);
        if (index !== -1) {
            attachments.value.splice(index, 1);
            changes_list.value.attachmentsList = true;
        }
    }
    ElMessageBox.confirm(`发现 ${unused.length} 个未使用的附件，包括 ${await decrypt_data(unused[0].name, secret_encryption_key.value)} 等，是否要删除它们？`, '清理未使用的附件', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        try {
            for (const i of unused) {
                await remove(i.id);
            }
            await save_article();
            ElMessageBox.alert(`已经删除了 ${unused.length} 个未使用的附件。`, '清理完成', {
                confirmButtonText: '我知道了',
                type: 'success',
            }).catch(() => { });
        }
        catch (e) {
            ElMessage.error("清理失败: " + e);
        }
    }).catch(() => {});
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
    min-width: 1px !important;
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
    padding: 0.5em 5px 0.5em 5px;
    position: sticky;
    top: calc(1.5em + 10px + 10px + 4px);
    z-index: 20;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    height: auto;
    min-height: 2em;
    box-sizing: content-box;
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
.field {
    display: flex;
    align-items: center;
    white-space: nowrap;
}
.field+.field {
    margin-top: 0.5em;
}
.field>span {
    margin-right: 0.5em;
}
.field > :not(:is(span, .label)) {
    flex: 1;
}
.cover {
    position: fixed;
    inset: 0;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    z-index: 99999999;
    background: white;
    opacity: 0.5;
    display: grid;
    place-items: center;
}

.cover * {
    pointer-events: none;
    touch-action: none;
}

.attachment-item {
    display: flex;
    padding: 5px;
    flex-direction: column;
    word-break: break-all;
}
.attachment-item+.attachment-item {
    margin-top: 0.5em;
}
</style>

<style>
.app-container > .content:has(.editor-container) {
    overflow: hidden;
}
</style>