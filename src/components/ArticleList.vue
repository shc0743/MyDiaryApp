<template>
    <div class="app" ref="root">
        <h2 style="margin-top: 0;">
            <span>文章列表</span>
            <a href="javascript:" @click.prevent="loadArticles()" style="margin-left: 1em; font-size: x-small; font-weight: normal;">加载</a>
        </h2>
        <div style="display: flex; margin-bottom: 0.5em;">
            <el-input v-model="searchKeyword" clearable placeholder=搜索... />
            <el-button @click="showFilter ? (showFilter = false) : (showFilter = true)" style="margin-left: 0.5em;">筛选</el-button>
        </div>
        <div v-if="isLoading" style="margin-bottom: 0.5em; margin-top: 1em;">
            <el-icon class="is-loading">
                <RefreshRight />
            </el-icon>
            <span style="margin-left: 0.5em; display: inline-block;">正在获取文章列表...</span>
        </div>
        <div v-if="!isLoading && !isEntriesEncrypted" style="margin: 0.5em 0;">
            <b style="color: red;">警告:&nbsp;</b>
            <span>索引文件没有加密。</span>
            <router-link to="/settings/">前往加密</router-link>
        </div>
        <div v-if="showFilter" class="filter-area" style="border: 1px solid #ccc; margin-bottom: 0.5em; padding: 10px; border-radius: 5px;">
            <label>
                <span class="label">日期:</span>
                <span class="content">
                    <span class="with-right-margin">从</span>
                    <el-date-picker v-model="filterData.date.from" type="datetime" placeholder="选择日期" clearable />
                    <span class="with-right-margin with-left-margin">到</span>
                    <el-date-picker v-model="filterData.date.to" type="datetime" placeholder="选择日期" clearable />
                </span>
            </label>

            <label>
                <span class="label">作者:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.authors" placeholder="输入作者" /> 
                </span>
            </label>

            <label>
                <span class="label">标签:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.tags" placeholder="输入标签" />
                </span>
            </label>

            <label>
                <span class="label">分类:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.categories" placeholder="输入分类" />
                </span>
            </label>

            <label>
                <span class="label">状态:</span>
                <span class="content">
                    <el-checkbox-group v-model="filterData.status">
                        <el-checkbox value="released" label="已发布" />
                        <el-checkbox value="draft" label="草稿" />
                    </el-checkbox-group>
                </span>
            </label>
        </div>

        <br>

        <div :data-show="computedCheckedArticles.length" class="checked-articles-overlay">
            <ElCheckbox v-model="checkedAll" />
            <span style="flex: 1;">已选中 {{ computedCheckedArticles.length }} 文章</span>
            <el-button size="small" type="danger" plain @click="deleteCheckedArticles(0)">消除</el-button>
            <el-button size="small" type="danger" plain @click="deleteCheckedArticles(1)">删除</el-button>
        </div>

        <!--动态渲染的文章列表-->
        <el-card v-for="article in filteredArticles" :key="article.id" style="margin-bottom: 1em;">
            <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <ElCheckbox v-model="checkedArticles[article.id]" class="article-checkbox" />
                    <span class="article-title" :title="(article.title && (
                        article.title.length > 300 ? (article.title.substring(0, 300) + '…') : article.title
                    )) || 'Untitled'">{{ article.title || '无标题' }}</span>
                    <div style="display: flex; align-items: center;">
                        <el-button draggable="true" @click="router.push(`/editor/${article.id}`)" @mousedown.middle.prevent="OpenLinkInNewWindow(`#/editor/${article.id}`)" @dragstart="setDragLink($event, `#/editor/${article.id}`)">编辑</el-button>
                        <el-button draggable="true" @click="router.push(`/article/${article.id}`)" @mousedown.middle.prevent="OpenLinkInNewWindow(`#/article/${article.id}`)" @dragstart="setDragLink($event, `#/article/${article.id}`)" type="primary" plain>打开</el-button>
                    </div>
                </div>
            </template>
            <div class="article-details">
                <div>作者: {{ article.author || '暂无' }}</div>
                <div>标签: <el-tag v-if="article.tags.length" v-for="tag in article.tags" :key="tag" size="small" style="margin-right: 0.5em;">{{ tag }}</el-tag><span v-else>暂无</span></div>
                <div>分类: <el-tag v-if="article.categories.length" v-for="category in article.categories" :key="category" size="small" type="info" style="margin-right: 0.5em;">{{ category }}</el-tag><span v-else>暂无</span></div>
                <div>创建时间: {{ new Date(+article.created).toLocaleString() }}</div>
                <div>最后更新: {{ new Date(+article.modified).toLocaleString() }}</div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { RefreshRight } from '@element-plus/icons-vue'

const emit = defineEmits(['update-title'])
const props = defineProps({
    credits: {
        type: Object,
        required: true
    }
})
emit('update-title', '文章列表')

const router = useRouter()

const searchKeyword = ref('')
const showFilter = ref(false)
const root = ref(null)

const filterData = ref({
    date: {
        from: '',
        to: ''
    },
    authors: [],
    tags: [],
    categories: [],
    status: ['released', 'draft']
})

const articles = ref([])
const checkedArticles = ref({})

