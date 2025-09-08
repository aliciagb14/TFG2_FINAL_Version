import { defineStore } from 'pinia';

export const useUserDataStore = defineStore('user', {
    state: () => ({
        username: localStorage.getItem('username') || '',
        roles: JSON.parse(localStorage.getItem('roles') || '[]'),
        isAdmin: false,
        token: localStorage.getItem('token') || '',
        bucketName: ''
    }),
    getters: {
        isLoggedIn: (state) => !!state.username,
        totalRoles() {
            return this.roles.length;
        }
    },
    actions: {
        setUser(username, roles, isAdmin, token) {
            this.username = username;
            this.roles = roles;
            this.isAdmin = roles.includes('admin');
            this.token = token;

            localStorage.setItem('username', username);
            localStorage.setItem('roles', JSON.stringify(roles));
            localStorage.setItem('token', token);
        },
        clearUser() {
            this.username = '',
            this.roles = [],
            this.isAdmin = false,
            this.token = '';
            
            localStorage.removeItem('username');
            localStorage.removeItem('roles');
            localStorage.removeItem('token');
        },
        setBucketName(bucketName) {
            this.bucketName = bucketName;
        }
    },
});

export const useNotasStore = defineStore('notas', {
  state: () => ({
    notas: JSON.parse(localStorage.getItem('notas')) || {}
  }),
  actions: {
    setNota(alumnoId, nota) {
      this.notas[alumnoId] = nota
      localStorage.setItem('notas', JSON.stringify(this.notas))
    },
    getNota(alumnoId) {
      return this.notas[alumnoId] || null
    }
  }
})

