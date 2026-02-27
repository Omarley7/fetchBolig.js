<template>
  <li class="mb-2">
    <div class="rounded-lg w-full p-2 skeleton-card overflow-hidden">
      <!-- Header: left-aligned title + gallery pill -->
      <div class="flex items-start justify-between gap-2">
        <div class="h-5 w-44 rounded skeleton-bone" />
        <div class="skeleton-pill rounded-2xl flex items-center gap-1.5 px-2.5 py-1 shrink-0">
          <div class="size-4 rounded skeleton-bone" />
          <div class="h-3 w-3 rounded skeleton-bone" />
        </div>
      </div>

      <!-- Body: unified info block at bottom -->
      <div class="flex flex-col flex-1 py-3">
        <div class="mt-auto skeleton-pill rounded-2xl p-3">
          <!-- Address row -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-1.5">
              <div class="h-3.5 w-36 rounded skeleton-bone" />
              <div class="h-3 w-24 rounded skeleton-bone" />
            </div>
            <div class="size-5 rounded skeleton-bone" />
          </div>
          <!-- Divider -->
          <div class="border-t border-white/5 my-2"></div>
          <!-- Time + queue row -->
          <div class="flex items-end justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="flex flex-col gap-1">
                <div class="h-3 w-16 rounded skeleton-bone" />
                <div class="h-4 w-28 rounded skeleton-bone" />
              </div>
              <div class="size-8 rounded-lg skeleton-bone" />
            </div>
            <div class="flex items-baseline gap-1.5">
              <div class="h-3 w-12 rounded skeleton-bone" />
              <div class="h-5 w-8 rounded skeleton-bone" />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer: single financials row -->
      <div class="skeleton-pill rounded-2xl flex items-center justify-between py-2 px-3 gap-2">
        <div class="h-4 w-20 rounded skeleton-bone" />
        <div class="h-3 w-28 rounded skeleton-bone" />
        <div class="size-4 rounded skeleton-bone" />
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
  min-height: 280px;
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