// 声明一个计算属性，用于过滤和排序文章列表
const filteredArticles = computed(() => {
    return articles.value.filter(article => {
        const titleMatch = article.title.toLowerCase().includes(searchKeyword.value.toLowerCase())
        const dateMatch = (filterData.value.date.from && filterData.value.date.to) ?
            (new Date(+article.modified) >= new Date(filterData.value.date.from) && new Date(+article.modified) <= new Date(filterData.value.date.to)):
            true
        const authorMatch = filterData.value.authors.length === 0 || 
            filterData.value.authors.some(author => 
                article.author.toLowerCase().includes(author.toLowerCase()))
        const tagsMatch = filterData.value.tags.length === 0 || 
            filterData.value.tags.some(tag => 
                article.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
        const categoriesMatch = filterData.value.categories.length === 0 || 
            filterData.value.categories.some(cat => 
                article.categories.some(c => c.toLowerCase().includes(cat.toLowerCase())))
        
        return titleMatch && dateMatch && authorMatch && tagsMatch && categoriesMatch
    }).sort((a, b) => +b.created - +a.created)
})
const computedCheckedArticles = computed(() => {
    return Reflect.ownKeys(checkedArticles.value).filter(key => !!checkedArticles.value[key]);
})
const checkedAll = computed({
    get() {
        return computedCheckedArticles.value.length === filteredArticles.value.length;
    },
    set(val) {
        filteredArticles.value.forEach(article => {
            checkedArticles.value[article.id] = val;
        });
    }
})

// 保存滚动位置，优化用户体验
const restoreScroll = async () => {
    await new Promise(nextTick);
    const scrolltop = +globalThis.sessionStorage.getItem('MyDiaryApp::ArticleList::scrolltop');
    if (isNaN(scrolltop)) {
        return;
    }
    root.value.parentElement.scrollTop = scrolltop;
}
const saveScrollPosition = async () => {
    globalThis.sessionStorage.setItem('MyDiaryApp::ArticleList::scrolltop', root.value.parentElement.scrollTop);
}

// 在挂载完成后加载文章列表
onMounted(async () => {
    if (false === await loadArticles(false)) return;
    await restoreScroll();
    root.value.parentElement.addEventListener('scroll', saveScrollPosition, { passive: true });
    await loadArticles(true);
})
onBeforeUnmount(() => {
    root.value.parentElement.removeEventListener('scroll', saveScrollPosition, { passive: true });
})

// 加载文章列表的函数
import { is_entries_encrypted, load_entries_index } from '../entries.js';
const isLoading = ref(false)
const isEntriesEncrypted = ref(false)
async function loadArticles(loadLatest = true) {
    try {
        if (props.credits.loaded && (!props.credits.oss_url || !props.credits.ak || !props.credits.sk || !props.credits.bucket || !props.credits.region)) {
            router.push('/login/')
            return
        }
        await props.credits.prom;
        isLoading.value = true;
        if (load_entries_index.__cache__) {
            if (loadLatest) {
                const latest_data = await load_entries_index(props.credits, true);
                articles.value = latest_data;
            } else {
                articles.value = await load_entries_index(props.credits);
            }
        } else {
            articles.value = await load_entries_index(props.credits, true);
        }
        isEntriesEncrypted.value = is_entries_encrypted();
    }
    catch (error) {
        ElMessageBox.alert('加载文章列表失败，请稍后重试。' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
        return false;
    } finally {
        isLoading.value = false;
    }
}

function setDragLink(event, url) {
    url = new URL(url, location)
    event.dataTransfer.setData('text/plain', url);
    event.dataTransfer.setData('text/uri-list', url);
}
function OpenLinkInNewWindow(url) {
    requestAnimationFrame(() => {
        const winobj = window.open(url, '_blank');
        winobj.focus();
    });
}

async function deleteCheckedArticles(type) {
    // type 0 - 消除
    // type 1 - 删除
    return ElMessage.error('功能未实现');
}
</script>

<style scoped>
.app {
    padding: 5px;
    overflow: auto;
}
.filter-area > label {
    display: flex;
    align-items: center;
    vertical-align: middle;
}
.filter-area > label + label {
    margin-top: 0.5em;
}
.filter-area > label > span.label {
    margin-right: 0.5em;
}
.filter-area > label > span.content {
    flex: 1;
}
.filter-area .with-right-margin {
    margin-right: 0.5em;
}
.filter-area .with-left-margin {
    margin-left: 0.5em;
}
.article-details > div+div {
    margin-top: 0.5em;
}
.article-checkbox {
    margin-right: 0.5em;
}
.article-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}
.checked-articles-overlay {
    display: flex;
    align-items: center;
    position: fixed;
    top: var(--overlay-top, 0);
    left: 0; right: 0;
    background-color: white;
    padding: 10px;
    z-index: 10;
    border-bottom: 1px solid #ccc;
    box-sizing: border-box;
    opacity: 1;
    transition: opacity 0.2s ease;

    --overlay-top: calc(
        1em + ((8px) * 2) + 2px + ((10px) * 2) - 2px
    );
}
.checked-articles-overlay[data-show="0"] {
    visibility: hidden;
    opacity: 0;
}
.checked-articles-overlay > span {
    margin: 0 0.5em;
}
</style>