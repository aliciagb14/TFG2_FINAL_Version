<template>
  <div :class="['custom-sidebar', { collapsed }]">
    <n-button ghost class="toggle-button" @click="toggleCollapse">
        <n-icon size="24" color="#e0e0e0"><MenuIcon /></n-icon>
    </n-button>

    <div class="menu">
      <div
        v-for="item in filteredMenu"
        :key="item.title"
        class="menu-item"
        @click="navigate(item.href)"
      >
        <n-icon class="icon" :size="22">
          <component :is="item.icon" />
        </n-icon>
        <span v-if="!collapsed" class="title">{{ item.title }}</span>
      </div>
    </div>

    <div class="bottom-section">
      <div class="menu-item profile-item" @click="navigate(profileItem.href)">
        <n-icon class="icon" :size="22">
          <component :is="profileItem.icon" />
        </n-icon>
        <span v-if="!collapsed" class="title">{{ user }} - {{ isAdmin ? 'Admin' : 'User' }}</span>
      </div>

      <div class="menu-item logout-item" @click="navigate(logoutItem.href)">
        <n-icon class="icon" :size="22">
          <component :is="logoutItem.icon" />
        </n-icon>
        <span v-if="!collapsed" class="title">{{ logoutItem.title }}</span>
      </div>
    </div>
  </div>
</template>
  
<script setup>
import { ref, computed, defineProps } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, useDialog } from 'naive-ui';
import { MenuOutline as MenuIcon } from '@vicons/ionicons5';
import keycloakService from '@/keycloak';
import { useUserDataStore } from '@/stores/keycloakUserData';

const props = defineProps({
  menu: Array,
  isAdmin: Boolean
})

const collapsed = ref(true)
const router = useRouter()
const dialog = useDialog()
const userStore = useUserDataStore()

const user = computed(() => userStore.username)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// Filtrar menú según si el ítem requiere admin o no
const filteredMenu = computed(() => 
  props.menu.filter(item => {
    if (item.title === 'Logout' || item.title === 'Profile') return false
    return !item.requiresAdmin || props.isAdmin
  })
)

const profileItem = computed(() =>
  props.menu.find(item => item.title === 'Profile')
)

const logoutItem = computed(() =>
  props.menu.find(item => item.title === 'Logout')
)

const logoutA = () => {
  dialog.info({
    title: 'Confirm Logout',
    content: 'Are you sure you want to log out?',
    positiveText: 'Yes',
    negativeText: 'Cancel',
    onPositiveClick: () => {
      localStorage.removeItem('access_token')
      keycloakService.CallLogout()
      router.push('/')
    }
  })
}

const navigate = (href) => {
  if (href === '/logout') {
    logoutA()
  } else {
    router.push(href)
  }
}
</script>

  
  <style scoped>
  .custom-sidebar {
    width: 250px;
    height: 100vh;
    background-color: #182a3d;
    transition: width 0.3s;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
    padding-top: 60px;

    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .custom-sidebar.collapsed {
    width: 65px;

  }
  .toggle-button {
    position: absolute;
    right: 10px;
    top: 15px;
  }
  .menu {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 0 10px;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    padding: 10px;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .icon {
    color:rgb(255, 255, 255);
  }
  .title {
    font-size: 16px;
    color:rgb(253, 253, 253);
  }
  .personal-data-content{
    padding: 20px;
  }

  .bottom-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 10px;
  }

  .logout-item {
    margin-top: auto;
  }
</style>
  