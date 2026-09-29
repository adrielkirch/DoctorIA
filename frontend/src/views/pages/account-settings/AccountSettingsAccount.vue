<script lang="ts" setup>


const accountData = {
  avatarImg: '',
  firstName: "john",
  lastName: "Doe",
  email: "johnDoe@example.com",
  org: "DoctorIA",
  phone: "+1 (917) 543-9876",
  address: "123 Main St, New York, NY 10001",
  state: "New York",
  zip: "10001",
  country: "USA",
  language: "English",
  timezone: "(GMT-11:00) International Date Line West",
  currency: "USD",
};

const refInputEl = ref<HTMLElement>();

const isConfirmDialogOpen = ref(false);
const accountDataLocal = ref(structuredClone(accountData));
const isAccountDeactivated = ref(false);

const validateAccountDeactivation = computed(() => [
  (v: string) => !!v || "Please confirm account deactivation",
]);

const resetForm = () => {
  accountDataLocal.value = structuredClone(accountData);
};

const timezones = [
  "(GMT-11:00) International Date Line West",
  "(GMT-11:00) Midway Island",
  "(GMT-10:00) Hawaii",
  "(GMT-09:00) Alaska",
  "(GMT-08:00) Pacific Time (US & Canada)",
  "(GMT-08:00) Tijuana",
  "(GMT-07:00) Arizona",
  "(GMT-07:00) Chihuahua",
  "(GMT-07:00) La Paz",
  "(GMT-07:00) Mazatlan",
  "(GMT-07:00) Mountain Time (US & Canada)",
  "(GMT-06:00) Central America",
  "(GMT-06:00) Central Time (US & Canada)",
  "(GMT-06:00) Guadalajara",
  "(GMT-06:00) Mexico City",
  "(GMT-06:00) Monterrey",
  "(GMT-06:00) Saskatchewan",
  "(GMT-05:00) Bogota",
  "(GMT-05:00) Eastern Time (US & Canada)",
  "(GMT-05:00) Indiana (East)",
  "(GMT-05:00) Lima",
  "(GMT-05:00) Quito",
  "(GMT-04:00) Atlantic Time (Canada)",
  "(GMT-04:00) Caracas",
  "(GMT-04:00) La Paz",
  "(GMT-04:00) Santiago",
  "(GMT-03:30) Newfoundland",
  "(GMT-03:00) Brasilia",
  "(GMT-03:00) Buenos Aires",
  "(GMT-03:00) Georgetown",
  "(GMT-03:00) Greenland",
  "(GMT-02:00) Mid-Atlantic",
  "(GMT-01:00) Azores",
  "(GMT-01:00) Cape Verde Is.",
  "(GMT+00:00) Casablanca",
  "(GMT+00:00) Dublin",
  "(GMT+00:00) Edinburgh",
  "(GMT+00:00) Lisbon",
  "(GMT+00:00) London",
];


const isCurrentPasswordVisible = ref(false);
const isNewPasswordVisible = ref(false);
const isConfirmPasswordVisible = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const isOneTimePasswordDialogVisible = ref(false);

