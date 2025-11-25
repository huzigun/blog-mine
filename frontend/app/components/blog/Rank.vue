<script lang="ts" setup>
interface BlogRankHistory {
  rank: number | null;
  dateStr: string;
}

interface BlogInfo {
  id: number;
  link: string;
  title: string;
  bloggerName: string;
  bloggerLink: string;
}

interface RanksResponse {
  trackingId: number;
  keyword: string;
  myBlogUrl: string;
  blog: BlogInfo | null;
  rankHistory: BlogRankHistory[];
  latestRank: number | null;
  rankChange: number | null;
}

interface Props {
  blogId: number;
}
const props = defineProps<Props>();

const { data, pending } = await useApiFetch<RanksResponse>(
  `/keyword-tracking/${props.blogId}/ranks`,
  {
    key: `ranks-${props.blogId}`,
  },
);

// ApexCharts 옵션 계산
const chartOptions = computed(() => {
  if (!data.value?.rankHistory || data.value.rankHistory.length === 0)
    return null;

  // 날짜 기준 오름차순 정렬 (차트는 시간 순서대로 표시)
  const sortedHistory = [...data.value.rankHistory].sort((a, b) =>
    a.dateStr.localeCompare(b.dateStr),
  );

  // null이 아닌 순위만 추출하여 최대값 계산
  const validRanks = sortedHistory
    .map((item) => item.rank)
    .filter((rank): rank is number => rank !== null);
  const maxRank = validRanks.length > 0 ? Math.max(...validRanks) : 10;

  return {
    chart: {
      id: 'rank-chart',
      type: 'line' as const,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
    },
    xaxis: {
      categories: sortedHistory.map((item) => {
        // YYYY-MM-DD에서 MM-DD만 추출
        const [, month, day] = item.dateStr.split('-');
        return `${month}-${day}`;
      }),
      title: {
        text: '날짜',
      },
    },
    yaxis: {
      reversed: true, // 순위는 숫자가 작을수록 좋으므로 Y축 반전
      title: {
        text: '순위',
      },
      min: 1,
      max: maxRank + 5,
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value}위`,
      },
    },
    colors: ['#3B82F6'], // primary color
    dataLabels: {
      enabled: true,
    },
  };
});

const chartSeries = computed(() => {
  if (!data.value?.rankHistory || data.value.rankHistory.length === 0) return [];

  // 날짜 기준 오름차순 정렬
  const sortedHistory = [...data.value.rankHistory].sort((a, b) =>
    a.dateStr.localeCompare(b.dateStr),
  );

  return [
    {
      name: '순위',
      data: sortedHistory.map((item) => item.rank),
    },
  ];
});

onMounted(() => {
  console.log(`On Mounted Rank Modal ${props.blogId}`);
});

onUnmounted(() => {
  console.log('On Unmounted Rank Modal');
});
</script>

<template>
  <UModal class="max-w-[1000px]">
    <template #header="{ close }">
      <div class="w-full flex items-center">
        <template v-if="pending">
          <USkeleton class="h-7 w-48" />
        </template>
        <template v-else>
          <h2 class="text-xl font-semibold">
            {{ data?.keyword }} 순위 추적
          </h2>
        </template>

        <UButton
          @click="close"
          variant="ghost"
          color="neutral"
          square
          icon="i-heroicons-x-mark"
          class="ml-auto"
        />
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <template v-if="pending">
          <!-- 상단: 추적 정보 카드 스켈레톤 -->
          <div class="grid grid-cols-4 gap-3">
            <UCard v-for="i in 4" :key="i">
              <div class="space-y-1">
                <USkeleton class="h-3 w-16" />
                <USkeleton class="h-5 w-20" />
              </div>
            </UCard>
          </div>

          <!-- 하단: 그래프 + 테이블 -->
          <div class="grid grid-cols-2 gap-4">
            <!-- 왼쪽: 그래프 영역 -->
            <div class="space-y-2">
              <USkeleton class="h-4 w-32" />
              <USkeleton class="h-[280px] w-full rounded-lg" />
            </div>

            <!-- 오른쪽: 테이블 영역 -->
            <div class="space-y-2">
              <USkeleton class="h-4 w-28" />
              <div class="space-y-1">
                <div class="flex gap-2 pb-2 border-b">
                  <USkeleton class="h-3 w-20" />
                  <USkeleton class="h-3 w-16 ml-auto" />
                </div>
                <div v-for="i in 7" :key="i" class="flex gap-2 py-1.5">
                  <USkeleton class="h-3 w-20" />
                  <USkeleton class="h-3 w-12 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="data">
          <!-- 상단: 추적 정보 카드들 -->
          <div class="grid grid-cols-4 gap-3">
            <!-- 키워드 카드 -->
            <UCard>
              <div class="space-y-1">
                <div class="text-xs text-neutral-600 dark:text-neutral-400">키워드</div>
                <div class="font-semibold text-sm">{{ data.keyword }}</div>
              </div>
            </UCard>

            <!-- 현재 순위 카드 -->
            <UCard>
              <div class="space-y-1">
                <div class="text-xs text-neutral-600 dark:text-neutral-400">현재 순위</div>
                <div class="font-bold text-lg">
                  {{ data.latestRank ? `${data.latestRank}위` : '순위 없음' }}
                </div>
              </div>
            </UCard>

            <!-- 전일 대비 카드 -->
            <UCard>
              <div class="space-y-1">
                <div class="text-xs text-neutral-600 dark:text-neutral-400">전일 대비</div>
                <div
                  v-if="data.rankChange !== null"
                  :class="[
                    'font-semibold text-sm',
                    data.rankChange > 0
                      ? 'text-success-500'
                      : data.rankChange < 0
                        ? 'text-error-500'
                        : 'text-neutral-500',
                  ]"
                >
                  {{
                    data.rankChange > 0
                      ? `▲ ${data.rankChange}`
                      : data.rankChange < 0
                        ? `▼ ${Math.abs(data.rankChange)}`
                        : '―'
                  }}
                </div>
                <div v-else class="text-sm text-neutral-500">-</div>
              </div>
            </UCard>

            <!-- 블로그 카드 -->
            <UCard>
              <div class="space-y-1">
                <div class="text-xs text-neutral-600 dark:text-neutral-400">블로그</div>
                <a
                  v-if="data.blog"
                  :href="data.blog.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-500 hover:underline truncate block text-sm font-medium"
                >
                  {{ data.blog.bloggerName }}
                </a>
                <div v-else class="text-sm text-neutral-500">-</div>
              </div>
            </UCard>
          </div>

          <!-- 하단: 그래프 + 테이블 -->
          <div class="grid grid-cols-2 gap-4">
            <!-- 왼쪽: 순위 변동 그래프 -->
            <div class="space-y-2">
              <h3 class="text-sm font-semibold">순위 변동 그래프</h3>

              <template v-if="data.rankHistory.length === 0">
                <div
                  class="h-[280px] flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                >
                  <p class="text-sm text-neutral-500">순위 데이터가 없습니다.</p>
                </div>
              </template>
              <template v-else-if="chartOptions && chartSeries">
                <ClientOnly>
                  <VueApexCharts
                    type="line"
                    height="280"
                    :options="chartOptions"
                    :series="chartSeries"
                  />
                  <template #fallback>
                    <div class="h-[280px] flex items-center justify-center">
                      <USkeleton class="h-full w-full rounded-lg" />
                    </div>
                  </template>
                </ClientOnly>
              </template>
            </div>

            <!-- 오른쪽: 순위 히스토리 테이블 -->
            <div class="space-y-2">
              <h3 class="text-sm font-semibold">순위 히스토리</h3>

              <template v-if="data.rankHistory.length === 0">
                <div
                  class="h-[280px] flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                >
                  <p class="text-sm text-neutral-500">순위 데이터가 없습니다.</p>
                </div>
              </template>
              <template v-else>
                <div
                  class="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden"
                >
                  <div class="max-h-[280px] overflow-y-auto">
                    <table class="w-full text-xs">
                      <thead
                        class="bg-neutral-100 dark:bg-neutral-800 sticky top-0 z-10"
                      >
                        <tr>
                          <th class="px-3 py-1.5 text-left font-semibold">날짜</th>
                          <th class="px-3 py-1.5 text-right font-semibold">순위</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(item, index) in data.rankHistory"
                          :key="index"
                          class="border-t border-neutral-200 dark:border-neutral-700"
                        >
                          <td class="px-3 py-1.5">{{ item.dateStr }}</td>
                          <td class="px-3 py-1.5 text-right font-medium">
                            {{ item.rank !== null ? `${item.rank}위` : '-' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
