<script setup lang="ts">
import { useGatewayPublicationStore } from "@/stores/useGatewayPublicationStore";
import type { GatewayNamespace, GatewayRoute } from "contracts/types/gateway";
import { onMounted, ref } from "vue";
import GatewayApiKeyPanel from "./GatewayApiKeyPanel.vue";
import { gatewayErrorMessage } from "./gatewayErrorKey";
import GatewayNamespaceDialog from "./GatewayNamespaceDialog.vue";
import GatewayNamespaceList from "./GatewayNamespaceList.vue";
import GatewayPublicationControl from "./GatewayPublicationControl.vue";
import GatewayQuickSetupDrawer from "./GatewayQuickSetupDrawer.vue";
import GatewayRouteDialog from "./GatewayRouteDialog.vue";
import GatewayRouteInvoker from "./GatewayRouteInvoker.vue";
import GatewayRouteTable from "./GatewayRouteTable.vue";
import GatewayWebhooksPanel from "./GatewayWebhooksPanel.vue";
import { useGatewayStore } from "./useGatewayStore";

const store = useGatewayStore();
const publicationStore = useGatewayPublicationStore();

const showNamespaceDialog = ref(false);
const editingNamespace = ref<GatewayNamespace | null>(null);
const showRouteDialog = ref(false);
const editingRoute = ref<GatewayRoute | null>(null);
const showQuickSetup = ref(false);

onMounted(async () => {
  await Promise.all([store.fetchNamespaces(), publicationStore.load()]);



  if (!store.selectedNamespace && store.namespaces.length > 0)
    store.selectNamespace(store.namespaces[0]);
});

function openCreateNamespace() {
  editingNamespace.value = null;
  showNamespaceDialog.value = true;
}

function openEditNamespace(ns: GatewayNamespace) {
  editingNamespace.value = ns;
  showNamespaceDialog.value = true;
}

async function handleNamespaceSubmit(payload: {
  slug: string;
  displayName: string;
  description: string;
  baseUrl: string;
  credentialId?: string;
  authHeader?: string;
  authScheme?: string;
}) {
  if (editingNamespace.value)
    await store.updateNamespace(editingNamespace.value.id, payload);
  else await store.createNamespace(payload);
}

async function handleDeleteNamespace(ns: GatewayNamespace) {
  if (
    !confirm(
      ("Delete namespace \"" + String(ns.displayName) + "\" and all its routes?"),
    )
  )
    return;
  await store.deleteNamespace(ns.id);
}

function openCreateRoute() {
  editingRoute.value = null;
  showRouteDialog.value = true;
}

function openEditRoute(route: GatewayRoute) {
  editingRoute.value = route;
  showRouteDialog.value = true;
}

async function handleRouteSubmit(payload: Partial<GatewayRoute>) {
  if (!store.selectedNamespace) return;
  if (editingRoute.value) {
    await store.updateRoute(
      store.selectedNamespace.id,
      editingRoute.value.id,
      payload,
    );
  } else {
    await store.createRoute(store.selectedNamespace.id, payload);
  }
}

