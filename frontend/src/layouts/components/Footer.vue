<template>
  <div class="h-100 d-flex align-center justify-md-space-between justify-center">
    <!-- 👉 Footer: left content -->
    <span class="d-flex align-center d-inline-block text-body-1 text-medium-emphasis">
      &copy;
      {{ new Date().getFullYear() }}
      <span class="d-inline-flex align-center">
        Made with
        <VIcon
          icon="bx-bxs-heart"
          color="error"
          size="1.25rem"
          class="mx-1"
        />
        by
        <a
          href="https://doctoria.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary ms-1"
        >DoctorIA</a>
      </span>
    </span>
    <!-- 👉 Footer: right content -->
  </div>
</template>
