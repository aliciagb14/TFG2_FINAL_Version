<template>
  <div class="file-upload-container">
    <n-card class="upload-card">
      <h1>Bucket: {{ bucketName || 'No definido' }}</h1>
      
      <n-upload
          ref="uploadRef"
          multiple
          :default-upload="false"
          :accept="acceptedFileTypes"
          :max-size="10 * 1024 * 1024"
          @change="handleChange"
      >
        <n-upload-dragger>
          <div class="upload-dragger-content">
            <n-icon size="48" :depth="3">
              <cloud-upload-outline />
            </n-icon>
            <div class="upload-text">
              <p><strong>Drop files here or click to upload</strong></p>
              <p style="margin-top: 8px">Supports .zip or .xlsx files</p>
            </div>
          </div>
        </n-upload-dragger>
      </n-upload>

      <n-button
          type="primary"
          class="upload-button"
          :disabled="files.length === 0 || uploading"
          @click="handleUpload"
      >
        <template #icon>
          <n-icon><cloud-upload-outline /></n-icon>
        </template>
        Upload Files
      </n-button>

      <div v-if="message" class="status-message" :class="messageType">{{ message }}</div>

      <div v-if="files.length > 0" class="file-list">
        <h3>Selected Files:</h3>
        <n-list>
          <n-list-item v-for="(file, index) in files" :key="index">
            <n-thing :title="file.name">
              <template #description>
                <n-text>Size: {{ formatSize(file.file.size) }}</n-text>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </div>

      <n-card title="Ficheros Subidos" class="mt-4">
        <p><strong>Bucket:</strong> {{ normalizeBucketName(bucketName) }}</p>
        <n-list bordered>
          <n-list-item v-for="(file, index) in uploadedFiles" :key="index">
            <template #prefix>
              <n-icon size="20" :component="CloudUploadOutline" />
            </template>
            <n-thing>
              <template #header>{{ uploadedFiles.value }}</template>
              <h2> Archivo subido: {{ String(file) }}</h2>
              <template #description>
                <n-button
                  size="small"
                  type="primary"
                  tag="a"
                  :href="`http://localhost:3000/bucket-file/${normalizeBucketName(bucketName)}/${encodeURIComponent(file)}`"
                  target="_blank"
                >
                  Ver / Descargar
                </n-button>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-card>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { NUpload, NUploadDragger, NCard, NButton, NListItem, NList, NIcon, NThing, NText } from 'naive-ui';
import { CloudUploadOutline } from '@vicons/ionicons5';
import axios from 'axios';
import { useMessage } from 'naive-ui';
import { getUsers } from '@/services/UserService'
import { useUserDataStore } from '@/stores/keycloakUserData'
const props = defineProps({
  bucketName: String,
  allowAllFiles: {
    type: Boolean,
    default: false   // false → usa restricciones, true → permite todo
  }
});

function normalizeBucketName(name) {
  if (!name || typeof name !== 'string') return ''; 
  return name
    .toLowerCase()
    .trim()
    .replace(/[, ]+/g, '-')       // coma o espacios -> guion
    .replace(/[^a-z0-9.-]/g, ''); // quitar caracteres inválidos
}

const userStore  = useUserDataStore();
// const bucketName = ref(userStore.bucketName || ''); PROFESOR
//   bucketName = computed(() => props.bucketName);  ALUMNO
 
let bucketName = ref('');

const acceptedFileTypes = computed(() => {
  if (props.allowAllFiles) return ''; // sin restricción
  return userStore.isAdmin ? '.xlsx' : '.zip,.rar';
});

const nMessage = useMessage();

const uploadRef = ref(null);
const files = ref([]);
const uploading = ref(false);
const message = ref('');
const messageType = ref('');
const uploadedFiles = ref([]);

import { useRoute, useRouter } from 'vue-router';
const router = useRouter();
const route = useRoute();

// Detectar el origen del componente
onMounted(async () => {
  // Si Upload se abre desde ListUsers (es decir, se pasó bucketName por props)
  if (props.bucketName) {
    console.log("[Upload] Abierto desde ListUsers con bucket:", props.bucketName);
    bucketName.value = props.bucketName;
  } 
  // Si se abre directamente desde el menú (ej: /files)
  else {
    console.log("[Upload] Abierto desde el sidebar (/files) usando bucket del profesor");
    bucketName.value = userStore.bucketName || '';

    // Si el store aún no tiene bucketName, lo generamos
    if (!bucketName.value) {
      try {
        const users = await getUsers();
        const generated = generateBucketName(users);
        if (generated) {
          bucketName.value = generated;
          userStore.setBucketName(generated);
        }
      } catch (err) {
        console.error("Error al generar bucketName en Upload.vue", err);
      }
    }
  }

  // Una vez definido el bucket, cargamos los ficheros
  uploadedFiles.value = await fetchUploadedFiles();

  // Si vienes desde /files (profesor), mostrar el primer archivo si existe
  if (route.path === '/files' && userStore.isAdmin && uploadedFiles.value.length > 0) {
    router.push({ 
      path: '/files', 
      query: { bucket: bucketName.value, file: uploadedFiles.value[0] } 
    });
  }
});

