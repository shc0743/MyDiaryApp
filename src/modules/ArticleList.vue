<template>
  <div>
    <h2>文章列表</h2>
    <p>这里是文章列表内容</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['update-title'])
emit('update-title', '文章列表')

const router = useRouter()

onMounted(() => {
  const ossConfig = localStorage.getItem('Project:MyDiaryApp;Type:User;Key:LogonData')
  if (!ossConfig) {
    router.push('/login/')
  }
})
</script>