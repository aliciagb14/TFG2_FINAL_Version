<template>
    <SidebarWrapper :menu="menu" :isAdmin="isAdmin"/>
</template>

<script setup>
import {ref, h, computed} from 'vue'
import SidebarWrapper from '@/components/SidebarWrapper.vue'
import { 
  FileTrayFullOutline as FileIcon, 
  SettingsOutline as SettingsIcon, 
  PeopleCircleOutline as ProfileIcon, 
  LogOutOutline as LogoutIcon,
  CloudUploadOutline as UploadIcon
} from '@vicons/ionicons5';
import { useUserDataStore } from '@/stores/keycloakUserData'

const userStore = useUserDataStore()
const isAdmin = computed(() => userStore.isAdmin)

const emit = defineEmits(['toggleSidebar'])

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
  emit('toggleSidebar'); // avisa al padre que cambió
};

const menu = ref([
  {
    href: '/home',
    title: "Projects",
    icon: FileIcon,
    requiresAdmin: true
  },
  {
    href: '/files',
    title: "Files",
    icon: UploadIcon,
    requiresAdmin: false
  },
  {
    href: '/settings',
    title: "Settings",
    icon: SettingsIcon,
    requiresAdmin: false
  },
  {
    href: '/profile',
    title: "Profile",
    icon: ProfileIcon,
    requiresAdmin: false
  },
  {
    href: '/logout',
    title: 'Logout',
    icon: LogoutIcon,
    requiresAdmin: false
  },
])

</script>
