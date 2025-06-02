<template>
    <div class="welcome-page">
        <h1 style="margin-top: 0;">欢迎使用我的日记应用</h1>
        <template v-if="step === 1000">
            <p>开始记录您的美好时光吧！</p>
            <a href="javascript:" @click="router.push('/list/')">查看文章列表</a>
            <a href="javascript:" @click="router.push('/editor/new')">撰写新的文章</a>
        </template>
    </div>
</template>

<script setup>
// 这里可以添加组件的逻辑
import { onMounted, defineEmits, defineProps, ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const props = defineProps({
    credits: {
        type: Object,
        default: () => ({
            oss_url: '',
            ak: '',
            sk: '',
            bucket: '',
            region: '',
        })
    }
})
const emit = defineEmits(['update-title'])
onMounted(() => {
    emit('update-title', '欢迎')
})

const step = ref(1000)
</script>

<style scoped>
.welcome-page {
    text-align: center;
    padding: 20px;
}
.welcome-page > a {
    display: block;
}
</style>