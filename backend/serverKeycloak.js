// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const {
  KEYCLOAK_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_USERNAME,
  KEYCLOAK_PASSWORD
} = process.env;

async function getAdminToken() {
  const response = await axios.post(
    `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: KEYCLOAK_USERNAME,
      password: KEYCLOAK_PASSWORD
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}
//CREAR USER
app.post('/api/users', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const adminToken = await getAdminToken();

    const username = email.split('@')[0];

    const userPayload = {
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false
        }
      ]
    };

    const result = await axios.post(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
      userPayload,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error creando usuario:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error creando el usuario', details: error.response?.data });
  }
});

// OBTENER USER
app.get('/api/users', async (req, res) => {
  try {
    const adminToken = await getAdminToken();

    const response = await axios.get(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener usuarios:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al obtener usuarios', details: error.response?.data });
  }
});

// BORRAR USER
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminToken = await getAdminToken();

    await axios.delete(
      `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${id}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al eliminar el usuario', details: error.response?.data });
  }
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
