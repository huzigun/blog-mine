<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui';
import { orderSchema, postProducts, type OrderSchema } from '~/schemas/order';
const OrderDone = defineAsyncComponent(
  () => import('~/components/order/done.vue'),
);

definePageMeta({
  middleware: 'auth',
});

const route = useRoute();
const toast = useToast();
const auth = useAuth();
const overlay = useOverlay();
const orderDoneModal = overlay.create(OrderDone);

// 원고 작성 신청 ID
const requestId = computed(() => route.params.id as string);

// 해당 원고 작성 신청 정보 조회
const { data: blogPost, status: fetchStatus } = await useApiFetch<BlogPost>(
  `/blog-posts/${requestId.value}`,
  {
    method: 'GET',
    lazy: true,
  },
);

const [isPending, startTransition] = useTransition();
const mainForm = useTemplateRef('mainForm');

// 총 생성된 원고 수
const totalPostCount = computed(() => blogPost.value?.posts?.length || 0);

// 상품별 배포 수량 상태
const productQuantities = reactive<Record<string, number>>(
  Object.fromEntries(postProducts.map((p) => [p.id, 0])),
);

// 총 배포 수량
const totalDistributionCount = computed(() =>
  Object.values(productQuantities).reduce((sum, qty) => sum + qty, 0),
);

// 총 배포 수량 초과 여부
const isOverLimit = computed(
  () => totalDistributionCount.value > totalPostCount.value,
);

// 총 크레딧 계산
const totalCredits = computed(() =>
  postProducts.reduce(
    (sum, product) =>
      sum + product.credit * (productQuantities[product.id] || 0),
    0,
  ),
);

// 현재 보유 크레딧
const currentCredits = computed(() => auth.creditBalance?.totalCredits ?? 0);

// 크레딧 부족 여부
const isInsufficientCredits = computed(
  () => totalCredits.value > currentCredits.value,
);

// 폼 상태
const state = reactive<OrderSchema>({
  companyName: '',
  naverMapUrl: '',
  requiredContent: '',
  applicantName: auth.user?.name || '',
  applicantPhone: '',
  applicantEmail: auth.user?.email || '',
  dailyUploadCount: 1,
  productDistributions: [],
  adGuidelineAgreement: false,
});

// 파일 업로드 상태 (ZIP 파일)
const uploadedFile = ref<File | null>(null);

// 파일 업로드 제한 상수
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// ZIP 파일 검증 함수
const isZipFile = (file: File): boolean => {
  const validMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
  ];
  const validExtension = file.name.toLowerCase().endsWith('.zip');
  return validMimeTypes.includes(file.type) || validExtension;
};

// 파일 크기 초과 여부
const isFileSizeOverLimit = computed(
  () => !!uploadedFile.value && uploadedFile.value.size > MAX_FILE_SIZE,
);

// 파일 선택 핸들러
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];

    if (!file) return;

    // ZIP 파일 검증
    if (!isZipFile(file)) {
      toast.add({
        title: '파일 형식 오류',
        description: 'ZIP 파일만 업로드 가능합니다.',
        color: 'error',
      });
      target.value = '';
      return;
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      toast.add({
        title: '파일 크기 초과',
        description: 'ZIP 파일은 500MB 이하만 업로드 가능합니다.',
        color: 'error',
      });
      target.value = '';
      return;
    }

    uploadedFile.value = file;
  }
  // input 초기화 (같은 파일 재선택 가능하도록)
  target.value = '';
};

// 파일 삭제
const removeFile = () => {
  uploadedFile.value = null;
};

