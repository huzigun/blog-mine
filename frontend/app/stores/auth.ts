import { defineStore } from 'pinia';

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as null | User,
    accessToken: null as null | string,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    hasActiveSubscription: (state) =>
      state.user?.subscription?.status === 'ACTIVE' ||
      state.user?.subscription?.status === 'TRIAL',
    isCanceledSubscription: (state) =>
      !state.user?.subscription?.autoRenewal && !!state.user?.subscription?.canceledAt,
    // Backward compatibility getters
    subscription: (state) => state.user?.subscription,
    creditBalance: (state) => state.user?.creditBalance,
  },
  actions: {
    setUser(user: User) {
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

      // 로그인 시 유저 정보 새로고침 (구독, 크레딧 정보 포함)
      await this.fetchUser();

      return data;
    },

    // 회원가입
    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
      // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
      const data = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: credentials,
      });

      this.setAccessToken(data.accessToken);
      this.setUser(data.user);

      // 회원가입 시 유저 정보 새로고침 (FREE 플랜 자동 할당됨)
      await this.fetchUser();

      return data;
    },

    // 카카오 로그인
    async kakaoLogin(code: string, redirectUri: string): Promise<AuthResponse & { isAccountLinked?: boolean }> {
      // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
      const data = await $fetch<AuthResponse & { isAccountLinked?: boolean }>('/api/auth/kakao-login', {
        method: 'POST',
        body: { code, redirectUri },
      });

      this.setAccessToken(data.accessToken);
      this.setUser(data.user);

      // 로그인 시 유저 정보 새로고침
      await this.fetchUser();

      return data;
    },

    async logout() {
      try {
        // Nuxt API를 통해 로그아웃 (httpOnly 쿠키 삭제)
        await $fetch('/api/auth/logout', { method: 'POST' });
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
