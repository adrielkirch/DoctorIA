<script setup lang="ts">
import type { AiChatSummary } from "contracts/ai/chat-history/types";
import { computed, ref } from "vue";

const props = defineProps<{ chat: AiChatSummary }>();

const emit = defineEmits<{
  open: [chatId: string];
  share: [chatId: string];
  delete: [chatId: string];
  rename: [chatId: string, newName: string];
}>();


const isRenaming = ref(false);
const showMenu = ref(false);
const draftName = ref("");

const truncatedTitle = computed(() =>
  props.chat.title.length > 50
    ? `${props.chat.title.slice(0, 50)}…`
    : props.chat.title,
);

const openChat = () => {
  if (!isRenaming.value) emit("open", props.chat.id);
};

const startRename = () => {
  draftName.value = props.chat.title;
  isRenaming.value = true;
  showMenu.value = false;
};

const saveRename = () => {
  const name = draftName.value.trim();
  if (name && name !== props.chat.title) emit("rename", props.chat.id, name);
  isRenaming.value = false;
};

const cancelRename = () => {
  isRenaming.value = false;
  draftName.value = "";
};
</script>

<template>
  <div class="chat-list-item" :class="{ 'chat-list-item--renaming': isRenaming }" @click="openChat">
    <div class="chat-list-item__content">
      <VTextField v-if="isRenaming" v-model="draftName" density="compact" variant="plain" autofocus @click.stop
        @keyup.enter="saveRename" @keyup.esc="cancelRename" @blur="saveRename" />
      <template v-else>
        <div class="chat-list-item__title">
          {{ truncatedTitle }}
        </div>
      </template>
    </div>

    <VMenu v-model="showMenu" location="bottom end" :close-on-content-click="false">
      <template #activator="{ props: menuProps }">
        <VBtn v-bind="menuProps" color="default" size="x-small" variant="text" icon="bx-dots-vertical-rounded"
          class="chat-list-item__menu" @click.stop />
      </template>

      <VList density="compact" class="chat-list-item__actions">
        <VListItem @click="emit('share', props.chat.id)">
          <VListItemTitle>{{
            "Share"
          }}</VListItemTitle>
        </VListItem>
        <VListItem @click="startRename">
          <VListItemTitle>{{
            "Rename"
          }}</VListItemTitle>
        </VListItem>
        <VDivider class="my-1" />
        <VListItem @click="emit('delete', props.chat.id)">
          <VListItemTitle class="text-error">
            {{ "Delete" }}
          </VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </div>
</template>

<style lang="scss" scoped>
.chat-list-item {
  display: flex;
  align-items: center;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.75rem;
  gap: 0.125rem;
  min-block-size: 1.625rem;
  padding-block: 0.2rem;
  padding-inline: 0.5rem;
  transition: background-color 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.06);
  }

  &--renaming {
    background: rgba(var(--v-theme-on-surface), 0.08);
  }

  &__content {
    flex: 1;
    min-inline-size: 0;
  }

  &__title {
    overflow: hidden;
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.125rem;
    opacity: 0.85;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__menu {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &:hover &__menu {
    opacity: 0.7;
  }
}
</style>
