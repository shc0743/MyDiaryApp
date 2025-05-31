<template>
    <div class="not-found">
        <h1>404</h1>
        <p>抱歉，您访问的页面不存在。</p>
        <router-link to="/">返回首页</router-link>
    </div>
</template>

<script setup>
// 这里可以添加组件的逻辑
import { onMounted, defineEmits } from 'vue'
const emit = defineEmits(['update-title'])
onMounted(() => {
    emit('update-title', '404')
})
</script>

<style scoped>

</style>