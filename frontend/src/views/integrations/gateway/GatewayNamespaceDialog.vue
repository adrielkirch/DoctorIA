<script setup lang="ts">
import type { GatewayNamespace } from "contracts/types/gateway";
import { ref, watch } from "vue";
import { useGatewayCredentials } from "./useGatewayCredentials";

const props = defineProps<{
  modelValue: boolean;
  namespace?: GatewayNamespace | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [val: boolean];
  submit: [
    payload: {
      slug: string;
      displayName: string;
      description: string;
      baseUrl: string;
      credentialId?: string;
      authHeader?: string;
      authScheme?: string;
    },
  ];
}>();

const { credentials, credentialsLoading } = useGatewayCredentials();

const slug = ref("");
const displayName = ref("");
const description = ref("");
const baseUrl = ref("");
const credentialId = ref<number | string>("");
const authHeader = ref("");
const authScheme = ref("");
const slugError = ref("");

const SLUG_PATTERN = /^[a-z0-9-]{2,64}$/;

watch(
  () => props.namespace,
  (ns) => {
    slug.value = ns?.slug ?? "";
    displayName.value = ns?.displayName ?? "";
    description.value = ns?.description ?? "";
    baseUrl.value = ns?.baseUrl ?? "";
    credentialId.value = ns?.credentialId ?? "";
    authHeader.value = ns?.authHeader ?? "";
    authScheme.value = ns?.authScheme ?? "";
    slugError.value = "";
  },
);

function validateSlug() {
  if (!slug.value) {
    slugError.value = "This field is required";

    return false;
  }
  if (!SLUG_PATTERN.test(slug.value)) {
    slugError.value = "Use 2–64 lowercase letters, numbers, or hyphens";

    return false;
  }
  slugError.value = "";

  return true;
}

function handleSubmit() {
  if (!validateSlug() || !displayName.value.trim()) return;
  emit("submit", {
    slug: slug.value,
    displayName: displayName.value.trim(),
    description: description.value.trim(),
    baseUrl: baseUrl.value.trim(),
    credentialId: credentialId.value ? String(credentialId.value) : undefined,
    authHeader: authHeader.value.trim() || undefined,
    authScheme: authScheme.value.trim() || undefined,
  });
  emit("update:modelValue", false);
}
</script>

<template>
  <VDialog :model-value="props.modelValue" max-width="480" @update:model-value="emit('update:modelValue', $event)">
    <VCard :title="props.namespace ? 'Edit Namespace' : 'New Namespace'">
      <VCardText class="d-flex flex-column gap-4 pt-4">
        <VTextField v-model="slug" label="Slug" placeholder="my-provider" :disabled="!!props.namespace"
          :error-messages="slugError" hint="URL-safe: lowercase letters, numbers, hyphens" persistent-hint
          @blur="validateSlug" />
        <VTextField v-model="displayName" label="Display Name" placeholder="My Provider"
          :rules="[value => !!value || 'This field is required']" />
        <VTextField v-model="description" label="Description" placeholder="Optional description" />
        <VTextField v-model="baseUrl" label="Base URL" placeholder="https://api.example.com"
          hint="Upstream base URL, e.g. https://api.stripe.com or /api/integrations/gateway/_upstream (mock)"
          persistent-hint
          :rules="[value => !value || value.startsWith('http') || value.startsWith('/') || 'Must start with http(s) or /']" />

        <!-- Upstream auth (used by PROXY routes) -->
        <div class="border rounded pa-3 d-flex flex-column gap-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">
            {{ "Upstream Authentication (PROXY routes)" }}
          </div>
          <VSelect v-model="credentialId" :items="credentials" item-title="key" item-value="id" label="Credential"
            clearable density="compact" :loading="credentialsLoading"
            hint="Injected by the gateway when proxying; never exposed to end users" persistent-hint />
          <div class="d-flex gap-3">
            <VTextField v-model="authHeader" label="Auth header" placeholder="Authorization"
              hint="Defaults to Authorization" persistent-hint density="compact" />
            <VTextField v-model="authScheme" label="Auth scheme" placeholder="Bearer" hint="Empty = raw value"
              persistent-hint density="compact" />
          </div>
        </div>
      </VCardText>

      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn variant="text" @click="emit('update:modelValue', false)">
          {{ "Cancel" }}
        </VBtn>
        <VBtn color="primary" :disabled="!slug || !displayName" @click="handleSubmit">
          {{ props.namespace ? "Save" : "Create" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
