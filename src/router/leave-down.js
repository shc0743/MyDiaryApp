// 用户，留下来！

window.addEventListener('beforeunload', (event) => {
    if (!globalThis.myEditor) return;
    if (!globalThis.myEditor.isSaved()) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes!';
        return false;
    }
})