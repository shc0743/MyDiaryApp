import { createRouter, createWebHashHistory } from 'vue-router'
import LoginForm from '../modules/LoginForm.vue'
import ArticleList from '../modules/ArticleList.vue'

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
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router