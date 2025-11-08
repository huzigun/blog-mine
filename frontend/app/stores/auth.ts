import { defineStore } from 'pinia';

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as null | { id: number; email: string; name: string | null },
    accessToken: null as null | string,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
  },
  actions: {
    setUser(user: { id: number; email: string; name: string | null }) {
      this.user = user;
    },
    setAccessToken(token: string) {
      this.accessToken = token;
    },
    clearAuth() {
      this.user = null;
      this.accessToken = null;
    },

    // 로그인
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
      // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
      const data = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: credentials,
      });

      this.setAccessToken(data.accessToken);
      this.setUser(data.user);

      return data;
    },

    // 회원가입
    async register(
      credentials: RegisterCredentials,
    ): Promise<AuthResponse> {
      // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
      const data = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: credentials,
      });

      this.setAccessToken(data.accessToken);
      this.setUser(data.user);

      return data;
    },

    async logout() {
      try {
        await useApi('/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout failed:', error);
      } finally {
        this.clearAuth();
        navigateTo('/auth/login');
      }
    },

    async fetchUser() {
      if (!this.accessToken) return null;
      try {
        const user = await useApi<User>('/user/me');
        this.setUser(user);
        return user;
      } catch (error) {
        console.error('Fetch user failed:', error);
        this.clearAuth();
        return null;
      }
    },
  },
});
