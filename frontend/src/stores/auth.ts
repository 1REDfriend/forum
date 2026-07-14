import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, usersApi, ApiError } from '../api/index.js';
import type { LoginDTO, RegisterDTO, User } from '../api/types.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

  // Hydrate cached user immediately (avoids a flicker); refreshed from /me on app load.
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
    setAuth(response.user, response.token, response.refreshToken);
  };

  const register = async (data: RegisterDTO) => {
    const response = await authApi.register(data);
    setAuth(response.user, response.token, response.refreshToken);
  };

  const googleAuth = async (idToken: string) => {
    const response = await authApi.googleAuth({ idToken });
    setAuth(response.user, response.token, response.refreshToken);
  };

  // Refresh the current user from the API (role/tier/profile may have changed
  // server-side). Call on app startup so the UI never shows a stale role.
  const fetchCurrentUser = async () => {
    if (!token.value) return;
    try {
      const me = await usersApi.getMe();
      user.value = me;
      localStorage.setItem('user', JSON.stringify(me));
    } catch (error) {
      // 401 → the apiClient already cleared the session; mirror that locally.
      if (error instanceof ApiError && error.status === 401) {
        logout();
      }
      // Other errors (e.g. offline): keep the cached user.
    }
  };

  const logout = () => {
    // Revoke the refresh token server-side (fire-and-forget) before clearing.
    const rt = localStorage.getItem('refreshToken');
    if (rt) void authApi.logout(rt).catch(() => {});
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const setAuth = (newUser: User, newToken: string, newRefreshToken: string) => {
    user.value = newUser;
    token.value = newToken;
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Handle token expiry — called by API client on 401
  const handleUnauthorized = () => {
    logout();
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    googleAuth,
    fetchCurrentUser,
    logout,
    handleUnauthorized,
  };
});
