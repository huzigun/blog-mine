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
    },
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

  icon: {
    provider: 'iconify',
    serverBundle: false,
  },
});
