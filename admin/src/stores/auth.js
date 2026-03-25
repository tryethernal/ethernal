import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('admin_token'));
    const isLoggedIn = computed(() => !!token.value);

    async function login(email, password) {
        const { data } = await api.post('/users/signin', { email, password });
        token.value = data.token;
        localStorage.setItem('admin_token', data.token);
    }

    function logout() {
        token.value = null;
        localStorage.removeItem('admin_token');
    }

    return { token, isLoggedIn, login, logout };
});