async function handleDeleteRoute(route: GatewayRoute) {
  if (!store.selectedNamespace) return;
  if (
    !confirm(
      ("Delete route " + String(route.method) + " " + String(route.path) + "?"),
    )
  )
    return;
  await store.deleteRoute(store.selectedNamespace.id, route.id);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
</script>

<template>
  <div class="pa-6">
    <!-- Header toolbar -->
    <div class="d-flex align-center mb-4 gap-3">
      <div>
        <h1 class="text-h5 font-weight-semibold">
          {{ "API Gateway" }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ "Manage integration namespaces and route configurations" }}
        </p>
      </div>
      <VSpacer />
      <VBtn variant="tonal" color="'info'" @click="showQuickSetup = true">
        {{ "Quick Setup" }}
      </VBtn>
      <VBtn v-if="store.canManageNamespace" color="primary" prepend-icon="bx-plus" @click="openCreateNamespace">
        {{ "New Namespace" }}
      </VBtn>
    </div>

    <!-- Gateway endpoint banner -->
    <VAlert type="info" variant="tonal" density="compact" icon="bx-link" class="mb-5">
      <div class="d-flex align-center gap-3 flex-wrap">
        <div>
          <span class="text-caption text-medium-emphasis me-2">{{
            "Gateway Base URL"
          }}</span>
          <code class="text-body-2 font-weight-medium">{{
            store.gatewayBaseUrl
          }}</code>
        </div>
        <VChip size="x-small" variant="tonal" color="info" label class="font-mono">
          {{ store.gatewayTenantId }}
        </VChip>
        <VBtn size="x-small" variant="text" icon="bx-copy" @click="copyToClipboard(store.gatewayBaseUrl)" />
        <VSpacer />
        <div class="d-flex gap-2">
          <VChip size="x-small" color="success" variant="tonal" label prepend-icon="bx-globe">
            {{ "Public routes bypass JWT" }}
          </VChip>
          <VChip size="x-small" color="warning" variant="tonal" label prepend-icon="bx-lock-alt">
            {{ "Private routes require JWT + role" }}
          </VChip>
        </div>
      </div>
    </VAlert>

    <!-- Error banner -->
    <VAlert v-if="store.namespacesError" type="error" class="mb-4" closable>
      {{ gatewayErrorMessage(store.namespacesError) }}
    </VAlert>

    <!-- Two-column layout -->
    <VRow>
      <!-- Left: Namespace list -->
      <VCol cols="12" md="4" lg="3">
        <GatewayNamespaceList :namespaces="store.namespaces" :selected-id="store.selectedNamespace?.id ?? null"
          :loading="store.namespacesLoading" :can-manage="store.canManageNamespace" @select="store.selectNamespace"
          @edit="openEditNamespace" @delete="handleDeleteNamespace" />
      </VCol>

      <!-- Right: Route table -->
      <VCol cols="12" md="8" lg="9">
        <template v-if="store.selectedNamespace">
          <div class="d-flex align-center mb-2 gap-2">
            <h2 class="text-subtitle-1 font-weight-semibold">
              {{ store.selectedNamespace.displayName }}
              <span class="text-caption text-medium-emphasis font-mono ms-1">/{{ store.selectedNamespace.slug }}</span>
            </h2>
            <VSpacer />
            <VBtn v-if="store.canManageNamespace" color="primary" size="small" variant="tonal" prepend-icon="bx-plus"
              @click="openCreateRoute">
              {{ "Add Route" }}
            </VBtn>
          </div>

          <!-- Namespace invocation URL + public/private summary -->
          <div class="d-flex align-center gap-2 mb-3 flex-wrap">
            <code class="text-caption text-medium-emphasis font-mono">{{
              store.namespaceGatewayUrl
            }}</code>
            <VBtn size="x-small" variant="text" icon="bx-copy" @click="copyToClipboard(store.namespaceGatewayUrl!)" />
            <VSpacer />
            <VChip v-if="store.publicRouteCount > 0" size="x-small" color="success" variant="tonal" label>
              {{
                (String(store.publicRouteCount) + " public")
              }}
            </VChip>
            <VChip v-if="store.privateRouteCount > 0" size="x-small" color="warning" variant="tonal" label>
              {{
                (String(store.privateRouteCount) + " private")
              }}
            </VChip>
          </div>

          <VAlert v-if="store.routesError" type="error" class="mb-3" density="compact">
            {{ gatewayErrorMessage(store.routesError) }}
          </VAlert>

          <GatewayRouteTable :routes="store.routes" :loading="store.routesLoading" :can-manage="store.canDeleteRoute"
            @edit="openEditRoute" @delete="handleDeleteRoute" />

          <GatewayRouteInvoker />

          <GatewayApiKeyPanel :namespace-id="store.selectedNamespace.id" />

          <GatewayWebhooksPanel :namespace-id="store.selectedNamespace.id" />

          <VDivider class="my-6" />

          <GatewayPublicationControl :environments="publicationStore.environments" :releases="publicationStore.releases"
            :selected-environment="publicationStore.productionEnvironment?.environment ?? 'sandbox'
              " :can-publish="store.canManageNamespace" :can-rollback="store.canManageNamespace"
            :is-loading="publicationStore.isLoading" :is-publishing="publicationStore.isPublishing"
            :error="publicationStore.error" @select-environment="(env) => { }" @create-release="
              () => publicationStore.createRelease(store.routes.length)
            " @publish="(id) => publicationStore.publish(id)"
            @unpublish="(reason) => publicationStore.unpublish(reason)"
            @rollback="(id) => publicationStore.rollback(id)" @retry="publicationStore.load" />
        </template>

        <div v-else class="text-center py-16 text-medium-emphasis">
          <VIcon icon="bx-left-arrow-alt" size="36" class="mb-2 opacity-40" />
          <div class="text-body-2">
            {{ "Select a namespace to view its routes" }}
          </div>
        </div>
      </VCol>
    </VRow>
  </div>

  <!-- Namespace dialog -->
  <GatewayNamespaceDialog v-model="showNamespaceDialog" :namespace="editingNamespace" @submit="handleNamespaceSubmit" />

  <!-- Route dialog -->
  <GatewayRouteDialog v-model="showRouteDialog" :route="editingRoute" @submit="handleRouteSubmit" />

  <!-- Quick Setup drawer -->
  <GatewayQuickSetupDrawer v-model="showQuickSetup" :namespaces="store.namespaces"
    :default-namespace-id="store.selectedNamespace?.id" @provisioned="store.fetchNamespaces()" />
</template>
