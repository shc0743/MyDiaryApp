<template>
    <div class="form-body">
        <h2 style="text-align: center;">登入</h2>
        <el-form :model="form_data" label-width="80px">
            <el-form-item label="OSS 地址">
                <el-input placeholder="Please enter valid content" v-model="form_data.oss_url" clearable />
            </el-form-item>
            <el-form-item label="AK">
                <el-input placeholder="Please enter valid content" v-model="form_data.ak" clearable />
            </el-form-item>
            <el-form-item label="SK">
                <el-input placeholder="Please enter valid content" v-model="form_data.sk" type="password" clearable show-password />
            </el-form-item>
            <el-form-item label="Bucket">
                <el-input placeholder="Please enter valid content" v-model="form_data.bucket" clearable />
            </el-form-item>
            <el-form-item label="Region">
                <el-input placeholder="Please enter valid content" v-model="form_data.region" clearable />
            </el-form-item>
            <el-form-item>
                <el-checkbox v-model="form_data.save_password">保存密码</el-checkbox>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" plain @click="handleSubmit" style="flex: 1;">登入</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['update-title', 'update-credits'])
emit('update-title', '登入')

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

const form_data = ref({
    oss_url: props.credits.oss_url || '',
    ak: props.credits.ak || '',
    sk: props.credits.sk || '',
    bucket: props.credits.bucket || '',
    region: props.credits.region || '',
    save_password: props.credits.sk ? true : false
})

const handleSubmit = () => {
    // 由于 structuredClone 报错，使用 JSON 序列化和反序列化来实现深拷贝
    const data = JSON.parse(JSON.stringify(form_data.value));
    if (!form_data.value.save_password) {
        data.sk = undefined
    }
    u.set('LogonData', (data))
    emit('update-credits', form_data.value) // 传递新的 credits 值给父组件 (..)
    router.push('/list/')
}
</script>

<style scoped>
.form-body {
    margin: 0 auto;
    max-width: 500px;
}
</style>