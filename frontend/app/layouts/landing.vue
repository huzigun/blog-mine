<script setup lang="ts">
const auth = useAuth();
const colorMode = useColorMode();

// 모바일 메뉴 상태
const isMobileMenuOpen = ref(false);

// 네비게이션 메뉴
const navItems = [
  { label: '기능', to: '/#features' },
  { label: '요금제', to: '/pricing' },
  { label: '블로그', to: '/blog' },
  { label: '고객센터', to: '/support' },
];

// 스크롤 감지 (헤더 스타일 변경)
const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 10;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

// 모바일 메뉴 닫기
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950">
    <!-- Header -->
    <header
      :class="[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg shadow-sm'
          : 'bg-transparent',
      ]"
    >
      <nav class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <NuxtLink
            to="/"
            class="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            <div class="i-heroicons-sparkles text-2xl text-primary" />
            <span>Blog Mine</span>
          </NuxtLink>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-8">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            >
              {{ item.label }}
            </NuxtLink>
          </div>

          <!-- Desktop Auth Buttons -->
          <div class="hidden md:flex items-center gap-3">
            <template v-if="auth.isAuthenticated">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                to="/console/dashboard"
                icon="i-heroicons-squares-2x2"
              >
                콘솔
              </UButton>
              <UButton
                color="primary"
                size="sm"
                to="/mypage/profile"
                icon="i-heroicons-user-circle"
              >
                내 프로필
              </UButton>
            </template>
            <template v-else>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                to="/auth/login"
              >
                로그인
              </UButton>
              <UButton
                color="primary"
                size="sm"
                to="/auth/register"
                icon="i-heroicons-rocket-launch"
              >
                무료 시작
              </UButton>
            </template>
          </div>

          <!-- Mobile Menu Button -->
          <UButton
            class="md:hidden"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-bars-3"
            @click="isMobileMenuOpen = true"
          />
        </div>
      </nav>

      <!-- Mobile Menu Overlay -->
      <Teleport to="body">
        <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden">
          <!-- Backdrop -->
          <div
            class="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm"
            @click="closeMobileMenu"
          />

          <!-- Menu Panel -->
          <div
            class="fixed top-0 right-0 bottom-0 w-64 bg-white dark:bg-neutral-900 shadow-xl"
          >
            <div class="flex flex-col h-full">
              <!-- Header -->
              <div
                class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800"
              >
                <span class="text-lg font-bold">메뉴</span>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  @click="closeMobileMenu"
                />
              </div>

              <!-- Navigation Links -->
              <nav class="flex-1 overflow-y-auto p-4 space-y-2">
                <NuxtLink
                  v-for="item in navItems"
                  :key="item.to"
                  :to="item.to"
                  class="block px-4 py-3 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  @click="closeMobileMenu"
                >
                  {{ item.label }}
                </NuxtLink>
              </nav>

              <!-- Auth Buttons -->
              <div
                class="p-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2"
              >
                <template v-if="auth.isAuthenticated">
                  <UButton
                    color="neutral"
                    variant="outline"
                    block
                    to="/console/dashboard"
                    icon="i-heroicons-squares-2x2"
                    @click="closeMobileMenu"
                  >
                    콘솔
                  </UButton>
                  <UButton
                    color="primary"
                    block
                    to="/mypage/profile"
                    icon="i-heroicons-user-circle"
                    @click="closeMobileMenu"
                  >
                    내 프로필
                  </UButton>
                </template>
                <template v-else>
                  <UButton
                    color="neutral"
                    variant="outline"
                    block
                    to="/auth/login"
                    @click="closeMobileMenu"
                  >
                    로그인
                  </UButton>
                  <UButton
                    color="primary"
                    block
                    to="/auth/register"
                    icon="i-heroicons-rocket-launch"
                    @click="closeMobileMenu"
                  >
                    무료 시작
                  </UButton>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </header>

    <!-- Main Content -->
    <main class="pt-16">
      <slot />
    </main>

    <!-- Footer -->
    <footer
      class="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
    >
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Company Info -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 text-xl font-bold">
              <div class="i-heroicons-sparkles text-2xl text-primary" />
              <span>Blog Mine</span>
            </div>
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              AI 기반 블로그 원고 자동 생성 서비스
            </p>
            <div class="flex items-center gap-3">
              <a
                href="#"
                class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <div class="i-heroicons-share text-xl" />
              </a>
              <a
                href="#"
                class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <div class="i-heroicons-share text-xl" />
              </a>
              <a
                href="#"
                class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <div class="i-heroicons-share text-xl" />
              </a>
            </div>
          </div>

          <!-- Product -->
          <div class="space-y-4">
            <h3 class="font-semibold text-neutral-900 dark:text-neutral-100">
              제품
            </h3>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink
                  to="/#features"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  기능
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/pricing"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  요금제
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/api-docs"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  API 문서
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/changelog"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  업데이트 내역
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Resources -->
          <div class="space-y-4">
            <h3 class="font-semibold text-neutral-900 dark:text-neutral-100">
              리소스
            </h3>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink
                  to="/blog"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  블로그
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/guides"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  사용 가이드
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/tutorials"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  튜토리얼
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/support"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  고객센터
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div class="space-y-4">
            <h3 class="font-semibold text-neutral-900 dark:text-neutral-100">
              회사
            </h3>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink
                  to="/about"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  회사 소개
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/contact"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  문의하기
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/terms"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  이용약관
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/privacy"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  개인정보처리방침
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Copyright -->
        <div
          class="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800"
        >
          <div
            class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600 dark:text-neutral-400"
          >
            <p>
              &copy; {{ new Date().getFullYear() }} Blog Mine. All rights
              reserved.
            </p>
            <div class="flex items-center gap-6">
              <NuxtLink
                to="/terms"
                class="hover:text-primary transition-colors"
              >
                이용약관
              </NuxtLink>
              <NuxtLink
                to="/privacy"
                class="hover:text-primary transition-colors"
              >
                개인정보처리방침
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
