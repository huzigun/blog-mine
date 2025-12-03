<script setup lang="ts">
definePageMeta({
  layout: 'landing',
});

const points = [
  {
    key: 'point01',
    title: '상위 노출 패턴 변화',
    description:
      '상위노출 패턴이 계속 바뀌어, 글을 쓸 때마다 다시 공부해야 합니다.',
    image: '/point01.png',
  },
  {
    key: 'point02',
    title: '계정 운영 부담',
    description: '어떤 계정에 어떤 글을 올려야 할지 매번 고민하게 됩니다.',
    image: '/point02.png',
  },
  {
    key: 'point03',
    title: '결과 관리 부족',
    description:
      '게시 후 순위 변화를 매일 직접 확인하고 기록하기가 현실적으로 어렵습니다.',
    image: '/point03.png',
  },
];
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative h-[604px]">
      <!-- Background Pattern -->
      <div class="absolute inset-0 grid grid-cols-2">
        <div class="col-span-1"></div>
        <div
          class="col-span-1 h-full bg-cover"
          :style="{
            backgroundImage: `url('/hero01.jpg')`,
          }"
        >
          <!-- <NuxtImg src="/hero01.jpg" alt="" class="w-full" /> -->
        </div>
      </div>

      <div class="relative container mx-auto max-w-7xl">
        <div class="grid grid-cols-2">
          <!-- Left Content -->
          <div class="pt-[107px] font-medium">
            <!-- Stats Badge -->
            <div
              class="inline-flex items-center gap-2 h-[34px] px-4 rounded-full bg-primary-100 border border-primary-200 mb-6"
            >
              <span class="text-sm text-primary-700 dark:text-primary-300">
                누적 생성 원고의 수:
              </span>
              <span class="text-primary-600 dark:text-primary-400">305개</span>
            </div>

            <h2
              class="text-[40px] font-semibold leading-normal mb-5"
              style="letter-spacing: -0.8px"
            >
              이제 '잘 되는 글'만 쓰세요.
              <br />
              AI로 패턴 분석부터 원고 생성,
              <br />
              배포, 추적까지 한 번에.
            </h2>

            <!-- Description -->
            <p class="text-lg mb-10">
              상위노출에 필요한 핵심 요소를 모두 자동화했습니다.
              <br />
              빠르게 쓰고, 정확하게 올리고, 꾸준히 추적하세요.
            </p>

            <UButton
              color="neutral"
              to="/auth/register"
              trailing-icon="i-heroicons-chevron-right-16-solid"
              class="rounded px-8"
              size="xl"
            >
              지금 바로 시작하기
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Pain Points Section -->
    <section class="pt-[120px] pb-[168px] bg-whit">
      <div class="container mx-auto max-w-7xl">
        <!-- Section Header -->
        <div class="text-center mb-10">
          <span class="inline-block text-primary-500 font-medium text-xl">
            Pain Point
          </span>
          <h2 class="text-[32px] font-bold">
            왜 블로그 원고 작성이 이렇게 어려울까요?
          </h2>
        </div>

        <!-- Pain Point Cards -->
        <ul class="grid gap-6 mb-12" :class="[`grid-cols-${points.length}`]">
          <!-- Card 1: 상위 노출 패턴 변화 -->
          <li class="" v-for="pt in points" :key="pt.key">
            <div class="relative bg-[#F4F4F4] rounded-xl p-9">
              <!-- Content -->
              <h3 class="text-2xl font-bold mb-2">{{ pt.title }}</h3>
              <p class="text-lg mb-9">
                {{ pt.description }}
              </p>
              <div class="flex justify-end">
                <NuxtImg :src="pt.image" alt="" sizes="150" />
              </div>
            </div>
          </li>
        </ul>

        <!-- Solution Message -->
        <div class="text-center py-12">
          <!-- prettier-ignore -->
          <p class="text-[40px] font-semibold">
            그래서 <span class="text-primary-600">블로그마인</span>은
            <br />
            <span class="text-primary-600">생성부터 배포, 추적까지</span> 전부 자동으로 해결합니다.
          </p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-[120px] bg-[#EFF1F5]">
      <div class="container mx-auto max-w-7xl px-[70px]">
        <!-- Section Header -->
        <div class="text-center mb-12">
          <span class="inline-block text-primary-500 font-medium text-xl">
            How It Works
          </span>
          <h2 class="text-[32px] font-bold">이렇게 가치를 제공합니다</h2>
        </div>

        <div class="mb-5">
          <div
            class="h-3 w-full grid grid-cols-3 gap-5"
            :style="{
              background: `url('/line01.png') 100% 50% no-repeat`,
            }"
          >
            <div
              class="col-span-1 flex items-center justify-center"
              v-for="i in 3"
              :key="`dot-${i}`"
            >
              <span class="w-3 h-3 bg-primary-500 rounded-full"></span>
            </div>
          </div>
        </div>

        <ul class="grid grid-cols-3 gap-5 mb-10">
          <li class="bg-white rounded-3xl py-11 px-6">
            <NuxtImg src="/icon_work01.png" alt="" :width="56" class="mb-6" />
            <div class="font-semibold text-xl text-primary-500 mb-1">
              STEP 1
            </div>
            <div class="font-semibold text-2xl mb-8">키워드 입력</div>
            <div class="text-lg">
              기획이나 구조 고민 없이, 단 한 단계로 모든 생성 프로세스가
              시작됩니다.
            </div>
          </li>
          <li class="bg-white rounded-3xl py-11 px-6">
            <NuxtImg src="/icon_work02.png" alt="" :width="56" class="mb-6" />
            <div class="font-semibold text-xl text-primary-500 mb-1">
              STEP 2
            </div>
            <div class="font-semibold text-2xl mb-8">
              상위 20개 블로그 자동 분석
            </div>
            <div class="text-lg">
              AI가 상위권 블로그를 분석해 어떤 구조가 효과적인지 즉시
              파악합니다.
            </div>
          </li>
          <li class="bg-white rounded-3xl py-11 px-6">
            <NuxtImg src="/icon_work03.png" alt="" :width="56" class="mb-6" />
            <div class="font-semibold text-xl text-primary-500 mb-1">
              STEP 3
            </div>
            <div class="font-semibold text-2xl mb-8">분석 기반 자동 생성</div>
            <div class="text-lg">
              패턴 분석 결과를 반영해 바로 써도 되는 고품질 원고가 완성됩니다.
            </div>
          </li>
        </ul>

        <div class="mb-5">
          <div
            class="h-3 w-full grid grid-cols-2 gap-5 px-[190px]"
            :style="{
              background: `url('/line02.png') 0 50% no-repeat`,
            }"
          >
            <div
              class="col-span-1 flex items-center justify-center"
              v-for="i in 2"
              :key="`dot-${i}`"
            >
              <span class="w-3 h-3 bg-primary-500 rounded-full"></span>
            </div>
          </div>
        </div>

        <ul class="grid grid-cols-2 gap-5 px-[190px]">
          <li class="bg-white rounded-3xl py-11 px-6">
            <NuxtImg src="/icon_work04.png" alt="" :width="56" class="mb-6" />
            <div class="font-semibold text-xl text-primary-500 mb-1">
              STEP 4
            </div>
            <div class="font-semibold text-2xl mb-8">키워드 입력</div>
            <div class="text-lg">
              기획이나 구조 고민 없이, 단 한 단계로 모든 생성 프로세스가
              시작됩니다.
            </div>
          </li>
          <li class="bg-white rounded-3xl py-11 px-6">
            <NuxtImg src="/icon_work05.png" alt="" :width="56" class="mb-6" />
            <div class="font-semibold text-xl text-primary-500 mb-1">
              STEP 5
            </div>
            <div class="font-semibold text-2xl mb-8">
              상위 20개 블로그 자동 분석
            </div>
            <div class="text-lg">
              AI가 상위권 블로그를 분석해 어떤 구조가 효과적인지 즉시
              파악합니다.
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="py-[120px]">
      <div class="container mx-auto max-w-7xl">
        <div class="text-center mb-12">
          <h2 class="text-[40px] font-bold">데모 영상</h2>
        </div>
        <div class="bg-[#D9D9D9] rounded-2xl h-[720px]"></div>
      </div>
    </section>

    <section class="py-[120px]">
      <div class="container mx-auto max-w-7xl">
        <div class="text-center mb-10">
          <span class="inline-block text-primary-500 font-medium text-xl">
            Inside the BloC
          </span>
          <h2 class="text-[32px] font-bold">
            블로그마인은 BloC으로 더 잘 쓸 수 있습니다
          </h2>
        </div>
        <div class="grid grid-cols-3 gap-5">
          <div class="rounded-2xl border border-primary-400 overflow-hidden">
            <NuxtImg src="/inside01.png" alt="" class="w-full" />
            <div class="p-8">
              <h4 class="text-2xl font-semibold mb-4">BloC (블럭)</h4>
              <ul class="flex flex-col gap-y-3">
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  원고 생성, 배포, 일부 고급 기능 이용 시 사용되는 재화입니다.
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  요금제마다 기본 제공량이 다르며, 필요한 경우 추가 구매할 수
                  있습니다.
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  충전한 블럭은 1년 동안 유효합니다.
                </li>
              </ul>
            </div>
          </div>
          <div class="rounded-2xl border border-primary-400 overflow-hidden">
            <NuxtImg src="/inside02.png" alt="" class="w-full" />
            <div class="p-8">
              <h4 class="text-2xl font-semibold mb-4">블로그 순위 추적 횟수</h4>
              <ul class="flex flex-col gap-y-3">
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  게시글이 검색 결과에서 몇 위에 노출되는 지를 자동으로
                  추적합니다.
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  요금제별로 월간 추적 기능 횟수가 달라집니다.
                </li>
              </ul>
            </div>
          </div>
          <div class="rounded-2xl border border-primary-400 overflow-hidden">
            <NuxtImg src="/inside01.png" alt="" class="w-full" />
            <div class="p-8">
              <h4 class="text-2xl font-semibold mb-4">추가 기능 제공 범위</h4>
              <ul class="flex flex-col gap-y-3">
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  스마트 원고 생성
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  AI 추천 키워드 제공
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  상위노출 패턴 인사이트 제공
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  상위노출 패턴 인사이트 제공
                </li>
                <li class="pl-6 relative">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="16"
                    class="absolute left-0 top-1 text-primary-500"
                  />
                  상위노출 패턴 인사이트 제공
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-[120px] bg-[#F1F4FA]">
      <div class="container mx-auto max-w-7xl">
        <div class="text-center mb-12">
          <span class="inline-block text-primary-500 font-medium text-xl">
            Pricing
          </span>
          <h2 class="text-[32px] font-bold mb-4">
            필요한 만큼, 원하는 방식으로 제공하는 유연한 요금제
          </h2>
          <p class="text-lg">
            키워드 분석부터 순위추적까지 업무량과 운영 규모에 맞게 플랜을
            선택하세요.
          </p>
        </div>
        <div class="grid grid-cols-4 gap-x-6 mb-16">
          <article class="px-8 bg-white rounded-2xl h-[647px] py-10">
            <header>
              <div>
                <h4 class="text-[28px] font-semibold mb-1">Free</h4>
                <p class="text-lg text-gray-600 mb-6 leading-tight">
                  AI 원고 작성과 순위 추적을 가볍게 시작해보세요.
                </p>
                <div
                  class="flex justify-center items-center bg-[#EFF6FF] rounded-lg border border-[#DBEAFE] gap-x-2 py-2"
                >
                  <NuxtImg src="/icon_bloc.png" alt="" />
                  <span class="text-lg font-medium text-primary">50 BloC</span>
                </div>
              </div>
            </header>
            <hr class="border-t border-[#E5E7EB] mt-8 mb-5" />
            <p class="flex items-center gap-x-1 mb-3">
              <span class="text-[30px] font-bold">무료</span>
              <span class="text-sm text-gray-600">(가입 즉시 14일간 무료)</span>
            </p>
            <UButton block class="rounded py-2.5" size="lg" color="neutral">
              무료로 시작하기
            </UButton>
            <div class="mt-8">
              <h5 class="font-semibold mb-3">제공 혜택</h5>
              <ul class="flex flex-col gap-y-2">
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  순위 추적: 10회
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  스마트 원고 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  블로그 배포 신청 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  해지 시 데이터 3개월 보관
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  이미지 50건 생성 가능
                </li>
              </ul>
            </div>
          </article>
          <article class="px-8 bg-white rounded-2xl h-[647px] py-10">
            <header>
              <div>
                <h4 class="text-[28px] font-semibold mb-1">Starter - 입문용</h4>
                <p class="text-lg text-gray-600 mb-6 leading-tight">
                  안정적인 상위 노출 분석과 AI 원고 작성 환경을 제공합니다.
                </p>
                <div
                  class="flex justify-center items-center bg-[#EFF6FF] rounded-lg border border-[#DBEAFE] gap-x-2 py-2"
                >
                  <NuxtImg src="/icon_bloc.png" alt="" />
                  <span class="text-lg font-medium text-primary">100 BloC</span>
                </div>
              </div>
            </header>
            <hr class="border-t border-[#E5E7EB] mt-8 mb-5" />
            <p class="flex items-center gap-x-1 mb-3">
              <span class="text-[30px] font-bold">9,900원</span>
              <span class="text-sm text-gray-600">/월</span>
            </p>
            <UButton block class="rounded py-2.5" size="lg" color="neutral">
              시작하기
            </UButton>
            <div class="mt-8">
              <h5 class="font-semibold mb-3">제공 혜택</h5>
              <ul class="flex flex-col gap-y-2">
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  순위 추적: 50회
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  스마트 원고 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  블로그 배포 신청 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  기본 상위노출 인사이트 제공
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  해지 시 데이터 6개월 보관
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  이미지 50건 생성 가능
                </li>
              </ul>
            </div>
          </article>
          <article class="px-8 bg-white rounded-2xl h-[647px] py-10">
            <header>
              <div>
                <h4 class="text-[28px] font-semibold mb-1">Pro - 성장형</h4>
                <p class="text-lg text-gray-600 mb-6 leading-tight">
                  다중 블로그 운영과 고급 분석을 위한 확장형 플랜입니다.
                </p>
                <div
                  class="flex justify-center items-center bg-[#EFF6FF] rounded-lg border border-[#DBEAFE] gap-x-2 py-2"
                >
                  <NuxtImg src="/icon_bloc.png" alt="" />
                  <span class="text-lg font-medium text-primary">500 BloC</span>
                </div>
              </div>
            </header>
            <hr class="border-t border-[#E5E7EB] mt-8 mb-5" />
            <p class="flex items-center gap-x-1 mb-3">
              <span class="text-[30px] font-bold">49,900원</span>
              <span class="text-sm text-gray-600">/월</span>
            </p>
            <UButton block class="rounded py-2.5" size="lg" color="neutral">
              Pro로 업그레이드
            </UButton>
            <div class="mt-8">
              <h5 class="font-semibold mb-3">제공 혜택</h5>
              <ul class="flex flex-col gap-y-2">
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  순위 추적: 150회
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  상위노출 인사이트 자동 반영
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  스마트 원고 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  원고 다량 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  블로그 배포 신청 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  해지 시 데이터 1년 보관
                </li>
              </ul>
            </div>
          </article>
          <article class="px-8 bg-white rounded-2xl h-[647px] py-10">
            <header>
              <div>
                <h4 class="text-[28px] font-semibold mb-1">Pro + 운영자용</h4>
                <p class="text-lg text-gray-600 mb-6 leading-tight">
                  대규모 블로그 운영에 최적화된 성능과 관리 기능을 제공합니다.
                </p>
                <div
                  class="flex justify-center items-center bg-[#EFF6FF] rounded-lg border border-[#DBEAFE] gap-x-2 py-2"
                >
                  <NuxtImg src="/icon_bloc.png" alt="" />
                  <span class="text-lg font-medium text-primary">
                    1,500 BloC
                  </span>
                </div>
              </div>
            </header>
            <hr class="border-t border-[#E5E7EB] mt-8 mb-5" />
            <p class="flex items-center gap-x-1 mb-3">
              <span class="text-[30px] font-bold">149,900원</span>
              <span class="text-sm text-gray-600">/월</span>
            </p>
            <UButton block class="rounded py-2.5" size="lg" color="neutral">
              시작하기
            </UButton>
            <div class="mt-8">
              <h5 class="font-semibold mb-3">제공 혜택</h5>
              <ul class="flex flex-col gap-y-2">
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  순위 추적: 500회
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  대량 원고 생성 및 배포
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  상위노출 인사이트 자동 반영
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  스마트 원고 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  원고 다량 생성 가능
                </li>
                <li class="pl-5 relative text-sm">
                  <UIcon
                    name="i-heroicons-check-20-solid"
                    size="14"
                    class="absolute left-0 top-[3px] text-primary-500"
                  />
                  해지 시 데이터 1년 보관
                </li>
              </ul>
            </div>
          </article>
        </div>
        <div class="bg-white rounded-2xl py-10 px-8">
          <div class="flex gap-x-12">
            <div class="w-[320px]">
              <h4 class="text-[28px] font-semibold mb-1">
                Enterprise - 기업용 요금제
              </h4>
              <p class="text-sm text-gray-600 mb-8 tracking-tight">
                조직 및 에이전시 운영에 맞춘 맞춤형 AI·SEO 솔루션입니다.
              </p>
              <UButton block color="neutral" size="lg" class="rounded py-2.5">
                비즈니스 문의하기
              </UButton>
            </div>
            <div class="flex-1">
              <p class="mb-8 text-lg font-semibold">
                1500 BloC 이상 필요시 문의 주시면 비즈니스 규모에 맞춰 사용
                가능합니다.
              </p>
              <div>
                <h5 class="font-semibold mb-3">제공 혜택:</h5>
                <ul class="flex flex-wrap gap-y-2 gap-x-6">
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    순위 추적 커스터마이징
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    대량 원고 생성 및 배포 지원
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    상위노출 인사이트 자동 반영
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    해지 시 데이터 무제한 보관
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    스마트 원고 생성 가능
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    상위노출 블로그 배포 신청
                  </li>
                  <li class="pl-5 relative text-sm">
                    <UIcon
                      name="i-heroicons-check-20-solid"
                      size="14"
                      class="absolute left-0 top-[3px] text-primary-500"
                    />
                    전용 CS 지원
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-[120px] bg-white dark:bg-neutral-900">
      <div class="container mx-auto max-w-7xl">
        <div class="text-center mb-10">
          <h2 class="text-[40px] font-bold">FAQ</h2>
        </div>

        <ul class="flex flex-col gap-y-5">
          <li
            v-for="item in [
              {
                label: 'Q. 블로그마인은 어떤 분들이 사용하면 좋나요?',
                defaultOpen: true,
                content:
                  '오프라인 매장 사장님부터 콘텐츠 제작자까지, 글 작성과 블로그 운영이 부담되는 모든 분들에게 도움이 됩니다.',
              },
              {
                label: 'Q2. 블로그 운영 경험이 없어도 사용할 수 있나요?',
                content:
                  '네, 가능합니다. 블로그마인은 초보자도 쉽게 사용할 수 있도록 직관적인 인터페이스로 설계되었습니다. 키워드만 입력하시면 AI가 자동으로 최적화된 원고를 생성해드립니다.',
              },
              {
                label:
                  'Q3. 생성된 원고를 업로드할 블로그 계정을 선택할 수 있나요?',

                content:
                  '네. 원고 생성 후 바로 배포할 블로그 계정을 선택할 수 있습니다. 최적화된 고품질 원고를 업로드해 상위노출 가능성을 더욱 높여보세요.',
              },
              {
                label: 'Q4. BloC(블록)은 어떤 기능을 사용할 때 차감되나요?',

                content:
                  '원고 생성, 배포 등 핵심 기능을 사용할 때 BloC이 차감됩니다. 부족할 경우 언제든 추가 충전하여 사용할 수 있습니다.',
              },
              {
                label: 'Q5. 배포 후 순위 추적은 어떻게 진행되나요?',

                content:
                  '게시 즉시 자동으로 추적이 시작되며, 설정한 키워드를 기준으로 매일 순위 변화를 기록하고 최대 30일간 누적 데이터를 제공합니다.',
              },
            ]"
            :key="item.label"
          >
            <FaqItem
              :label="item.label"
              :description="item.content"
              :default-open="item.defaultOpen"
            />
          </li>
        </ul>
      </div>
    </section>

    <!-- Final CTA Section -->
    <section
      class="py-[120px]"
      :style="{
        background: `url('/cta_bg.png') center center no-repeat`,
        backgroundSize: 'cover',
      }"
    >
      <div class="container mx-auto max-w-7xl">
        <div class="flex items-center justify-center gap-1.5 mb-5">
          <h3 class="text-[21px] font-bold text-[#7FB3FF]">BlogMine</h3>
          <NuxtImg src="/icon_logo2.png" alt="" />
        </div>
        <h2 class="text-[40px] font-bold text-white text-center mb-12">
          지금, 블로그마인으로
          <br />
          블로그 상위 노출을 시작해보세요
        </h2>

        <div class="w-[238px] mx-auto">
          <UButton
            to="/auth/register"
            size="xl"
            class="dark py-4"
            block
            color="neutral"
          >
            지금 바로 시작하기
            <UIcon name="i-heroicons-chevron-right-16-solid" size="20" />
          </UButton>
        </div>
      </div>
    </section>
  </div>
</template>
