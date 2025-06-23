<template>
    <div class="file-upload-container">
        <n-card title="MinIO File Upload" class="upload-card">
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
                <p style="margin-top: 8px">
                    Supports .zip or .xlsx files
                </p>
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
    
        <div v-if="message" class="status-message" :class="messageType">
            {{ message }}
        </div>
    
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
    
        <div v-if="uploadedFiles.length > 0" class="uploaded-files">
            <h3>Uploaded Files:</h3>
            <n-list>
            <n-list-item v-for="(file, index) in uploadedFiles" :key="index">
                {{ file }}
            </n-list-item>
            </n-list>
        </div>
        </n-card>
    </div>
</template>
    
<script setup>
import { ref } from 'vue';
import { NUpload, NUploadDragger, NCard, NButton, NListItem, NList, NIcon, NThing } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5';
import axios from 'axios';
import { useMessage } from 'naive-ui';
import { useUserDataStore } from '@/stores/keycloakUserData'

const userStore  = useUserDataStore()
const isAdmin = userStore.isAdmin
const isAlumno = !isAdmin
const userLogged = userStore.username
const token = userStore.token; 

const acceptedFileTypes = isAdmin ? '.xlsx' : isAlumno ? '.zip' : '';

const nMessage = useMessage();

const uploadRef = ref(null);
const files = ref([]);
const uploading = ref(false);
const message = ref('');
const messageType = ref('');
const uploadedFiles = ref([]);

const handleChange = (options) => {
files.value = options.fileList;
message.value = '';
};

const formatSize = (size) => {
if (size < 1024) {
    return size + ' B';
} else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB';
} else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + ' MB';
} else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
};

const handleUpload = async () => {
  if (files.value.length === 0) return;

  for (const file of files.value) {
    if (isAdmin && !file.file.name.endsWith('.xlsx')) {
      console.log("hola soy profesor")
      message.value = 'Admins solo pueden subir archivos .xlsx';
      messageType.value = 'error';
      nMessage.error(message.value);
      return;
    }
    if (isAlumno && !file.file.name.endsWith('.zip')) {
      console.log("hola soy alumno")
      message.value = 'Alumnos solo pueden subir archivos .zip';
      messageType.value = 'error';
      nMessage.error(message.value);
      return;
    }
  }

  uploading.value = true;
  message.value = 'Uploading files...';
  messageType.value = 'info';

  try {
    const formData = new FormData();
    files.value.forEach(file => {
      formData.append('file', file.file);
    });
    const response = await axios.post('http://localhost:3000/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data) {
      message.value = 'Files uploaded successfully!';
      messageType.value = 'success';
      nMessage.success('Files uploaded to MinIO successfully');
      uploadedFiles.value = [...uploadedFiles.value, ...files.value.map(f => f.name)];

      files.value = [];
      if (uploadRef.value) uploadRef.value.clear();
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    message.value = `Upload failed: ${error.response?.data?.message || error.message}`;
    messageType.value = 'error';
    nMessage.error(message.value);
  } finally {
    uploading.value = false;
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
</style>