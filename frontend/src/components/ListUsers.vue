<template>
  <h2>Bienvenido, {{ props.username }}</h2>
  <div class="table-header">
    <NButton type="primary" @click="downloadExcel">
      Download
    </NButton>
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
import axios from 'axios';
import { NDataTable, NIcon, NButton, NDatePicker, NRate, NModal, NInputNumber } from 'naive-ui';
import { getUsers, createUserKeycloak, deleteUserKeycloak } from '@/services/UserService';
import { PersonAddSharp as AddUserIcon, 
        CloseCircleOutline as DeleteUserIcon, 
        CreateOutline as EditUserIcon,
        EyeOutline as ViewIcon 
      } from '@vicons/ionicons5';
import { fetchAlumnos, deployTienda } from '@/services/MinioService';
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useUserDataStore, useNotasStore } from '@/stores/keycloakUserData'
import AddUserModal from '@/components/AddUserModal.vue'
import EditUserModal from '@/components/EditUserModal.vue'
import DeleteUserModal from '@/components/DeleteUserModal.vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const showViewModal = ref(false);
const viewTiendaUrl = ref('');
const userStore = useUserDataStore()
const data = ref([]);
const loading = ref(true)
const checkedRowKeysRef = ref([]);
const selectedCount = computed(() => checkedRowKeysRef.value.length);
const showModal = ref(false);
const showDeleteModal = ref(false);
const showEditModal = ref(false)
const userToDelete = ref([]);
const userToEdit = ref(null);
const uploadedFiles = ref([])
const notasStore = useNotasStore()

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

const normalizeBucketName = (name) => {
  return name
    .toLowerCase()
    .replace(/[,]/g, '-')
};

const createBucket = async (bucketName) => {
  try {
    console.log("el bucket en create es: ", bucketName)
    //userStore.setBucketName(bucketName)
    await axios.post('http://localhost:3000/create-bucket', 
      { bucketName: bucketName },
      {
        headers: {
          Authorization: `Bearer ${userStore.token}`
        }
      }
    );
    console.log("Bucket creado o ya existía:", bucketName);
  } catch (error) {
    console.error("Error al crear bucket:", error.response?.data || error.message);
  }
};

const createBucketsForUsers = async (usuarios) => {
  for (const user of usuarios) {
    const apellidos = user.lastName.replace(/\s+/g, '');
    const nombre = user.firstName.trim();
    const bucketName = normalizeBucketName(`${apellidos},${nombre}`);
    console.log("EL bucket del user es: ", bucketName)
    await createBucket(bucketName);
  }
};

onMounted(async () => {
  if (props.isAdmin) {
    console.log("SOY ADMIN")
    try {
      loading.value = true;

      // Paso 1: obtener usuarios y transformar
      const usuarios = await getUsers();

      const usuariosTransformados = Array.isArray(usuarios)
        ? usuarios.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            id: user.id,
            username: user.username,
            rol: getRol(user),
            añoAcademico: getActualYear(),
            archivoSubido: false,
          }))
        : [];

      // Paso 2: crear buckets para todos
      await createBucketsForUsers(usuariosTransformados);

      // Paso 3: actualizar el flag archivoSubido sólo para usuario actual
      const usuariosConArchivoActualizado = await fetchArchivoSubidoUsuarioActual(usuariosTransformados);
      data.value = usuariosConArchivoActualizado;

       // Paso 2: obtener alumnos de MinIO
      let alumnos = [];
      const result = await fetchAlumnos(userStore.bucketName);   
      alumnos = result;
      console.log("alumnos: ", alumnos)

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
              username: alumno.username, // ahora sí lo usa el backend
              password: '12345678',
              rol: alumno.rol
            });
            console.log(`Usuario ${alumno.username} creado en Keycloak`);
          } catch (error) {
            console.error(`Error al crear ${alumno.username}:`, error);
          }
        }
      }


    } catch (error) {
      console.error('Error al obtener usuarios o buckets:', error);
    } finally {
      loading.value = false;
    }
  } else {
    console.log("NO soy admin, soy alumno: ", !props.isAdmin)
    const bucketFormatOKName = normalizeBucketName(bucketName.value)
    await axios.post(
      `http://localhost:3000/upload/${bucketFormatOKName}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
});

function exportNotasExcel(usuarios) {
  const dataExcel = usuarios.map(a => ({
    Nombre: a.firstName,
    Apellidos: a.lastName,
    Matricula: a.username,
    Email: a.email,
    Rol: a.rol,
    AñoAcademico: a.añoAcademico,
    Nota: notasStore.getNota(a.username) || ''
  }))

  const ws = XLSX.utils.json_to_sheet(dataExcel)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Notas')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  saveAs(blob, 'SCE listado alumnos.xlsx')
}

function downloadExcel() {
  exportNotasExcel(data.value)
}

function encontrarTiendaEnHtdocs(nombreArchivoSubido) {
  const HTDOCS_DIR = 'C:\\xampp\\htdocs';
  
  const baseName = path.basename(nombreArchivoSubido, path.extname(nombreArchivoSubido)).toLowerCase();

  const dirs = fs.readdirSync(HTDOCS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name.toLowerCase());

  const tiendaExistente = dirs.find(d => d === baseName);

  return tiendaExistente || null;
}

const fetchArchivoSubidoUsuarioActual = async (usuariosTransformados) => {
  const usuarioActual = usuariosTransformados.find(user => user.username === userStore.username);
  console.log("user actual es: ", usuarioActual)
  const apellidos = usuarioActual.lastName.replace(/\s+/g, '');
  const nombre = usuarioActual.firstName.trim();
  const bucketNameUsuarioActual = normalizeBucketName(`${apellidos},${nombre}`);

  userStore.setBucketName(bucketNameUsuarioActual);

  if (!usuarioActual) return usuariosTransformados;

  const usuariosConArchivos = await Promise.all(
    usuariosTransformados.map(async (user) => {
      const bucketName = normalizeBucketName(`${user.lastName.replace(/\s+/g, '')},${user.firstName.trim()}`);
      console.log("[BUCKET FETCH]", bucketName)
      try {
        const res = await axios.get(`http://localhost:3000/bucket-files/${bucketName}`, {
          headers: {
            Authorization: `Bearer ${userStore.token}`
          }
        });
        console.log("[RESPONSE] fetch", res.data)
        return {
          ...user,
          archivoSubido: Array.isArray(res.data.files) && res.data.files.length > 0
        };
      } catch (err) {
        return {
          ...user,
          bucketName,
          archivoSubido: false,
          files: res.data.files || []
        };
      }
    })
  );
  console.log("USer con archivos: ", usuariosConArchivos)
  return usuariosConArchivos;
};


