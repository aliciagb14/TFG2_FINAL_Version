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
