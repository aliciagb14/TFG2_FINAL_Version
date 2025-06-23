import { computed, ref } from "vue";

export const useFormValidation = (user) => {
  const errors = ref({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const isValidEmail = (email) => {
    return email.endsWith("@alumnos.upm.es");
  };

  const isValidPassword = (password) => {
    return /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(password);
  };

  const isFormValid = computed(() => {
    const validations = [
      { field: "firstName", condition: !user.value.firstName, message: "El campo nombre no puede estar vacío" },
      { field: "lastName", condition: !user.value.lastName, message: "El campo apellido no puede estar vacío" },
      { field: "email", condition: !isValidEmail(user.value.email), message: "El email debe acabar en @alumnos.upm.es" },
      { field: "password", condition: !isValidPassword(user.value.password), message: "La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial" }
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

  return { errors, isFormValid };
};

export const closeModal = (emit) => {
  emit("update:show", false);
};

export const onPositiveClick = (validateFn, submitFn, emit) => {
  if (!validateFn.value) {
    alert("Por favor, complete todos los campos.");
    return;
  }
  submitFn();
  closeModal(emit);
};
