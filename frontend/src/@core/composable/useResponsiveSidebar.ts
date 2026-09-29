import type { Ref } from 'vue'
import { useDisplay } from 'vuetify'

export const useResponsiveLeftSidebar = (mobileBreakpoint: Ref<boolean> | undefined = undefined) => {
  const { mdAndDown, name: currentBreakpoint } = useDisplay()

  const _mobileBreakpoint = mobileBreakpoint || mdAndDown

  const isLeftSidebarOpen = ref(true)

  const setInitialValue = () => {
    isLeftSidebarOpen.value = !_mobileBreakpoint.value
  }


  setInitialValue()

  watch(
    currentBreakpoint,
    () => {

      isLeftSidebarOpen.value = !_mobileBreakpoint.value
    },
  )

  return {
    isLeftSidebarOpen,
  }
}