// const fetchUploadedFilesPorUsuario = async (usuarios) => {
//   const resultados = [];
//   for (const user of usuarios) {
//     const apellidos = user.lastName.replace(/\s+/g, '');
//     const nombre = user.firstName.trim();
//     const bucketName = normalizeBucketName(`${apellidos},${nombre}`);

//     try {
//       const res = await axios.get(`http://localhost:3000/bucket-files/${bucketName}`, {
//         headers: {
//           Authorization: `Bearer ${userStore.token}`
//         }
//       });
//       console.log(`Archivos encontrados para ${bucketName}:`, res.data);

//       if (Array.isArray(res.data) && res.data.length > 0) {
//         user.archivoSubido = true;
//       } else {
//         user.archivoSubido = false;
//       }
//     } catch (error) {
//       console.error(`Error al verificar archivos de ${user.username}:`, error);
//       user.archivoSubido = false;
//       resultados.push({ ...user, archivoSubido: [] }); 
//     }
//   }

//   return usuarios;
// };


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
      title: 'Archivo Subido',
      key: 'archivoSubido',
      width: 120,
      render(row) {
        return row.archivoSubido
          ? h('span', { style: 'color: green;' }, '✔️ Sí')
          : h('span', { style: 'color: red;' }, '❌ No');
      }
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
            title: 'Ver tienda',
            disabled: !row.archivoSubido 
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
      filterOptions: Array.from({ length: 10 }, (_, i) => ({
        label: (i + 1).toString(),
        value: i + 1
      })),
      filter(value, row) {
        return notasStore.getNota(row.username) === value
      },
      render(row) {
        return h(NInputNumber, {
          value: notasStore.getNota(row.username),
          min: 1,
          max: 10,
          step: 1,
          onUpdateValue: (newValue) => {
            notasStore.setNota(row.username, newValue)
          }
        })
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

const generarNombreTienda = (user) => {
  const nombre = user.firstName.trim().split(' ')[0][0].toLowerCase(); // primera letra del primer nombre
  const apellidos = user.lastName
    .trim()
    .split(' ')
    .map(a => a[0].toLowerCase()) // primera letra de cada apellido
    .join('');
  
  return `ce_${nombre}${apellidos}`;
};

const openViewModal = async (row) => {
  try {
    // Generar nombre de tienda desde el usuario
    const nombreArchivo = generarNombreTienda(row);

    const res = await axios.get(`http://localhost:3000/tienda/${nombreArchivo}`);
    const tiendaExistente = res.data.tienda;

    viewTiendaUrl.value = `http://localhost/${tiendaExistente}/`;
    showViewModal.value = true;
  } catch (err) {
    alert('No se encontró la tienda desplegada en htdocs.');
  }
};




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
      const usuariosConArchivo = await fetchArchivoSubidoUsuarioActual(usuariosTransformados);

      data.value = usuariosConArchivo;
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
    console.warn(`Email inválido detectado: ${newUser.email}`);
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
      username: newUser.username,
      id: newUser.id,
      añoAcademico: getActualYear()
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