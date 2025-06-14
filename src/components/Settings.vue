<template>
    <div>
        <h1>设置</h1>

        <ElCard class="card">
            <template #header>
                <span>数据持久化</span>
            </template>
            <div>状态: {{ (persist_status === true) ? 'ok' : (persist_status === false ? '失败。请尝试与应用程序更多互动、将应用程序作为 PWA 安装、或者在 chrome://site-engagement/ 中提高优先级。' : (persist_status === 0 ? '点击以持久化数据。' : persist_status)) }}</div>
            <ElButton type="success" plain @click="doPersist" v-if="persist_status === 0" style="margin-top: 0.5em;">持久化</ElButton>
        </ElCard>

        <ElCard class="card">
            <template #header>
                <span>加密索引文件</span>
            </template>
            <template v-if="isEntriesEncrypted">
                <div style="color: green;">索引文件已加密。</div>
                <ElButton style="margin-top: 0.5em;" @click="encryptEntries">更改密码</ElButton>
                <ElButton style="margin-top: 0.5em;" @click="decryptEntries" type="danger" plain>解密索引文件</ElButton>
            </template>
            <template v-else-if="isEntriesEncrypted === undefined">
                <div>正在检查索引文件是否加密。</div>
            </template>
            <template v-else-if="isEntriesEncrypted === null">
                遇到了异常。请刷新页面以重试。
            </template>
            <template v-else>
                <div style="color: red;">索引文件没有加密。</div>
                <ElButton style="margin-top: 0.5em;" @click="encryptEntries" type="primary" plain>加密索引文件</ElButton>
            </template>
            <div style="margin-top: 0.5em;">
                <b style="color: blue">注意:&nbsp;</b>
                <span>索引文件采取单独的密码管理体系。</span>
            </div>
        </ElCard>

        <ElCard class="card">
            <template #header>
                <span>PIN 设置</span>
            </template>
            <template v-if="isPINSet">
                <div style="color: green;">PIN 已设置。</div>
                <ElButton style="margin-top: 0.5em;" @click="changePIN">更改 PIN</ElButton>
                <ElButton style="margin-top: 0.5em;" plain type="danger" @click="clearPIN">清除 PIN</ElButton>
            </template>
            <template v-else>
                <div style="color: red;">PIN 未设置。</div>
                <ElButton style="margin-top: 0.5em;" @click="mySetPIN" type="primary" plain>设置 PIN</ElButton>
            </template>
        </ElCard>

        <ElCard class="card">
            <template #header>
                <span>保存的密码</span>
            </template>
            <div style="display: flex; align-items: center;">
                <span>您可以清除保存的密码。</span>
                <ElButton type="danger" plain @click="clearSavedPasswd(true)">清除所有</ElButton>
            </div>
            <hr>
            <div>以下是保存的密码列表：</div>
            <div v-for="(item, k) in saved_passwd_list" :key="k" class="saved-passwd-item">
                <b>{{ k }} 中的 <code>{{ item.name }}</code></b>
                <a href="javascript:" @click="showPassPhrase(item, k)">查看passphrase</a>
                <a href="javascript:" @click="clearSavedPasswd(k)">清除</a>
            </div>
            <hr>
            <div>以下是 索引文件 体系中保存的密码：</div>
            <div v-for="(item) in saved_passwd_text_list" :key="item" class="saved-passwd-item">
                <b>{{ (item?.substring(0, 2) || '???') + '...' }}</b>
                <a href="javascript:" @click="showPassPhrase(item, '密码')">查看passphrase</a>
                <a href="javascript:" @click="clearSavedPasswdLegacy(item)">清除</a>
            </div>
        </ElCard>

        <ElCard class="card">
            <template #header>
                <span>关于</span>
            </template>
            <ElButton @click="openSysInfo">点击打开。</ElButton>
        </ElCard>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElCard, ElButton, ElMessageBox, ElMessage } from 'element-plus'
import { dynamic_decrypt, is_entries_encrypted, load_entries_index, set_this_time_password, signit } from '../entries'
import { encrypt_blob } from 'simple-data-crypto/builder'
import { generateQuestion } from '../relation'
import { u, IsPINSet, SetPIN, ChangePIN, ClearPIN } from '../user.js';

