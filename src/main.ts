import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { initEmbedBridge } from './services/embed';
import './assets/styles/index.css';

// Starts the handshake with the HighLevel loader before the first render, so
// the sub-account id is available to the very first request.
initEmbedBridge();

createApp(App).use(createPinia()).use(router).mount('#app');
