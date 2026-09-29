<script setup lang="ts">
import type { Skill, SkillCreatePayload } from "contracts/ai/skills/types";
import { marked } from "marked";
import { computed, ref, watch } from "vue";
import { useSkillsStore } from "./useSkillsStore";

interface Props {
  modelValue: boolean;
  skill: Skill | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  saved: [skill: Skill];
  deleted: [id: number];
}>();

const store = useSkillsStore();

const isEditMode = computed(() => props.skill !== null);
const isDefault = computed(() => props.skill?.type === "DEFAULT");

const drawerTitle = computed(() => {
  if (!isEditMode.value) return "Add Skill";
  if (isDefault.value) return props.skill!.name;

  return "Edit Skill";
});


const name = ref("");
const command = ref("");
const category = ref("");
const instructions = ref("");
const color = ref("#1A4A8A");
const icon = ref("bx-file-md");
const activeTab = ref("write");
const isSaving = ref(false);
const deleteDialogOpen = ref(false);


const nameError = ref("");
const commandError = ref("");
const categoryError = ref("");
const instructionsError = ref("");

const previewHtml = computed(
  () => marked.parse(instructions.value || "") as string,
);

const colorOptions = [
  { value: "#1A4A8A", label: "Blue" },
  { value: "#1E3A5F", label: "Navy" },
  { value: "#2A2A3A", label: "Dark" },
  { value: "#1A3A2A", label: "Green" },
  { value: "#3A1A1A", label: "Red" },
  { value: "#3A2A1A", label: "Brown" },
];

const iconOptions = [
  { value: "bx-file-md", label: "Document" },
  { value: "bx-code-alt", label: "Code" },
  { value: "bx-shield-alt-2", label: "Shield" },
  { value: "bx-video", label: "Video" },
  { value: "bx-palette", label: "Design" },
  { value: "bx-brain", label: "Brain" },
];


watch(
  () => [props.skill, props.modelValue],
  () => {
    if (props.modelValue) {
      resetErrors();
      if (props.skill) {
        name.value = props.skill.name;
        command.value = props.skill.command;
        category.value = props.skill.category;
        instructions.value = props.skill.instructions;
        color.value = props.skill.color;
        icon.value = props.skill.icon;
      } else {
        name.value = "";
        command.value = "";
        category.value = "";
        instructions.value = "";
        color.value = "#1A4A8A";
        icon.value = "bx-file-md";
      }
      activeTab.value = "write";
    }
  },
  { immediate: true },
);

function resetErrors() {
  nameError.value = "";
  commandError.value = "";
  categoryError.value = "";
  instructionsError.value = "";
}

function normaliseCommand() {
  if (command.value && !command.value.startsWith("/"))
    command.value = `/${command.value}`;
  command.value = command.value.toLowerCase();
}

function close() {
  emit("update:modelValue", false);
}

async function handleSave() {
  resetErrors();
  normaliseCommand();

  let valid = true;

  if (!name.value.trim()) {
    nameError.value = "This field is required";
    valid = false;
  }
  if (!command.value.trim()) {
    commandError.value = "This field is required";
    valid = false;
  } else if (store.isCommandTaken(command.value, props.skill?.id)) {
    commandError.value = "Command already in use";
    valid = false;
  }
  if (!category.value.trim()) {
    categoryError.value = "This field is required";
    valid = false;
  }
  if (!instructions.value.trim()) {
    instructionsError.value = "This field is required";
    valid = false;
  }

  if (!valid) return;

  const payload: SkillCreatePayload = {
    name: name.value.trim(),
    command: command.value,
    category: category.value.trim(),
    instructions: instructions.value,
    color: color.value,
    icon: icon.value,
  };

  isSaving.value = true;
  try {
    let saved: Skill;
    if (isEditMode.value)
      saved = await store.updateSkill({ id: props.skill!.id, ...payload });
    else saved = await store.createSkill(payload);

    emit("saved", saved);
  } finally {
    isSaving.value = false;
  }
}

