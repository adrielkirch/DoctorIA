<script setup lang="ts">
import {
  extractRouteName,
  isRouteLocationDisabled,
} from "@/config/featureFlags";
import { frozenModuleKeys } from "@/navigation/frozenModules";
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useConfigStore } from "@core/stores/config";
import { resolveNavIconProps } from "@layouts/utils";
import type { SearchResults } from "contracts/app-bar-search/types";
import Shepherd from "shepherd.js";
import { withQuery } from "ufo";
import type { RouteLocationRaw } from "vue-router";

interface Suggestion {
  icon: string;
  title: string;


  url: RouteLocationRaw | { href: string };
}

defineOptions({
  inheritAttrs: false,
});

const configStore = useConfigStore();
const auth = useAuthStore();


const accessControlStore = useAccessControlStore();

accessControlStore.ensureLoaded();


const hasTenant = computed(() => !!auth.currentTenant);

const resolveSearchIcon = (icon: unknown) =>
  resolveNavIconProps(typeof icon === "string" ? { icon } : undefined, {
    icon: "bx-circle",
  }).icon as string;

interface SuggestionGroup {
  title: string;
  content: Suggestion[];
}


const isAppSearchBarVisible = ref(false);
const isLoading = ref(false);



const suggestionGroups = computed<SuggestionGroup[]>(() => {
  if (!hasTenant.value) return [];

  const groups: SuggestionGroup[] = [



    {
      title: "AI",
      content: [
        {
          icon: "bx-code-alt",
          title: "Skills",
          url: { name: "ai-skills" },
        },
        {
          icon: "bx-book-content",
          title: "Knowledge",
          url: { name: "ai-knowledge" },
        },
      ],
    },
    {
      title: "Integrations",
      content: [
        // {
        //   icon: "bx-server",
        //   title: "MCP Hub",
        //   url: { name: "integrations-mcp" },
        // },
        {
          icon: "bx-transfer-alt",
          title: "API Gateway",



          url: { name: "integrations-gateway" },
        },
      ],
    },
    {
      title: "Security & Access",
      content: [
        {
          icon: "bx-check-shield",
          title: "Roles & Permissions",
          url: { name: "access-control-roles" },
        },
        {
          icon: "bx-key",
          title: "Credentials",
          url: { name: "security-credentials" },
        },
      ],
    },
  ];




  return groups.filter((group) => {
    group.content = group.content.filter((item) => {
      if (isRouteLocationDisabled(item.url)) return false;

      const routeName = extractRouteName(item.url);
      if (routeName && !accessControlStore.can(routeName)) return false;

      const titleLower = item.title.toLowerCase();

      return !frozenModuleKeys.some((key) =>
        titleLower.includes(key.toLowerCase()),
      );
    });

    return group.content.length > 0;
  });
});


const noDataSuggestions = computed(() =>
  suggestionGroups.value.flatMap((g) => g.content),
);

const compactSearchDialogClasses = computed(() => ({
  "compact-nav-enabled": true,
  "compact-nav-dense": configStore.isLessThanOverlayNavBreakpoint,
}));

const searchQuery = ref("");

const router = useRouter();
const searchResult = ref<SearchResults[]>([]);

const fetchResults = async () => {

  if (!hasTenant.value) {
    searchResult.value = [];

    return;
  }

  isLoading.value = true;

  const { data } = await useApi<any>(
    withQuery("/app-bar/search", { q: searchQuery.value }),
  );



  searchResult.value = (data.value ?? [])
    .map((item: SearchResults) => ({
      ...item,
      children: (item.children ?? []).filter(
        (child) =>
          !isRouteLocationDisabled(child.url) &&
          !(
            extractRouteName(child.url) &&
            !accessControlStore.can(extractRouteName(child.url))
          ),
      ),
    }))
    .filter((item: SearchResults) => item.children.length > 0);


  setTimeout(() => {
    isLoading.value = false;
  }, 500);
};

watch(searchQuery, fetchResults);

const closeSearchBar = () => {
  isAppSearchBarVisible.value = false;
  searchQuery.value = "";
};


const redirectToSuggestedPage = (selected: Suggestion) => {
  const u = selected.url as any;


  if (u && typeof u === "object" && "href" in u) {
    window.open(u.href, "_blank", "noopener");
    closeSearchBar();

    return;
  }


  router.push(u as any);
  closeSearchBar();
};

const LazySearchResultsDialog = defineAsyncComponent(
  () => import("@core/components/SearchResultsDialog.vue"),
);
</script>

