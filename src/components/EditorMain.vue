<template>
    <div class="editor-container" @keydown.ctrl.s.stop.prevent="save_article">
        <div class="article-title bg-auto">
            <input type="text" v-model="article.title" placeholder="我的文章" class="bg-auto">
            <el-button @click="save_article" style="margin-left: 0.5em;">救</el-button>
        </div>

        <div class="art-info">
            <div class="info-item">
                <el-icon><User /></el-icon>
                <span>作者:</span>
                <el-input placeholder="请输入作者" v-model="article.author" clearable />
            </div>

            <div class="info-item">
                <el-icon><CollectionTag /></el-icon>
                <span>标签:</span>
                <el-input-tag v-model="article.tags" placeholder="输入标签" trigger="Space" />
            </div>

            <div class="info-item">
                <el-icon><Folder /></el-icon>
                <span>分类:</span>
                <el-input-tag v-model="article.categories" placeholder="输入分类" trigger="Space" />
            </div>
        </div>

        <div class="sep-line" style="margin: 0.5em 0;"></div>

        <div class="floating-toolbar bg-auto">
            <el-button text @click="insert_html"><el-icon><DocumentAdd /></el-icon>&nbsp;插入<span style="margin: 0 0.2em;">HTML</span>片段</el-button>
        </div>

        <Tiptap class="tiptap t-el" v-model="article.content" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Tiptap from './Tiptap.vue'
import { User, CollectionTag, Folder, DocumentAdd } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { sign_url } from '../../lib/util/sign'

const router = useRouter()
const emit = defineEmits(['update-title'])

const props = defineProps({
    articleId: { 
        type: String,
        default: '',
    },
    credits: {
        type: Object,
        default: () => ({
            oss_url: '',
            ak: '',
            sk: '',
            bucket: '',
            region: '',
        })
    },
})
// 初始化文章数据
const initArticle = () => ({
    title: '',
    content: {
        type: 'doc',
        content: [
            { type: 'paragraph', content: [] }
        ]
    },
    author: '',
    tags: [],
    categories: [],
    tmpArticleId: '',
})

const article = ref(initArticle())

// 加载文章数据
const load_article = async (id) => {
    try {
        const data = await load_entries_index(props.credits);
        const article_data = data.find(item => item.id === id);
        if (!article_data) {
            ElMessageBox.alert('文章不存在。', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
            return;
        }
        article.value = Object.assign({
            content: {
                type: 'doc',
                content: [
                    { type: 'paragraph', content: [{ type: "text", text: '正在加载文章，请稍候...' }] }
                ]
            },
        }, article_data);
        // 获取文件内容
        const url = new URL(`./entries/${article_data.id}`, props.credits.oss_url);
        const signed_url = await sign_url(url, {
            access_key_id: props.credits.ak,
            access_key_secret: props.credits.sk,
            bucket: props.credits.bucket,
            region: props.credits.region,
            expires: 30,
        })
        const resp = await fetch(signed_url);
        if (404 === resp.status) {
            ElMessageBox.alert('文章不存在。', '错误', {
                confirmButtonText: '返回上一页',
                type: 'error',
            }).then(() => { }).catch(() => { }).finally(() => history.back())
            return;
        }
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
        article.value.content = await resp.json();
    }
    catch (error) {
        ElMessageBox.alert('加载文章列表失败，请稍后重试。' + error, '错误', {
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
    let t = article.value.title
    if (t.length > 10) t = t.substring(0, 10) + '…'
    emit('update-title', `文章编辑器 - [${t || '新文章'}]`)
});
onMounted(() => {
    update_title();
    if (props.articleId) load_article(props.articleId);
})

import { watch } from 'vue'

// 监听 article.value.title 的变化，变化时调用 update_title 函数
watch(() => article.value.title, () => {
    update_title()
})

watch(() => props.articleId, async () => {
    if (!(props.articleId === article.value.tmpArticleId)) 
        await load_article(props.articleId);
})


const save_article = async () => {
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
        article.value.tmpArticleId = article_id_allocated;

        // 添加到索引
        const item = {
            id: article_id_allocated,
            title: article.value.title,
            author: article.value.author,
            tags: article.value.tags,
            categories: article.value.categories,
            created: String(new Date().getTime()),
        };
        await save_entries_index(props.credits, item);

        // 保存文章内容
        const url = new URL(`./entries/${article_id_allocated}`, props.credits.oss_url);
        const head = {
            'Content-Type': 'text/x-rich-text; charset=utf-8',
        };
        const signed_url = await sign_url(url, {
            access_key_id: props.credits.ak,
            access_key_secret: props.credits.sk,
            bucket: props.credits.bucket,
            region: props.credits.region,
            expires: 30,
            method: 'PUT',
            additionalHeadersList: head,
        })
        const resp = await fetch(signed_url, {
            method: 'PUT',
            headers: head,
            body: JSON.stringify(article.value.content)
        });
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
        
        ElMessage.success('文章保存成功');
    } catch (e) {
        ElMessage.error(`文章创建失败! ${e}`)
    } finally {
        return
    }
    // 保存文章逻辑
    try {
        // 添加到索引
        const item = {
            id: article.value.id,
            title: article.value.title,
            author: article.value.author,
            tags: article.value.tags,
            categories: article.value.categories,
            created: article.value.created,
        };
        await save_entries_index(props.credits, item);

        // 保存文章内容
        const url = new URL(`./entries/${article.value.id}`, props.credits.oss_url);
        const head = {
            'Content-Type': 'text/x-rich-text; charset=utf-8',
        };
        const signed_url = await sign_url(url, {
            access_key_id: props.credits.ak,
            access_key_secret: props.credits.sk,
            bucket: props.credits.bucket,
            region: props.credits.region,
            expires: 30,
            method: 'PUT',
            additionalHeadersList: head,
        })
        const resp = await fetch(signed_url, {
            method: 'PUT',
            headers: head,
            body: JSON.stringify(article.value.content)
        });
        if (!resp.ok) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        ElMessage.success('文章保存成功');
    }
    catch (error) {
        ElMessageBox.alert('加载文章列表失败，请稍后重试。' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
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
    z-index: 20;
}
.article-title > input  {
    border: 0;
    margin: 0;
    flex: 1;
    outline: 0 !important;
    border-bottom: 1px solid gray;
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
    padding: 5px;
    position: sticky;
    top: calc(1.5em + 10px + 10px + 4px);
    z-index: 20;
}
@media (prefers-color-scheme: dark) {
    .bg-auto {
        --bg: #222222;
        --text-color: #ffffff;
    }
    .article-title > input {
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