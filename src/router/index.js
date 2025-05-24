import { createRouter, createWebHashHistory } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import ArticleList from '../components/ArticleList.vue'
import Viewer from '../components/Viewer.vue'
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
        path: '/article/:articleId',  // 动态路由
        component: Viewer,
        props: true  // 将路由参数作为props传递
    },
    {
        path: '/encryption/management',
        component: () => import('../components/EncryptionManagement.vue')
    },
    {
        path: '/secret/management',
        component: () => import('../components/SecretManagement.vue')
    },
    {
        path: '/secret/management.STAGING',
        component: () => import('../components/SecretManagement.vue'),
        props: { staging: true }  // 传递staging为true
    },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router