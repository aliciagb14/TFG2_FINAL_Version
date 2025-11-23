<template>
  <Sidebar />
  <h1 class="page-title">Lista de alumnos</h1>
  <div class="main-bg">
    <n-grid :cols="12" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="(user, index) in displayedUsers" :key="user.id" :span="4">
        <n-card
          class="persona-card"
          hoverable
          size="small"
          tabindex="0"
        >
          <div class="avatar-wrapper">
            <n-avatar
              size="64"
              :class="['avatar', user.rol === 'Profesor' ? 'profesor-avatar' : 'alumno-avatar']"
              role="img"
              :aria-label="`Inicial de ${user.firstName}`"
            >
              <span class="avatar-initial">{{ user.firstName?.charAt(0) }}</span>
            </n-avatar>
          </div>

          <div class="card-content">
            <h3 class="card-title">{{ user.firstName }} {{ user.lastName }}</h3>

            <div class="card-detail email-row" v-if="user.email">
              <n-icon size="18"><MailOutline /></n-icon>
              <span>{{ user.email }}</span>
            </div>

            <div class="card-detail year-row">
              <n-icon size="18"><CalendarOutline /></n-icon>
              <span>{{ currentYear }}</span>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
import { NAvatar, NCard, NGrid, NGridItem, NIcon } from 'naive-ui'
import { ref, onMounted, computed } from 'vue'
import { getUsers } from '@/services/UserService'
import { MailOutline, CalendarOutline } from '@vicons/ionicons5'

const usuarios = ref([])
const currentYear = new Date().getFullYear()

async function loadUsers() {
  usuarios.value = await getUsers()
}

onMounted(loadUsers)

const displayedUsers = computed(() => usuarios.value.slice(0, 9))
</script>

<style scoped>
.page-title {
  color: #182a3d;
  font-weight: 500;
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 2rem;
}

.main-bg {
  background: #182a3d;
  padding: 3rem;
  border-radius: 1rem;
  width: 85vw;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.persona-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: row; /* para alinear avatar y texto */
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
  min-height: 6rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.persona-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.avatar-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.8rem;
  color: #fff;
}

/* Diferenciar alumnos y profesores */
.alumno-avatar {
  background: linear-gradient(135deg, #6a5acd, #836fff);
}

.profesor-avatar {
  background: linear-gradient(135deg, #ff7f50, #ffb347);
}

.avatar-initial {
  user-select: none;
}

.card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-title {
  font-weight: 600;
  font-size: 1.2rem;
  color: #f0ebff;
  margin: 0 0 0.5rem 0;
}

.card-detail {
  font-size: 0.95rem;
  color: #d1cfff;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.3rem;
}

.email-row, .year-row {
  font-weight: 400;
}
</style>
