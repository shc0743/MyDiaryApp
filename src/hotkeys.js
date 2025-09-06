import { ElMessage } from 'element-plus';
import router from './router'

export const NoPrevent = Symbol('NoPrevent');
export default {
    'Ctrl+N'() {
        router.push('/editor/new');
    },
    'Alt+N'() {
        router.push('/editor/new');
    },
    'Ctrl+J'() {
        router.push('/list/');
    },
    'Ctrl+,'() {
        router.push('/settings/');
    },
    'Ctrl+S'() {
        const editor = globalThis.myEditor;
        if (!editor) return ElMessage.error('没有打开的文章');
        else editor.save_article().then(() => {});
    },
};
