<template>
    <div class="app-container">
        <nav>
            <el-button><el-icon>
                    <Expand />
                </el-icon></el-button>
            <div class="title">{{ title }}</div>
            <el-button @click="showAppMenu = true"><el-icon>
                    <Fold />
                </el-icon></el-button>
        </nav>
        <div class="content">
            <router-view @update-title="updateTitle" @update-credits="updateCredits" :credits="credits"></router-view>
        </div>

        <ElDrawer v-model="showAppMenu" :with-header="false" direction="rtl" size="300px">
            <ElMenu default-active="/" mode="vertical" @select="handleAppMenuSelect"
                style="overflow: auto; height: 100%;">
                <ElMenuItem index="#welcome">My Diary</ElMenuItem>
                <ElMenuItem index="#article">文章列表</ElMenuItem>
                <ElMenuItem index="#date">日期列表</ElMenuItem>
                <ElSubMenu index="#撰写文章">
                    <template #title>撰写文章</template>
                    <ElMenuItem index="#editor">文章编辑器</ElMenuItem>
                    <ElMenuItem index="#new">新文章</ElMenuItem>
                    <ElMenuItem index="#save">保存更改</ElMenuItem>
                </ElSubMenu>
                <ElMenuItem index="#secm">Secret 管理</ElMenuItem>
                <ElMenuItem index="#settings">设置</ElMenuItem>
                <ElMenuItem index="#u">{{credits.sk ? "已登入" : "登入"}}</ElMenuItem>
                <ElMenuItem index="#x">关闭菜单</ElMenuItem>
            </ElMenu>
        </ElDrawer>
    </div>

    <resizable-widget ref="sys_info_box" style="width: 500px; height: 300px;">
        <widget-caption slot="widget-caption">
            <span>系统信息</span>
            <button style="float:right" data-exclude-bindmove="" @click="sys_info_box.close()">x</button>
        </widget-caption>
        <div style="display: flex; flex-direction: column; height: 100%; overflow: auto; white-space: normal; word-break: break-all;">
            <div>使用 Vue.JS。<a href="./copyright/"
                    @click.prevent="((loadCopyRightFrame = true), (copyrightBox.open = true))">点击查看版权信息。</a></div>
            <hr style="box-sizing: border-box; width: 100%;">
            <div>版本: {{appVersion}}</div>
            <div>加密版本: {{ enc_version }}</div>
        </div>
    </resizable-widget>

    <!-- copyrightBox -->
    <resizable-widget ref="copyrightBox" style="width: 800px; height: 480px; --padding: 0;">
        <widget-caption slot="widget-caption">
            <span>Copyright & License</span>
            <button style="float:right" data-exclude-bindmove="" @click="$refs.copyrightBox.close()">x</button>
        </widget-caption>
        <iframe sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
            v-if="loadCopyRightFrame" src="./assets/LICENSE.html"
            style="width: 100%; height: 100%; overflow: hidden; border: 0; box-sizing: border-box; display: flex; flex-direction: column;"></iframe>
    </resizable-widget>
    <!-- copyrightBox -->

    <dialog ref="dlgInputPasswd" @close="doneInputPasswd(false)" style="width: 240px;">
        <form method="dialog" @submit.prevent="doneInputPasswd(true)">
            <div style="font-size: large; margin-bottom: 0.5em;">啊~哦!</div>
            <div style="margin-bottom: 0.5em;" v-text="userInputPasswdShowStr"></div>
            <div style="margin-bottom: 0.5em; white-space: nowrap; overflow: hidden;">密码:&nbsp;<select
                    v-model="userInputPasswdSelectedOption">
                    <option value="_">自动选择</option>
                    <option v-for="option in userInputPasswdOptionsList" :key="option" :value="option">
                        {{option}}
                    </option>
                </select></div>
            <div style="margin-bottom: 0.5em;">输入密码:</div>
            <el-input v-model="userInputPasswd" autofocus type="password" clearable show-password />
            <div style="margin-top: 0.5em; display: flex; justify-content: space-between; align-items: center;">
                <ElCheckbox v-model="userSavePasswd" :disabled="userCanSavePasswd == false">保存</ElCheckbox>
                <div style="display: flex; align-items: center;">
                    <el-button @click="doneInputPasswd(false)">取消</el-button>
                    <el-button type="primary" plain @click="doneInputPasswd(true)">解密</el-button>
                </div>
            </div>
        </form>
    </dialog>
</template>

<script setup>
import { ref, onMounted, nextTick, h, computed } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElCheckbox, ElMessage, ElMessageBox } from 'element-plus'
import { VERSION } from 'simple-data-crypto/builder'
import { u } from './user.js';
const router = useRouter()

const title = ref('')
const appVersion = ref('')
const showAppMenu = ref(false)
const sys_info_box = ref(null)  
const loadCopyRightFrame = ref(false)
const copyrightBox = ref(null)

const updateTitle = (newTitle) => {
    title.value = newTitle
    document.title = newTitle + ' - My Diary App'
}

const updateCredits = (newCredits) => {
    credits.value = newCredits
}

