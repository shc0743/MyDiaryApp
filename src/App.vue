<template>
  <div class="app-container">
    <nav class="nav-bar">
      <el-button><el-icon><Expand /></el-icon></el-button>
      <div class="title">{{ title }}</div>
      <el-button><el-icon><Fold /></el-icon></el-button>
    </nav>
    <div class="content">
      <router-view @update-title="updateTitle" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'

const title = ref('')

const updateTitle = (newTitle) => {
  title.value = newTitle
}
</script>

<style>
:root, :root > body * {
  font-family: Consolas, NSimsun, monospace;
}
</style>

<style scoped>
.app-container {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  padding: 10px;
  background: #f5f5f5;
}

.title {
  flex: 1;
  text-align: center;
  line-height: 32px;
}

.content {
  flex: 1;
  padding: 10px;
  overflow: auto;
}
</style>
