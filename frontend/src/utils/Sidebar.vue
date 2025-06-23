<template>
  <div>
    <n-button ghost class="toggle-button" @click="toggleSidebar">
      <n-icon size="24"><SidebarIcon /></n-icon>
    </n-button>
    
    <div class="sidebar" :class="{ 'sidebar-hidden': !isSidebarVisible }">
      <div class="sidebar-header">
        <h4>Menú</h4>
        <n-button ghost size="small" @click="toggleSidebar">
          <n-icon size="16"><SidebarIcon /></n-icon> Close
        </n-button>
      </div>
      
      <div class="sidebar-content">
        <ul>
          <li><router-link to="/files">Files</router-link></li>
          <li><router-link to="/settings">Settings</router-link></li>
          <li><router-link to="/profile">Profile</router-link></li>
        </ul>
      </div>
    </div>

    <div class="content" :class="{ 'content-expanded': !isSidebarVisible }">
      <router-view />
    </div>
  </div>
</template>

<script setup>
  import { ref,  watch } from 'vue';
  import { NButton, NIcon } from 'naive-ui';
  import VueSidebarMenu from 'vue-sidebar-menu'
  import { ListOutline as SidebarIcon } from '@vicons/ionicons5';

  const isSidebarVisible = ref(true);

  const toggleSidebar = () => {
    isSidebarVisible.value = !isSidebarVisible.value;
  };

  watch(isSidebarVisible, (newValue) => {
    console.log('isSidebarVisible esta a : ', newValue);
  });
</script>

<style scoped>

.sidebar {
  width: 350px;
  height: 100vh;
  background-color: #2c3e50;
  color: rgb(211, 185, 185);
  padding: 25px;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  transition: width 0.5s ease-in-out;  /* Transición para el cambio de ancho */
  z-index: 1000;
}

.sidebar-hidden {
  width: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
}

.sidebar-header h4 {
  margin: 0;
}

.sidebar-content ul {
  list-style-type: disc;
  padding-left: 20px;
}

.sidebar-content li {
  margin: 15px 0;
}


</style>