<template>
  <div class="d-flex align-center cursor-pointer" v-bind="$attrs" :style="{ userSelect: 'none' }"
    @click="isAppSearchBarVisible = !isAppSearchBarVisible">
    <!-- 👉 Search Trigger button -->
    <!-- close active tour while opening search bar using icon -->
    <IconBtn @click="Shepherd.activeTour?.cancel()">
      <VIcon icon="bx-search" />
    </IconBtn>

    <span v-if="configStore.appContentLayoutNav === 'vertical'" class="d-none d-md-flex align-center text-disabled ms-2"
      @click="Shepherd.activeTour?.cancel()">
      <span class="me-2">{{ "Search" }}</span>
      <span class="meta-key">&#8984;K</span>
    </span>
  </div>

  <!-- 👉 App Bar Search -->
  <LazySearchResultsDialog v-model:is-dialog-visible="isAppSearchBarVisible" :search-results="searchResult"
    :is-loading="isLoading" :class="compactSearchDialogClasses" @search="searchQuery = $event">
    <!-- suggestion -->
    <template #suggestions>
      <VCardText class="app-bar-search-suggestions pa-12">
        <VRow v-if="suggestionGroups.length">
          <VCol v-for="suggestion in suggestionGroups" :key="suggestion.title" cols="12" sm="6">
            <p class="text-overline text-disabled text-uppercase py-2 px-4 mb-0">
              {{ suggestion.title }}
            </p>
            <VList class="card-list">
              <VListItem v-for="item in suggestion.content" :key="item.title"
                class="app-bar-search-suggestion mx-4 mt-2" @click="redirectToSuggestedPage(item)">
                <VListItemTitle class="compact-nav-search-title" :title="item.title">
                  {{ item.title }}
                </VListItemTitle>
                <template #prepend>
                  <VIcon :icon="resolveSearchIcon(item.icon)" size="20" class="me-n1" />
                </template>
              </VListItem>
            </VList>
          </VCol>
        </VRow>

        <!-- ℹ️ Tenant gating: no active tenant → CTA to pick/create a workspace -->
        <div v-else class="d-flex flex-column align-center justify-center gap-4 py-8">
          <VIcon icon="bx-buildings" size="40" class="text-disabled" />
          <p class="text-body-1 text-medium-emphasis mb-0">
            {{ "Select a workspace to see search suggestions." }}
          </p>
          <VBtn color="primary" @click="router.push('/tenants')">
            {{ "Choose workspace" }}
          </VBtn>
        </div>
      </VCardText>
    </template>

    <!-- no data suggestion -->
    <template #noDataSuggestion>
      <div class="mt-11">
        <span class="d-flex justify-center text-disabled mb-2">{{
          "Try searching for"
        }}</span>
        <h6 v-for="suggestion in noDataSuggestions" :key="suggestion.title"
          class="app-bar-search-suggestion compact-nav-search-title text-h6 font-weight-regular cursor-pointer py-2 px-4"
          :title="suggestion.title" @click="redirectToSuggestedPage(suggestion)">
          <VIcon size="20" :icon="resolveSearchIcon(suggestion.icon)" class="me-2" />
          <span class="d-inline-block">{{ suggestion.title }}</span>
        </h6>
      </div>
    </template>

    <!-- search result -->
    <template #searchResult="{ item }">
      <VListSubheader class="text-disabled font-weight-regular ps-4">
        {{ item.title }}
      </VListSubheader>
      <VListItem v-for="list in item.children" :key="list.title" :to="list.url" @click="closeSearchBar">
        <template #prepend>
          <VIcon size="20" :icon="resolveSearchIcon(list.icon)" class="me-n1" />
        </template>
        <template #append>
          <VIcon size="20" icon="bx-subdirectory-left" class="enter-icon flip-in-rtl" />
        </template>
        <VListItemTitle>
          <span class="compact-nav-search-title" :title="list.title">{{ list.title }}</span>
        </VListItemTitle>
      </VListItem>
    </template>
  </LazySearchResultsDialog>
</template>

<style lang="scss">
@use "@styles/variables/vuetify";

.meta-key {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  block-size: 1.5625rem;
  font-size: 0.8125rem;
  line-height: 1.3125rem;
  padding-block: 0.125rem;
  padding-inline: 0.25rem;
}

.app-bar-search-dialog {
  .card-list {
    --v-card-list-gap: 8px;
  }

  .compact-nav-search-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* stylelint-disable declaration-block-no-redundant-longhand-properties, order/properties-order */
  .v-list-item:focus-visible,
  .app-bar-search-suggestion:focus-visible {
    outline-color: rgb(var(--v-theme-primary));
    outline-style: solid;
    outline-width: var(--compact-nav-focus-outline-width);
    outline-offset: 1px;
  }

  /* stylelint-enable declaration-block-no-redundant-longhand-properties, order/properties-order */
}
</style>
