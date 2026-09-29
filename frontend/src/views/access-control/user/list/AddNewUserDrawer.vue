<script setup lang="ts">
import { emailValidator, requiredValidator } from '@core/utils/validators'
import { nextTick, ref } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

import type { VForm } from 'vuetify/components/VForm'

import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useTeamOptions } from '@/views/access-control/teams/useTeamOptions'
import { useTeamsStore } from '@/views/access-control/teams/useTeamsStore'
import type { UserProperties } from 'contracts/access-control/users/types'

interface Emit {
  (e: 'update:isDrawerOpen', value: boolean): void
  (e: 'userData', value: UserProperties): void
}

interface Props {
  isDrawerOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const accessControlStore = useAccessControlStore()
accessControlStore.ensureLoaded()

const roleItems = computed(() =>
  accessControlStore.roles.map(role => ({ title: role.name, value: role.id })),
)



const teamsStore = useTeamsStore()
teamsStore.ensureLoaded()
const teamOptions = useTeamOptions()
const canViewTeams = computed(() => accessControlStore.can('teams.view'))

const requiredRule = (value: unknown) =>
  requiredValidator(value) === true || "This field is required"

const emailRule = (value: unknown) =>
  emailValidator(value) === true || "The Email field must be a valid email"

const isFormValid = ref(false)
const refForm = ref<VForm>()
const fullName = ref('')
const userName = ref('')
const email = ref('')
const company = ref('')
const country = ref()
const contact = ref('')
const role = ref()
const status = ref()
const team = ref<string | null>(null)

const topBusinessCountries = [
  'Australia',
  'Austria',
  'Bahrain',
  'Belgium',
  'Brazil',
  'Bulgaria',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Croatia',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Egypt',
  'Estonia',
  'Finland',
  'France',
  'Georgia',
  'Germany',
  'Greece',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Ireland',
  'Israel',
  'Italy',
  'Japan',
  'Jordan',
  'Kenya',
  'Kuwait',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malaysia',
  'Malta',
  'Mauritius',
  'Mexico',
  'Morocco',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Norway',
  'Oman',
  'Pakistan',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Saudi Arabia',
  'Serbia',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'Turkey',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Vietnam',
]


const closeNavigationDrawer = () => {
  emit('update:isDrawerOpen', false)

  nextTick(() => {
    refForm.value?.reset()
    refForm.value?.resetValidation()
    team.value = null
  })
}

const onSubmit = () => {
  refForm.value?.validate().then(({ valid }) => {
    if (valid) {
      emit('userData', {
        id: 0,



        tenantId: '',
        fullName: fullName.value,
        company: company.value,
        role: role.value,

        teamId: team.value,
        country: country.value,
        contact: contact.value,
        email: email.value,


        currentPlan: 'team',
        status: status.value,
        avatar: '',
        billing: 'Auto Debit',
      })
      emit('update:isDrawerOpen', false)
      nextTick(() => {
        refForm.value?.reset()
        refForm.value?.resetValidation()
        team.value = null
      })
    }
  })
}

const handleDrawerModelValueUpdate = (val: boolean) => {
  emit('update:isDrawerOpen', val)
}
</script>

<template>
  <VNavigationDrawer data-allow-mismatch temporary :width="400" location="end" border="none" class="scrollable-content"
    :model-value="props.isDrawerOpen" @update:model-value="handleDrawerModelValueUpdate">
    <!-- 👉 Title -->
    <AppDrawerHeaderSection title="Add New User" @cancel="closeNavigationDrawer" />

    <VDivider />

    <PerfectScrollbar :options="{ wheelPropagation: false }">
      <VCard flat>
        <VCardText>
          <!-- 👉 Form -->
          <VForm ref="refForm" v-model="isFormValid" @submit.prevent="onSubmit">
            <VRow>
              <!-- 👉 Full name -->
              <VCol cols="12">
                <AppTextField v-model="fullName" :rules="[requiredRule]" label="Full Name" placeholder="John Doe" />
              </VCol>

              <!-- 👉 Username -->
              <VCol cols="12">
                <AppTextField v-model="userName" :rules="[requiredRule]" label="Username" placeholder="Johndoe" />
              </VCol>

              <!-- 👉 Email -->
              <VCol cols="12">
                <AppTextField v-model="email" :rules="[requiredRule, emailRule]" label="Email"
                  placeholder="johndoe@email.com" />
              </VCol>

              <!-- 👉 company -->
              <VCol cols="12">
                <AppTextField v-model="company" :rules="[requiredRule]" label="Company" placeholder="DoctorIA" />
              </VCol>

              <!-- 👉 Country -->
              <VCol cols="12">
                <AppSelect v-model="country" label="Select Country" placeholder="Select Country" :rules="[requiredRule]"
                  :items="topBusinessCountries" />
              </VCol>

              <!-- 👉 Contact -->
              <VCol cols="12">
                <AppTextField v-model="contact" type="number" :rules="[requiredRule]" label="Contact"
                  placeholder="+1-541-754-3010" />
              </VCol>

              <!-- 👉 Role -->
              <VCol cols="12">
                <AppSelect v-model="role" label="Select Role" placeholder="Select Role" :rules="[requiredRule]"
                  :items="roleItems" />
              </VCol>

              <!-- 👉 Time (opcional — só com `teams.view`) -->
              <VCol v-if="canViewTeams" cols="12">
                <AppSelect v-model="team" label="Select Team" placeholder="Select Team" :items="teamOptions"
                  data-testid="add-user-team-select" />
              </VCol>

              <!-- 👉 Status -->
              <VCol cols="12">
                <AppSelect v-model="status" label="Select Status" placeholder="Select Status" :rules="[requiredRule]"
                  :items="[
                    { title: 'Active', value: 'active' },
                    { title: 'Inactive', value: 'inactive' },
                    { title: 'Pending', value: 'pending' },
                  ]" />
              </VCol>

              <!-- 👉 Submit and Cancel -->
              <VCol cols="12">
                <VBtn type="submit" class="me-4">
                  {{ "Submit" }}
                </VBtn>
                <VBtn type="reset" variant="tonal" color="error" @click="closeNavigationDrawer">
                  {{ "Cancel" }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </PerfectScrollbar>
  </VNavigationDrawer>
</template>
