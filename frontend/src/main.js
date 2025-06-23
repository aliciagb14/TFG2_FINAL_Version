import './assets/main.css'

import { createApp } from 'vue';
import { createPinia } from 'pinia'

import App from './App.vue';
import router from './router/router.js';
import VueSidebarMenu from 'vue-sidebar-menu'
import 'vue-sidebar-menu/dist/vue-sidebar-menu.css'
import keycloakService from '@/keycloak';


const app = createApp(App);
app.use(VueSidebarMenu)
app.use(router);
app.use(createPinia())

keycloakService.CallInit(() => {
  app.mount('#app');
});