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
            <router-view @update-title="updateTitle" @update-credits="updateCredits" :credits="credits" />
        </div>

        <ElDrawer v-model="showAppMenu" :with-header="false" direction="rtl" size="300px">
            <ElMenu default-active="/" mode="vertical" @select="handleAppMenuSelect"
                style="overflow: auto; height: 100%;">
                <ElMenuItem index="/">My Diary</ElMenuItem>
                <ElMenuItem index="#article">文章列表</ElMenuItem>
                <ElMenuItem index="#date">日期列表</ElMenuItem>
                <ElSubMenu index="#撰写文章">
                    <template #title>撰写文章</template>
                    <ElMenuItem index="#editor">文章编辑器</ElMenuItem>
                    <ElMenuItem index="#new">新文章</ElMenuItem>
                    <ElMenuItem index="#save">保存更改</ElMenuItem>
                </ElSubMenu>
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
            <div>使用 Vue.JS。<a href="./copyright/" @click.prevent="((loadCopyRightFrame = true), (copyrightBox.open = true))">点击查看版权信息。</a></div>
            <hr style="box-sizing: border-box; width: 100%;">
            <div>版本: {{appVersion}}</div>
        </div>
    </resizable-widget>

    <!-- copyrightBox -->
    <resizable-widget ref="copyrightBox" style="width: 800px; height: 480px; --padding: 0;">
        <widget-caption slot="widget-caption">
            <span>Copyright & License</span>
            <button style="float:right" data-exclude-bindmove="" @click="$refs.copyrightBox.close()">x</button>
        </widget-caption>
        <iframe sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox" v-if="loadCopyRightFrame" src="./assets/LICENSE.html" style="width: 100%; height: 100%; overflow: hidden; border: 0; box-sizing: border-box; display: flex; flex-direction: column;"></iframe>
    </resizable-widget>
    <!-- copyrightBox -->


</template>

<script setup>
import { ref } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
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

const credits = ref({
    oss_url: '',
    ak: '',
    sk: '',
    bucket: '',
    region: '',
})

try {
    const data = u.get('LogonData');
    if (!data) throw -1;
    credits.value = JSON.parse(data);
} catch {}

function handleAppMenuSelect(data) {
    switch (data) {
        case '/':
            sys_info_box.value.open = true;
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
        case '#u':
            router.push('/login/');
            break;
        case '#x':
            showAppMenu.value = false;
            break;

        default:
            break;
    }
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
}

.content {
    flex: 1;
    padding: 10px;
    overflow: auto;
    box-sizing: border-box;
}
</style>
