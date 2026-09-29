<script lang="ts" setup>
import { buildHorizontalNavItems } from "@/navigation/horizontal";
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";


import Footer from "@/layouts/components/Footer.vue";
import NavSearchBar from "@/layouts/components/NavSearchBar.vue";


import Logo from "@/components/Logo.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";
import { HorizontalNavLayout } from "@layouts";

const auth = useAuthStore();


const accessControlStore = useAccessControlStore();

watch(
  () => auth.currentTenantId,
  () => {
    accessControlStore.reset();
    accessControlStore.ensureLoaded();
  },
  { immediate: true },
);


const navItems = computed(() => buildHorizontalNavItems(!!auth.currentTenant));
</script>

<template>
  <HorizontalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar>
      <RouterLink to="/" class="app-logo d-flex align-center gap-x-2">
        <Logo show-name />
      </RouterLink>
      <VSpacer />

      <NavSearchBar trigger-btn-class="ms-lg-n3" />

      <NavbarThemeSwitcher />
      <!-- <NavbarShortcuts /> -->
      <UserProfile />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </HorizontalNavLayout>
</template>

<style lang="scss" scoped>
.app-logo {
  --brand-logo-default-size: 2.5rem;

  :deep(.brand-identity__name) {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.15px;
    line-height: 1.75rem;
  }
}
</style>
