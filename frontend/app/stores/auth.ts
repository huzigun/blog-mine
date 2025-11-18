import { defineStore } from 'pinia';

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as null | { id: number; email: string; name: string | null },
    accessToken: null as null | string,
    subscription: null as null | Subscription,
    creditBalance: null as null | {
      totalCredits: number;
      subscriptionCredits: number;
      purchasedCredits: number;
      bonusCredits: number;
    },
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    hasActiveSubscription: (state) =>
      state.subscription?.status === 'ACTIVE' ||
      state.subscription?.status === 'TRIAL',
    isCanceledSubscription: (state) =>
      !state.subscription?.autoRenewal && !!state.subscription?.canceledAt,
  },
  actions: {
    setUser(user: { id: number; email: string; name: string | null }) {
      this.user = user;
    },
    setAccessToken(token: string) {
      this.accessToken = token;
    },
    setSubscription(subscription: Subscription) {
      this.subscription = subscription;
    },
    setCreditBalance(balance: {
      totalCredits: number;
      subscriptionCredits: number;
      purchasedCredits: number;
      bonusCredits: number;
    }) {
      this.creditBalance = balance;
    },
    clearAuth() {
      this.user = null;
      this.accessToken = null;
      this.subscription = null;
      this.creditBalance = null;
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

      // 로그인 시 구독 정보 함께 로드
      await this.fetchSubscription();

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

      // 회원가입 시 구독 정보 함께 로드 (FREE 플랜 자동 할당됨)
      await this.fetchSubscription();

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

    // 구독 정보 조회
    async fetchSubscription() {
      if (!this.accessToken) return null;
      try {
        const subscription = await useApi<Subscription>('/subscriptions/me');
        this.setSubscription(subscription);
        return subscription;
      } catch (error) {
        console.error('Fetch subscription failed:', error);
        // 구독 정보 조회 실패는 치명적이지 않으므로 null만 반환
        return null;
      }
    },

    // BloC 잔액 조회
    async fetchCreditBalance() {
      if (!this.accessToken) return null;
      try {
        const balance = await useApi<{
          totalCredits: number;
          subscriptionCredits: number;
          purchasedCredits: number;
          bonusCredits: number;
        }>('/credits/balance');
        this.setCreditBalance(balance);
        return balance;
      } catch (error) {
        console.error('Fetch credit balance failed:', error);
        return null;
      }
    },
  },
});
