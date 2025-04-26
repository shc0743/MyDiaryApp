<template>
    <bubble-menu :editor="editor" :tippy-options="{ duration: 100 }" v-if="editor">
        <div class="bubble-menu">
            <button @click="editor.chain().focus().toggleBold().run()"
                :class="{ 'is-active': editor.isActive('bold') }">
                粗体
            </button>
            <button @click="editor.chain().focus().toggleItalic().run()"
                :class="{ 'is-active': editor.isActive('italic') }">
                斜体
            </button>
            <button @click="copySelectedText">
                复制
            </button>
            <button @click="pasteText">
                粘贴
            </button>
        </div>
    </bubble-menu>
    <editor-content data-editor :editor="editor" v-bind="$attrs" :class="$attrs.class" />
</template>

<script>
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent, BubbleMenu } from '@tiptap/vue-3'

export default {
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
        }
    },

    props: {
        modelValue: {
            type: Object,
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
            // const isSame = this.editor.getHTML() === value

            // JSON
            const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

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
            ],
            content: this.modelValue,
            editorProps: {
                attributes: {
                    class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',
                },
            },
            onUpdate: () => {
                // HTML
                // this.$emit('update:modelValue', this.editor.getHTML())

                // JSON
                this.$emit('update:modelValue', this.editor.getJSON())
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