async function confirmDelete() {
  if (!props.skill) return;
  isSaving.value = true;
  try {
    await store.deleteSkill(props.skill.id);
    deleteDialogOpen.value = false;
    emit("deleted", props.skill.id);
    emit("update:modelValue", false);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <VNavigationDrawer :model-value="modelValue" temporary location="right" width="480"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="d-flex flex-column h-100">
      <!-- Header -->
      <div class="d-flex align-center px-4 py-3 border-b">
        <span class="text-h6 font-weight-semibold flex-grow-1">{{
          drawerTitle
        }}</span>
        <VBtn icon="bx-x" variant="text" size="small" @click="close" />
      </div>

      <!-- Scrollable body -->
      <div class="flex-grow-1 overflow-y-auto pa-4">
        <!-- Name -->
        <VTextField v-model="name" label="Name" :disabled="isDefault" :error-messages="nameError" class="mb-3"
          density="compact" />

        <!-- Command -->
        <VTextField v-model="command" label="Command" placeholder="/my-skill" :disabled="isDefault"
          :error-messages="commandError" class="mb-3" density="compact" @blur="normaliseCommand" />

        <!-- Category -->
        <VTextField v-model="category" label="Category" :disabled="isDefault" :error-messages="categoryError"
          class="mb-3" density="compact" />

        <!-- Markdown editor with Write/Preview tabs -->
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis mb-1">
            {{ "Instructions" }}
          </div>
          <VTabs v-model="activeTab" density="compact" class="mb-2">
            <VTab value="write">
              {{ "Write" }}
            </VTab>
            <VTab value="preview">
              {{ "Preview" }}
            </VTab>
          </VTabs>

          <VTabsWindow v-model="activeTab">
            <VTabsWindowItem value="write">
              <VTextarea v-model="instructions" :readonly="isDefault" :error-messages="instructionsError" rows="10"
                no-resize class="skill-drawer__textarea" />
            </VTabsWindowItem>
            <VTabsWindowItem value="preview">
              <div class="skill-drawer__preview pa-3 rounded" v-html="previewHtml" />
            </VTabsWindowItem>
          </VTabsWindow>
        </div>

        <!-- Color swatches -->
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis mb-2">
            {{ "Card Color" }}
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <div v-for="opt in colorOptions" :key="opt.value" class="skill-drawer__swatch rounded cursor-pointer"
              :style="{ background: opt.value }" :class="{ 'skill-drawer__swatch--active': color === opt.value }"
              :title="opt.label" @click="!isDefault && (color = opt.value)" />
          </div>
        </div>

        <!-- Icon picker -->
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis mb-2">
            {{ "Icon" }}
          </div>
          <div class="d-flex gap-3 flex-wrap">
            <VBtn v-for="opt in iconOptions" :key="opt.value" :icon="opt.value"
              :variant="icon === opt.value ? 'flat' : 'outlined'" :color="icon === opt.value ? 'primary' : undefined"
              size="small" :disabled="isDefault" :title="opt.label" @click="icon = opt.value" />
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="d-flex align-center gap-2 px-4 py-3 border-t">
        <VBtn v-if="!isDefault" color="primary" :loading="isSaving" :disabled="isSaving" @click="handleSave">
          {{ "Save" }}
        </VBtn>

        <VBtn v-if="isEditMode && !isDefault" color="error" variant="outlined" :disabled="isSaving"
          @click="deleteDialogOpen = true">
          {{ "Delete" }}
        </VBtn>

        <VSpacer />

        <VBtn variant="text" @click="close">
          {{ "Close" }}
        </VBtn>
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <VDialog v-model="deleteDialogOpen" max-width="400">
      <VCard>
        <VCardTitle class="text-h6 pt-4 px-4">
          {{ "Delete Skill" }}
        </VCardTitle>
        <VCardText>{{ "Delete this skill? This cannot be undone." }}</VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn variant="text" @click="deleteDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="error" :loading="isSaving" @click="confirmDelete">
            {{ "Confirm Delete" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VNavigationDrawer>
</template>

<style scoped>
.skill-drawer__preview {
  background: rgba(var(--v-theme-surface-variant), 0.4);
  line-height: 1.6;
  max-block-size: 340px;
  min-block-size: 220px;

  /* ℹ️ Conteúdo markdown via v-html: quebra palavras longas/URLs para nunca
     estourar o container horizontalmente. */
  overflow-wrap: break-word;

  /* ℹ️ Nada da preview pode estourar na horizontal (listas com marcador
     "outside" são cortadas pela borda quando overflow-x vira auto). */
  overflow: hidden auto;
  word-break: break-word;
}

/* ℹ️ Blocos de código/pre do markdown também precisam quebrar linha
   (pre por padrão não quebra). */
.skill-drawer__preview :deep(pre),
.skill-drawer__preview :deep(code) {
  white-space: pre-wrap;
  word-break: break-word;
}

/* ℹ️ Listas markdown: padding explícito para os números/bullets ficarem DENTRO
   da caixa (se algum reset zerar o padding, o marcador "outside" estoura). */
.skill-drawer__preview :deep(ol),
.skill-drawer__preview :deep(ul) {
  margin-block: 0.5rem 1rem;
  padding-inline-start: 1.5rem;
}

.skill-drawer__preview :deep(li) {
  margin-block: 0.25rem;
}

.skill-drawer__swatch {
  border: 2px solid transparent;
  border-radius: 4px;
  block-size: 28px;
  inline-size: 28px;
  transition: transform 0.15s;
}

.skill-drawer__swatch:hover {
  transform: scale(1.15);
}

.skill-drawer__swatch--active {
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.15);
}

.skill-drawer__textarea :deep(textarea) {
  font-family: "Courier New", monospace;
  font-size: 13px;
}

/* ℹ️ Skills DEFAULT ficam read-only: o conteúdo deve continuar legível (sem o
   cinza translúcido que o Vuetify aplica em campos disabled) e rolável. */
.skill-drawer :deep(.v-input--disabled) {
  opacity: 1;
}

.skill-drawer :deep(.v-input--disabled .v-field__input) {
  color: rgb(var(--v-theme-on-surface));
}
</style>
