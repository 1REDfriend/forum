import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/index.js';
import type { LoginDTO, RegisterDTO, User } from '../api/types.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  
  // Initialize user state from token if it exists (in a real app, you'd fetch /me here)
  if (token.value) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        user.value = JSON.parse(storedUser);
      }
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      token.value = null;
    }
  }

  const isAuthenticated = computed(() => !!token.value);

  const login = async (data: LoginDTO) => {
    const response = await authApi.login(data);
    setAuth(response.user, response.token);
  };

  const register = async (data: RegisterDTO) => {
    const response = await authApi.register(data);
    setAuth(response.user, response.token);
  };

  const googleAuth = async (idToken: string) => {
    const response = await authApi.googleAuth({ idToken });
    setAuth(response.user, response.token);
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const setAuth = (newUser: User, newToken: string) => {
    user.value = newUser;
    token.value = newToken;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    googleAuth,
    logout,
  };
});