const emit = defineEmits(['update-title'])
const props = defineProps({
    credits: {
        type: Object,
        required: true
    }
})
onMounted(async () => {
    emit('update-title', '设置')
    try {
        persist_status.value = (await navigator.storage.persisted() === true) ? true : 0
    }
    catch (error) {
        persist_status.value = '状态获取失败: ' + error
    }
    load_entries_index(props.credits).then(() => {
        isEntriesEncrypted.value = is_entries_encrypted()
    }).catch(() => {
        isEntriesEncrypted.value = null;
    }).finally(async () => {
        try {
            saved_passwd_list.value = await u.getx('saved_secret_passwords') || {}
            saved_passwd_text_list.value = await u.getx('saved_passwords') || []
        } catch (error) {
            ElMessage.error('拒绝访问。')
        }
    })
    isPINSet.value = await IsPINSet()
})

const isPINSet = ref(undefined)

const persist_status = ref('正在加载...')
async function doPersist() {
    try {
        persist_status.value = await navigator.storage.persist()
    }
    catch (error) {
        persist_status.value = '操作失败: '+ error
    }
}

function openSysInfo() {
    globalThis.appComponent.show_sys_info();
}

const isEntriesEncrypted = ref(undefined)
async function encryptEntries() {
    let pwd;
    try {
        pwd = (await ElMessageBox.prompt('请设置密码。', '加密', {
            type: 'info', confirmButtonText: '立即加密', cancelButtonText: '不要加密'
        })).value; if (!pwd) return;
    } catch { return };

    const dialog = document.createElement('dialog');
    dialog.append('请稍候...');
    dialog.oncancel = () => requestAnimationFrame(() => dialog.showModal());
    document.body.append(dialog);
    dialog.showModal();

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
        const encrypted = await encrypt_blob(new Blob([str]), pwd);

        // 保存
        const head = {
            'Content-Type': 'application/x-encrypted',
        };
        const url = new URL('./data/entries.json', props.credits.oss_url);
        const signed_url = await signit(url, 'PUT', head);
        const resp = await fetch(signed_url, {
            method: 'PUT',
            headers: head,
            body: encrypted
        });
        if (resp.ok == false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;

        set_this_time_password(pwd);
        await load_entries_index(props.credits, true);
        dialog.close();
        ElMessageBox.alert('加密成功。', '成功', {
            confirmButtonText: '确定',
            type:'success',
        }).then(() => { }).catch(() => { })
        isEntriesEncrypted.value = is_entries_encrypted();
    }
    catch (error) {
        ElMessageBox.alert('加密失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
        dialog.close();
    }
    finally {
        dialog.remove();
    }
}
async function decryptEntries() {
    try {
        await ElMessageBox.confirm('解密索引文件后，您将无法使您的数据免受未经授权的访问。您真的要这样做吗？', '解密索引文件', {
            confirmButtonText: '输入动态验证码以继续',
            cancelButtonText: '放弃',
            type: 'warning',
        });

        const otp = Math.floor(Math.random() * 1000000).toString();
        const user = await globalThis.appComponent.requestOtpConfirm('解密索引文件', `动态验证码是 ${otp}。动态验证码不是 ${Math.floor(Math.random() * 1000000).toString()}。`);
        if (user !== otp) throw 'yzmcw';
        const { question, answer } = generateQuestion();
        const userRisk = await globalThis.appComponent.requestOtpConfirm('解密索引文件', question);
        if (userRisk !== answer) throw 'yzmcw';
    } catch { return }

    try {
        const blob = await (await fetch(await signit(new URL('./data/entries.json', props.credits.oss_url)))).blob();
        const decrypted = await dynamic_decrypt(blob);
        // PUT
        const head = {
            'Content-Type': 'application/json',
        };
        const url = new URL('./data/entries.json', props.credits.oss_url);
        const signed_url = await signit(url, 'PUT', head);
        const resp = await fetch(signed_url, {
            method: 'PUT',
            headers: head,
            body: decrypted
        });
        if (resp.ok == false) throw `HTTP Error ${resp.status}: ${resp.statusText}`;
        ElMessageBox.alert('解密成功。现在必须重新加载页面。', '成功', {
            confirmButtonText: '确定',
            type: 'success',
        }).then(() => { }).catch(() => { })
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    catch (error) {
        ElMessageBox.alert('解密失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}

const saved_passwd_list = ref({})
const saved_passwd_text_list = ref([])
async function showPassPhrase(item, k) {
    ElMessageBox.prompt('这是passphrase内容。', k, {
        confirmButtonText: '确定',
        type: 'info',
        inputValue: typeof item === 'string' ? item : item?.passphrase,
        cancelButtonText: '取消',
    }).catch(() => { })
}
async function clearSavedPasswd(k) {
    try {
        await ElMessageBox.confirm('请确认此操作。', '清除保存的密码', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning',
        });
    }
    catch { return }
    if (k === true) {
        await u.setx('saved_secret_passwords', {})
        saved_passwd_list.value = {}
        await u.setx('saved_passwords', [])
        saved_passwd_text_list.value = []
        ElMessage.success('已清除所有保存的密码。')
        return
    }
    const original = await u.getx('saved_secret_passwords')
    Reflect.deleteProperty(original, k)
    await u.setx('saved_secret_passwords', original)
    saved_passwd_list.value = original
    ElMessage.success('已清除 ' + k + ' 。');
}
async function clearSavedPasswdLegacy(k) {
    try {
        await ElMessageBox.confirm('请确认此操作。', '清除保存的密码', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning',
        });
    }
    catch { return }
    /**
     * @type {Array<string>}
     */
    const original = await u.getx('saved_passwords')
    const index = original.indexOf(k)
    if (index === -1) return
    original.splice(index, 1)
    await u.setx('saved_passwords', original)
    saved_passwd_text_list.value = original
    ElMessage.success('已清除。');
}

async function changePIN() {
    let pwd;
    try {
        pwd = (await ElMessageBox.prompt('请设置新的 PIN。', '设置 PIN', {
            type: 'info', confirmButtonText: '立即设置', cancelButtonText: '不要设置'
        })).value; if (!pwd) return;
    } catch { return };
    try {
        await ChangePIN(pwd);
        ElMessageBox.alert('设置成功。', '成功', {
            confirmButtonText: '确定',
            type:'success',
        }).then(() => { }).catch(() => { }).finally(() => {
            window.location.reload();
        })
    }
    catch (error) {
        ElMessageBox.alert('设置失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}
async function clearPIN() {
    try {
        await ElMessageBox.confirm('请确认此操作。', '清除 PIN', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'error',
        });
    } catch { return }
    try {
        await ClearPIN();
        ElMessageBox.alert('清除成功。', '成功', {
            confirmButtonText: '确定',
            type:'success',
        }).then(() => { }).catch(() => { }).finally(() => {
            window.location.reload();
        })
    } catch (error) {
        ElMessageBox.alert('清除失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}
async function mySetPIN() {
    let pwd;
    try {
        pwd = (await ElMessageBox.prompt('请设置 PIN。', '设置 PIN', {
            type: 'info', confirmButtonText: '立即设置', cancelButtonText: '不要设置'
        })).value; if (!pwd) return;
    } catch { return };
    try {
        await SetPIN(pwd);
        ElMessageBox.alert('设置成功。', '成功', {
            confirmButtonText: '确定',
            type:'success',
        }).then(() => { }).catch(() => { }).finally(() => {
            window.location.reload();
        })
    } catch (error) {
        ElMessageBox.alert('设置失败！原因：' + error, '错误', {
            confirmButtonText: '确定',
            type: 'error',
        }).then(() => { }).catch(() => { })
    }
}
</script>

<style scoped>
.card + .card {
    margin-top: 1em;
}
.saved-passwd-item {
    display: flex;
    flex-direction: column;
    word-break: break-all;
}
.saved-passwd-item > a::before {
    content: "-";
    margin-right: 0.5em;
    color: black;
    text-decoration: none !important;
}
.saved-passwd-item > a:hover::before {
    text-decoration: none !important;
}
</style>