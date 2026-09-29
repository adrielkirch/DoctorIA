<script setup lang="ts">
const { y } = useWindowScroll()

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}
</script>

<template>
  <VScaleTransition
    style="transform-origin: center;"
    class="scroll-to-top d-print-none"
  >
    <VBtn
      v-show="y > 200"
      icon
      density="comfortable"
      variant="tonal"
      color="primary"
      @click="scrollToTop"
    >
      <VIcon
        size="22"
        icon="bx-up-arrow-alt"
      />
    </VBtn>
  </VScaleTransition>
</template>

<style lang="scss">
.scroll-to-top {
  position: fixed !important;


  z-index: 999;
  inset-block-end: 24px;
  inset-inline-end: 24px;
}
</style>
