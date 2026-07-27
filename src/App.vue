<script setup lang="ts">
import { ConfigProvider } from 'reka-ui';
import AppShell from '@/layouts/AppShell.vue';

/**
 * Root component.
 *
 * It used to measure its own height and post it to a parent frame, because the
 * Custom JS loader created the iframe and had to be told how tall to make it.
 * HighLevel's own Custom Menu Link page owns that iframe and sizes it, so the
 * measurement had nothing left to talk to.
 */
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
    <div class="min-h-full">
      <AppShell>
        <RouterView />
      </AppShell>
    </div>
  </ConfigProvider>
</template>
