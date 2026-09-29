<script setup lang="ts">
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { StarterKit } from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  readonly?: boolean
}>(), {
  placeholder: undefined,
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const placeholderText = computed(() =>
  props.placeholder || "Write knowledge content here...",
)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: () => placeholderText.value }),
    Underline,
  ],
  onUpdate() {
    if (editor.value)
      emit('update:modelValue', editor.value.getHTML())
  },
})

watch(() => props.modelValue, () => {
  if (editor.value?.getHTML() !== props.modelValue)
    editor.value?.commands.setContent(props.modelValue, false)
})

watch(() => props.readonly, val => {
  editor.value?.setEditable(!val)
})
</script>

<template>
  <div
    class="knowledge-editor border rounded"
    :class="{ 'opacity-50': readonly }"
  >
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="d-flex flex-wrap align-center gap-1 px-2 py-1 border-b bg-surface"
      :class="{ 'pointer-events-none': readonly }"
    >
      <!-- Inline formatting -->
      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('bold') ? 'tonal' : 'text'"
        :color="editor.isActive('bold') ? 'primary' : 'default'"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <VIcon
          icon="bx-bold"
          size="16"
        />
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('italic') ? 'tonal' : 'text'"
        :color="editor.isActive('italic') ? 'primary' : 'default'"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <VIcon
          icon="bx-italic"
          size="16"
        />
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('underline') ? 'tonal' : 'text'"
        :color="editor.isActive('underline') ? 'primary' : 'default'"
        @click="editor.commands.toggleUnderline()"
      >
        <VIcon
          icon="bx-underline"
          size="16"
        />
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('strike') ? 'tonal' : 'text'"
        :color="editor.isActive('strike') ? 'primary' : 'default'"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <VIcon
          icon="bx-strikethrough"
          size="16"
        />
      </IconBtn>

      <VDivider
        vertical
        class="mx-1"
        style="block-size: 20px;"
      />
      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('heading', { level: 1 }) ? 'tonal' : 'text'"
        :color="editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setHeading({ level: 1 }).run()"
      >
        <span class="text-caption font-weight-bold">H1</span>
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('heading', { level: 2 }) ? 'tonal' : 'text'"
        :color="editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setHeading({ level: 2 }).run()"
      >
        <span class="text-caption font-weight-bold">H2</span>
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive('heading', { level: 3 }) ? 'tonal' : 'text'"
        :color="editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setHeading({ level: 3 }).run()"
      >
        <span class="text-caption font-weight-bold">H3</span>
      </IconBtn>

      <VDivider
        vertical
        class="mx-1"
        style="block-size: 20px;"
      />
      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive({ textAlign: 'left' }) ? 'tonal' : 'text'"
        :color="editor.isActive({ textAlign: 'left' }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setTextAlign('left').run()"
      >
        <VIcon
          icon="bx-align-left"
          size="16"
        />
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive({ textAlign: 'center' }) ? 'tonal' : 'text'"
        :color="editor.isActive({ textAlign: 'center' }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setTextAlign('center').run()"
      >
        <VIcon
          icon="bx-align-middle"
          size="16"
        />
      </IconBtn>

      <IconBtn
        size="small"
        rounded
        :variant="editor.isActive({ textAlign: 'right' }) ? 'tonal' : 'text'"
        :color="editor.isActive({ textAlign: 'right' }) ? 'primary' : 'default'"
        @click="editor.chain().focus().setTextAlign('right').run()"
      >
        <VIcon
          icon="bx-align-right"
          size="16"
        />
      </IconBtn>
    </div>

    <!-- Editor content area -->
    <EditorContent
      :editor="editor"
      class="knowledge-editor__content pa-3"
    />
  </div>
</template>

<style>
.knowledge-editor__content .ProseMirror {
  min-block-size: 180px;
  outline: none;
}

.knowledge-editor__content .ProseMirror p.is-editor-empty:first-child::before {
  block-size: 0;
  color: rgba(var(--v-theme-on-surface), 0.38);
  content: attr(data-placeholder);
  float: inline-start;
  pointer-events: none;
}
</style>
