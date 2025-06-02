<template>
  <div>
    <h1>设置</h1>
  </div>
</template>

<script setup>
import { onMounted, defineEmits } from 'vue'
const emit = defineEmits(['update-title'])
onMounted(() => {
    emit('update-title', '设置')
})
</script>

<style scoped>

</style>