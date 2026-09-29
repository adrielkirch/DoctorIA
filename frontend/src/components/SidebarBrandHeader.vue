<script setup lang="ts">
import Logo from './Logo.vue';

/**
 * SidebarBrandHeader
 * ─────────────────────────────────────────────────────────────────────────────
 * Header de marca ÚNICO das duas vertical navs (view default do VerticalNav e
 * view de chats via AiChatNavHeader). Encapsula o layout enxuto (~44px), marca
 * a partir de 0.5rem da borda, alinhada com os itens da lista. Nenhum override
 * CSS duplicado nos consumidores — a tipografia/logo vivem no `Logo`
 * com a prop `compact` (fonte única da identidade visual).
 */
interface Props {

  /** Exibe o nome da marca (gated por `showBrandName` no Logo). */
  showName?: boolean

  /** Modo collapsed/mini: só a logo (reduzida), nunca o nome. */
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), {
  showName: false,
  collapsed: false,
})
</script>

<template>
  <!--
    ℹ️ Estados MUTUAMENTE EXCLUSIVOS (ternário direto no wrapper):
    • expandido  → `--expanded`  com o padding horizontal/vertical padrão.
    • collapsed  → `--collapsed` com padding ~zero, altura travada e centralizada.
    Nenhum padding estático fica "ativo" nos dois estados (era o buraco negro
    que sobrava quando o estado colapsado não sobrescrevia o shorthand base).
  -->
  <div
    class="sidebar-brand-header"
    :class="collapsed
      ? 'sidebar-brand-header--collapsed'
      : 'sidebar-brand-header--expanded'"
  >
    <RouterLink
      :to="{ name: 'tenants' }"
      class="sidebar-brand-header__brand"
    >
      <Logo
        compact
        :show-name="showName"
        :collapsed="collapsed"
      />
    </RouterLink>

    <!--
      Ações opcionais (ex.: pin/unpin/close no VerticalNav default).
      No collapsed elas somem do DOM — não sobram offsets no layout.
    -->
    <div
      v-if="$slots.actions && !collapsed"
      class="sidebar-brand-header__actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>



.sidebar-brand-header {
  display: flex;
  align-items: center;
  inline-size: 100%;

  &__brand {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    gap: 0.5rem;
    min-inline-size: 0;
    text-decoration: none;
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }



  &--expanded {
    column-gap: 0.25rem;
    justify-content: flex-start;
    padding: 0.5rem 1rem 0.625rem 0.5rem;
  }



  &--collapsed {
    column-gap: 0;
    justify-content: center;
    padding: 0.25rem;

    .sidebar-brand-header__brand {
      justify-content: center;
    }
  }
}
</style>
