<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'

import Logo from '@/components/Logo.vue'
import { emailValidator, requiredValidator } from '@core/utils/validators'


import { useAuthStore } from '@/stores/useAuthStore'

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const router = useRouter()
const ability = useAbility()
const auth = useAuthStore()

const isLegalDialogOpen = ref(false)

const form = ref({
  username: '',
  email: '',
  password: '',
  privacyPolicies: false,
})

const errors = ref<Record<string, string | undefined>>({
  username: undefined,
  email: undefined,
  password: undefined,
})

const isPasswordVisible = ref(false)
const isRegistering = ref(false)

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
    'Username is required': "This field is required",
    'Email is required': "This field is required",
    'Email already exists': "Email already exists",
    'Password is required': "This field is required",
    'Password must be at least 6 characters': "Password must be at least 6 characters",
  }

  return map[String(code)] ?? "Unable to create the account. Please try again."
}

const register = async () => {
  isRegistering.value = true

  try {
    const res = await $api('/auth/register', {
      method: 'POST',
      body: {
        username: form.value.username,
        email: form.value.email,
        password: form.value.password,
      },
      onResponseError({ response }) {
        const raw = response._data?.errors ?? {}

        errors.value = {
          username: translateApiError(raw.username),
          email: translateApiError(raw.email),
          password: translateApiError(raw.password),
        }
      },
    })

    const { accessToken, userData, userAbilityRules, memberships, currentTenantId } = res


    const effectiveRules = userAbilityRules?.length
      ? userAbilityRules
      : userData?.role === 'admin'
        ? [{ action: 'manage', subject: 'all' }]
        : []

    useCookie('userAbilityRules').value = effectiveRules
    ability.update(effectiveRules)

    auth.setSession({ accessToken, user: userData, memberships, currentTenantId })



    await nextTick()
    await router.replace({ name: 'tenants' })
  }
  catch (err) {
    console.error(err)
  }
  finally {
    isRegistering.value = false
  }
}

const onSubmit = () => {
  if (!form.value.privacyPolicies)
    return

  refVForm.value?.validate()
    .then(({ valid: isValid }) => {
      if (isValid)
        register()
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
    no-gutters
    class="auth-wrapper bg-surface"
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 pa-8">
        <div class="d-flex align-center justify-center w-100 h-100">
          <!-- <VImg
            max-width="700"
            :src="authV2RegisterIllustration"
            class="auth-illustration"
          /> -->
        </div>
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
      style="background-color: rgb(var(--v-theme-surface))"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-6"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            {{ "Adventure starts here" }} 🚀
          </h4>
          <p class="mb-0">
            {{ "Make your app management easy and fun!" }}
          </p>
        </VCardText>

        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- Username -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.username"
                  :rules="[requiredRule]"
                  :error-messages="errors.username"
                  autofocus
                  label="Username"
                  placeholder="Johndoe"
                />
              </VCol>

              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.email"
                  :rules="[requiredRule, emailRule]"
                  :error-messages="errors.email"
                  label="Email"
                  type="email"
                  placeholder="johndoe@email.com"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="form.password"
                  :rules="[requiredRule]"
                  :error-messages="errors.password"
                  label="Password"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="password"
                  :append-inner-icon="isPasswordVisible ? 'bx-hide' : 'bx-show'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center my-6">
                  <VCheckbox
                    id="privacy-policy"
                    v-model="form.privacyPolicies"
                    inline
                  />
                  <VLabel
                    for="privacy-policy"
                    style="opacity: 1"
                  >
                    <span class="me-1 text-high-emphasis">{{ "I agree to" }}</span>
                    <a
                      href="javascript:void(0)"
                      class="text-primary"
                      @click="isLegalDialogOpen = true"
                    >{{ "privacy policy & terms" }}</a>
                  </VLabel>
                </div>

                <VBtn
                  block
                  type="submit"
                  :loading="isRegistering"
                >
                  {{ "Sign up" }}
                </VBtn>
              </VCol>

              <!-- create account -->
              <VCol
                cols="12"
                class="text-center text-base"
              >
                <span class="d-inline-block">{{ "Already have an account?" }}</span>
                <RouterLink
                  class="text-primary ms-1 d-inline-block"
                  :to="{ name: 'login' }"
                >
                  {{ "Sign in instead" }}
                </RouterLink>
              </VCol>

              <!--
                <VCol
                cols="12"
                class="d-flex align-center"
                >
                <VDivider />
                <span class="mx-4">or</span>
                <VDivider />
                </VCol>
              -->

              <!-- auth providers -->
              <VCol
                cols="12"
                class="text-center"
              >
                <!-- <AuthProvider /> -->
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
