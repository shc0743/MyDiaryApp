<template>
  <div class="welcome-page">
    <h1>欢迎使用我的日记应用</h1>
    <p>开始记录您的美好时光吧！</p>
  </div>
</template>

<script setup>
// 这里可以添加组件的逻辑
import { onMounted, defineEmits } from 'vue'
const emit = defineEmits(['update-title'])
onMounted(() => {
    emit('update-title', '欢迎')
})
</script>

<style scoped>
.welcome-page {
  text-align: center;
  padding: 20px;
}
</style>