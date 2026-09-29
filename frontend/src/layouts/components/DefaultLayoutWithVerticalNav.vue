<script lang="ts" setup>
import { buildVerticalNavItems } from "@/navigation/vertical";
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";


import Footer from "@/layouts/components/Footer.vue";
import NavSearchBar from "@/layouts/components/NavSearchBar.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";


import { useConfigStore } from "@/@core/stores/config";
import { useSnackbar } from "@/composables/useSnackbar";
import {
  resolveVerticalNavView,
  verticalNavViews,
} from "@/layouts/components/vertical-nav-views/verticalNavViews";
import { VerticalNavLayout } from "@layouts";

const configStore = useConfigStore();
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


const navItems = computed(() => buildVerticalNavItems(!!auth.currentTenant));



const route = useRoute();

const activeView = computed(
  () =>
    verticalNavViews.find(
      (v) => v.id === resolveVerticalNavView(String(route.name)),
    ) ?? verticalNavViews[0],
);





const isImmersive = computed(() => route.meta.immersive === true);



const previousCollapsed = ref<boolean | null>(null);

watch(
  () => activeView.value.id,
  (viewId) => {
    if (viewId === "chats" && configStore.isVerticalNavCollapsed) {
      previousCollapsed.value = configStore.isVerticalNavCollapsed;
      configStore.isVerticalNavCollapsed = false;
    } else if (viewId === "default" && previousCollapsed.value !== null) {
      configStore.isVerticalNavCollapsed = previousCollapsed.value;
      previousCollapsed.value = null;
    }
  },
  { immediate: true },
);


const snackbar = useSnackbar();


const verticalNavHeaderActionAnimationName = ref<
  null | "rotate-180" | "rotate-back-180"
>(null);

watch(
  [() => configStore.isVerticalNavCollapsed, () => configStore.isAppRTL],
  (val) => {
    if (configStore.isAppRTL) {
      verticalNavHeaderActionAnimationName.value = val[0]
        ? "rotate-back-180"
        : "rotate-180";
    } else {
      verticalNavHeaderActionAnimationName.value = val[0]
        ? "rotate-180"
        : "rotate-back-180";
    }
  },
  { immediate: true },
);

const actionArrowInitialRotation = configStore.isVerticalNavCollapsed
  ? "180deg"
  : "0deg";
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!--
      ℹ️ Views da sidebar (registry): header + conteúdo trocam conforme a rota.
      Na view `default` nada é renderizado → a VerticalNav usa o conteúdo
      nativo (links + RBAC) e o header vazio atual.
    -->
    <template #vertical-nav-header>
      <component :is="activeView.header" v-if="activeView.header" />
    </template>
    <template
      v-if="activeView.items"
      #vertical-nav-items="{ updateIsVerticalNavScrolled }"
    >
      <component
        :is="activeView.items"
        :update-is-vertical-nav-scrolled="updateIsVerticalNavScrolled"
      />
    </template>

    <template #after-vertical-nav-items>
      <!-- ℹ️ Workspace switcher removed for single-tenant per user -->
    </template>

    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <!--
        ℹ️ Modo IMERSIVO: controles flutuantes SEPARADOS — hamburger à
        esquerda (SÓ no mobile/tablet, onde a sidebar vira drawer) e avatar
        no extremo direito. No desktop a sidebar fica ABERTA sempre
        (chatgpt.com). O restante da navbar some.
      -->
      <template v-if="isImmersive">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="immersive-nav"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon size="24" icon="bx-menu" />
        </IconBtn>
        <div class="immersive-nav__profile">
          <UserProfile />
        </div>

        <!--
          ℹ️ Troca de tema (claro/escuro/sistema) também no modo imersivo: aqui a
          navbar "normal" — que carrega o NavbarThemeSwitcher — está reduzida a
          controles flutuantes, então sem este pill o AI Assistant (única rota
          imersiva) era a única página sem o switcher de tema.
        -->
        <div class="immersive-nav__theme">
          <NavbarThemeSwitcher />
        </div>
      </template>

      <div v-else class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon size="26" icon="bx-menu" />
        </IconBtn>

        <NavSearchBar class="ms-lg-n3" />

        <VSpacer />

        <NavbarThemeSwitcher />
        <!-- <NavbarShortcuts /> -->
        <UserProfile />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Snackbar global (estado compartilhado via useSnackbar) -->
    <VSnackbar v-model="snackbar.state.visible" :color="snackbar.state.color">
      {{ snackbar.state.text }}
    </VSnackbar>
  </VerticalNavLayout>
