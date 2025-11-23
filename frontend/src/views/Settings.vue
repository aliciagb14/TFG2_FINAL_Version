<template>
  <div class="settings-container">
    <Sidebar />

    <div class="settings-content">
      <h1 class="page-title">Ajustes del profesor</h1>

      <!-- GRID 2 COLUMNS: PERFIL + INFO SISTEMA -->
      <section class="grid-2-columns">
        <!-- PERFIL -->
        <n-card class="persona-card">
          <div class="avatar-wrapper">
            <div class="avatar profesor-avatar">
              {{ user.name[0].toUpperCase() }}
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-title">Mi perfil</h3>
            <p class="card-detail"><strong>Nombre:</strong> {{ user.name }}</p>
            <p class="card-detail"><strong>Email:</strong> {{ user.email }}</p>
            <p class="card-detail"><strong>Rol:</strong> Profesor</p>
            <n-button type="primary" @click="goToKeycloak">
              Cambiar contraseña
            </n-button>
          </div>
        </n-card>

        <!-- INFORMACIÓN DEL SISTEMA -->
        <n-card class="persona-card">
          <div class="avatar-wrapper">
            <div class="avatar alumno-avatar">
              ⚙️
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-title">Información del sistema</h3>
            <p class="card-detail"><strong>Alumnos totales:</strong> {{ totalAlumnos }}</p>
            <p class="card-detail"><strong>Backups totales:</strong> {{ totalBuckets }}</p>
            <p class="card-detail"><strong>Versión backend:</strong> {{ stats.backendVersion }}</p>

            <div class="card-detail" style="display: flex; align-items: center; gap: 0.5rem;">
              <strong>Estado Keycloak:</strong>
              <n-switch
                :value="stats.keycloakStatus === 'ON'"
                disabled
                size="small"
                :style="{
                  '--n-switch-checked-color': stats.keycloakStatus === 'ON' ? '#4caf50' : '#f44336',
                  '--n-switch-unchecked-color': stats.keycloakStatus === 'ON' ? '#4caf50' : '#f44336',
                  pointerEvents: 'none'
                }"
              />
            </div>

            <div class="card-detail" style="display: flex; align-items: center; gap: 0.5rem;">
              <strong>Estado MinIO:</strong>
              <n-switch
                :value="stats.minioStatus === 'ON'"
                disabled
                size="small"
                :style="{
                  '--n-switch-checked-color': stats.minioStatus === 'ON' ? '#4caf50' : '#f44336',
                  '--n-switch-unchecked-color': stats.minioStatus === 'ON' ? '#4caf50' : '#f44336',
                  pointerEvents: 'none'
                }"
              />
            </div>
          </div>
        </n-card>
      </section>

      <!-- ACCESOS RÁPIDOS -->
      <section class="settings-section">
        <h2 style="color: #182a3d;">Accesos rápidos</h2>
        <div class="quick-access-grid">
          <n-card class="quick-card" @click="go('http://localhost:8180')" hoverable>
            <h3 class="card-title-access">Keycloak</h3>
            <p class="card-desc">Administración de usuarios</p>
          </n-card>

          <n-card class="quick-card" @click="go('http://localhost:9001')" hoverable>
            <h3 class="card-title-access">MinIO Console</h3>
            <p class="card-desc">Gestión de almacenamiento</p>
          </n-card>

          <n-card class="quick-card" @click="go('http://localhost/phpmyadmin')" hoverable>
            <h3 class="card-title-access">phpMyAdmin</h3>
            <p class="card-desc">Base de datos MySQL</p>
          </n-card>
        </div>
      </section>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from "vue";
import { NButton, NCard, NSwitch } from "naive-ui";
import { getUsers } from '@/services/UserService'
import { getSystemStats } from '@/services/MinioService';

import Sidebar from "@/components/Sidebar.vue";
import { useUserDataStore } from "@/stores/keycloakUserData";
import axios from 'axios';

const userStore = useUserDataStore()

const user = {
  name: userStore.username,
  email: userStore.email || (userStore.username + "@upm.es"),
  roles: userStore.roles,
  isAdmin: userStore.isAdmin
}
const usuarios = ref([])
async function loadUsers() {
  usuarios.value = await getUsers()
  console.log("users settings: ", usuarios.value)
}

function goToKeycloak() {
  window.open("http://localhost:8180/realms/ComercioElectronico/account", "_blank");
}

function go(url) {
  window.open(url, "_blank");
}

const totalAlumnos = computed(() =>
  usuarios.value.filter(u => u.email?.endsWith('@alumnos.upm.es')).length
)

const totalProfesores = computed(() =>
  usuarios.value.filter(u => !u.email?.endsWith('@alumnos.upm.es')).length
)

const totalBuckets = computed(() => usuarios.value.length)

const stats = ref({
  students: 0,
  backups: 0,
  backendVersion: '1.0.0',
  keycloakStatus: 'OFF',
  minioStatus: 'OFF'
});

onMounted(async () => {
  try {
    loadUsers()
    stats.value = await getSystemStats();
    console.log("stats: ", stats.value)
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
  }
});
</script>

<style scoped>
.settings-content {
  flex-grow: 1;
  padding: 2rem 3rem;
}

.page-title {
  color: #182a3d;
  font-weight: 500;
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 2rem;
}

/* GRID 2 COLUMNS */
.grid-2-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.persona-card {
  background: #182a3d;
  color: #fff;
  border: none;
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  min-height: 10rem;
  transition: all 0.3s ease;
}

.persona-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.25);
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

.profesor-avatar {
  background: linear-gradient(135deg, #ff7f50, #ffb347);
}

.alumno-avatar {
  background: linear-gradient(135deg, #6a5acd, #836fff);
}

.card-content {
  display: flex;
  flex-direction: column;
}


.card-title {
  font-weight: 600;
  font-size: 1.3rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.card-title-access {
  font-weight: 600;
  font-size: 1.3rem;
  color: #182a3d;
  margin-bottom: 0.5rem;
}

.card-detail {
  font-size: 0.95rem;
  color: #fff;
  margin-bottom: 0.3rem;
}

/* ACCESOS RÁPIDOS */
.quick-access-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.quick-card {
  padding: 1.8rem;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.25s ease-in-out;
  text-align: center;
  background: #f7f7fb;
}

.quick-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

/* Responsive */
@media (max-width: 900px) {
  .grid-2-columns {
    grid-template-columns: 1fr;
  }

  .quick-access-grid {
    grid-template-columns: 1fr;
  }
}

</style>