// 파일 크기 포맷
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 폼 제출
const onSubmit = async (event: FormSubmitEvent<OrderSchema>) => {
  // 배포 수량 초과 검사
  if (isOverLimit.value) {
    toast.add({
      title: '배포 수량 초과',
      description: `총 배포 수량(${totalDistributionCount.value}개)이 생성된 원고 수(${totalPostCount.value}개)를 초과할 수 없습니다.`,
      color: 'error',
    });
    return;
  }

  // 최소 1개 이상 배포 수량 검사
  if (totalDistributionCount.value <= 0) {
    toast.add({
      title: '배포 수량 필요',
      description: '총 배포 수량은 1건 이상이어야 합니다.',
      color: 'error',
    });
    return;
  }

  startTransition(async () => {
    try {
      // 상품별 배포 수량 업데이트
      state.productDistributions = postProducts
        .filter((p) => (productQuantities[p.id] ?? 0) > 0)
        .map((p) => ({
          productId: p.id,
          quantity: productQuantities[p.id] ?? 0,
        }));

      // FormData 생성 (파일 포함)
      const formData = new FormData();
      formData.append('requestId', requestId.value);
      formData.append('companyName', event.data.companyName);
      formData.append('naverMapUrl', event.data.naverMapUrl || '');
      formData.append('requiredContent', event.data.requiredContent);
      formData.append('applicantName', event.data.applicantName);
      formData.append('applicantPhone', event.data.applicantPhone);
      formData.append('applicantEmail', event.data.applicantEmail);
      formData.append('dailyUploadCount', String(event.data.dailyUploadCount));
      formData.append(
        'productDistributions',
        JSON.stringify(state.productDistributions),
      );
      formData.append(
        'adGuidelineAgreement',
        String(event.data.adGuidelineAgreement),
      );

      // ZIP 파일 추가
      const file = uploadedFile.value;
      if (file) {
        formData.append('file', file);
      }

      await useApi('/blog-posts/order', {
        method: 'POST',
        body: formData,
      });

      // 배포 신청 완료 모달 표시
      const instance = orderDoneModal.open({
        requestId: requestId.value,
      });

      const action = (await instance.result) as 'status' | 'new';

      if (action === 'status') {
        // 현재 원고 생성 상세보기 (배포 진행상황)
        await navigateTo(`/console/workspace/${requestId.value}`);
      } else {
        // 새 원고 만들기
        await navigateTo('/console/ai-post');
      }
    } catch (err: any) {
      toast.add({
        title: '배포 신청 실패',
        description: err.message || '배포 신청 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
};
</script>

<template>
  <SubscriptionGuard>
    <section class="container mx-auto max-w-3xl">
      <ConsoleTitle
        title="원고 배포 신청"
        description="생성된 원고를 블로그에 배포합니다."
      />

      <!-- 로딩 상태 -->
      <div v-if="fetchStatus === 'pending'" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 text-primary-600 animate-spin"
        />
      </div>

      <!-- 원고 정보 요약 카드 -->
      <BlogPostSummaryCard
        v-else-if="blogPost"
        :blog-post="blogPost"
        compact
        class="mb-6"
      />

      <!-- 배포 신청 폼 -->
      <UForm
        ref="mainForm"
        :state="state"
        :schema="orderSchema"
        @submit="onSubmit"
        class="space-y-6"
      >
        <!-- 업체 정보 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-building-office"
                class="w-5 h-5 text-primary-600"
              />
              <h3 class="font-bold text-neutral-900 dark:text-white">
                업체 정보
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="업체명" name="companyName" required>
              <UInput
                v-model="state.companyName"
                placeholder="배포될 블로그의 업체명을 입력해주세요"
                size="lg"
                variant="soft"
                class="w-full"
              />
            </UFormField>

            <UFormField label="네이버 지도 URL" name="naverMapUrl">
              <UInput
                v-model="state.naverMapUrl"
                placeholder="https://map.naver.com/... 또는 https://naver.me/..."
                size="lg"
                variant="soft"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-neutral-500">
                  네이버 지도에서 업체를 검색 후 공유 링크를 입력해주세요
                </span>
              </template>
            </UFormField>

            <UFormField label="필수 포함 내용" name="requiredContent" required>
              <UTextarea
                v-model="state.requiredContent"
                placeholder="원고에 반드시 포함되어야 하는 내용을 입력해주세요 (예: 연락처, 주소, 영업시간, 특별 안내사항 등)"
                :rows="5"
                size="lg"
                variant="soft"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-neutral-500">
                  {{ state.requiredContent.length }} / 2000자
                </span>
              </template>
            </UFormField>

            <!-- 광고 심사지침 동의 (선택) -->
            <UFormField name="adGuidelineAgreement">
              <div class="flex items-start gap-3">
                <UCheckbox
                  v-model="state.adGuidelineAgreement"
                  name="adGuidelineAgreement"
                />
                <div>
                  <label
                    class="text-sm font-medium text-neutral-900 dark:text-white cursor-pointer"
                    @click="
                      state.adGuidelineAgreement = !state.adGuidelineAgreement
                    "
                  >
                    추천·보증 등에 관한 표시·광고 심사지침 동의
                    <span class="text-neutral-400 text-xs">(선택)</span>
                  </label>
                  <p class="text-xs text-neutral-500 mt-1">
                    표시 광고법, 공정 거래 위원회 지침에 따라 포스팅 맨 하단에
                    소정의 문구가 이미지 또는 텍스트 형태로 작성됩니다
                  </p>
                </div>
              </div>
            </UFormField>
          </div>
        </UCard>

        <!-- 신청인 정보 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary-600" />
              <h3 class="font-bold text-neutral-900 dark:text-white">
                신청인 정보
              </h3>
            </div>
          </template>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="이름" name="applicantName" required>
              <UInput
                v-model="state.applicantName"
                placeholder="신청인 이름"
                size="lg"
                variant="soft"
                class="w-full"
              />
            </UFormField>

            <UFormField label="연락처" name="applicantPhone" required>
              <UInput
                v-model="state.applicantPhone"
                placeholder="010-1234-5678"
                size="lg"
                variant="soft"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="이메일"
              name="applicantEmail"
              required
              class="col-span-2"
            >
              <UInput
                v-model="state.applicantEmail"
                type="email"
                placeholder="email@example.com"
                size="lg"
                variant="soft"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- 압축 파일 업로드 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-archive-box"
                class="w-5 h-5 text-primary-600"
              />
              <h3 class="font-bold text-neutral-900 dark:text-white">
                이미지/동영상 파일
              </h3>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 파일 업로드 안내 -->
            <div
              class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
            >
              <div class="flex gap-2">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                />
                <div class="text-sm text-amber-800 dark:text-amber-200">
                  <p class="font-semibold mb-2">📌 파일 업로드 안내</p>
                  <ul class="space-y-1 text-xs">
                    <li>
                      • 이미지 또는 동영상 파일은 총 500MB 이하로 압축한 1개의
                      파일만 업로드해 주세요
                    </li>
                    <li>
                      • 업로드된 파일은 별도 수정 없이 담당자에게 그대로
                      전달됩니다
                    </li>
                    <li>
                      • 동영상(1분 미만) 은 최대 5개까지 업로드 가능하며, 이 중
                      1개가 담당자에 의해 랜덤으로 선택되어 등록됩니다
                    </li>
                    <li class="text-red-600">
                      • 이미지가 중복되면 신청이 누락될 수 있으니, 업로드 전
                      반드시 파일을 확인해 주세요.
                    </li>
                    <li>
                      • 사전 동의 없는 인물 사진이나 저작권이 있는 이미지는
                      반드시
                      <strong>모자이크 처리</strong>
                      후 업로드해 주세요
                    </li>
                    <li class="text-amber-600">
                      ⚠️ 초상권 및 저작권 관련 모든 법적 책임은 배포 신청자에게
                      있습니다
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 업로드 영역 -->
            <label
              v-if="!uploadedFile"
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-neutral-300 dark:border-neutral-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <UIcon
                  name="i-heroicons-cloud-arrow-up"
                  class="w-8 h-8 text-neutral-400 mb-2"
                />
                <p class="text-sm text-neutral-500">
                  <span class="font-semibold text-primary-600">클릭</span>
                  하여 ZIP 파일을 선택하거나 드래그하여 업로드
                </p>
                <p class="text-xs text-neutral-400 mt-1">
                  ZIP 파일만 업로드 가능
                </p>
              </div>
              <input
                type="file"
                class="hidden"
                accept=".zip,application/zip,application/x-zip-compressed"
                @change="handleFileChange"
              />
            </label>

            <!-- 업로드된 파일 표시 -->
            <div
              v-if="uploadedFile"
              class="p-4 rounded-xl border"
              :class="
                isFileSizeOverLimit
                  ? 'bg-error-50 dark:bg-error-950/20 border-error-300 dark:border-error-700'
                  : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
              "
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="p-2 rounded-lg"
                    :class="
                      isFileSizeOverLimit
                        ? 'bg-error-100 dark:bg-error-900/30'
                        : 'bg-primary-100 dark:bg-primary-900/30'
                    "
                  >
                    <UIcon
                      name="i-heroicons-archive-box"
                      class="w-6 h-6"
                      :class="
                        isFileSizeOverLimit
                          ? 'text-error-600'
                          : 'text-primary-600'
                      "
                    />
                  </div>
                  <div>
                    <p
                      class="text-sm font-medium text-neutral-900 dark:text-white"
                    >
                      {{ uploadedFile.name }}
                    </p>
                    <p
                      class="text-xs"
                      :class="
                        isFileSizeOverLimit
                          ? 'text-error-600 font-semibold'
                          : 'text-neutral-500'
                      "
                    >
                      {{ formatFileSize(uploadedFile.size) }}
                      <span v-if="isFileSizeOverLimit">/ 500MB 초과</span>
                    </p>
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-x-mark"
                  @click="removeFile"
                />
              </div>
              <!-- 파일 크기 초과 에러 메시지 -->
              <div
                v-if="isFileSizeOverLimit"
                class="mt-3 flex items-center gap-2 text-sm text-error-600"
              >
                <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4" />
                파일 크기가 500MB를 초과했습니다. 다른 파일을 선택해 주세요.
              </div>
            </div>
          </div>
        </UCard>

        <!-- 배포 상품 선택 -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-shopping-bag"
                  class="w-5 h-5 text-primary-600"
                />
                <h3 class="font-bold text-neutral-900 dark:text-white">
                  배포 상품 선택
                </h3>
              </div>
              <div class="text-sm">
                <span class="text-neutral-500">생성된 원고:</span>
                <span class="ml-1 font-semibold text-primary-600">
                  {{ totalPostCount }}개
                </span>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 상품 카드 목록 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="product in postProducts"
                :key="product.id"
                class="border rounded-xl p-4 transition-all"
                :class="
                  (productQuantities[product.id] ?? 0) > 0
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                    : 'border-neutral-200 dark:border-neutral-700'
                "
              >
                <!-- 상품 태그 -->
                <div class="mb-2">
                  <UBadge color="neutral" variant="soft" size="xs">
                    {{ product.tag }}
                  </UBadge>
                </div>

                <!-- 상품명 및 크레딧 -->
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-bold text-neutral-900 dark:text-white">
                    {{ product.name }}
                  </h4>
                  <span class="text-sm font-semibold text-primary-600">
                    {{ product.credit }} 크레딧/건
                  </span>
                </div>

                <!-- 상품 설명 -->
                <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                  {{ product.description }}
                </p>

                <!-- 상품 특징 -->
                <ul class="text-xs text-neutral-500 space-y-1 mb-4">
                  <li v-for="(feature, idx) in product.features" :key="idx">
                    {{ feature }}
                  </li>
                </ul>

                <!-- 수량 입력 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    배포 수량:
                  </span>
                  <UInput
                    v-model.number="productQuantities[product.id]"
                    type="number"
                    :min="0"
                    :max="totalPostCount"
                    placeholder="0"
                    size="sm"
                    class="w-24"
                  />
                  <span class="text-sm text-neutral-500">건</span>
                </div>
              </div>
            </div>

            <!-- 배포 수량 및 크레딧 요약 -->
            <div
              class="mt-4 rounded-xl overflow-hidden border"
              :class="
                isOverLimit
                  ? 'border-error-300 dark:border-error-700'
                  : 'border-neutral-200 dark:border-neutral-700'
              "
            >
              <!-- 상품별 내역 테이블 -->
              <table class="w-full text-sm">
                <thead class="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th
                      class="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      상품
                    </th>
                    <th
                      class="px-4 py-2 text-center font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      수량
                    </th>
                    <th
                      class="px-4 py-2 text-center font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      단가
                    </th>
                    <th
                      class="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      크레딧
                    </th>
                  </tr>
                </thead>
                <tbody
                  class="divide-y divide-neutral-200 dark:divide-neutral-700"
                >
                  <template v-for="product in postProducts" :key="product.id">
                    <tr
                      v-if="(productQuantities[product.id] ?? 0) > 0"
                      class="bg-white dark:bg-neutral-900"
                    >
                      <td class="px-4 py-2 text-neutral-900 dark:text-white">
                        {{ product.name }}
                      </td>
                      <td
                        class="px-4 py-2 text-center text-neutral-700 dark:text-neutral-300"
                      >
                        {{ productQuantities[product.id] }}건
                      </td>
                      <td class="px-4 py-2 text-center text-neutral-500">
                        {{ product.credit }} BloC
                      </td>
                      <td
                        class="px-4 py-2 text-right font-medium text-neutral-900 dark:text-white"
                      >
                        {{
                          (
                            product.credit *
                            (productQuantities[product.id] ?? 0)
                          ).toLocaleString()
                        }}
                        BloC
                      </td>
                    </tr>
                  </template>
                  <!-- 선택된 상품이 없을 때 -->
                  <tr
                    v-if="totalDistributionCount === 0"
                    class="bg-white dark:bg-neutral-900"
                  >
                    <td
                      colspan="4"
                      class="px-4 py-4 text-center text-neutral-500"
                    >
                      배포할 상품을 선택해주세요
                    </td>
                  </tr>
                </tbody>
                <!-- 합계 -->
                <tfoot
                  class="border-t-2"
                  :class="
                    isOverLimit
                      ? 'border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-950/20'
                      : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800'
                  "
                >
                  <tr>
                    <td
                      class="px-4 py-3 font-semibold text-neutral-900 dark:text-white"
                    >
                      합계
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span
                        class="font-bold"
                        :class="
                          isOverLimit
                            ? 'text-error-600'
                            : 'text-neutral-900 dark:text-white'
                        "
                      >
                        {{ totalDistributionCount }}건
                      </span>
                      <span class="text-neutral-500 text-xs ml-1">
                        / {{ totalPostCount }}건
                      </span>
                    </td>
                    <td class="px-4 py-3"></td>
                    <td class="px-4 py-3 text-right">
                      <span
                        class="font-bold text-lg"
                        :class="
                          isInsufficientCredits
                            ? 'text-error-600'
                            : 'text-primary-600'
                        "
                      >
                        {{ totalCredits.toLocaleString() }} BloC
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- 보유 크레딧 정보 -->
              <div
                class="px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    보유 크레딧
                  </span>
                  <span class="font-semibold text-neutral-900 dark:text-white">
                    {{ currentCredits.toLocaleString() }} BloC
                  </span>
                </div>
                <div
                  v-if="totalDistributionCount > 0"
                  class="flex items-center justify-between mt-1"
                >
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    결제 후 잔액
                  </span>
                  <span
                    class="font-semibold"
                    :class="
                      isInsufficientCredits
                        ? 'text-error-600'
                        : 'text-success-600'
                    "
                  >
                    {{ (currentCredits - totalCredits).toLocaleString() }} BloC
                  </span>
                </div>
              </div>

              <!-- 에러 메시지 -->
              <div
                v-if="isOverLimit"
                class="px-4 py-2 bg-error-100 dark:bg-error-900/30 text-sm text-error-600 dark:text-error-400"
              >
                총 배포 수량이 생성된 원고 수를 초과할 수 없습니다.
              </div>
            </div>

            <!-- 크레딧 부족 안내 카드 -->
            <div
              v-if="isInsufficientCredits && totalDistributionCount > 0"
              class="mt-4 p-4 rounded-xl bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-800"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-5 h-5 text-error-600 shrink-0 mt-0.5"
                />
                <div class="flex-1">
                  <p class="font-semibold text-error-700 dark:text-error-400">
                    크레딧이 부족합니다
                  </p>
                  <p class="text-sm text-error-600 dark:text-error-400 mt-1">
                    배포에 필요한 크레딧이
                    <strong>
                      {{ (totalCredits - currentCredits).toLocaleString() }}
                      BloC
                    </strong>
                    부족합니다. 크레딧을 충전 후 다시 시도해 주세요.
                  </p>
                  <UButton
                    color="error"
                    variant="soft"
                    size="sm"
                    class="mt-3"
                    to="/mypage/credits"
                  >
                    <UIcon
                      name="i-heroicons-plus-circle"
                      class="w-4 h-4 mr-1"
                    />
                    충전하러 가기
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- 배포 설정 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-cog-6-tooth"
                class="w-5 h-5 text-primary-600"
              />
              <h3 class="font-bold text-neutral-900 dark:text-white">
                배포 설정
              </h3>
            </div>
          </template>

          <div class="space-y-6">
            <UFormField
              label="일 업로드 건수"
              name="dailyUploadCount"
              required
              description="하루에 배포될 원고의 수를 입력해주세요"
            >
              <UInput
                v-model.number="state.dailyUploadCount"
                type="number"
                :min="1"
                :max="100"
                placeholder="1"
                size="lg"
                class="w-32"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- 제출 버튼 -->
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            block
            to="/console/workspace"
          >
            취소
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="xl"
            block
            :loading="isPending"
            :disabled="
              isOverLimit ||
              totalDistributionCount <= 0 ||
              isInsufficientCredits ||
              isFileSizeOverLimit
            "
            class="bg-linear-to-r from-purple-600 to-blue-600"
          >
            <UIcon name="i-heroicons-rocket-launch" class="w-5 h-5 mr-2" />
            배포 신청하기
          </UButton>
        </div>
      </UForm>
    </section>
  </SubscriptionGuard>
</template>