const enc_version = computed(() => {
    return VERSION
});

let credits
credits = ref({
    oss_url: '',
    ak: '',
    sk: '',
    bucket: '',
    region: '',
    loaded: false,
    prom: new Promise(async (resolve, reject) => {
        await new Promise(r => requestAnimationFrame(r));
        credits.prom_resolve = resolve;
    }),
})

const dlgInputPasswd = ref(null)
const userInputPasswd = ref('')
const userSavePasswd = ref(false)
const userCanSavePasswd = ref(false)
const userInputPasswdFn = ref({})
const userInputPasswdOptionsList = ref([])
const userInputPasswdSelectedOption = ref('_')
const userInputPasswdShowStr = ref('')

/**
 * requestInputPasswd
 * @param passwordOptionsList Password options list.
 * @param allow_Save Configure if the user can save the password.
 * @param text Text to display.
 * @returns {Promise<{value: string, save: boolean, option: string}>}
 */
function requestInputPasswd(passwordOptionsList = [], allow_Save = true, text = null) {
    return new Promise((resolve, reject) => {
        dlgInputPasswd.value.showModal()
        userInputPasswdFn.value.resolve = resolve;
        userInputPasswdFn.value.reject = reject;
        userInputPasswd.value = '';
        userSavePasswd.value = false;
        userCanSavePasswd.value = !!allow_Save;
        userInputPasswdOptionsList.value = passwordOptionsList;
        userInputPasswdSelectedOption.value = '_';
        if (text) userInputPasswdShowStr.value = text;
        else userInputPasswdShowStr.value = '此内容已加密。';
    })
}

async function requestOtpConfirm(operation, text) {
    const { value } = await ElMessageBox.prompt(h('div', [], [
        h('div', [], `您正在执行[${operation}]，请输入动态验证码以继续。`),
        h('div', { style: { 'margin-top': '0.5em' } }, text),
    ]), '请确认此操作', {
        confirmButtonText: '执行此操作',
        cancelButtonText: '不要执行',
        type: 'warning',
    });
    return value;
}

function get_credit() {
    return credits.value
}

function show_sys_info() {
    sys_info_box.value.open = true;
}

const api = {
    requestInputPasswd,
    requestOtpConfirm,
    get_credit,
    show_sys_info,
}
defineExpose(api)
onMounted(async () => {
    await nextTick()
    globalThis.appComponent = api

    queueMicrotask(async () => {
        await new Promise(r => requestAnimationFrame(r));
        try {
            const data = await u.getx('LogonData');
            if (!data) throw -1;
            credits.value = (data);
        } catch (e) {
            if (e !== -1) ElMessageBox.alert('拒绝访问。', '错误', { type: 'error', confirmButtonText: '重新加载' }).finally(() => {
                globalThis.location.reload();
            })
        }
        credits.value.loaded = true;
        credits.prom_resolve();
    })
})

function doneInputPasswd(ok) {
    if (!ok) userInputPasswdFn.value.reject?.();
    if (userInputPasswdSelectedOption.value === '_') userInputPasswdSelectedOption.value = '';
    userInputPasswdFn.value.resolve?.({ value: userInputPasswd.value, save: userSavePasswd.value, option: userInputPasswdSelectedOption.value });
    dlgInputPasswd.value.close()
}

function handleAppMenuSelect(data) {
    switch (data) {
        case '/':
            sys_info_box.value.open = true;
            break;
        case '#welcome':
            router.push('/welcome/');
            break;
        case '#article':
            router.push('/list/');
            break;
        case '#date':
            router.push('/date/');
            break;
        case '#editor':
        case '#new':
            router.push('/editor/');
            break;
        case '#em':
            router.push('/encryption/management');
            break;
        case '#secm':
            router.push('/secret/management');
            break;
        case '#settings':
            router.push('/settings/');
            break;
        case '#u':
            router.push('/login/');
            break;
        case '#x':
            showAppMenu.value = false;
            break;
        case '#save': {
            const editor = globalThis.myEditor;
            if (!editor) ElMessage.error('没有打开编辑器');
            else editor.save_article().then(() => ElMessage.success('保存成功'));
        }
            break;

        default: return;
    }
    showAppMenu.value = false;
}

fetch('./assets/version.json').then(v => v.json()).then(json => {
    if (json.schema_version === 1) {
        appVersion.value = json.data.values['app.version.id'];
    } else {
        console.warn('[version]', 'Unsupported schema version:', json.schema_version);
        appVersion.value = '0.0.0.0';
    }
}).catch(() => appVersion.value = '0.0.0.0');
</script>

<style>
:root,
:root>body * {
    font-family: Consolas, NSimsun, monospace;
}
</style>

<style scoped>
.app-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    z-index: 5;
}

nav {
    display: flex;
    padding: 10px;
    background: #f5f5f5;
}

.title {
    flex: 1;
    text-align: center;
    line-height: 32px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.content {
    flex: 1;
    padding: 10px;
    overflow: auto;
    box-sizing: border-box;
}

.app-loading-ui-suspense {
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>
