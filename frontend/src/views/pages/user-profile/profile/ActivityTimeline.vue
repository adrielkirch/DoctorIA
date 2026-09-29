<script lang="ts" setup>
import avatar1 from '@images/avatars/avatar-1.png'
import avatar2 from '@images/avatars/avatar-2.png'
import avatar3 from '@images/avatars/avatar-3.png'
import pdf from '@images/icons/project-icons/pdf.png'
</script>

<template>
  <VCard>
    <VCardItem>
      <template #prepend>
        <VIcon
          icon="bx-bar-chart-alt-2"
          size="24"
          class="me-2"
        />
      </template>

      <VCardTitle>{{ "Activity Timeline" }}</VCardTitle>
    </VCardItem>

    <VCardText>
      <VTimeline
        side="end"
        align="start"
        line-inset="9"
        truncate-line="start"
        density="compact"
      >
        <!-- SECTION Timeline Item: Flight -->
        <VTimelineItem
          dot-color="primary"
          size="x-small"
        >
          <!-- 👉 Header -->
          <div class="d-flex justify-space-between align-center gap-2 flex-wrap mb-3">
            <span class="app-timeline-title">
              {{ (String(12) + " Tasks have been completed") }}
            </span>
            <span class="app-timeline-meta">{{ (String(12) + " min ago") }}</span>
          </div>

          <!-- 👉 Content -->
          <div class="app-timeline-text">
            {{ "Tasks have been completed by the team" }}
          </div>

          <div class="d-inline-flex align-center timeline-chip mt-2">
            <img
              :src="pdf"
              height="20"
              class="me-2"
              alt="img"
            >
            <span class="app-timeline-text font-weight-medium">
              weekly-report.pdf
            </span>
          </div>
        </VTimelineItem>
        <!-- !SECTION -->

        <!-- SECTION Timeline Item: Interview Schedule -->
        <VTimelineItem
          size="x-small"
          dot-color="success"
        >
          <!-- 👉 Header -->
          <div class="d-flex justify-space-between align-center flex-wrap mb-3">
            <div class="app-timeline-title">
              {{ "Client Meeting" }}
            </div>
            <span class="app-timeline-meta">{{ (String(45) + " min ago") }}</span>
          </div>

          <div class="app-timeline-text">
            {{ "Project meeting with john {'@'}10:15am" }}
          </div>

          <!-- 👉 Person -->
          <div class="d-flex justify-space-between align-center flex-wrap">
            <!-- 👉 Avatar & Personal Info -->
            <div class="d-flex align-center mt-2">
              <VAvatar
                size="32"
                class="me-2"
                :image="avatar1"
              />
              <div class="d-flex flex-column">
                <p class="text-sm font-weight-medium text-medium-emphasis mb-0">
                  Lester McCarthy ({{ "Client" }})
                </p>
                <span class="text-sm">{{ ("CEO of " + String('ThemeSelection')) }}</span>
              </div>
            </div>
          </div>
        </VTimelineItem>
        <!-- !SECTION -->

        <!-- SECTION Design Review -->
        <VTimelineItem
          size="x-small"
          dot-color="info"
        >
          <!-- 👉 Header -->
          <div class="d-flex justify-space-between align-center flex-wrap mb-3">
            <span class="app-timeline-title">
              {{ "Create a new project for client" }}
            </span>
            <span class="app-timeline-meta">{{ (String(2) + " Day Ago") }}</span>
          </div>

          <!-- 👉 Content -->
          <p class="app-timeline-text mb-2">
            {{ (String(6) + " team members in a project") }}
          </p>

          <div class="v-avatar-group demo-avatar-group">
            <VAvatar>
              <VImg :src="avatar1" />
              <VTooltip
                activator="parent"
                location="top"
              >
                John Doe
              </VTooltip>
            </VAvatar>

            <VAvatar>
              <VImg :src="avatar2" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Jennie Obrien
              </VTooltip>
            </VAvatar>

            <VAvatar>
              <VImg :src="avatar3" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Peter Harper
              </VTooltip>
            </VAvatar>

            <VAvatar :color="$vuetify.theme.current.dark ? '#373b50' : '#eeedf0'">
              +3
            </VAvatar>
          </div>
        </VTimelineItem>
        <!-- !SECTION -->
      </VTimeline>
    </VCardText>
  </VCard>
</template>