</template>

<style lang="scss">
@use "@layouts/styles/mixins" as layoutsMixins;

.layout-vertical-nav {



  .nav-header {
    position: relative;
    overflow: visible !important;
  }
}


@keyframes rotate-180 {
  from {
    transform: rotate(0deg) scaleX(var(--app-header-actions-scale-x));
  }

  to {
    transform: rotate(180deg) scaleX(var(--app-header-actions-scale-x));
  }
}

@keyframes rotate-back-180 {
  from {
    transform: rotate(180deg) scaleX(var(--app-header-actions-scale-x));
  }

  to {
    transform: rotate(0deg) scaleX(var(--app-header-actions-scale-x));
  }
}

/* stylelint-disable-next-line no-duplicate-selectors */
.layout-vertical-nav {
  /* stylelint-disable-next-line no-duplicate-selectors */
  .nav-header {
    .header-action {

      --app-header-actions-scale-x: 1;

      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      animation-duration: 0.35s;
      animation-fill-mode: forwards;
      animation-name: v-bind(verticalNavHeaderActionAnimationName);
      block-size: 28px;
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      cursor: pointer;
      inline-size: 28px;
      /* stylelint-disable-next-line value-keyword-case */
      transform: rotate(v-bind(actionArrowInitialRotation))
        scaleX(var(--app-header-actions-scale-x));
      transition:
        color 0.15s ease,
        background-color 0.15s ease,
        opacity 0.2s ease-in-out;

      &:hover {
        background-color: rgba(
          var(--v-theme-on-surface),
          var(--v-hover-opacity)
        );
        color: rgb(var(--v-theme-on-surface));
      }

      &:focus-visible {
        outline: 2px solid rgb(var(--v-theme-primary));
        outline-offset: 1px;
      }

      @include layoutsMixins.rtl {
        --app-header-actions-scale-x: -1;
      }

      @at-root {
        .layout-nav-type-vertical.layout-overlay-nav
          .layout-vertical-nav:not(.visible)
          .nav-header
          .header-action {
          opacity: 0;
        }
      }
    }
  }
}




.layout-wrapper.immersive {


  @media (max-width: 1279px) {
    .layout-vertical-nav {
      transform: translateX(-100%);
      transition: transform 0.25s ease-in-out;

      @include layoutsMixins.rtl {
        transform: translateX(100%);
      }

      &.visible {
        transform: translateX(0);
      }
    }

    .layout-content-wrapper {
      padding-inline-start: 0 !important;
    }
  }









  &.layout-nav-type-vertical .layout-navbar,
  &.layout-nav-type-vertical .layout-navbar .navbar-content-container {
    border: none !important;
    backdrop-filter: none !important;
    background-color: transparent !important;
    border-block-end: none !important;
    border-block-start: none !important;
    border-inline-end: none !important;
    border-inline-start: none !important;
    box-shadow: none !important;
  }

  .layout-navbar {
    position: fixed;
    inset-block-start: 0;


    &::after {
      display: none;
    }
  }


  .layout-page-content {
    padding-block: 0;
  }
}
</style>

<!--
  ℹ️ Controles flutuantes do modo imersivo (scoped): hamburger no topo
  esquerdo (SÓ mobile/tablet — desktop a sidebar fica aberta) e avatar no
  extremo direito.
-->
<style lang="scss" scoped>
.immersive-nav {
  position: fixed;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  background-color: rgb(var(--v-theme-surface), 0.85);
  box-shadow: 0 2px 10px rgb(0 0 0 / 12%);
  inset-block-start: 0.75rem;
  inset-inline-start: 0.75rem;



  @media (min-width: 1280px) {
    display: none;
  }
}


.immersive-nav__profile {
  position: fixed;
  z-index: 30;
  padding: 0;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  background-color: rgb(var(--v-theme-surface), 0.85);
  box-shadow: 0 2px 10px rgb(0 0 0 / 12%);
  inset-block-start: 0.75rem;
  inset-inline-end: 0.75rem;
}




.immersive-nav__theme {
  position: fixed;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  background-color: rgb(var(--v-theme-surface), 0.85);
  box-shadow: 0 2px 10px rgb(0 0 0 / 12%);
  inset-block-start: 0.75rem;
  inset-inline-end: 4.5rem;
}
</style>
