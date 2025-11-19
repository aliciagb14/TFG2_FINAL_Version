<template>
  <n-modal :show="props.show" :mask-closable="false" >
    <n-card title="Editar Usuario" style="width: 400px;" :bordered="false">
      <FormUser :user="user" :errors="errors" />

      <div class="botones">
        <n-button type="error" @click="closeModal" ghost>Cancelar</n-button>
        <n-button type="primary" ghost @click="onPositiveClick" :disabled="!isFormValid" >Guardar</n-button>
      </div>
    </n-card>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import FormUser from "@/components/FormUser.vue";
import {NButton, NCard, NModal} from 'naive-ui'
import { updateUserKeycloak } from '@/services/UserService'
const props = defineProps({ 
  show: Boolean, 
  user: Object 
});

const emit = defineEmits(["update:show", "userUpdated"]);

const userToEdit = ref({ ...props.user });
const errors = ref({ firstName: "", lastName: "", email: "", password: "" });

watch(() => props.user, (newUser) => {
  userToEdit.value = { ...newUser };
}, { deep: true });

const isFormValid = computed(() => {
    const validations = [
      { field: 'firstName', condition: !userToEdit.value.firstName, message: "El campo nombre no puede estar vacío" },
      { field: 'lastName', condition: !userToEdit.value.lastName, message: "El campo apellido no puede estar vacío" },
      { field: 'email', condition: !isValidMail(userToEdit.value.email), message: "El mail debe acabar en @alumnos.upm.es" },
      { field: 'password', condition: !isValidPassword(userToEdit.value.password) , message: "La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial" }
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

  const isValidMail = (email) => {
    return email.endsWith('@alumnos.upm.es');
  };

  const isValidPassword = (password) => {
    return /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(password);
  };

const updateUser = async () => {
  try {
    await updateUserKeycloak(userToEdit.value);
    emit("userUpdated", { ...userToEdit.value});

  } catch (error) {
    console.error("Error al actualizar usuario:", error);
  }
};

const closeModal = () => {
  emit("update:show", false);
};

const onPositiveClick = () => {
  updateUser();
  closeModal();
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