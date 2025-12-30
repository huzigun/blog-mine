<script lang="ts" setup>
import {
  createDeployOrderSchema,
  type DeployOrderSchema,
} from '~/schemas/order';

interface DeployProduct {
  id: number;
  itemId: number;
  name: string;
  tag: string;
  credit: number;
  description: string | null;
  features: string[];
  sortOrder: number;
  isActive: boolean;
}

const props = defineProps<{
  blogPostId: number;
  totalPostCount: number;
}>();

const emit = defineEmits<{ close: [boolean] }>();

const toast = useToast();
const authStore = useAuth();
const [isPending, startTransition] = useTransition();

// Zod 스키마 생성 (동적 maxPostCount 적용)
const deployOrderSchema = computed(() =>
  createDeployOrderSchema(props.totalPostCount),
);

// 오늘 날짜를 YYYYMMDD 형식으로 반환
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// 폼 상태 (신청 정보 입력 필드)
const formState = reactive<DeployOrderSchema>({
  deployTitle: `${getTodayString()} 배포신청`,
  companyName: '',
  applicantPhone: '',
  applicantEmail: '',
  dailyUploadCount: props.totalPostCount <= 10 ? props.totalPostCount : 10,
});

// UForm ref (폼 검증용)
const formRef = ref<{ validate: () => Promise<boolean> } | null>(null);

// 배포 상품 목록 조회
const products = ref<DeployProduct[]>([]);
const isLoadingProducts = ref(true);

onMounted(async () => {
  try {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
    products.value = await useApi<DeployProduct[]>('/deploy-products');
  } catch (err: any) {
    toast.add({
      title: '상품 목록 조회 실패',
      description: err.message || '배포 상품 목록을 가져오는데 실패했습니다.',
      color: 'error',
    });
  } finally {
    isLoadingProducts.value = false;
  }
});

// 보유 크레딧
const currentCredits = computed(
  () => authStore.creditBalance?.totalCredits ?? 0,
);

// 상품 선택 상태
const selectedProductId = ref<number | null>(null);

// 하루 배포 건수 최대값 (총 원고 수를 초과할 수 없음)
const maxDailyUploadCount = computed(() => props.totalPostCount);

// 예상 배포 일수
const estimatedDays = computed(() => {
  if (formState.dailyUploadCount <= 0) return 0;
  return Math.ceil(props.totalPostCount / formState.dailyUploadCount);
});

// 파일 업로드 상태
const uploadedFile = ref<File | null>(null);
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// 선택된 상품 정보
const selectedProduct = computed(() =>
  products.value.find((p) => p.id === selectedProductId.value),
);

// 예상 차감 BloC (상품 단가 x 배포할 원고 수)
const estimatedCost = computed(() => {
  if (!selectedProduct.value) return 0;
  return selectedProduct.value.credit * props.totalPostCount;
});

// 크레딧 부족 여부
const isInsufficientCredits = computed(
  () => estimatedCost.value > currentCredits.value,
);

// 크레딧 충전 페이지로 이동
const goToChargeCredits = () => {
  emit('close', false);
  navigateTo('/mypage/credits');
};

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

// 폼 검증 함수 (UForm의 validate 메서드 사용)
const validateForm = async (): Promise<boolean> => {
  if (!formRef.value) return false;
  try {
    await formRef.value.validate();
    return true;
  } catch {
    toast.add({
      title: '입력 오류',
      description: '입력 정보를 확인해주세요.',
      color: 'error',
    });
    return false;
  }
};

// 필수 입력 필드 검증 (UI용 간단 체크)
const isRequiredFieldsFilled = computed(() => {
  return (
    formState.companyName.trim().length > 0 &&
    formState.applicantPhone.trim().length > 0 &&
    formState.applicantEmail.trim().length > 0 &&
    formState.deployTitle.trim().length >= 3
  );
});

// 제출 가능 여부
const canSubmit = computed(
  () =>
    selectedProductId.value !== null &&
    formState.dailyUploadCount >= 1 &&
    formState.dailyUploadCount <= maxDailyUploadCount.value &&
    !isFileSizeOverLimit.value &&
    !isInsufficientCredits.value &&
    isRequiredFieldsFilled.value,
);

