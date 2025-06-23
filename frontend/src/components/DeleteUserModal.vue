<template>
    <n-modal :show="show" :mask-closable="false" @update:show="emit('update:show', false)">
      <n-card title="Eliminar Usuario(s)" style="width: 400px;">
        <div v-if="Array.isArray(users) && users.length > 1">
          <p>¿Estás seguro de que deseas eliminar a <strong>{{ user?.firstName }} {{ user?.lastName }}</strong>?</p>
          <ul>
            <li v-for="user in users" :key="user.id">
              {{ user.firstName }} {{ user.lastName }}
            </li>
          </ul>
        </div>
        <div v-else-if="users?.length === 1">
          <p>¿Estás seguro de que deseas eliminar a <strong>{{ users[0].firstName }} {{ users[0].lastName }}</strong>?</p>
        </div>
        <div class="botones">
          <n-button type="error" @click="confirmDelete">Eliminar</n-button>
          <n-button @click="closeModal">Cancelar</n-button>
        </div>
      </n-card>
    </n-modal>
  </template>
  
  <script setup>
  import { defineProps, defineEmits } from 'vue';
  import {NModal, NCard, NButton} from 'naive-ui'
  
  const props = defineProps({
    show: Boolean,
    users: Array,
  });
  
  const emit = defineEmits(['update:show', 'deleteUser']);
  
  const closeModal = () => {
    emit('update:show', false);
  };
  
  const confirmDelete = () => {
    emit('deleteUser', [...props.users]); // Emitir evento con el usuario a eliminar
    closeModal();
  };
  </script>

<style scoped>
.botones{
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
</style>