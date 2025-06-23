export async function uploadFileToMinio(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:9001/backups", {
      method: "POST",
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) throw new Error("Error al subir el archivo");

    const data = await response.json();
    console.log("✅ Subida exitosa:", data.message);
    return data;
  } catch (error) {
    console.error("❌ Error al subir archivo:", error);
    throw error;
  }
}

export async function getPresignedPostData(fileName) {
  const response = await fetch('http://localhost:9001/generate-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName }),
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener la URL firmada');
  }

  return await response.json();
}

