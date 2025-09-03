import Keycloak from 'keycloak-js';
import axios from 'axios';
import { useUserDataStore } from './stores/keycloakUserData';

const keycloak = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'ComercioElectronico',
  clientId: 'frontend-ce'
});

let authenticated;
let store = null;

/**
 * Initializes Keycloak, then run callback. This will prompt you to login.
 *
 * @param onAuthenticatedCallback
 */
async function init(onInitCallback) {
  try {
    authenticated = await keycloak.init({ 
        onLoad: 'login-required',
        pkceMethod: 'S256',
        redirectUri: 'http://localhost:5173',
        enableLogging: true
     })
     
    if (authenticated) {
      const userStore = useUserDataStore()
        const token = keycloak.token;
        const tokenDecoded = JSON.parse(atob(token.split('.')[1]));
        console.log("token recibido (decoded): ", tokenDecoded)

        const user = tokenDecoded.preferred_username || "Usuario";
        const roles = tokenDecoded.realm_access?.roles || [];

        const validRoles = ["admin", "alumno"]
        const matchingRoles = roles.filter(role =>
          validRoles.includes(role.toLowerCase())
        );

        const lastName = tokenDecoded.lastName
        const firstName = tokenDecoded.firstName
        
        if (matchingRoles.length === 0) {
          console.error("No se encontró un rol válido.");
          return;
        }

        console.log("roles de keycloak: ", roles, "roles backend: ", validRoles)
        console.log("el rol match es: ", matchingRoles)
        userStore.setUser(user, roles, roles.includes('admin'), token, firstName, lastName)

    }
    onInitCallback()
  } catch (error) {
    console.error("Keycloak init failed")
    console.error(error)
  }
};

/**
 * Initializes store with Keycloak user data
 *
 */
async function initStore(storeInstance) {
  try {
    store = storeInstance
    store.initOauth(keycloak)

    if (!authenticated) { alert("not authenticated") }
  } catch (error) {
    console.error("Keycloak init failed")
    console.error(error)
  }
};

function logout(url) {
  keycloak.logout({ redirectUri: url });
}

async function refreshToken() {
  try {
    await keycloak.updateToken(480);
    return keycloak;
  } catch (error) {
    console.error('Failed to refresh token');
    console.error(error);
  }
}

const KeycloakService = {
  CallInit: init,
  CallInitStore: initStore,
  CallLogout: logout,
  CallTokenRefresh: refreshToken
};

export default KeycloakService;

// import Keycloak from 'keycloak-js';
// import axios from 'axios';

// const keycloak = new Keycloak({
//   url: 'http://localhost:8080',
//   realm: 'ComercioElectronico',
//   clientId: 'frontend-ce'
// });

// const authUrl = 'http://localhost:8080/realms/ComercioElectronico/protocol/openid-connect/token';

// export const getAdminToken = async () => {
//     const token = localStorage.getItem('access_token');

//     if (!token) {
//         throw new Error("❌ No hay token disponible. Inicia sesión primero.");
//     }

//     console.log("🔑 Usando token de sesión actual:", token);
//     return token;
// };

// export const loginWithCredentials = async (username, password) => {
//     try {
//         const response = await axios.post(authUrl, new URLSearchParams({
//             client_id: 'frontend-ce',
//             grant_type: 'password',
//             username,
//             password
//         }), {
//             headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
//         });

//         const data = response.data;
//         console.log("🔑 Token recibido:", data.access_token);

//         localStorage.setItem('access_token', data.access_token);
//         localStorage.setItem('refresh_token', data.refresh_token);

//         const tokenDecoded = JSON.parse(atob(data.access_token.split('.')[1]));
//         const user = tokenDecoded.preferred_username || "Usuario";
//         const roles = tokenDecoded.realm_access?.roles || [];

//         console.log("👤 Usuario autenticado:", user);
//         console.log("🎭 Roles:", roles);

//         return { username: user, roles, token: data.access_token };

//     } catch (error) {
//         console.error("❌ Error en la autenticación:", error.response?.data || error.message);
//         throw error;
//     }
// };




// export default keycloak;
