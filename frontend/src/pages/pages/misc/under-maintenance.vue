<script setup lang="ts">
import miscUnderMaintenance from '@images/pages/misc-under-maintenance.png'

definePage({
  meta: {
    layout: 'blank',
    public: true,
  },
})
</script>

<template>
  <div class="misc-wrapper">
    <div class="text-center mb-13">
      <!-- 👉 Title and subtitle -->
      <h3 class="text-h3 font-weight-medium mb-2">
        Under Maintenance! 🚧
      </h3>
      <p class="text-body-1 mb-6">
        Sorry for the inconvenience but we're performing some maintenance at the moment
      </p>

      <VBtn to="/">
        Back to Home
      </VBtn>
    </div>

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg
        :src="miscUnderMaintenance"
        alt="Coming Soon"
        :max-width="500"
        class="mx-auto"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@core/scss/template/pages/misc.scss";
</style>
