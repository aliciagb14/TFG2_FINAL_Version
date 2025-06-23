<template>
    <n-modal :show="show" :mask-closable="false" @update:show="emit('update:show', false)">
      <n-card title="Reestablecer contraseña" style="width: 400px;">
        <p>¿Estás seguro de que deseas cambiar la contraseña del usuario <strong>{{ props.user?.username }}</strong>?</p>
  
        <n-input v-model:value="newPassword" type="password" placeholder="Nueva contraseña"/>
        <n-input v-model:value="confirmPassword" type="password" placeholder="Reescribe la nueva contraseña" />
  
        <div class="botones">
          <n-button type="primary" @click="confirmChangePassword">Confirmar</n-button>
          <n-button @click="closeModal">Cancelar</n-button>
        </div>
      </n-card>
    </n-modal>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { NModal, NInput, NCard, NButton } from 'naive-ui'
  
  const props = defineProps({
    show: Boolean,
    user: Object,
  })
  
  const emit = defineEmits(['update:show', 'changePassword'])
  
  const newPassword = ref('')
  const confirmPassword = ref('')
  
  const closeModal = () => {
    emit('update:show', false)
  }
  
  const confirmChangePassword = () => {
    if (newPassword.value !== confirmPassword.value) {
      alert('⚠️ Las contraseñas no coinciden')
      return
    }
    console.log("La nueva password es: ", newPassword.value)
    emit('changePassword', { username: props.user.username, password: newPassword.value })
  
    closeModal()
  }
  </script>

<style scoped>
.botones{
    margin: 10px
}
</style>
  