<template>
  <n-form ref="formRef" label-placement="top">
    <n-form-item
      label="Nombre"
      :feedback="errors.firstName"
      :validation-status="errors.firstName ? 'error' : (user.firstName ? 'success' : '')"
    >
      <n-input v-model:value="user.firstName" placeholder="Nombre" @input="validateForm" />
    </n-form-item>

    <n-form-item
      label="Apellidos"
      :feedback="errors.lastName"
      :validation-status="errors.lastName ? 'error' : (user.lastName ? 'success' : '')"
    >
      <n-input v-model:value="user.lastName" placeholder="Apellidos" @input="validateForm" />
    </n-form-item>

    <n-form-item
      label="Correo Electrónico"
      :feedback="errors.email"
      :validation-status="errors.email ? 'error' : (user.email ? 'success' : '')"
    >
      <n-input v-model:value="user.email" placeholder="user@alumnos.upm.es" @input="validateForm" />
    </n-form-item>

    <n-form-item
      label="Contraseña"
      :feedback="errors.password"
      :validation-status="errors.password ? 'error' : (user.password ? 'success' : '')"
    >
      <n-input v-model:value="user.password" type="password" placeholder="Ingrese la contraseña" @input="validateForm" />
    </n-form-item>
  </n-form>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from "vue";
import { NForm, NInput, NFormItem } from "naive-ui";

const props = defineProps({
  user: Object,
  errors: Object,
});

const emit = defineEmits(["validate"]);

const validateForm = () => {
  emit("validate");
};
</script>
