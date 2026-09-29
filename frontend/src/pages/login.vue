<!-- ❗Errors in the form are set on line 60 -->
<script setup lang="ts">
import Logo from "@/components/Logo.vue";
import { useAuthStore } from "@/stores/useAuthStore";
import { emailValidator, requiredValidator } from "@core/utils/validators";
import { themeConfig } from "@themeConfig";
import { VForm } from "vuetify/components/VForm";

definePage({
  meta: {
    layout: "blank",
    unauthenticatedOnly: true,
  },
});


const isPasswordVisible = ref(false);

const router = useRouter();

const ability = useAbility();
const auth = useAuthStore();

const errors = ref<Record<string, string | undefined>>({
  email: undefined,
  password: undefined,
});

const refVForm = ref<VForm>();

const credentials = ref({
  email: "admin@demo.com",
  password: "admin",
});

const rememberMe = ref(false);


const demoAccounts = [
  { role: "Owner", email: "owner@demo.com", password: "owner" },
  { role: "Admin", email: "admin@demo.com", password: "admin" },
  { role: "Developer", email: "developer@demo.com", password: "developer" },
  { role: "Support", email: "support@demo.com", password: "support" },
  { role: "Client", email: "client@demo.com", password: "client" },
];

const requiredRule = (value: unknown) =>
  requiredValidator(value) === true || "This field is required";

const emailRule = (value: unknown) =>
  emailValidator(value) === true || "The Email field must be a valid email";

const login = async () => {
  try {
    const res = await $api("/auth/login", {
      method: "POST",
      body: {
        email: credentials.value.email,
        password: credentials.value.password,
      },
      onResponseError({ response }) {
        const raw = response._data?.errors ?? {};
        const invalid = "Invalid email or password";

        errors.value = {
          email: raw.email ? invalid : undefined,
          password: raw.password ? invalid : undefined,
        };
      },
    });

    const {
      accessToken,
      userData,
      userAbilityRules,
      memberships,
      currentTenantId,
    } = res;




    const effectiveRules = userAbilityRules?.length
      ? userAbilityRules
      : userData?.role === "admin"
        ? [{ action: "manage", subject: "all" }]
        : [];

    useCookie("userAbilityRules").value = effectiveRules;
    ability.update(effectiveRules);

    auth.setSession({
      accessToken,
      user: userData,
      memberships,
      currentTenantId,
    });


    if (!currentTenantId && memberships && memberships.length > 0)
      auth.switchTenant(memberships[0].tenantId);


    await nextTick();
    await router.replace({ name: "ai-assistant" });
  } catch (err) {
    console.error(err);
  }
};

const onSubmit = () => {
  refVForm.value?.validate().then(({ valid: isValid }) => {
    if (isValid) login();
  });
};
</script>

<template>
  <VRow no-gutters class="auth-wrapper bg-surface">
    <VCol md="8" class="d-none d-md-flex">
      <div class="position-relative bg-background w-100 pa-8">
        <div class="d-flex align-center justify-center w-100 h-100">
          <!-- <VImg
            max-width="700"
            :src="authV2LoginIllustration"
            class="auth-illustration"
          /> -->
        </div>
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard flat :max-width="500" class="mt-12 mt-sm-0 pa-6">
        <VCardText>
          <RouterLink
            to="/"
            class="d-flex align-center gap-x-2 mb-6 text-decoration-none"
          >
            <div class="auth-logo d-flex align-center gap-x-2">
              <Logo show-name />
            </div>
          </RouterLink>
        </VCardText>
        <VCardText>
          <h4 class="text-h4 mb-1">
            {{ ("Welcome to " + String(themeConfig.app.title) + "!") }} 👋🏻
          </h4>
          <p class="mb-0">
            {{ "Please sign-in to your account and start the adventure" }}
          </p>
        </VCardText>
        <VCardText>
          <VAlert color="primary" variant="tonal">
            <p class="text-sm mb-2 font-weight-medium">
              {{ "Demo accounts (one per role)" }}
            </p>
            <p
              v-for="acc in demoAccounts"
              :key="acc.email"
              class="text-sm mb-0"
            >
              <strong class="text-capitalize">{{ acc.role }}</strong>
              — {{ acc.email }} / {{ acc.password }}
            </p>
          </VAlert>
        </VCardText>
        <VCardText>
          <VForm ref="refVForm" @submit.prevent="onSubmit">
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="credentials.email"
                  label="Email"
                  placeholder="johndoe@email.com"
                  type="email"
                  autofocus
                  :rules="[requiredRule, emailRule]"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  v-model="credentials.password"
                  label="Password"
                  placeholder="············"
                  :rules="[requiredRule]"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="password"
                  :error-messages="errors.password"
                  :append-inner-icon="isPasswordVisible ? 'bx-hide' : 'bx-show'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div
                  class="d-flex align-center flex-wrap justify-space-between my-6"
                >
                  <VCheckbox
                    v-model="rememberMe"
                    label="Remember me"
                  />
                  <RouterLink
                    class="text-primary"
                    :to="{ name: 'forgot-password' }"
                  >
                    {{ "Forgot Password?" }}
                  </RouterLink>
                </div>

                <VBtn block type="submit">
                  {{ "Login" }}
                </VBtn>
              </VCol>

              <!-- create account -->
              <VCol cols="12" class="text-body-1 text-center">
                <span class="d-inline-block">
                  {{ "New on our platform?" }}
                </span>
                <RouterLink
                  class="text-primary ms-1 d-inline-block text-body-1"
                  :to="{ name: 'register' }"
                >
                  {{ "Create an account" }}
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
              <VCol cols="12" class="text-center">
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
