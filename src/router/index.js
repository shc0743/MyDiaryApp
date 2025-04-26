import { createRouter, createWebHashHistory } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import ArticleList from '../components/ArticleList.vue'
import EditorMain from '../components/EditorMain.vue'
import EncryptionManagement from '../components/EncryptionManagement.vue'

const routes = [
    {
        path: '/',
        redirect: '/list/'
    },
    {
        path: '/login/',
        component: LoginForm
    },
    {
        path: '/list/',
        component: ArticleList
    },
    {
        path: '/editor/',
        redirect: '/editor/new'  // 重定向到新建文章
    },
    {
        path: '/editor/new',
        component: EditorMain,
        props: { articleId: '' }  // 传递props表示是新建文章
    },
    {
        path: '/editor/:articleId',  // 动态路由
        component: EditorMain,
        props: true  // 将路由参数作为props传递
    },
    {
        path: '/encryption/management',
        component: EncryptionManagement
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router