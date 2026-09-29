<script setup lang="ts">
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { computed } from 'vue';

const props = defineProps<{
  content: string
  streaming?: boolean
}>()


marked.use({ gfm: true, breaks: true })

function escapeHtml(text: string): string {
  const div = document.createElement('div')

  div.textContent = text

  return div.innerHTML
}

/**
 * LaTeX sem katex: `$$...$$` vira um bloco estilizado e `$...$` inline.
 * O marcado passa HTML cru adiante (antes do DOMPurify), então a substituição
 * prévia é segura e o resultado final é sanitizado.
 */
function injectLatex(source: string): string {
  return source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, formula: string) => `<div class="md-latex-block">${escapeHtml(formula.trim())}</div>`)
    .replace(/\$([^$\n]{1,120})\$/g, (_m, formula: string) => `<span class="md-latex-inline">${escapeHtml(formula.trim())}</span>`)
}

const processedContent = computed(() => {
  const raw = props.content ?? ''
  if (!raw)
    return ''



  const source = props.streaming ? `${raw} ` : raw

  const html = marked.parse(injectLatex(source), { async: false }) as string

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'u',
      's',
      'del',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
})
</script>

<template>
  <!-- ℹ️ v-html intencional: o conteúdo é sanitizado com DOMPurify antes de renderizar. -->
  <div
    class="markdown-content"
    :class="{ 'markdown-content--streaming': streaming }"
    v-html="processedContent"
  />
</template>

<style lang="scss" scoped>
.markdown-content {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(var(--v-theme-on-surface));
  overflow-wrap: anywhere;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 1.1rem 0 0.5rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.3;

    &:first-child {
      margin-block-start: 0;
    }
  }

  :deep(h1) { font-size: 1.375rem; }
  :deep(h2) { font-size: 1.125rem; }
  :deep(h3) { font-size: 1rem; }
  :deep(h4), :deep(h5), :deep(h6) { font-size: 0.875rem; }

  :deep(p) {
    margin: 0.5rem 0;

    &:first-child { margin-block-start: 0; }
    &:last-child { margin-block-end: 0; }
  }

  :deep(hr) {
    margin: 1rem 0;
    border: none;
    block-size: 1px;
    background-color: rgb(var(--v-border-color));
  }

  :deep(strong) { font-weight: 600; }
  :deep(em) { font-style: italic; }

  :deep(ul), :deep(ol) {
    margin: 0.5rem 0;
    padding-inline-start: 1.25rem;

    li {
      margin: 0.2rem 0;
    }
  }

  :deep(blockquote) {
    margin: 0.75rem 0;
    padding: 0.5rem 0.75rem;
    border-inline-start: 3px solid rgb(var(--v-theme-primary));
    border-radius: 0 0.375rem 0.375rem 0;
    background-color: rgba(var(--v-theme-on-surface), 0.05);
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));

    :deep(p) {
      margin: 0;
    }
  }


  :deep(code) {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background-color: rgba(var(--v-theme-on-surface), 0.08);
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 0.8125em;
    color: rgb(var(--v-theme-primary));
  }

  :deep(pre) {
    margin: 0.75rem 0;
    padding: 0.75rem;
    border: 1px solid rgb(var(--v-border-color));
    border-radius: 0.5rem;
    background-color: rgba(var(--v-theme-on-surface), 0.06);
    overflow-x: auto;

    code {
      padding: 0;
      background: transparent;
      color: rgb(var(--v-theme-on-surface));
      font-size: 0.8125rem;
    }
  }

  :deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(table) {
    display: block;
    max-inline-size: 100%;
    margin: 0.75rem 0;
    overflow-x: auto;
    border-collapse: collapse;
    border: 1px solid rgb(var(--v-border-color));
    border-radius: 0.5rem;

    th, td {
      padding: 0.375rem 0.625rem;
      border-block-end: 1px solid rgb(var(--v-border-color));
      text-align: start;
      font-size: 0.8125rem;
    }

    th {
      background-color: rgba(var(--v-theme-on-surface), 0.05);
      font-weight: 600;
    }

    tr:last-child th, tr:last-child td {
      border-block-end: none;
    }
  }

  :deep(.md-latex-block) {
    margin: 0.75rem 0;
    padding: 0.625rem 0.875rem;
    border: 1px solid rgb(var(--v-border-color));
    border-radius: 0.5rem;
    background-color: rgba(var(--v-theme-on-surface), 0.04);
    font-family: 'Cambria Math', Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    text-align: center;
    color: rgb(var(--v-theme-on-surface));
  }

  :deep(.md-latex-inline) {
    font-family: 'Cambria Math', Georgia, 'Times New Roman', serif;
    font-style: italic;
    color: rgb(var(--v-theme-on-surface));
  }


  &--streaming :deep(*) {
    transition: opacity 0.12s ease;
  }
}
</style>
