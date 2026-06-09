import { defineStore } from 'pinia';
import { authClient, type AuthUser, type SmsScene } from '../services/api';

const TOKEN_KEY = 'smart-member-token';
const USER_KEY = 'smart-member-user';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: (localStorage.getItem(TOKEN_KEY) as string) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') as AuthUser | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin'
  },

  actions: {
    async login(role: 'admin' | 'user', account: string, password: string) {
      const result = await authClient.login(role, account, password);
      this.setSession(result.token, result.user);
      return result;
    },

    async register(
      mobile: string,
      email: string,
      nickname: string,
      password: string,
      confirmPassword: string
    ) {
      const result = await authClient.register(
        mobile,
        email,
        nickname,
        password,
        confirmPassword
      );
      this.setSession(result.token, result.user);
      return result;
    },

    async resetPassword(mobile: string, email: string) {
      return authClient.resetPassword(mobile, email);
    },

    async sendSmsCode(mobile: string, scene: SmsScene) {
      return authClient.sendSmsCode(mobile, scene);
    },

    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
});
