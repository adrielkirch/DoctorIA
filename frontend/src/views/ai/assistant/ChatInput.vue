<script setup lang="ts">
import { useSnackbar } from "@/composables/useSnackbar";
import { $api } from "@/utils/api";
import type { Skill, SkillListResponse } from "contracts/ai/skills/types";
import { computed, onMounted, ref } from "vue";
import { ACCEPT_ATTRIBUTE, isSupportedFile } from "./chatInputFormats";
import ModelSelector from "./ModelSelector.vue";

interface Props {
  disabled?: boolean;
  showCapabilitiesButton?: boolean;

  /** Fase 3 — true enquanto o assistente está gerando: o send vira STOP. */
  streaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showCapabilitiesButton: true,
  streaming: false,
});

const emit = defineEmits<{
  send: [content: string];
  fileSelect: [files: File[]];
  toggleCapabilities: [];
  stop: [];
}>();

const snackbar = useSnackbar();

const editableRef = ref<HTMLDivElement | null>(null);
const hasContent = ref(false);
const tokenCount = ref(0);
const isDragging = ref(false);
const dragCounter = ref(0);
const fileInputRef = ref<HTMLInputElement | null>(null);


const skills = ref<Skill[]>([]);
const isSkillsMenuOpen = ref(false);


const sortedSkills = computed(() =>
  [...skills.value].sort((a, b) => a.command.localeCompare(b.command)),
);



onMounted(async () => {
  try {
    const response = await $api<SkillListResponse>("/ai/skills", {
      query: { itemsPerPage: 100 },
    });

    skills.value = response.skills;
  } catch {
    skills.value = [];
  }
});




function readEditableContent(): string {
  const el = editableRef.value;
  if (!el) return "";

  let output = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent ?? "";
    } else if (node instanceof HTMLElement && node.dataset.skillId) {
      output +=
        skills.value.find((s) => String(s.id) === node.dataset.skillId)
          ?.command ?? "";
    } else {
      node.childNodes.forEach(walk);
    }
  };

  el.childNodes.forEach(walk);

  return output.trim();
}

function refreshContent() {
  const content = readEditableContent();

  hasContent.value = content.length > 0;
  tokenCount.value =
    editableRef.value?.querySelectorAll(".skill-token").length ?? 0;
}

const canSend = computed(() => hasContent.value && !props.disabled);

function clearEditable() {
  if (editableRef.value) editableRef.value.innerHTML = "";
}


function insertSkill(skill: Skill) {
  const el = editableRef.value;
  if (!el) return;

  el.focus();

  const token = document.createElement("span");

  token.className = "skill-token";
  token.contentEditable = "false";
  token.dataset.skillId = String(skill.id);
  token.textContent = skill.command;
  token.title = skill.name;


  token.addEventListener("click", (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    token.remove();
    refreshContent();
  });

  const sel = window.getSelection();
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

  if (range && el.contains(range.commonAncestorContainer)) {

    range.deleteContents();
    range.insertNode(token);
    range.setStartAfter(token);
    range.insertNode(document.createTextNode("\u00A0"));
    range.setStartAfter(token.nextSibling ?? token);
    range.collapse(true);
  } else {

    el.appendChild(token);
    el.appendChild(document.createTextNode("\u00A0"));

    const newRange = document.createRange();

    newRange.setStartAfter(el.lastChild ?? token);
    newRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(newRange);
  }

  refreshContent();
}


function handleSend() {
  if (!canSend.value) return;

  const content = readEditableContent();
  if (!content) return;

  emit("send", content);
  clearEditable();
  hasContent.value = false;
  tokenCount.value = 0;
  editableRef.value?.focus();
}


function handleSendClick() {
  if (props.streaming) {
    emit("stop");

    return;
  }

  handleSend();
}

function handleKeydown(event: KeyboardEvent) {

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}


function processFiles(files: File[]) {
  const valid = files.filter(isSupportedFile);

  if (valid.length > 0) emit("fileSelect", valid);

  if (valid.length < files.length)
    snackbar.warning("Some files are not supported.");
}

