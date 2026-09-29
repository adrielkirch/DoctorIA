<script setup lang="ts">
import miscComingSoon from '@images/pages/auth-v2-login-illustration.png'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})

const email = ref('')
</script>

<template>
  <div class="misc-wrapper">
    <div>
      <!-- 👉 Title and subtitle -->
      <div class="text-center mb-4">
        <h3 class="text-h3 font-weight-medium mb-2">
          We are launching soon 🚀
        </h3>
        <p class="text-body-1 mb-6">
          Our website is opening soon. Please register to get notified when it's ready!
        </p>
      </div>

      <!-- 👉 Email input -->
      <VForm
        class="d-flex flex-wrap align-center justify-center gap-4 misc-form"
        @submit.prevent="() => {}"
      >
        <AppTextField
          v-model="email"
          autofocus
          placeholder="Enter your email or username"
          class="misc-email-input"
        />
        <VBtn type="submit">
          Notify
        </VBtn>
      </VForm>
    </div>

    <!-- 👉 Image -->
    <div class="misc-avatar w-100">
      <VImg
        :src="miscComingSoon"
        alt="Coming Soon"
        :max-width="500"
        class="mx-auto"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@core/scss/template/pages/misc.scss";

.misc-email-input {
  max-inline-size: 22.75rem;
  min-inline-size: 14.75rem;
}

.misc-form {
  margin-block-end: 3.25rem;
}

@media screen and (max-width: 575.98px) {
  .misc-form {
    margin-block-end: 3rem;
  }
}
</style>
