import { defineStore } from 'pinia';
import { authClient, type AuthUser, type SmsScene } from '../services/api';

const TOKEN_KEY = 'smart-member-mobile-token';
const USER_KEY = 'smart-member-mobile-user';

function getStorageItem(key: string): string {
  try {
    return uni.getStorageSync(key) || '';
  } catch {
    return '';
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    uni.setStorageSync(key, value);
  } catch {
    // silently ignore storage errors
  }
}

function removeStorageItem(key: string): void {
  try {
    uni.removeStorageSync(key);
  } catch {
    // silently ignore
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getStorageItem(TOKEN_KEY),
    user: (() => {
      try {
        const raw = getStorageItem(USER_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
      } catch {
        return null;
      }
    })()
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    displayName: (state) => state.user?.nickname ?? '未登录',
    memberLevel: (state) => state.user?.memberLevel ?? '普通会员'
  },

  actions: {
    async login(role: 'admin' | 'user', account: string, password: string) {
      const result = await authClient.login(role, account, password);
      this.setSession(result.token, result.user);
      return result;
    },

    async register(
      mobile: string,
      nickname: string,
      password: string,
      confirmPassword: string,
      smsCode: string
    ) {
      const result = await authClient.register(
        mobile,
        nickname,
        password,
        confirmPassword,
        smsCode
      );
      this.setSession(result.token, result.user);
      return result;
    },

    async resetPassword(mobile: string, password: string, confirmPassword: string, smsCode: string) {
      return authClient.resetPassword(mobile, password, confirmPassword, smsCode);
    },

    async sendSmsCode(mobile: string, scene: SmsScene) {
      return authClient.sendSmsCode(mobile, scene);
    },

    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      setStorageItem(TOKEN_KEY, token);
      setStorageItem(USER_KEY, JSON.stringify(user));
    },

    logout() {
      this.token = '';
      this.user = null;
      removeStorageItem(TOKEN_KEY);
      removeStorageItem(USER_KEY);
    }
  }
});
