<script lang="ts" setup>
/**
 * T035 [US3] Integrations Page Shell
 * Shell page for Integrations feature following thin-page pattern
 */
definePage({
  meta: {
    layoutWrapperClasses: 'layout-content-height-fixed',
  },
})
</script>

<template>
  <VContainer class="py-8">
    <VRow>
      <VCol cols="12">
        <h4 class="text-h4 mb-2">
          {{ "Integrations" }}
        </h4>
        <p class="text-body-1 text-medium-emphasis mb-6">
          {{ "Manage external connectivity through MCP Hub and API Gateway." }}
        </p>
      </VCol>

      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardTitle>{{ "MCP Hub" }}</VCardTitle>
          <VCardText>
            {{ "Configure Model Context Protocol servers and connectors." }}
          </VCardText>
          <VCardActions>
            <VBtn
              color="primary"
              :to="{ name: 'integrations-mcp' }"
            >
              {{ "Open MCP Hub" }}
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="6"
      >
        <VCard>
          <VCardTitle>{{ "API Gateway" }}</VCardTitle>
          <VCardText>
            {{ "Define routes, policies, and upstream services." }}
          </VCardText>
          <VCardActions>
            <VBtn
              color="primary"
              variant="outlined"
              :to="{ name: 'integrations-gateway' }"
            >
              {{ "Open API Gateway" }}
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
