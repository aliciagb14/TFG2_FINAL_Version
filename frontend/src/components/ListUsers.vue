<template>
  <h2>Bienvenido, {{ props.username }}</h2>
  <div class="table-header">
    <div class="table-header-selected">
      <p>{{ selectedCount }} usuario(s) seleccionado(s)</p>
    </div>
    <div class="table-header-buttons">
      <n-button @click="showModal = !showModal">
        <n-icon size="20">
          <AddUserIcon /> 
        </n-icon>
      </n-button>
      <n-button
        type="error"
        @click="deleteSelectedUsers"
        :disabled="selectedCount === 0"
      >
        Eliminar seleccionados
      </n-button>
    </div>
  </div>
  <AddUserModal v-model:show="showModal"  @userAdded="handleUserAdded"/>
  <div class="data-table">
    <n-data-table 
      v-if="isAdmin && !loading" 
      :columns="columns" 
      :data="data" 
      :row-key="rowKey"
      :checked-row-keys="checkedRowKeysRef"
      :pagination="paginationOptions"
      @update:checked-row-keys="handleCheck"
      bordered
    />
    <p v-else>No tienes permisos para ver esta información.</p>
  </div>

  <EditUserModal
    v-model:show="showEditModal"
    :user="userToEdit"
    @update:show="showEditModal = $event"
    @editUser="handleEditUser"
  />
  <DeleteUserModal 
    v-model:show="showDeleteModal"
    :users="userToDelete"
    @update:show="showDeleteModal = $event"
    @deleteUser="handleDeleteUser"
  />
  <n-modal v-model:show="showViewModal" title="Vista previa de la tienda" >
    <iframe
      :src="viewTiendaUrl"
      style="width: 100%; height: 70vh; border: none;"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    ></iframe>
  </n-modal>

</template>

<script setup>
import { ref, onMounted, h, watch, computed, reactive } from 'vue';

import { NDataTable, NIcon, NButton, NDatePicker, NRate, NModal } from 'naive-ui';
import { getUsers, createUserKeycloak, deleteUserKeycloak, fetchAlumnos } from '@/services/UserService';
import { PersonAddSharp as AddUserIcon, 
        CloseCircleOutline as DeleteUserIcon, 
        CreateOutline as EditUserIcon,
        EyeOutline as ViewIcon 
      } from '@vicons/ionicons5';
import AddUserModal from '@/components/AddUserModal.vue'
import EditUserModal from '@/components/EditUserModal.vue'
import DeleteUserModal from '@/components/DeleteUserModal.vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const showViewModal = ref(false);
const viewTiendaUrl = ref('');

const data = ref([]);
const loading = ref(true)
const checkedRowKeysRef = ref([]);
const selectedCount = computed(() => checkedRowKeysRef.value.length);
const showModal = ref(false);
const showDeleteModal = ref(false);
const showEditModal = ref(false)
const userToDelete = ref([]);
const userToEdit = ref(null);

const paginationOptions = reactive({
  page: 1,
  pageSize: 5,
  showSizePicker: true,
  pageSizes: [5, 10, 15], 
  prefix ({ itemCount }) {
    return `Total: ${itemCount} usuarios`;
  },
  onChange: (page) => {
    paginationOptions.page = page;
  },
  onUpdatePageSize: (pageSize) => {
    paginationOptions.pageSize = pageSize;
    paginationOptions.page = 1;
  }
});

onMounted(async () => {
  console.log('isAdmin:', props.isAdmin);
  if (props.isAdmin) {
    try {
      loading.value = true;

      const usuarios = await getUsers();
      const usuariosTransformados = Array.isArray(usuarios)
        ? usuarios.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            id: user.id,
            username: user.username,
            rol: getRol(user),
            añoAcademico: getActualYear()
          }))
        : [];

      // Paso 2: obtener alumnos de MinIO
      const alumnos = await fetchAlumnos();

      // Paso 3: crear en Keycloak si no existen
      for (const alumno of alumnos) {
        const yaExiste = usuariosTransformados.some(
          u => u.username === alumno.username || u.email === alumno.email
        );

        if (!yaExiste) {
          try {
            await createUserKeycloak({
              firstName: alumno.firstName,
              lastName: alumno.lastName,
              email: alumno.email,
              username: alumno.username,
              password: '12345678',
              rol: alumno.rol
            });
            console.log(`Usuario ${alumno.username} creado en Keycloak`);
          } catch (error) {
            console.error(`Error al crear ${alumno.username}:`, error);
          }
        }
      }

      // Paso 4: refrescar usuarios tras crear nuevos
      const updatedUsers = await getUsers();
      const updatedUsuariosTransformados = Array.isArray(updatedUsers)
        ? updatedUsers.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            id: user.id,
            username: user.username,
            rol: getRol(user),
            añoAcademico: getActualYear()
          }))
        : [];

      data.value = updatedUsuariosTransformados;

    } catch (error) {
      console.error('Error al obtener usuarios o alumnos:', error);
    } finally {
      loading.value = false;
    }
  }
});


// onMounted(async () => {
//     console.log('isAdmin:', props.isAdmin);
//     if (props.isAdmin) {
//       await fetchUsers();
//       try {
//         data.value = await fetchAlumnos();
//       } catch (error) {
//         console.error('Error al obtener alumnos:', error);
//       }
//     }

// });

