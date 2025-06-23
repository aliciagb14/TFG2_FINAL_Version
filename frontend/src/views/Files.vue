<template>
  <h1>Files</h1>
  <Sidebar></Sidebar>
  <Upload/>
  <div class="content">
    
    <router-view></router-view>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue';
import { useRoute } from 'vue-router';
import Upload from '@/components/Upload.vue'
import { ref, computed } from 'vue';
import {useUserDataStore} from '@/stores/KeycloakUserData'
const userStore = useUserDataStore()
const route = useRoute();

const isAdmin = userStore.isAdmin
const username = userStore.username
const roles = userStore.roles
console.log("el user y rol logueado es:", username, roles)
</script>