<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const toast = useToast()

onMounted(async () => {
  if (isAuthenticated.value && !user.value) {
    await fetchUser()
  }
})

const { fetchUser } = useAuth()

async function handleLogout() {
  try {
    await logout()
    toast.add({
      title: '로그아웃',
      description: '로그아웃되었습니다',
      color: 'success',
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Blog Mine
            </h1>
            <div v-if="isAuthenticated" class="flex items-center gap-4">
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ user?.email }}
              </div>
              <UButton
                color="neutral"
                variant="outline"
                @click="handleLogout"
              >
                로그아웃
              </UButton>
            </div>
            <UButton
              v-else
              to="/login"
              color="primary"
            >
              로그인
            </UButton>
          </div>
        </template>

        <div class="text-center py-12">
          <div v-if="isAuthenticated">
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              환영합니다, {{ user?.name || user?.email }}님!
            </h2>
            <p class="text-gray-600 dark:text-gray-400">
              로그인에 성공했습니다.
            </p>
          </div>
          <div v-else>
            <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Blog Mine에 오신 것을 환영합니다
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
              로그인하여 계속하세요
            </p>
            <UButton
              to="/login"
              color="primary"
              size="lg"
            >
              로그인하기
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