const columns = [
    {
      type: "selection"
    },
    {
      title: 'Nombre',
      key: 'firstName',
      width: 90,
    },
    {
      title: 'Apellidos',
      key: 'lastName',
      width: 120,
    },
    {
      title: 'Correo Electrónico',
      key: 'email',
      width: 200,
    },
    {
      title: 'Rol',
      key: 'rol',
      width: 100,
    },
    {
      title: 'Año académico',
      key: 'añoAcademico',
      width: 90,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 90,
      render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
        h(
          NButton,
          {
            size: 'small',
            type: 'info',
            onClick: () => openViewModal(row),
            title: 'Ver tienda'
          },
          {
            default: () => h(NIcon, () => h(ViewIcon))
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'warning',
            onClick: () => editUser(row),
          },
          {
            default: () => h(NIcon, () => h(EditUserIcon))
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => deleteUser(row),
          },
          {
            default: () => h(NIcon, () => h(DeleteUserIcon))
          }
        )
      ])
    },
    {
      title: "Valoración",
      key: "valoracion",
      width: 200,
      defaultFilterOptionValues: [],
      filterOptions: [
        { label: "⭐", value: 1 },
        { label: "⭐⭐", value: 2 },
        { label: "⭐⭐⭐", value: 3 },
        { label: "⭐⭐⭐⭐", value: 4 },
        { label: "⭐⭐⭐⭐⭐", value: 5 },
      ],
      filter(value, row) {
        return row.valoracion === value
      },
      render(row) {
        return h(NRate, {
          value: row.valoracion,
          readonly: true,
          allowHalf: true,
          count: 5,
          onUpdateValue: (newValue) => {
            row.valoracion = newValue;  
          }
        });
      }
    }
];

const props = defineProps({
  username: String,
  password: String,
  isAdmin: Boolean
})
const rowKey = (row) => row.username;

const handleCheck = (rowKeys) => {
  console.log("IDs seleccionados:", rowKeys);
  checkedRowKeysRef.value = rowKeys;
};

const openViewModal = (row) => {
  const nombreTienda = 'tiendaCE'; // o genera dinámicamente si tienes varios
  viewTiendaUrl.value = `https://localhost/${nombreTienda}/`; // URL de la tienda que quieres mostrar
  showViewModal.value = true;
}


const deleteUser = (user) => {
  userToDelete.value = [user]
  showDeleteModal.value = true
}

const editUser = (user)=> {
  userToEdit.value = user
  showEditModal.value = true
}

const getActualYear = () => {
  return new Date().getFullYear();
};

const handleRowClick = (row) => {
  if (props.isAdmin) {
    const archivo = "tiendaCE.zip";
    const nombreTienda = archivo.replace(/\s*\(\d+\)/, "").replace(".zip", "");
    const tiendaURL = `https://localhost/${nombreTienda}`;
    // Abrir en una nueva pestaña para evitar problemas con CORS en fetch
    window.open(tiendaURL, '_blank');
  } else {
    alert('No tienes permisos para acceder a esta tienda.');
  }
};



const rowProps = (row) => {
  return {
    style: 'cursor: pointer;',
    onClick: () => handleRowClick(row)
  };
};


const deleteSelectedUsers = () => {
  const usersToDelete = data.value.filter(user => checkedRowKeysRef.value.includes(user.id));
  console.log("Usuarios seleccionados para eliminar:", usersToDelete);
  if (usersToDelete.length === 0) {
    console.warn("No hay usuarios seleccionados para eliminar.");
    return;
  }
  userToDelete.value = usersToDelete;
  showDeleteModal.value = true;
};


const handleDeleteUser = async (users) => {
  if (!Array.isArray(users) || users.length === 0) return;

  try {
    const deletePromises = users.map(user => deleteUserKeycloak(user.id));
    await Promise.all(deletePromises);

    const idsEliminados = users.map(u => u.id);
    data.value = data.value.filter(user => !idsEliminados.includes(user.id));

    checkedRowKeysRef.value = [];
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
  }
};

const handleEditUser = async (updatedUser) => {
  console.log("el usertoedit es: ", updatedUser)

  if (!updatedUser) {
    console.error("Error: No se pudo actualizar el usuario porque no tiene un ID válido.");
    return;
  }

  try {
    const index = data.value.findIndex(user => user.id === updatedUser.id);
    if (index !== -1) {
      data.value[index] = { ...updatedUser };
    }

    showEditModal.value = false;
    console.log(`Usuario ${updatedUser.firstName} actualizado correctamente.`);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
  }
}

const isValidEmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@(alumnos\.upm\.es|upm\.es)$/;
    return regex.test(email);
};

const fetchUsers = async () => {
  try {
    loading.value = true;
    const users = await getUsers();
    console.log(users)
    if (Array.isArray(users)) {
      data.value = users.map(user => ({
        firstName: user.firstName,
        lastName: user.lastName, 
        email: user.email,
        id: user.id,
        username: user.username,
        rol: getRol(user),
        añoAcademico: getActualYear()
      }));
      
    } else {
      console.error("La respuesta no es un array de usuarios");
    }
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
  } finally {
    loading.value = false;
  }
};

const getRol = (newUser) => {
  if (!isValidEmail(newUser.email)) {
        newUser.email = ""; 
        return "";
    }
    return newUser.email.endsWith("@alumnos.upm.es") ? "Usuario" : "Profesor";
}

const handleUserAdded = (newUser) => {
  console.log('Usuario agregado:', newUser);
  const exists = data.value.some(user => user.username === newUser.username);
  if (!exists) {
    data.value.push({
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      rol: getRol(newUser),
    });
  }
};

watch(showModal, (newVal) => {
  console.log('showModal cambio a: ', newVal);
});

</script>

<style scoped>
.table-header {
  display: flex;
  margin-bottom: 1rem;
  align-items: center;
  justify-content: space-between;
}

.table-header-selected {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.table-header-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.data-table {
  display: flex;
  flex-direction: column;
}

</style>