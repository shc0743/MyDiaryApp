<template>
    <div class="welcome-page">
        <h1 style="margin-top: 0;">欢迎使用我的日记应用</h1>
        <template v-if="step === 0">
            <p>正在加载，请稍候……</p>
        </template>
        <template v-if="step === 1">
            <p>请<router-link to="/login/">前往登录</router-link>以使用此应用程序。</p>
        </template>
        <template v-if="step === 102">
            <p>检测到安全风险: 索引文件没有加密。请<router-link to="/settings/">前往加密</router-link>以安全地使用此应用程序。</p>
        </template>
        <template v-if="step === 103">
            <p>检测到安全风险: PIN 没有设置。请<router-link to="/settings/">前往设置</router-link>以防止未经授权的数据访问。</p>
        </template>
        <template v-if="step === 1000">
            <p>开始记录您的美好时光吧！</p>
        </template>
        <template v-if="step > 100">
            <p v-if="step === 101">&nbsp;</p><!-- 防止CLS（布局偏移） -->
            <a href="javascript:" @click="router.push('/list/')">查看文章列表</a>
            <a href="javascript:" @click="router.push('/editor/new')">撰写新的文章</a>
        </template>
    </div>
</template>

<script setup>
// 这里可以添加组件的逻辑
import { ElMessage } from 'element-plus'
import { onMounted, defineEmits, defineProps, ref } from 'vue'
import { useRouter } from 'vue-router'
import { is_entries_encrypted, load_entries_index } from '../entries'
import { IsPINSet } from '../pin_user'
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
    loadSteps()
})

const step = ref(0)
async function loadSteps() {
    step.value = 0
    if (!props.credits.ak || !props.credits.sk || !props.credits.bucket || !props.credits.region || !props.credits.oss_url) {
        step.value = 1
        return
    }
    try {
        step.value = 101
        try {
            await load_entries_index(props.credits);
            if (is_entries_encrypted() == false) {
                step.value = 102
                return;
            }
        } catch { }

        if (!await IsPINSet()) {
            step.value = 103
            return;
        }

        step.value = 1000;
    } catch (error) {
        console.error('[Welcome]', error);
        ElMessage.error(error);
    }
} 
</script>

<style scoped>
.welcome-page {
    text-align: center;
    padding: 20px;
}
.welcome-page > a {
    display: block;
    margin-bottom: 0.5em;
    font-size: larger;
}
.welcome-page > p {
    word-break: break-all;
}
</style>