function handleFileSelect(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? []);

  processFiles(files);
  if (fileInputRef.value) fileInputRef.value.value = "";
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  dragCounter.value = 0;
  isDragging.value = false;

  const files = Array.from(event.dataTransfer?.files ?? []);

  processFiles(files);
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  dragCounter.value++;
  isDragging.value = true;
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  dragCounter.value--;

  if (dragCounter.value === 0) isDragging.value = false;
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}


function handlePaste(event: ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items ?? []);

  const files = items
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((f): f is File => f !== null);

  if (files.length > 0) {
    processFiles(files);

    return;
  }


  const text = event.clipboardData?.getData("text/plain");
  if (text) {
    event.preventDefault();
    document.execCommand("insertText", false, text);
    refreshContent();
  }
}
</script>

<template>
  <div class="chat-input" :class="{ 'chat-input--dragging': isDragging }" @dragenter="handleDragEnter"
    @dragleave="handleDragLeave" @dragover="handleDragOver" @drop="handleDrop">
    <!-- Overlay de drag & drop -->
    <div v-if="isDragging" class="chat-input__overlay">
      <VIcon icon="bx-cloud-upload" size="40" />
      <span class="chat-input__overlay-text">
        {{ "Drop your files here" }}
      </span>
    </div>

    <div class="chat-input__box">
      <!--
        ℹ️ Input "como HTML": as skills viram TOKENS no MEIO do texto — a
        ordem importa (ex.: "siga a skill /reviewer e depois /cyber").
      -->
      <div ref="editableRef" class="chat-input__editable" :contenteditable="!disabled"
        data-placeholder="Type your message..." @input="refreshContent" @keydown="handleKeydown" @paste="handlePaste"
        @drop.prevent />

      <!--
        ℹ️ Cluster à DIREITA (condensado): dropdown do modelo + skills +
        capacidades + anexar + enviar — tudo pequeno, estilo ChatGPT.
      -->
      <div class="chat-input__actions">
        <ModelSelector class="chat-input__model" />

        <!--
          ℹ️ Seletor de skills (VS Code): cada item mostra o ícone "shine magic"
          (`bx-bxs-magic-wand`, padrão Gemini) + comando em ordem alfabética.
          Sem skills no workspace, o botão nem aparece.
        -->
        <VMenu v-if="skills.length > 0" v-model="isSkillsMenuOpen" location="bottom end" offset="8"
          content-class="skills-selector-menu">
          <template #activator="{ props: menuProps }">
            <!--
              ℹ️ `v-tooltip` é um DIRECTIVE (não componente): mantém o botão
              inline no flex do input. CUIDADO: botão no slot default do
              componente VTooltip é teleportado para o overlay (invisível).
            -->
            <button v-tooltip="{
              text: 'Select skills',
              openDelay: 400,
            }" class="chat-input__action" type="button" v-bind="menuProps">
              <VIcon icon="bx-bxs-magic-wand" size="16" />
              <span v-if="tokenCount > 0" class="chat-input__action-badge">
                {{ tokenCount }}
              </span>
            </button>
          </template>

          <VCard class="skills-selector__card">
            <VList density="compact">
              <VListItem v-for="skill in sortedSkills" :key="skill.id" class="skills-selector__item"
                @click="insertSkill(skill)">
                <template #prepend>
                  <VIcon icon="bx-bxs-magic-wand" size="13" class="text-medium-emphasis" />
                </template>
                {{ skill.command }}
              </VListItem>
            </VList>
          </VCard>
        </VMenu>

        <!--
          <button
          v-if="showCapabilitiesButton"
          v-tooltip="{ text: "Show capabilities", openDelay: 400 }"
          class="chat-input__action"
          type="button"
          @click="emit('toggleCapabilities')"
          >
          <VIcon
          icon="bx-cube"
          size="16"
          />
          </button>
        -->

        <label v-tooltip="{
          text: 'Attach files',
          openDelay: 400,
        }" class="chat-input__action chat-input__attach">
          <VIcon icon="bx-paperclip" size="16" />
          <input ref="fileInputRef" type="file" multiple class="d-none" :accept="ACCEPT_ATTRIBUTE"
            @change="handleFileSelect" />
        </label>

        <button v-tooltip="{
          text: streaming ? 'Stop generating' : 'Send',
          openDelay: 400,
        }" class="chat-input__action chat-input__send" :class="{ 'chat-input__send--stop': streaming }" type="button"
          :disabled="!streaming && !canSend" @click="handleSendClick">
          <VIcon :icon="streaming ? 'bx-square-rounded' : 'bx-send'" size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-input {
  position: relative;
  margin-inline: auto;
  max-inline-size: 880px;

  &--dragging {
    .chat-input__box {
      opacity: 0.35;
    }
  }

  &__overlay {
    position: absolute;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed rgb(var(--v-theme-primary));
    border-radius: 1rem;
    background-color: rgba(var(--v-theme-primary), 0.08);
    color: rgb(var(--v-theme-primary));
    gap: 0.5rem;
    inset: 0;
    pointer-events: none;
  }

  &__overlay-text {
    font-weight: 500;
  }

  &__box {
    display: flex;
    align-items: center;
    border: 1px solid rgb(var(--v-border-color));
    border-radius: 1.25rem;
    backdrop-filter: blur(6px);



    background-color: rgba(var(--v-theme-surface), 0.82);
    gap: 0.125rem;



    padding-block: 0.1875rem;
    padding-inline: 0.5rem;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:focus-within {
      border-color: rgb(var(--v-theme-primary));
      box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.12);
    }
  }

  &__model {
    flex-shrink: 0;
  }



  &__editable {
    flex: 1;
    border: none;
    background: transparent;
    color: rgb(var(--v-theme-on-surface));
    cursor: text;
    font-family: inherit;
    font-size: 0.75rem;
    line-height: 1.35;
    max-block-size: 120px;
    min-block-size: 1.375rem;
    min-inline-size: 0;
    outline: none;
    overflow-y: auto;
    padding-block: 0.25rem;
    padding-inline: 0;


    &:empty::before {
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      content: attr(data-placeholder);
      pointer-events: none;
    }
  }

  &__action {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    block-size: 1.625rem;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    cursor: pointer;
    inline-size: 1.625rem;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.08);
      color: rgb(var(--v-theme-primary));
    }


    &-badge {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background-color: rgb(var(--v-theme-primary));
      block-size: 0.875rem;
      color: rgb(var(--v-theme-on-primary));
      font-size: 0.625rem;
      font-weight: 600;
      inset-block-start: -0.1875rem;
      inset-inline-end: -0.1875rem;
      line-height: 1;
      min-inline-size: 0.875rem;
      padding-inline: 0.1875rem;
      pointer-events: none;
    }


    &--stop {
      background-color: rgb(var(--v-theme-error)) !important;
      color: rgb(var(--v-theme-on-error)) !important;

      &:hover {
        opacity: 0.9;
      }
    }
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.125rem;
  }

  &__send {
    flex-shrink: 0;

    &:disabled {
      cursor: default;
      opacity: 0.35;
    }
  }
}
</style>

<!--
  ℹ️ Estilos globais: o VMenu de skills é teleportado para o body, e os
  tokens de skill são criados em runtime (sem scope attr).
-->
<style lang="scss">
.skills-selector-menu {
  .skills-selector__card {
    min-inline-size: 200px;
    padding-block: 0.25rem;
  }


  .skills-selector__item {
    font-size: 0.75rem;
    min-block-size: 30px;

    .v-list-item__prepend {

      margin-inline-end: 0.375rem;
    }
  }
}


.skill-token {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background-color: rgb(var(--v-theme-surface-variant), 0.7);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  margin-inline: 0.125rem;
  padding-block: 0;
  padding-inline: 0.375rem;
  user-select: none;

  &:hover {
    background-color: rgb(var(--v-theme-error), 0.14);
    color: rgb(var(--v-theme-error));
    text-decoration: line-through;
  }
}
</style>
