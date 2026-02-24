<template>
  <li class="mb-2">
    <div class="rounded-lg w-full p-2 skeleton-card overflow-hidden">
      <!-- Header: centered title pill -->
      <div class="flex flex-col items-center">
        <div class="skeleton-pill rounded-2xl px-8 py-2">
          <div class="h-6 w-36 rounded-md skeleton-bone" />
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-col py-4 min-h-56 justify-between">
        <!-- Address pill (right-aligned) -->
        <div class="skeleton-pill rounded-2xl flex gap-4 p-2 mb-4 items-center self-end">
          <div class="flex flex-col gap-1.5">
            <div class="h-3.5 w-32 rounded skeleton-bone" />
            <div class="h-3.5 w-24 rounded skeleton-bone" />
          </div>
          <div class="size-7 rounded skeleton-bone" />
        </div>

        <!-- Open house pill (left-aligned) -->
        <div class="skeleton-pill rounded-2xl flex p-2 gap-3 items-center self-start">
          <div class="flex flex-col gap-1.5">
            <div class="h-5 w-24 rounded skeleton-bone" />
            <div class="h-3.5 w-36 rounded skeleton-bone" />
          </div>
          <div class="size-10 rounded-lg skeleton-bone" />
        </div>
      </div>

      <!-- Footer: financials pill -->
      <div class="skeleton-pill rounded-2xl flex flex-row justify-between py-2 px-4">
        <div class="h-4 w-24 rounded skeleton-bone" />
        <div class="h-4 w-32 rounded skeleton-bone" />
      </div>
    </div>
  </li>
</template>

<style scoped>
.skeleton-card {
  background: linear-gradient(
    135deg,
    rgb(163 163 163 / 0.12) 0%,
    rgb(163 163 163 / 0.18) 50%,
    rgb(163 163 163 / 0.12) 100%
  );
  min-height: 380px;
}

:where(.dark, .dark *) .skeleton-card {
  background: linear-gradient(
    135deg,
    rgb(255 255 255 / 0.04) 0%,
    rgb(255 255 255 / 0.07) 50%,
    rgb(255 255 255 / 0.04) 100%
  );
}

.skeleton-pill {
  background: rgb(163 163 163 / 0.1);
  border: 1px solid rgb(163 163 163 / 0.12);
}

:where(.dark, .dark *) .skeleton-pill {
  background: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.08);
}

.skeleton-bone {
  background: linear-gradient(
    90deg,
    rgb(163 163 163 / 0.15) 0%,
    rgb(163 163 163 / 0.25) 50%,
    rgb(163 163 163 / 0.15) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

:where(.dark, .dark *) .skeleton-bone {
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 0.06) 0%,
    rgb(255 255 255 / 0.14) 50%,
    rgb(255 255 255 / 0.06) 100%
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