// 배포 요청 제출
const handleSubmit = async () => {
  if (!canSubmit.value || !selectedProduct.value) return;

  // Zod 스키마 검증 (UForm validate 사용)
  const isValid = await validateForm();
  if (!isValid) return;

  startTransition(async () => {
    try {
      // FormData 생성 (파일 업로드 지원)
      const formData = new FormData();
      formData.append('productId', String(selectedProduct.value!.id));
      formData.append('companyName', formState.companyName.trim());
      formData.append('applicantPhone', formState.applicantPhone.trim());
      formData.append('applicantEmail', formState.applicantEmail.trim());
      formData.append('deployTitle', formState.deployTitle.trim());
      formData.append('dailyUploadCount', String(formState.dailyUploadCount));

      // 첨부파일이 있으면 추가
      if (uploadedFile.value) {
        formData.append('attachmentFile', uploadedFile.value);
      }

      // 새로운 배포 API 호출
      const result = await useApi<{
        success: boolean;
        blogPostId: number;
        helloPostNo?: number;
        creditUsed: number;
        message: string;
      }>(`/blog-posts/${props.blogPostId}/deploy`, {
        method: 'POST',
        body: formData,
      });

      // 크레딧 잔액 갱신 (유저 정보 새로고침)
      await authStore.fetchUser();

      toast.add({
        title: '배포 요청 완료',
        description: `${result.creditUsed} BloC이 차감되었습니다. (배포번호: ${result.helloPostNo})`,
        color: 'success',
      });

      emit('close', true);
    } catch (err: any) {
      toast.add({
        title: '배포 요청 실패',
        description: err.message || '배포 요청 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
};
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }" class="sm:max-w-2xl">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-rocket-launch" class="w-5 h-5 text-primary" />
        <span class="font-bold">원고 배포 요청</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- 원고 정보 -->
        <div
          class="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-600 dark:text-neutral-400"
        >
          <span>배포할 원고:</span>
          <span class="font-semibold text-neutral-900 dark:text-white">
            {{ totalPostCount }}건
          </span>
        </div>

        <!-- 배포 상품 선택 -->
        <div>
          <h3
            class="text-sm font-semibold text-neutral-900 dark:text-white mb-3"
          >
            배포 상품 선택
          </h3>

          <!-- 스켈레톤 로딩 UI -->
          <div v-if="isLoadingProducts" class="grid grid-cols-2 gap-2">
            <div
              v-for="i in 4"
              :key="i"
              class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <div class="flex items-start justify-between mb-2">
                <USkeleton class="h-5 w-16 rounded" />
                <USkeleton class="h-4 w-12 rounded" />
              </div>
              <USkeleton class="h-5 w-24 mb-2 rounded" />
              <div class="space-y-1">
                <USkeleton class="h-3 w-full rounded" />
                <USkeleton class="h-3 w-3/4 rounded" />
              </div>
            </div>
          </div>

          <!-- 상품 목록 -->
          <div
            v-else-if="products.length > 0"
            class="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1"
          >
            <div
              v-for="product in products"
              :key="product.id"
              class="p-3 rounded-lg border cursor-pointer transition-all"
              :class="
                selectedProductId === product.id
                  ? 'border-primary bg-primary-50 dark:bg-primary-950/30'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50'
              "
              @click="selectedProductId = product.id"
            >
              <div class="flex items-start justify-between mb-1">
                <UBadge color="neutral" variant="soft" size="xs">
                  {{ product.tag }}
                </UBadge>
                <span class="text-xs font-semibold text-primary">
                  {{ product.credit }} BloC
                </span>
              </div>
              <h4
                class="font-semibold text-sm text-neutral-900 dark:text-white mb-1"
              >
                {{ product.name }}
              </h4>
              <ul class="text-xs text-neutral-500 space-y-0.5">
                <li v-for="(feature, idx) in product.features" :key="idx">
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 상품 없음 -->
          <div v-else class="text-center py-8 text-neutral-500">
            <UIcon
              name="i-heroicons-cube"
              class="w-8 h-8 mx-auto mb-2 opacity-50"
            />
            <p class="text-sm">등록된 배포 상품이 없습니다.</p>
          </div>

          <!-- 예상 차감 BloC 표시 (상품 선택 시) -->
          <div
            v-if="selectedProduct"
            class="mt-3 p-3 rounded-lg"
            :class="
              isInsufficientCredits
                ? 'bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-800'
                : 'bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800'
            "
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  예상 차감 BloC
                </p>
                <p
                  class="text-lg font-bold"
                  :class="
                    isInsufficientCredits
                      ? 'text-error-600 dark:text-error-400'
                      : 'text-primary-600 dark:text-primary-400'
                  "
                >
                  {{ estimatedCost.toLocaleString() }} BloC
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-neutral-500">보유 BloC</p>
                <p
                  class="text-sm font-semibold"
                  :class="
                    isInsufficientCredits
                      ? 'text-error-600 dark:text-error-400'
                      : 'text-neutral-900 dark:text-white'
                  "
                >
                  {{ currentCredits.toLocaleString() }} BloC
                </p>
              </div>
            </div>

            <!-- 크레딧 부족 경고 -->
            <div
              v-if="isInsufficientCredits"
              class="mt-3 pt-3 border-t border-error-200 dark:border-error-700"
            >
              <div
                class="flex items-center gap-2 text-error-600 dark:text-error-400 mb-2"
              >
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-4 h-4"
                />
                <span class="text-sm font-medium">
                  BloC이
                  {{ (estimatedCost - currentCredits).toLocaleString() }}
                  부족합니다
                </span>
              </div>
              <UButton
                color="primary"
                variant="soft"
                size="sm"
                block
                @click="goToChargeCredits"
              >
                <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 mr-1" />
                BloC 충전하기
              </UButton>
            </div>
          </div>
        </div>

        <!-- 신청 정보 입력 (UForm으로 실시간 검증) -->
        <UForm
          ref="formRef"
          :schema="deployOrderSchema"
          :state="formState"
          class="space-y-4"
        >
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">
            신청 정보
          </h3>

          <div class="grid grid-cols-2 gap-x-3 gap-y-4">
            <!-- 배포 제목 -->
            <UFormField
              label="배포 제목"
              name="deployTitle"
              required
              class="col-span-1"
            >
              <UInput
                v-model="formState.deployTitle"
                placeholder="예: 20241230 배포신청"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <!-- 업체명 -->
            <UFormField
              label="업체명"
              name="companyName"
              required
              class="col-span-1"
            >
              <UInput
                v-model="formState.companyName"
                placeholder="성명/업체명을 입력해주세요"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- 연락처 -->
            <UFormField
              label="연락처"
              name="applicantPhone"
              required
              description="이미지/가이드에 궁금한점이 있는 경우 연락드리는 번호입니다."
              class="col-span-2"
              :ui="{
                description: 'text-xs',
              }"
            >
              <UInput
                v-model="formState.applicantPhone"
                type="tel"
                placeholder="010-0000-0000"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- 이메일 -->
            <UFormField
              label="이메일"
              name="applicantEmail"
              required
              description="이미지 수신 여부 및 광고시작, 광고종료 안내 메일 발송에 사용됩니다."
              :ui="{
                description: 'text-xs',
              }"
              class="col-span-2"
            >
              <UInput
                v-model="formState.applicantEmail"
                type="email"
                placeholder="example@email.com"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>
          <!-- 하루 배포 건수 -->
          <UFormField
            label="하루 배포 건수"
            name="dailyUploadCount"
            :description="`자연스러운 노출을 위해 하루 배포 건수를 제한하면 여러 날에 걸쳐 순차적으로 배포됩니다. (최대 ${maxDailyUploadCount}건)`"
          >
            <div class="flex items-center gap-3">
              <UInput
                v-model.number="formState.dailyUploadCount"
                type="number"
                :min="1"
                :max="maxDailyUploadCount"
                placeholder="10"
                size="lg"
                class="w-32"
              />
              <span class="text-sm text-neutral-500">건/일</span>
              <span
                v-if="estimatedDays > 1"
                class="text-xs text-primary-600 dark:text-primary-400"
              >
                (약 {{ estimatedDays }}일 소요)
              </span>
            </div>
          </UFormField>
        </UForm>

        <!-- 자료 첨부파일 -->
        <div>
          <h3
            class="text-sm font-semibold text-neutral-900 dark:text-white mb-2"
          >
            자료 첨부파일
            <span class="text-neutral-400 font-normal">(선택)</span>
          </h3>

          <!-- 업로드 영역 -->
          <label
            v-if="!uploadedFile"
            class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-neutral-300 dark:border-neutral-700 hover:border-primary/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
          >
            <div class="flex flex-col items-center justify-center">
              <UIcon
                name="i-heroicons-cloud-arrow-up"
                class="w-6 h-6 text-neutral-400 mb-1"
              />
              <p class="text-xs text-neutral-500">
                <span class="font-semibold text-primary">클릭</span>
                하여 ZIP 파일 업로드
              </p>
              <p class="text-xs text-neutral-400 mt-0.5">최대 500MB</p>
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
            class="p-3 rounded-lg border"
            :class="
              isFileSizeOverLimit
                ? 'bg-error-50 dark:bg-error-950/20 border-error-300 dark:border-error-700'
                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
            "
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-archive-box"
                  class="w-5 h-5"
                  :class="
                    isFileSizeOverLimit ? 'text-error-600' : 'text-primary-600'
                  "
                />
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
                  </p>
                </div>
              </div>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                @click="removeFile"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          block
          @click="emit('close', false)"
          :disabled="isPending"
        >
          취소
        </UButton>
        <UButton
          color="primary"
          size="lg"
          block
          :loading="isPending"
          :disabled="!canSubmit"
          @click="handleSubmit"
          icon="i-heroicons-rocket-launch"
        >
          배포 요청
        </UButton>
      </div>
    </template>
  </UModal>
</template>
