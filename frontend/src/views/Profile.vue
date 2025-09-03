<template>
  <Sidebar />
  <h1 class="page-title">Lista de alumnos</h1>
  <div class="main-bg">
    <n-grid :cols="12" :x-gap="16" :y-gap="16">
      <n-grid-item v-for="(user, index) in displayedUsers" :key="user.id" :span="4">
        <n-card
          class="persona-card"
          :class="{ animate: animateCards }"
          :style="getAnimationStyle(index)"
          hoverable
          size="small"
          tabindex="0"
        >
          <n-avatar
            size="64"
            class="avatar"
            role="img"
            :aria-label="`Inicial de ${user.firstName}`"
          >
            <span class="avatar-initial">{{ user.firstName?.charAt(0) }}</span>
          </n-avatar>

          <n-card class="card-title">{{ user.firstName }}</n-card>

          <div class="card-detail email-row" v-if="user.email">
            {{ user.email }}
          </div>

          <div class="card-detail year-row">
            Año: {{ currentYear }}
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup>
import Sidebar from '@/components/Sidebar.vue'
import { NAvatar, NCard, NGrid, NGridItem } from 'naive-ui'
import { ref, onMounted, computed } from 'vue'
import { getUsers } from '@/services/UserService'

const usuarios = ref([])
const currentYear = new Date().getFullYear()

async function loadUsers() {
  usuarios.value = await getUsers()
  console.log("USERS: ", usuarios.value)
}

onMounted(async () => {
  await loadUsers()
  console.log("USERS CARGADOS: ", usuarios.value)
})

const displayedUsers = computed(() => {
  console.log("displayedUsers:", usuarios.value.slice(0, 9))
  return usuarios.value.slice(0, 9)
})

const getAnimationStyle = (index) => {
  const count = displayedUsers.value.length || 1
  console.log("count: ", count)
 
}
</script>

<style scoped>
.page-title {
  color: rgb(61, 62, 151);
  font-weight: 300;
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.main-bg {
  background-color: rgb(65, 56, 138);
  padding: 3rem;
  border-radius: 1rem;
  width: 80vw;
  margin: 0 auto;
}

.persona-card {
  background-color: rgb(14, 8, 61);
  border: 2px solid var(--color-accent, rgb(177, 169, 235));
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 17.5rem;
  max-width: 17.5rem;
  margin-left: auto;
  margin-right: auto;
  overflow: visible;
  transform: translateY(10px);
  transition: opacity 0.4s ease, transform 0.3s ease;
  transition-delay: var(--delay-opacity, 0ms);
}

.animate {
  opacity: 1;
  transform: translateY(0);
}

.persona-card:hover,
.persona-card:focus-visible {
  transform: translateY(-0.4rem);
  box-shadow:
    0 6px 20px rgba(96, 98, 224, 0.4),
    0 0 10px rgba(130, 158, 218, 0.5);
  outline: none;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 1.8rem;
  font-weight: bold;
  background-color: rgb(46, 37, 119);
  color: var(--color-bg-main, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem auto;
}

.avatar-initial {
  user-select: none;
}

.card-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color:  rgb(101, 86, 216);
}

.card-detail {
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.email-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  color:  rgb(101, 86, 216);
}

.year-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  color:  rgb(101, 86, 216);
}
</style>
