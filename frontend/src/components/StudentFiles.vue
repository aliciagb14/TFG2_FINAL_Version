<template>
  <div class="upload-container">
    <n-upload
      multiple
      directory-dnd
      :custom-request="handleUpload"
      :accept="'.xlsx,.zip'"
    >
      <n-upload-dragger class="upload-box">
        <div class="icon-container">
          <n-icon size="48">
            <ArchiveIcon />
          </n-icon>
        </div>
        <n-text>
          Haz clic o arrastra un archivo aquí para subirlo
        </n-text>
        <n-text>
          Solo se permiten archivos <b>.xlsx</b> y <b>.zip</b>. No subas información sensible.
        </n-text>
      </n-upload-dragger>
    </n-upload>
  </div>
</template>

<script setup>
import { uploadFileToMinio } from "@/services/MinioService";
import { useMessage, NUpload, NUploadDragger, NText } from "naive-ui";
import { ArchiveOutline as ArchiveIcon } from "@vicons/ionicons5";

const message = useMessage()
const handleUpload = async ({ file, onProgress, onError, onFinish }) => {
  try {
    message.loading(`Subiendo ${file.name}...`);

    const result = await uploadFileToMinio(file.file);
    
    message.success(`${file.name} subido con éxito`);
    onFinish();
  } catch (error) {
    console.error("Error al subir archivo:", error);
    message.error(`Error al subir ${file.name}`);
    onError(error);
  }
};
</script>


<style scoped>
.upload-container {
  max-width: 400px;
  margin: 0 auto;
}

.upload-box {
  padding: 20px;
  text-align: center;
  border-radius: 8px;
}

.icon-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
}

.icon-container .n-icon {
  font-size: 18px;
}
</style>