// onMounted(async () => {
//   if (!bucketName.value) {
//     try {
//       const users = await getUsers();
//       const generated = generateBucketName(users);
//       if (generated) {
//         bucketName.value = generated;
//         userStore.setBucketName(generated);
//       }
//     } catch (err) {
//       console.error("Error al generar bucketName en Upload.vue", err);
//     }
//   }
//   uploadedFiles.value  = await fetchUploadedFiles();
//   if (userStore.isAdmin && uploadedFiles.length > 0) {
//     router.push({ path: '/files', query: { bucket: bucketName.value, file: uploadedFiles[0] } });
//   }
// });

watch(() => userStore.bucketName, async (newVal) => {
  if (newVal) {
    bucketName.value = newVal;
    await fetchUploadedFiles();
  }
});

const generateBucketName = (users) => {
  const user = users.find(u => u.username === userStore.username);
  if (user) {
    const apellidos = user.lastName.replace(/\s+/g, '');
    const nombre = user.firstName.trim();
    return `${apellidos},${nombre}`;
  }
  return null;
};

const handleChange = (options) => {
  files.value = options.fileList;
  message.value = '';
};

const formatSize = (size) => {
  if (size < 1024) return size + ' B';
  else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
  else if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
  else return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const handleUpload = async () => {
  if (files.value.length === 0) return;

  for (const file of files.value) {
    if (!props.allowAllFiles) {
      if (userStore.isAdmin && !file.file.name.endsWith('.xlsx')) {
        message.value = 'Solo se permiten archivos .xlsx en el bucket del profesor';
        messageType.value = 'error';
        nMessage.error(message.value);
        return;
      }
      if (!userStore.isAdmin && !(file.file.name.endsWith('.zip') || file.file.name.endsWith('.rar'))) {
        message.value = 'Alumnos solo pueden subir archivos .zip o .rar';
        messageType.value = 'error';
        nMessage.error(message.value);
        return;
      }
    }
    // if (userStore.isAdmin && !file.file.name.endsWith('.xlsx')) {
    //   message.value = 'Admins solo pueden subir archivos .xlsx';
    //   messageType.value = 'error';
    //   nMessage.error(message.value);
    //   return;
    // }
    // if (!userStore.isAdmin && !(file.file.name.endsWith('.zip') || file.file.name.endsWith('.rar'))) {
    //   message.value = 'Alumnos solo pueden subir archivos .zip o .rar';
    //   messageType.value = 'error';
    //   nMessage.error(message.value);
    //   return;
    // }
  }

  uploading.value = true;
  message.value = 'Uploading files...';
  messageType.value = 'info';

  try {
    const formData = new FormData();
    files.value.forEach(file => formData.append('file', file.file));
    formData.append('bucketName', bucketName.value);
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

    message.value = 'Upload successful';
    messageType.value = 'success';
    files.value = [];

    uploadedFiles.value = await fetchUploadedFiles();
  } catch (error) {
    console.error(error);
    message.value = 'Error uploading files';
    messageType.value = 'error';
    nMessage.error(message.value);
  } finally {
    uploading.value = false;
  }
};



const fetchUploadedFiles = async () => {
  if (!bucketName.value) return;
  try {
    console.log("Buscando ficheros en: ", bucketName.value)
    const normalizedBucket = normalizeBucketName(bucketName.value);
    console.log("Buscando ficheros tras transformar bucket en: ", normalizedBucket)
 
    const res = await axios.get(`http://localhost:3000/bucket-files/${normalizedBucket}`, {
      headers: {
        Authorization: `Bearer ${userStore.token}`
      }
    });
    
    console.log(`Archivos encontrados para ${normalizedBucket}:`, res.data);

    if (Array.isArray(res.data)) {
      uploadedFiles.value = res.data;
    } else {
      uploadedFiles.value = [];
    }
    console.log("Los ficheros encontrados son: ", res.data)
    return res.data
  } catch (error) {
    console.error("Error fetching uploaded files:", error);
    uploadedFiles.value = [];
  }
};
</script>

<style scoped>

.upload-dragger-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100px;
  border-radius: 8px;
  background-color: white;
}

.upload-card {
  width:700px;
  height: 700px;
  margin: 0 auto; /* Centrar horizontalmente */
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>