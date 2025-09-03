import axios from 'axios';
import KeycloakService from '@/keycloak';


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
        const response = await axios.put(`http://localhost:8180/admin/realms/ComercioElectronico/users/${user.id}`, {
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