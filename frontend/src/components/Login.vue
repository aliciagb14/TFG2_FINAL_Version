<!-- <template>
    <div v-if="!isauthenticated" class="Login-container">
        <div class="form-container">
            <h1>Gestión de Tiendas</h1>
            <div>
                <n-space vertical class="input-container">
                    <n-input v-model:value="username" type="text" placeholder="Username" clearable  />
                    <n-input v-model:value="password" type="password" placeholder="Password" show-password-on="click"/>
                </n-space>
                <div class="button-container">
                    <n-button type="success" ghost @click="handleLogin" >Login</n-button>
                    <n-button type="error" ghost @click="forgotPassword">Forgot your password?
                        <n-icon><ForgotPasswordIcon/></n-icon>
                    </n-button>
                </div>
                <ForgotPasswordModal 
                    :show="showForgotModal"
                    :user="{ username: username }"
                    @update:show="val => showForgotModal = val"
                />
            </div>
        </div>
    </div>
</template>
  
<script setup>
import {ref, onMounted, watch} from 'vue'
import { NInput, NButton, NCard, NSpace, NIcon } from 'naive-ui'
import { LockClosedOutline as ForgotPasswordIcon, NuclearOutline} from '@vicons/ionicons5';
//import keycloak, { loginWithCredentials  } from '../../keycloak'
import ForgotPasswordModal from '@/utils/ForgotPasswordModal.vue';
import { useRouter } from 'vue-router';

const username = ref('')
const password = ref('')
const users = ref([]);
const isauthenticated = ref(false)
const authenticatedUser = ref('');
const isAdmin = ref(false)
const router = useRouter()
const showForgotModal = ref(false);

const forgotPassword = () => {
  showForgotModal.value = true;
  
};

const handleLogin = async () => {
    try {
        console.log("🔍 Intentando iniciar en frontend input sesión con:");
        console.log("📝 Username input :", username.value);
        console.log("🔒 Password input:", password.value);  

       // const result = await loginWithCredentials(username.value, password.value);

        isauthenticated.value = true;
        authenticatedUser.value = result.username;
        isAdmin.value = result.roles.includes('admin');

        console.log("✅ Usuario autenticado:", authenticatedUser.value);
        console.log("🎭 Roles:", result.roles);
        console.log("👑 ¿Es Admin?:", isAdmin.value);

        router.push({ 
            path: '/home', 
            query: { 
                username: authenticatedUser.value, 
                isAdmin: isAdmin.value, 
                password: password.value
            } 
        });
        setTimeout(() => {
            window.history.replaceState({}, '', '/home');
        }, 100); 

    } catch (error) {
        console.error("❌ Error en login:", error);
        alert("Usuario o contraseña incorrectos.");
    }
};


watch(authenticatedUser, (newValue) => {
    if (newValue) {
        console.log('User is authenticated, displaying ListUsers component.', newValue);
    }
});

</script>


<style scoped>
    .Login-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #a8c3ff, #6b8ef7);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .form-container {
        background: white;
        padding: 30px 25px;
        border-radius: 15px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 350px;
    }

    h1 {
        margin-bottom: 20px;
        font-size: 2.2rem;
        color: #3a3a3a;
        font-weight: bold;
    }

    .input-container {
        width: 100%;
        margin-top: 15px;
    }

    .n-input:focus {
        border-color: #4a6cf7;
        box-shadow: 0 0 8px rgba(75, 102, 247, 0.3);
    }

    .button-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 15px;
    }

    .n-button {
        padding: 12px;
        font-size: 1rem;
        border-radius: 8px;
        width: 100%;
        transition: all 0.3s ease;
        margin-top:10px
    }

    .n-button:hover {
        transform: scale(1.05);
    }

    .forgot-password {
        margin-top: 12px;
        font-size: 0.9rem;
        color: #4a4a32;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .forgot-password:hover {
        color: #6b8ef7;
    }
</style> -->