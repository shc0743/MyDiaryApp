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
                <el-checkbox v-model="form_data.save_password" :style="{ color: isSafe ? 'green' : '' }">
                    保存密码 {{ isSafe ? '(安全)' : '(设置 PIN 即可安全地保存)' }}
                </el-checkbox>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" plain @click="handleSubmit" style="flex: 1;">登入</el-button>
                <el-button type="danger" plain @click="logout">退出登录</el-button>
            </el-form-item>
            <el-form-item>
                <el-button type="success" plain @click="importData" style="flex: 1;">导入</el-button>
                <el-button type="info" plain @click="exportData">导出凭据</el-button>
            </el-form-item>
            <el-form-item>
                要清除保存的自定义密码，请<router-link to="/settings/">前往“设置”</router-link>。
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IsPINSet, u } from '../user.js';

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

const isSafe = ref(false)

onMounted(async () => {
    if (await IsPINSet()) {
        form_data.value.save_password = true // 安全地保存密码
        isSafe.value = true
    }
})

const handleSubmit = async () => {
    try {
        const data = JSON.parse(JSON.stringify(form_data.value));
        if (!form_data.value.save_password) {
            data.sk = undefined
        }
        await u.setx('LogonData', data)
        emit('update-credits', form_data.value) // 传递新的 credits 值给父组件 (..)
        router.push('/welcome/')
    } catch (error) {
        ElMessageBox.alert('登入失败：' + error, '错误', { type: 'error', confirmButtonText: '好的' });
    }
}

function logout() {
    u.setx('LogonData', {}) // 清空登录数据
    ElMessageBox.alert('成功');
    setTimeout(() => { globalThis.location.reload(); }, 200) // 刷新页面 
}

async function importData() {
    try {
        const { value } = await ElMessageBox.prompt('请输入凭据', '导入凭据', {
            type: 'info',
            confirmButtonText: '下一步',
            cancelButtonText: '不要继续',
        });
        await ElMessageBox.confirm(h('div', {}, [
            h('span', {}, '注意: 我们无法确保第三方凭据的安全性和合法性！请确保您的输入来自'),
            h('b', {}, '您自己的导出'),
            h('span', {}, '而不是'),
            h('b', { style: { color: 'red' } }, '其他人或者第三方'),
            h('span', {}, '！'),
            h('br'),
            h('i', {}, '我们不对来自第三方凭据的非法内容负责。'),
        ]), '导入凭据', {
            confirmButtonText: '我已充分理解上述内容，继续操作',
            cancelButtonText: '放弃',
            type: 'warning',
        });
        try {
            const json = JSON.parse(value);
            const properties = Reflect.ownKeys(form_data.value);
            for (const key of properties) {
                if (!json[key]) {
                    throw new Error(`缺少属性：${key}`);
                }
                form_data.value[key] = json[key];
            }
            handleSubmit();
            ElMessage.success('成功。');
        }
        catch (error) {
            ElMessageBox.alert('导入失败：' + error, '错误', { type: 'error', confirmButtonText: '好的' });
        }
    }
    catch { } // 吃掉错误
}

async function exportData() {
    try {
        await ElMessageBox.confirm(h('div', {}, [
            h('span', {}, '注意: 这些凭据含有您的访问密钥等'),
            h('b', {}, '敏感信息'),
            h('span', {}, '！请勿向'),
            h('b', { style: { color: 'red' } }, '其他人或者第三方'),
            h('span', {}, '提供这些内容。'),
            h('br'),
            h('i', {}, '我们不对您的不当数据导出行为负责。'),
        ]), '导出凭据', {
            confirmButtonText: '我已充分理解上述内容，继续操作',
            cancelButtonText: '放弃',
            type: 'warning',
        });
        try {
            const data = JSON.stringify(props.credits) // 序列化 props.credits 为字符串
            ElMessageBox.prompt('请妥善保管您的凭据。按下[复制]按钮可以复制。', '凭据已经导出', {
                type: 'success',
                confirmButtonText: '复制',
                cancelButtonText: '好的',
                inputValue: data, // 将序列化后的字符串作为输入框的初始值
            }).then(async () => {
                try {
                    await navigator.clipboard.writeText(data);
                    ElMessage.success('凭据已复制到剪贴板。');
                }
                catch (error) {
                    ElMessage.error('复制失败。' + error);
                }
            }).catch(() => { });
        }
        catch (error) {
            ElMessageBox.alert('导出失败：' + error, '错误', { type: 'error', confirmButtonText: '好的' });
        }
    }
    catch { } // 吃掉错误
}
</script>

<style scoped>
.form-body {
    margin: 0 auto;
    max-width: 500px;
    display: flex;
    flex-direction: column;
}
</style>