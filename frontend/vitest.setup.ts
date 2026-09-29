import { defineStore, storeToRefs } from 'pinia'
import {
    computed,
    defineComponent,
    h,
    nextTick,
    onMounted,
    reactive,
    ref,
    watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'




const vueGlobals: Record<string, unknown> = {
  ref,
  computed,
  watch,
  h,
  defineComponent,
  nextTick,
  onMounted,
  reactive,
  useRoute,
  useRouter,
  defineStore,
  storeToRefs,





}

