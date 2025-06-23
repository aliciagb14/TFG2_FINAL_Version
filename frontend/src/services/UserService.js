import axios from 'axios';
import KeycloakService from '@/keycloak';
import { useUserDataStore } from '@/stores/keycloakUserData';


export async function getUsers() {
  try {
    const response = await axios.get('http://localhost:3001/api/users');
    return response.data;
  } catch (error) {
    console.error("Error al obtener los usuarios: ", error.response?.data || error.message);
    throw error;
  }
}

export async function createUserKeycloak(user) {
  try {
    const response = await axios.post('http://localhost:3001/api/users', user);
    return response.data;
  } catch (error) {
    console.error("Error al crear el usuario: ", error.response?.data || error.message);
    throw error;
  }
}

export async function deleteUserKeycloak(userId) {
  try {
    const response = await axios.delete(`http://localhost:3001/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar usuario:", error.response?.data || error.message);
    throw error;
  }
}

//llamada a minio
export async function fetchAlumnos() {
  const userStore = useUserDataStore();
  try {
    const response = await axios.get('http://localhost:3000/alumnos', {
      headers: {
        Authorization: `Bearer ${userStore.token}`
      }
    });
    
    const rawAlumnos = response.data.alumnos;
    const currentYear = new Date().getFullYear();
    console.log("alumnos: ", rawAlumnos)
    console.log("año act: ", currentYear)
    return rawAlumnos.map(alumno => {
      const email = alumno["Dirección de correo"]?.trim() || "";
      
      return {
        firstName: alumno["Nombre"],
        lastName: alumno["Apellido(s)"],
        email: alumno["Dirección de correo"],
        username: alumno["Nº matrícula"],
        rol: email.endsWith("@alumnos.upm.es")
              ? "Usuario"
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

export async function updateUserKeycloak(user) {
    const token = await getAdminToken()

    if (!token) {
        throw new Error('Token de autenticación no disponible.');
    }

    if (!user.id) {
        throw new Error('El usuario no tiene un ID válido.');
    }

    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios.put(`http://localhost:8080/admin/realms/ComercioElectronico/users/${user.id}`, {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            enabled: true
        }, config);

        console.log("Usuario actualizado con éxito", response.data);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar el usuario:', error.response ? error.response.data : error.message);
        throw error;
    }
}