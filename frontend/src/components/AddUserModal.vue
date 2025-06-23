<template>
  <n-modal :show="props.show" :mask-closable="false">
    <n-card 
      title="Añadir Usuario"
      style="width: 400px;"
      :bordered="false"
    >
    <FormUser :user="newUser" :errors="errors" @validate="isFormValid" />
    <div class="botones">
      <n-button type="error" @click="closeModal" ghost >Cancelar</n-button>
      <n-button type="primary" ghost @click="onPositiveClick"  :disabled="!isFormValid">Crear</n-button>
    </div>
    </n-card>
  </n-modal>
</template>
  
<script setup>
  import { ref, computed } from 'vue';
  import { NCard, NButton, NForm, NFormItem, NInput, NIcon, NModal } from 'naive-ui';
  import { createUserKeycloak } from '@/services/UserService';
  import FormUser from '@/components/FormUser.vue'
  
  const props = defineProps({
    show: Boolean
  });
  
  const emit = defineEmits(['update:show', 'userAdded', 'close']);
  
  const newUser = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const errors = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });


  const isValidMail = (email) => {
    return email.endsWith('@alumnos.upm.es');
  };

  const isValidPassword = (password) => {
    return /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(password);
  };

  const onPositiveClick = () => {
    addUser();
    closeModal();
  };

  const closeModal = () => {
    console.log(
    "Nombre:", newUser.value.firstName, 
    "Apellidos: ", newUser.value.lastName, 
    "Mail:" , newUser.value.email , 
    "Password:", newUser.value.password)
    emit('update:show', false); 
  };

  const isFormValid = computed(() => {
    const validations = [
      { field: 'firstName', condition: !newUser.value.firstName, message: "El campo nombre no puede estar vacío" },
      { field: 'lastName', condition: !newUser.value.lastName, message: "El campo apellido no puede estar vacío" },
      { field: 'email', condition: !isValidMail(newUser.value.email), message: "El mail debe acabar en @alumnos.upm.es" },
      { field: 'password', condition: !isValidPassword(newUser.value.password) , message: "La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial" }
    ];

    let valid = true;

    validations.forEach(({ field, condition, message }) => {
      if (condition) {
        errors.value[field] = message;
        valid = false;
      } else {
        errors.value[field] = "";
      }
    });

    return valid;
  });

  
const addUser = async () => {
  if (!isFormValid.value) {
    alert('Por favor, complete todos los campos.');
    return;
  }

  try {
    await createUserKeycloak(newUser.value);
    emit('userAdded', { ...newUser.value });
    closeModal();

    newUser.value = { firstName: '', lastName: '', email: '', password: '' };
  } catch (error) {
    console.error('Error al agregar usuario:', error);
  }
};

</script>

<style scoped>
.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
}
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #a8c3ff;
}

.sidebar {
  flex: 0 0 20%;
  background-color: #4a4a32;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
}

.main-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #a8c3ff;
}

.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.add-user-btn {
  font-size: 1rem;
  color: #4a4a32;
  cursor: pointer;
}

.table-container {
  width: 100%;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
}

.botones {
  display: flex;               
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>