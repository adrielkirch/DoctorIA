<script setup lang="ts">
import Logo from '@/components/Logo.vue'
import { emailValidator, requiredValidator } from '@core/utils/validators'
import { VForm } from 'vuetify/components/VForm'

import authV2ForgotPasswordIllustration from '@images/pages/auth-v2-forgot-password-illustration.png'

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const email = ref('')

const errors = ref<Record<string, string | undefined>>({
  email: undefined,
})

const isSending = ref(false)
const isSent = ref(false)

const refVForm = ref<VForm>()

const requiredRule = (value: unknown) =>
  requiredValidator(value) === true || "This field is required"

const emailRule = (value: unknown) =>
  emailValidator(value) === true || "The Email field must be a valid email"

const translateApiError = (raw: unknown) => {
  const code = Array.isArray(raw) ? raw[0] : raw
  if (!code)
    return undefined

  const map: Record<string, string> = {
    'Email is required': "This field is required",
    'Enter a valid email address': "The Email field must be a valid email",
  }

  return map[String(code)] ?? "Unable to send the reset link. Please try again."
}

const sendResetLink = async () => {
  isSending.value = true

  try {
    await $api('/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.value,
      },
      onResponseError({ response }) {
        const raw = response._data?.errors ?? {}

        errors.value = {
          email: translateApiError(raw.email),
        }
      },
    })

    isSent.value = true
  }
  catch (err) {
    console.error(err)
  }
  finally {
    isSending.value = false
  }
}

const onSubmit = () => {
  refVForm.value?.validate()
    .then(({ valid: isValid }) => {
      if (isValid)
        sendResetLink()
    })
}
</script>

<template>
  <RouterLink to="/">
    <div class="auth-logo d-flex align-center gap-x-2">
      <Logo show-name />
    </div>
  </RouterLink>

  <VRow
    class="auth-wrapper bg-surface"
    no-gutters
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 pa-8">
        <div class="d-flex align-center justify-center w-100 h-100">
          <VImg
            max-width="700"
            :src="authV2ForgotPasswordIllustration"
            class="auth-illustration"
          />
        </div>
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-6"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            {{ "Forgot Password?" }} 🔒
          </h4>
          <p class="mb-0">
            {{ "Enter your email and we'll send you instructions to reset your password" }}
          </p>
        </VCardText>

        <VCardText>
          <VAlert
            v-if="isSent"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ "If an account exists for this email, we have sent a password reset link. Please check your inbox." }}
          </VAlert>

          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  :rules="[requiredRule, emailRule]"
                  :error-messages="errors.email"
                  autofocus
                  label="Email"
                  type="email"
                  placeholder="johndoe@email.com"
                />
              </VCol>

              <!-- Reset link -->
              <VCol cols="12">
                <VBtn
                  block
                  type="submit"
                  :loading="isSending"
                >
                  {{ "Send Reset Link" }}
                </VBtn>
              </VCol>

              <!-- back to login -->
              <VCol cols="12">
                <RouterLink
                  class="d-flex align-center justify-center"
                  :to="{ name: 'login' }"
                >
                  <VIcon
                    icon="bx-chevron-left"
                    size="20"
                    class="me-1 flip-in-rtl"
                  />
                  <span>{{ "Back to login" }}</span>
                </RouterLink>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>
