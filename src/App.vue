<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ConfigProvider } from 'reka-ui';
import AppShell from '@/layouts/AppShell.vue';
import { isEmbedded, reportHeight } from '@/services/embed';

/**
 * Root component.
 *
 * Its only responsibility beyond mounting the shell is telling the HighLevel
 * loader how tall our content is. Without that the iframe stays a fixed height
 * and the user gets a scrollbar inside a scrollbar, which is the clearest
 * possible signal that something has been bolted on rather than integrated.
 */
const root = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!isEmbedded.value || !root.value) return;

  observer = new ResizeObserver((entries) => {
    const height = entries[0]?.target.scrollHeight;
    if (height) reportHeight(height);
  });
  observer.observe(root.value);
});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<template>
  <!--
    `scroll-body="false"` disables reka-ui's scrollbar compensation when a
    dialog locks body scroll.

    Its default behaviour measures `innerWidth - documentElement.clientWidth`
    and, if that is non-zero, adds an equal `padding-right` to the body so the
    page does not jump when the scrollbar is removed. That is the right default
    — but we reserve the scrollbar gutter permanently in index.css, so the
    measurement is always ~10px and the compensation would itself shift the
    layout every time a dialog opened. The gutter already guarantees a constant
    width; reka still applies `overflow: hidden`, so scroll locking is intact.
  -->
  <ConfigProvider :scroll-body="false">
    <div ref="root" class="min-h-full">
      <AppShell>
        <RouterView />
      </AppShell>
    </div>
  </ConfigProvider>
</template>
