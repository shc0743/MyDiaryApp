import { createRouter, createWebHashHistory } from 'vue-router'


const routes = [
    {
        path: '/:pathMatch(.*)*',
        component: () => import('../components/NotFound.vue')
    },
    {
        path: '/',
        redirect: '/welcome/'
    },
    {
        path: '/welcome/',
        component: () => import('../components/Welcome.vue')
    },
    {
        path: '/login/',
        component: () => import('../components/LoginForm.vue')
    },
    {
        path: '/list/',
        component: () => import('../components/ArticleList.vue')
    },
    {
        path: '/editor/',
        redirect: '/editor/new'  // 重定向到新建文章
    },
    {
        path: '/editor/new',
        component: () => import('../components/EditorMain.vue'),
        props: { articleId: '' }  // 传递props表示是新建文章
    },
    {
        path: '/editor/:articleId',  // 动态路由
        component: () => import('../components/EditorMain.vue'),
        props: true  // 将路由参数作为props传递
    },
    {
        path: '/article/:articleId',  // 动态路由
        component: () => import('../components/Viewer.vue'),
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