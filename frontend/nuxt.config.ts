// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/image', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],

  devServer: {
    port: 8706,
  },

  ui: {
    colorMode: false,
  },

  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:9706',
      // 배포 환경에서는 같은 도메인 사용 여부
      useDirectApi: process.env.NUXT_PUBLIC_USE_DIRECT_API === 'true',
    },
  },

  // 배포 환경에서 /api 요청을 백엔드로 프록시 (선택사항)
  nitro: {
    devProxy: {
      // 로컬 개발 환경에서만 사용 (배포시에는 nginx/vercel 등에서 처리)
    },
    // 배포 환경에서 routeRules 사용
    routeRules: process.env.NODE_ENV === 'production' ? {
      // 프로덕션에서 /api/** 요청을 백엔드로 프록시
      // 실제 배포시에는 nginx나 vercel.json 등에서 설정하는 것을 권장
    } : {},
  },

  app: {
    head: {
      link: [
        {
          href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css',
          rel: 'stylesheet',
          crossorigin: 'anonymous',
          as: 'style',
        },
      ],
    },
  },
});
