import { useUserDataStore } from '@/stores/keycloakUserData';
import KeycloakService from '@/keycloak';
import axios from 'axios';

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

export async function fetchAlumnos(bucketName) {
  const userStore = useUserDataStore();
  try {
    const response = await axios.get(`http://localhost:3000/alumnos/${bucketName}`, {
      headers: {
        Authorization: `Bearer ${userStore.token}`
      }
    });
    
    const rawAlumnos = response.data.alumnos;
    const currentYear = new Date().getFullYear();
    console.log("alumnos: ", rawAlumnos)
    console.log("año act: ", currentYear)
    console.log("Claves reales en el excel:", Object.keys(rawAlumnos[0]));

    return rawAlumnos.map(alumno => {
      const email = alumno["Dirección de correo"]?.trim() || "";
      
      return {
        firstName: alumno["Nombre"],
        lastName: alumno["Apellido(s)"],
        username: alumno["Nº de matrícula"],
        email: alumno["Dirección de correo"],
        rol: email.endsWith("@alumnos.upm.es")
              ? "alumno"
              : email.endsWith("@upm.es")
              ? "Profesor"
              : "Inválido",
        añoAcademico: currentYear
      };
    });
  } catch (error) {
      console.error("Error al obtener alumnos:", error);
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
