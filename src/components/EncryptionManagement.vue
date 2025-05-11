<template>
    <div>
        <h2>加密管理中心</h2>

        <fieldset>
            <legend>索引文件</legend>

            <el-button @click="enc_entries">加密</el-button>
        </fieldset>

        <fieldset hidden>
            <legend>STAGING</legend>

            <el-button @click="test_requestInputPasswd">Test requestInputPasswd</el-button>
        </fieldset>
    </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { sign_url } from 'alioss-sign-v4-util';
import { encrypt_data } from 'simple-data-crypto/builder';
import { ref, computed } from 'vue'
import { file_inmemory_encrypt } from '../entries.js';

const emit = defineEmits(['update-title'])
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
emit('update-title', '加密管理中心')

async function enc_entries() {
    let pwd;
    try {
        await ElMessageBox.confirm('确定要加密索引文件吗？', '加密', {
            type: 'warning', confirmButtonText: '立即加密', cancelButtonText: '不要加密'
        });
        pwd = (await ElMessageBox.prompt('请设置密码。', '加密', {
            type: 'info', confirmButtonText: '立即加密', cancelButtonText: '不要加密'
        })).value; if (!pwd) return;
    } catch { return };

    // 加密
    try {
        // 获取最新索引
        const latest_index = await load_entries_index(props.credits, true);
        const str = JSON.stringify({
            version: 1,
            schema_version: 1,
            type: 'x-my-diary-app-entries-list',
            entries: latest_index,
        }, null, 2);
        const encrypted = await file_inmemory_encrypt(new Blob([str]), pwd);

        // 保存
        const head = {
            'Content-Type': 'application/x-encrypted',
        };
        const url = new URL('./data/entries.json', props.credits.oss_url);
        const signed_url = await sign_url(url, {
            access_key_id: props.credits.ak,
            access_key_secret: props.credits.sk,
            bucket: props.credits.bucket,
            region: props.credits.region,
            expires: 30,
            method: 'PUT',
            additionalHeadersList: head,
        })
        const resp = await fetch(signed_url, {
            method: 'PUT',
            headers: head,
            body: encrypted
        });
        if (resp.ok == false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        ElMessage.success('成功。')
        return true
    }
    catch (error) {
        ElMessageBox.alert('加密失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}


function test_requestInputPasswd() {
    globalThis.appComponent.requestInputPasswd().then(v => {
        console.log(v)
    }).catch(() => console.log("cancel"));
}
</script>

<style scoped>

</style>