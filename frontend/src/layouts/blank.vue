<script lang="ts" setup>
const { injectSkinClasses } = useSkins();


injectSkinClasses();


const isFallbackStateActive = ref(false);
const refLoadingIndicator = ref<any>(null);


watch(
  [isFallbackStateActive, refLoadingIndicator],
  () => {
    if (isFallbackStateActive.value && refLoadingIndicator.value)
      refLoadingIndicator.value.fallbackHandle();

    if (!isFallbackStateActive.value && refLoadingIndicator.value)
      refLoadingIndicator.value.resolveHandle();
  },
  { immediate: true },
);

</script>

<template>
  <AppLoadingIndicator ref="refLoadingIndicator" />

  <div class="layout-wrapper layout-blank" data-allow-mismatch>
    <RouterView #="{ Component }">
      <Suspense
        :timeout="0"
        @fallback="isFallbackStateActive = true"
        @resolve="isFallbackStateActive = false"
      >
        <Component :is="Component" />
      </Suspense>
    </RouterView>
  </div>
</template>

<style>
.layout-wrapper.layout-blank {
  position: relative;
  flex-direction: column;
}

.layout-blank__i18n {
  position: absolute;
  z-index: 2;
  inset-block-start: 1rem;
  inset-inline-end: 1rem;
}
</style>