const passwordRequirements = computed(() => [
  "Minimum 8 characters long - the more, the better",
  "At least one lowercase character",
  "At least one number, symbol, or whitespace character",
]);
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText>
          <!-- 👉 Form -->
          <VForm>
            <VRow>
              <!-- 👉 First Name -->
              <VCol md="6" cols="12">
                <AppTextField v-model="accountDataLocal.firstName" placeholder="John" label="First Name" />
              </VCol>

              <!-- 👉 Last Name -->
              <VCol md="6" cols="12">
                <AppTextField v-model="accountDataLocal.lastName" placeholder="Doe" label="Last Name" />
              </VCol>

              <!-- 👉 Email -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.email" label="E-mail" placeholder="johndoe@gmail.com"
                  type="email" />
              </VCol>

              <!-- 👉 Organization -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.org" label="Organization" placeholder="ThemeSelection" />
              </VCol>

              <!-- 👉 Phone -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.phone" label="Phone Number" placeholder="+1 (917) 543-9876" />
              </VCol>

              <!-- 👉 Address -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.address" label="Address"
                  placeholder="123 Main St, New York, NY 10001" />
              </VCol>

              <!-- 👉 State -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.state" label="State" placeholder="New York" />
              </VCol>

              <!-- 👉 Zip Code -->
              <VCol cols="12" md="6">
                <AppTextField v-model="accountDataLocal.zip" label="Zip Code" placeholder="10001" />
              </VCol>

              <!-- 👉 Country -->
              <VCol cols="12" md="6">
                <AppSelect v-model="accountDataLocal.country" label="Country"
                  :items="['USA', 'Canada', 'UK', 'India', 'Australia']" placeholder="Select Country" />
              </VCol>
              <!-- 👉 Timezone -->
              <VCol cols=" 12" md="6">
                <AppSelect v-model="accountDataLocal.timezone" label="Timezone" placeholder="Select Timezone"
                  :items="timezones" :menu-props="{ maxHeight: 200 }" />
              </VCol>

              <!-- 👉 Form Actions -->
              <VCol cols="12" class="d-flex flex-wrap gap-4">
                <VBtn>{{ "Save changes" }}</VBtn>

                <VBtn color="secondary" variant="tonal" type="reset" @click.prevent="resetForm">
                  {{ "Cancel" }}
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>

    <!-- SECTION: Change Password -->
    <VCol cols="12">
      <VCard title="Change Password">
        <VForm>
          <VCardText class="pt-0">
            <!-- 👉 Current Password -->
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="currentPassword" :type="isCurrentPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isCurrentPasswordVisible ? 'bx-hide' : 'bx-show'
                    " label="Current Password" autocomplete="on" placeholder="············" @click:append-inner="
                      isCurrentPasswordVisible = !isCurrentPasswordVisible
                      " />
              </VCol>
            </VRow>

            <!-- 👉 New Password -->
            <VRow>
              <VCol cols="12" md="6">
                <AppTextField v-model="newPassword" :type="isNewPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isNewPasswordVisible ? 'bx-hide' : 'bx-show'
                    " label="New Password" autocomplete="on" placeholder="············" @click:append-inner="
                      isNewPasswordVisible = !isNewPasswordVisible
                      " />
              </VCol>

              <VCol cols="12" md="6">
                <AppTextField v-model="confirmPassword" :type="isConfirmPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="isConfirmPasswordVisible ? 'bx-hide' : 'bx-show'
                    " label="Confirm New Password" autocomplete="on" placeholder="············" @click:append-inner="
                      isConfirmPasswordVisible = !isConfirmPasswordVisible
                      " />
              </VCol>
            </VRow>
          </VCardText>

          <!-- 👉 Password Requirements -->
          <VCardText>
            <h6 class="text-h6 text-medium-emphasis mb-4">
              {{ "Password requirements" }}
            </h6>

            <VList class="card-list">
              <VListItem v-for="item in passwordRequirements" :key="item" :title="item" class="text-medium-emphasis">
                <template #prepend>
                  <VIcon size="6" icon="bx-bxs-circle" class="me-n1" />
                </template>
              </VListItem>
            </VList>
          </VCardText>

          <!-- 👉 Action Buttons -->
          <VCardText class="d-flex flex-wrap gap-4">
            <VBtn>{{ "Save changes" }}</VBtn>

            <VBtn type="reset" color="secondary" variant="tonal">
              {{ "Reset" }}
            </VBtn>
          </VCardText>
        </VForm>
      </VCard>
    </VCol>
    <!-- !SECTION -->

    <!-- SECTION Two-steps verification -->
    <VCol cols="12">
      <VCard title="Two-steps verification">
        <VCardText>
          <h5 class="text-h5 text-medium-emphasis mb-4">
            {{ "Two factor authentication is not enabled yet." }}
          </h5>
          <p class="mb-6">
            Two-factor authentication adds an additional layer of security to your account by requiring more than just a password to log in.
            <a href="javascript:void(0)" class="text-decoration-none">
              Learn more.
            </a>
          </p>

          <VBtn @click="isOneTimePasswordDialogVisible = true">
            {{ "Enable two-factor authentication" }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
    <!-- !SECTION -->

    <VCol cols="12">
      <!-- 👉 Delete Account -->
      <VCard title="Delete Account">
        <VCardText>
          <!-- 👉 Checkbox and Button  -->
          <div>
            <VCheckbox v-model="isAccountDeactivated" :rules="validateAccountDeactivation"
              label="I confirm my account deactivation" />
          </div>

          <VBtn :disabled="!isAccountDeactivated" color="error" class="mt-6" @click="isConfirmDialogOpen = true">
            {{ "Deactivate Account" }}
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Confirm Dialog -->
  <ConfirmDialog v-model:is-dialog-visible="isConfirmDialogOpen"
    confirmation-question="Are you sure you want to deactivate your account?" confirm-title="Deactivated!"
    confirm-msg="Your account has been deactivated successfully." cancel-title="Cancelled"
    cancel-msg="Account Deactivation Cancelled!" />
</template>
