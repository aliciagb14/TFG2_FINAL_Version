import { createRouter, createWebHistory } from "vue-router";
// import Login from "@/components/Login.vue";
import Home from "@/views/Home.vue";
import Files from "@/views/Files.vue";
import Profile from "@/views/Profile.vue";
import Settings from "@/views/Settings.vue";

const routes = [
  { 
    path: "/",
    redirect: "/home"
  },
  {
    path: "/home",
    component: Home
  },
  {
    path: '/files',
    component: Files
  },
  {
    path: "/profile",
    component: Profile
  },
  {
    path: "/settings",
    component: Settings
  }

];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
