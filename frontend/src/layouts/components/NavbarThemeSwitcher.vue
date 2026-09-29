<script setup lang="ts">
import type { ThemeSwitcherTheme } from '@layouts/types'

const themes: ThemeSwitcherTheme[] = [
  {
    name: 'light',
    icon: 'bx-sun',
  },
  {
    name: 'dark',
    icon: 'bx-moon',
  },
  {
    name: 'system',
    icon: 'bx-desktop',
  },
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
