<template>
    <bubble-menu :editor="editor" :tippy-options="{ duration: 100 }" v-if="editor">
        <div class="bubble-menu">
            <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
                <b>B</b>
            </button>
            <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }">
                <i>I</i>
            </button>
            <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }">
                <s>S</s>
            </button>
            <button @click="editor.chain().focus().toggleUnderline().run()" :class="{ 'is-active': editor.isActive('underline') }">
                <u>U</u>
            </button>
            <button @click="copySelectedText">
                复制
            </button>
            <button @click="pasteText">
                粘贴
            </button>
        </div>
    </bubble-menu>
    <editor-content data-editor :editor="editor" v-bind="$attrs" :class="$attrs.class"
        @click.ctrl="tryOpenLink"
        @keydown.ctrl="isCtrlPressed = true"
        @keyup="isCtrlPressed = false"
        @blur="isCtrlPressed = false"
        :data-ctrl-pressed="isCtrlPressed"
        />
</template>

<script>
import { Editor, EditorContent, BubbleMenu } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Node } from '@tiptap/core'
import { Color } from '@tiptap/extension-color'
import { ElMessage } from 'element-plus'
import { HTMLXMyDiaryAppFileReferenceElement } from '../secret-elementary.js'

const myFileReferenceAttrs = HTMLXMyDiaryAppFileReferenceElement.observedAttributes;
const CustomFileReferenceWebComponent = Node.create({
    name: 'x-my-diary-app-file-reference',
    group: 'block',
    renderHTML({ HTMLAttributes }) {
        return ['x-my-diary-app-file-reference', HTMLAttributes];
    },
    parseHTML() {
        return [{
            tag: 'x-my-diary-app-file-reference',
            getAttrs: dom => {
                const attrs = {};
                for (const attr of myFileReferenceAttrs) {
                    attrs[attr] = dom.getAttribute(attr);
                }
                return attrs;
            },
        }]
    },
    addAttributes() {
        const attrs = {};
        for (const attr of myFileReferenceAttrs) {
            attrs[attr] = { default: null, };
        }
        return attrs;
    },
})

export default {
    data() {
        return {
            isCtrlPressed: false,
        }
    },

    components: {
        EditorContent,
        BubbleMenu,
    },
    
    methods: {
        copySelectedText() {
            const selection = window.getSelection()
            if (selection.toString().length > 0) {
                navigator.clipboard.writeText(selection.toString())
            }
        },
        async pasteText() {
            try {
                const text = await navigator.clipboard.readText()
                this.editor.commands.insertContent(text)
            } catch (error) {
                console.error('粘贴失败:', error)
            }
        },
        setLink(url) {
            // cancelled
            if (url === null) {
                return
            }
            // empty
            if (url === '') {
                this.editor.chain().focus().extendMarkRange('link').unsetLink().run()
                return
            }
            // update link
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        },
        getLink() {
            return this.editor.getAttributes('link')?.href || ''
        },
        /**
         * @param event {Event} event
         */
        tryOpenLink(event) {
            // ctrl + click
            let target = event.target
            if (target.tagName !== 'A') {
                target = target.closest('a')
                if (!target) return;
            }
            try {
                const href = new URL(target.href, location.href);
                if (href.protocol !== 'http:' && href.protocol !== 'https:') throw 1;
                if (href.origin === location.origin && href.pathname === location.pathname) {
                    location = href;
                }
                else requestAnimationFrame(() => {
                    const w = window.open(href, '_blank');
                    requestAnimationFrame(() => {
                        w.focus();
                    });
                });
            } catch {
                ElMessage.error("不支持的链接: " + target.href);
            }
        },
    },

    props: {
        modelValue: {
            type: String,
            default: '',
        },
    },

    emits: ['update:modelValue'],

    data() {
        return {
            editor: null,
        }
    },

    watch: {
        modelValue(value) {
            // HTML
            const isSame = this.editor.getHTML() === value

            // JSON
            // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

            if (isSame) {
                return
            }

            this.editor.commands.setContent(value, false)
        },
    },

    mounted() {
        this.editor = new Editor({
            extensions: [
                StarterKit,
                CustomFileReferenceWebComponent,
                Underline,
                TextStyle,
                Color,
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        class: "my-link",
                        title: "Follow Link (Ctrl + Click)"
                    },
                    autolink: true,
                }),
                Table.configure({
                    resizable: true,
                }),
                TableRow,
                TableHeader,
                TableCell,
            ],
            content: this.modelValue,
            editorProps: {
                attributes: {
                    class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',
                },
            },
            onUpdate: () => {
                // HTML
                this.$emit('update:modelValue', this.editor.getHTML())

                // JSON
                // this.$emit('update:modelValue', this.editor.getJSON())
            },
        })
    },

    beforeUnmount() {
        this.editor.destroy()
    },
}
</script>

<style scoped>
.bubble-menu {
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 0.7rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    display: flex;
    padding: 0.2rem;
    button {
        background-color: unset;
        border: none;
        padding: 0.3rem 0.6rem;
        margin: 0 0.1rem;
        border-radius: 0.3rem;
        cursor: pointer;
        &:hover {
            background-color: #eee;
        }
        &.is-active {
            background-color: #666;
            color: white;
            &:hover {
                background-color: #555;
            }
        }
    }
}

[data-editor] {
    display: flex;
    flex-direction: column;
}
[data-editor] > ::v-deep(div.tiptap) {
    flex: 1;
    max-width: revert !important;
    font-size: revert !important;
    line-height: revert !important;
}
[data-editor] > ::v-deep(div.tiptap) p {
    margin: 0.5em 0 !important;
}
[data-editor] > ::v-deep(div.tiptap) :is(h1, h2, h3, h4, h5, h6) {
    margin-bottom: 0.5em !important;
}
</style>