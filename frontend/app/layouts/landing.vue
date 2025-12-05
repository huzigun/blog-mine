<script setup lang="ts">
const auth = useAuth();
const colorMode = useColorMode();
const { scrollToSection } = useSmoothScroll();

// 모바일 메뉴 상태
const isMobileMenuOpen = ref(false);

// 네비게이션 메뉴
const navItems = [
  { label: '기능', section: 'features' },
  { label: '요금제', section: 'pricing' },
  { label: 'BloC', section: 'bloc' },
  { label: 'FAQ', section: 'faq' },
];

// 스크롤 감지 (헤더 스타일 변경)
const isScrolled = ref(false);

const handleScroll = () => {
  if (import.meta.client) {
    isScrolled.value = window.scrollY > 10;
  }
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
            <a
              v-for="item in navItems"
              :key="item.section"
              href="#"
              class="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              @click="(e) => { e.preventDefault(); scrollToSection(item.section); }"
            >
              {{ item.label }}
            </a>
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
                <a
                  v-for="item in navItems"
                  :key="item.section"
                  href="#"
                  class="block px-4 py-3 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection(item.section); closeMobileMenu(); }"
                >
                  {{ item.label }}
                </a>
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
    <footer class="bg-[#212121] dark">
      <div class="container mx-auto max-w-7xl px-8 py-12">
        <div class="flex justify-between items-start">
          <!-- Company Info -->
          <div class="w-md">
            <dl class="mb-[54px]">
              <dt class="text-xl font-medium mb-6 text-white">BlogMine</dt>
              <dd class="text-sm text-gray-400">
                상위 노출 블로그의 패턴을 학습하고 원고를 생성하며, 블로그
                성과까지 추적합니다
              </dd>
            </dl>
            <dl class="">
              <dt class="text-xl font-medium mb-6 text-white">사업자 정보</dt>
              <dd>
                <ul class="flex flex-wrap text-sm text-gray-400 gap-y-1">
                  <li
                    class="after:content-[''] after:inline-block after:mx-2.5 after:w-px after:h-2.5 after:bg-[#C7C7C780] flex items-center"
                  >
                    회사명: 리클릭
                  </li>
                  <li
                    class="after:content-[''] after:inline-block after:mx-2.5 after:w-px after:h-2.5 after:bg-[#C7C7C780] flex items-center"
                  >
                    주소: 광주광역시 북구 매곡로 233-1, 3층(오치동)
                  </li>
                  <li
                    class="after:content-[''] after:inline-block after:mx-2.5 after:w-px after:h-2.5 after:bg-[#C7C7C780] flex items-center"
                  >
                    대표: 신준섭
                  </li>
                  <li
                    class="after:content-[''] after:inline-block after:mx-2.5 after:w-px after:h-2.5 after:bg-[#C7C7C780] flex items-center"
                  >
                    사업자등록번호: 246-86-00094
                  </li>
                  <li>통신판매업신고번호: 2020-광주북구-0662</li>
                </ul>
              </dd>
            </dl>
          </div>

          <!-- Product -->
          <div class="">
            <h3
              class="font-medium text-neutral-900 dark:text-neutral-100 text-xl mb-6"
            >
              서비스
            </h3>
            <ul class="flex flex-col gap-y-4 text-sm">
              <li>
                <a
                  href="#"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection('hero'); }"
                >
                  소개
                </a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection('features'); }"
                >
                  서비스
                </a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection('features'); }"
                >
                  이용방법
                </a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection('pricing'); }"
                >
                  요금제
                </a>
              </li>
              <li>
                <a
                  href="#"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors cursor-pointer"
                  @click="(e) => { e.preventDefault(); scrollToSection('faq'); }"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <!-- Resources -->
          <div class="">
            <h3
              class="font-medium text-neutral-900 dark:text-neutral-100 text-xl mb-6"
            >
              정보
            </h3>
            <ul class="space-y-2 text-sm">
              <li>
                <NuxtLink
                  to="https://atomosads.notion.site/_BlogMine_v1-0-2b13f8c41f088166aaebcae54bd460f4"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                  target="_blank"
                >
                  이용약관
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="https://atomosads.notion.site/_BlogMine_v1-0-2b13f8c41f088178a1aeef9df3fbab5b"
                  target="_blank"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  개인정보처리방침
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div class="">
            <h3
              class="font-medium text-neutral-900 dark:text-neutral-100 text-xl mb-6"
            >
              고객지원
            </h3>
            <ul class="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:help@atomos.com"
                  class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                >
                  이메일: help@atomos.com
                </a>
              </li>
              <li
                class="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
              >
                영업시간: 평일 10:00 - 18:00
              </li>
            </ul>
          </div>
        </div>

        <!-- Copyright -->
        <div class="mt-12 pt-8 border-t border-neutral-600">
          <div
            class="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600 dark:text-neutral-400"
          >
            <ClientOnly>
              <p>
                &copy; {{ new Date().getFullYear() }} Blog Mine. All rights
                reserved.
              </p>
            </ClientOnly>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
