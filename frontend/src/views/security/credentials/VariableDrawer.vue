<script setup lang="ts">
import type { CreateSecretPayload, CreateVariablePayload, VariableCredential } from 'contracts/security/credentials/types'
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  variable: VariableCredential | null
  isSaving?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: ({ credentialType: 'VARIABLE' | 'SECRET' } & (CreateVariablePayload | CreateSecretPayload)) | (CreateVariablePayload & { id: number })]
}>()

const key = ref('')
const value = ref('')
const description = ref('')
const credentialType = ref<'VARIABLE' | 'SECRET'>('VARIABLE')
const keyError = ref('')
const valueError = ref('')

const isEditMode = computed(() => props.variable !== null)
const title = computed(() => (isEditMode.value ? "Edit Variable" : "Add Credential"))
const valueLabel = computed(() => (credentialType.value === 'SECRET' ? "Secret value" : "Default value"))
const valueInputType = computed(() => (credentialType.value === 'SECRET' ? 'password' : 'text'))
const valuePlaceholder = computed(() => (credentialType.value === 'SECRET' ? "Enter secret value" : 'us-east-1'))

watch(
  () => [props.modelValue, props.variable],
  () => {
    if (!props.modelValue)
      return

    keyError.value = ''
    valueError.value = ''
    credentialType.value = 'VARIABLE'
    key.value = props.variable?.key ?? ''
    value.value = props.variable?.value ?? ''
    description.value = props.variable?.description ?? ''
  },
  { immediate: true },
)

function closeDrawer() {
  emit('update:modelValue', false)
}

function submitForm() {
  keyError.value = ''
  valueError.value = ''

  const payloadKey = key.value.trim()
  const payloadValue = value.value.trim()

  if (!payloadKey)
    keyError.value = credentialType.value === 'SECRET' ? "Secret key is required" : "Default key is required"

  if (!payloadValue)
    valueError.value = credentialType.value === 'SECRET' ? "Secret value is required" : "Default value is required"

  if (keyError.value || valueError.value)
    return

  if (isEditMode.value && props.variable) {
    emit('submit', {
      id: props.variable.id,
      key: payloadKey,
      value: payloadValue,
      description: description.value.trim() || undefined,
    })
  }
  else {
    emit('submit', {
      credentialType: credentialType.value,
      key: payloadKey,
      value: payloadValue,
      description: description.value.trim() || undefined,
    })
  }
}
</script>

<template>
  <VNavigationDrawer :model-value="modelValue" temporary location="right" width="440"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="d-flex align-center px-4 py-3 border-b">
      <span class="text-h6 flex-grow-1">{{ title }}</span>
      <VBtn icon="bx-x" variant="text" size="small" @click="closeDrawer" />
    </div>

    <div class="pa-4 d-flex flex-column gap-3">
      <VRadioGroup v-if="!isEditMode" v-model="credentialType" inline density="compact">
        <VRadio label="Default" value="VARIABLE" />
        <VRadio label="Secret" value="SECRET" />
      </VRadioGroup>

      <VTextField v-model="key" :label="credentialType === 'SECRET' ? 'Secret key' : 'Default key'"
        placeholder="APP_REGION" :error-messages="keyError" density="compact" />

      <VTextField v-model="value" :label="valueLabel" :type="valueInputType" :placeholder="valuePlaceholder"
        :error-messages="valueError" density="compact" />

      <VTextarea v-model="description" label="Description" rows="3" auto-grow density="compact" />
    </div>

    <div class="d-flex align-center gap-2 px-4 py-3 border-t">
      <VBtn color="primary" :loading="isSaving" :disabled="isSaving" @click="submitForm">
        {{ isEditMode ? "Update Variable" : (credentialType === 'SECRET' ? "Create Secret" : "Create Default") }}
      </VBtn>
      <VBtn variant="text" :disabled="isSaving" @click="closeDrawer">
        {{ "Cancel" }}
      </VBtn>
    </div>
  </VNavigationDrawer>
</template>
