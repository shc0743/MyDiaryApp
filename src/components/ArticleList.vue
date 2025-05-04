<template>
    <div class="app">
        <h2 style="margin-top: 0;">
            <span>文章列表</span>
            <a href="javascript:" @click.prevent="loadArticles()" style="margin-left: 1em; font-size: x-small; font-weight: normal;">加载</a>
        </h2>
        <div style="display: flex; margin-bottom: 0.5em;">
            <el-input v-model="searchKeyword" clearable placeholder=搜索... />
            <el-button @click="showFilter ? (showFilter = false) : (showFilter = true)" style="margin-left: 0.5em;">筛选</el-button>
        </div>
        <div v-if="showFilter" class="filter-area" style="border: 1px solid #ccc; margin-bottom: 0.5em; padding: 10px; border-radius: 5px;">
            <label>
                <span class="label">日期:</span>
                <span class="content">
                    <span class="with-right-margin">从</span>
                    <el-date-picker v-model="filterData.date.from" type="date" placeholder="选择日期" clearable />
                    <span class="with-right-margin with-left-margin">到</span>
                    <el-date-picker v-model="filterData.date.to" type="date" placeholder="选择日期" clearable />
                </span>
            </label>

            <label>
                <span class="label">作者:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.authors" placeholder="输入作者" trigger="Space" /> 
                </span>
            </label>

            <label>
                <span class="label">标签:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.tags" placeholder="输入标签" trigger="Space" />
                </span>
            </label>

            <label>
                <span class="label">分类:</span>
                <span class="content">
                    <el-input-tag v-model="filterData.categories" placeholder="输入分类" trigger="Space" />
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

        <!--动态渲染的文章列表-->
        <el-card v-for="article in filteredArticles" :key="article.id" style="margin-bottom: 1em;">
            <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>{{ article.title || '无标题' }}</span>
                    <div style="display: flex; align-items: center;">
                        <el-button @click="router.push(`/editor/${article.id}`)" >编辑</el-button>
                        <el-button @click="router.push(`/article/${article.id}`)" type="primary" plain>打开</el-button>
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
import { ElMessageBox } from 'element-plus'
import { ref, computed } from 'vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

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
    })
})

// 在挂载完成后加载文章列表
onMounted(async () => {
    await loadArticles()
})

// 加载文章列表的函数
import { sign_url } from '../../lib/util/sign';
async function loadArticles() {
    try {
        if (props.credits.loaded && (!props.credits.oss_url || !props.credits.ak || !props.credits.sk || !props.credits.bucket || !props.credits.region)) {
            router.push('/login/')
            return
        }
        await props.credits.prom;
        const data = await load_entries_index(props.credits, true);
        articles.value = data;
    }
    catch (error) {
        ElMessageBox.alert('加载文章列表失败，请稍后重试。' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => {}).catch(() => {})
    }
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
</style>