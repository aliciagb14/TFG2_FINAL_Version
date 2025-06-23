<template>
  <div class="container">
    <Sidebar :isVisible="isSidebarVisible" @toggleSidebar="toggleSidebar" />
    <div class="main-content" :class="{ 'collapsed': !isSidebarVisible }">
      <ListUsers
        v-if="isAuthenticated && isAdmin"
        :username="userData.username"
        :isAdmin="userData.isAdmin"
      />
      <Upload v-else :role="userData.isAdmin ? 'admin' : 'student'" />
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from "@/components/Sidebar.vue"
import ListUsers from "@/components/ListUsers.vue"
import Upload from "@/components/Upload.vue"
import { useRouter } from 'vue-router'
import { useUserDataStore } from '@/stores/keycloakUserData'

const router = useRouter()
const userData = useUserDataStore()

const isSidebarVisible = ref(false)

const toggleSidebar = () => {
  isSidebarVisible.value = !isSidebarVisible.value
}

const isAuthenticated = computed(() => !!userData.username)
const isAdmin = computed(() => userData.isAdmin)

onMounted(() => {
  console.log("✅ Usuario autenticado:", userData.username)
  console.log("👑 ¿Es admin?:", userData.isAdmin)

  if (!isAuthenticated.value) {
    router.push('/')
  }
})
</script>


<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  padding: 20px;
  transition: margin-left 0.3s ease-in-out;
  margin-left: 250px;
}

.collapsed {
  margin-right: 195px;
}
</style>