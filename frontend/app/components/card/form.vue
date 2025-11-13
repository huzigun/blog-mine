<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import {
  cardRegistrationSchema,
  type CardRegistrationForm,
} from '~/schemas/card';

const props = defineProps<{
  existingCardsCount: number;
}>();
const emit = defineEmits<{ close: [boolean] }>();

// hooks
const toast = useToast();
const [isPending, startTransition] = useTransition();

// 카드 추가 폼 상태
const addCardState = reactive<CardRegistrationForm>({
  cardNumber: '',
  expiryDate: '',
  idNo: '',
  cardPw: '',
});

// 카드번호 자동 포맷팅 (XXXX-XXXX-XXXX-XXXX)
function formatCardNumber(value: string) {
  // 숫자만 추출
  const digits = value.replace(/\D/g, '');

  // 최대 16자리까지만 허용
  const limited = digits.slice(0, 16);

  // 4자리씩 하이픈 삽입
  const parts: string[] = [];
  for (let i = 0; i < limited.length; i += 4) {
    parts.push(limited.slice(i, i + 4));
  }

  return parts.join('-');
}

// 카드번호 입력 처리
function handleCardNumberInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const formatted = formatCardNumber(input.value);
  addCardState.cardNumber = formatted;
}

// 유효기간 자동 포맷팅 (MM/YY)
function formatExpiryDate(value: string) {
  // 숫자만 추출
  const digits = value.replace(/\D/g, '');

  // 최대 4자리까지만 허용
  const limited = digits.slice(0, 4);

  // MM/YY 형식으로 포맷팅
  if (limited.length >= 3) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  }

  return limited;
}

// 유효기간 입력 처리
function handleExpiryInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const formatted = formatExpiryDate(input.value);
  addCardState.expiryDate = formatted;
}

// 카드 추가 처리
async function onAddCard(event: FormSubmitEvent<CardRegistrationForm>) {
  // 카드 번호에서 하이픈 및 공백 제거
  const cardNo = event.data.cardNumber.replace(/[\s-]/g, '');

  // 유효기간 파싱 (MM/YY → month, year)
  const [expireMonth = '', expireYear = ''] = event.data.expiryDate.split('/');

  // API 요청 데이터 구성
  const requestData: CreateCardRequest = {
    cardNo,
    expireMonth,
    expireYear,
    idNo: event.data.idNo.replace(/[\s-.]/g, ''), // 포맷팅 문자 제거
    cardPw: event.data.cardPw,
    isDefault: props.existingCardsCount === 0, // 첫 카드는 자동으로 기본 카드
  };
  startTransition(
    async () => {
      // 카드 등록 API 호출
      await useApi('/cards', {
        method: 'POST',
        body: requestData,
      });
    },
    {
      onSuccess: () => {
        toast.add({
          title: '카드 등록 성공',
          description: '새로운 카드가 성공적으로 등록되었습니다.',
          color: 'success',
        });

        // 모달 닫기
        emit('close', true);
      },
      onError: (error: any) => {
        toast.add({
          title: '카드 등록 실패',
          description:
            error.response?._data?.message ||
            error.message ||
            '카드 등록 중 오류가 발생했습니다.',
          color: 'error',
        });
      },
    },
  );
}
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
        >
          <div class="i-heroicons-credit-card text-primary text-xl" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">카드 추가</h3>
          <p class="text-sm text-gray-500">새로운 결제 카드를 등록합니다</p>
        </div>
      </div>
    </template>

    <template #body>
      <UForm
        :state="addCardState"
        :schema="cardRegistrationSchema"
        @submit="onAddCard"
        class="flex flex-col gap-4"
      >
        <UFormField label="카드 번호" name="cardNumber" required>
          <UInput
            :model-value="addCardState.cardNumber"
            @input="handleCardNumberInput"
            placeholder="0000-0000-0000-0000"
            :maxlength="19"
            icon="i-heroicons-credit-card"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="유효기간" name="expiryDate" required>
            <UInput
              :model-value="addCardState.expiryDate"
              @input="handleExpiryInput"
              placeholder="MM/YY"
              :maxlength="5"
              icon="i-heroicons-calendar"
              class="w-full"
            />
          </UFormField>

          <UFormField label="카드 비밀번호 앞 2자리" name="cardPw" required>
            <UInput
              v-model="addCardState.cardPw"
              type="password"
              placeholder="••"
              maxlength="2"
              icon="i-heroicons-lock-closed"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="생년월일 / 사업자번호" name="idNo" required>
          <UInput
            v-model="addCardState.idNo"
            placeholder="생년월일 앞 6자리(YYMMDD) 또는 사업자번호 10자리"
            :maxlength="10"
            icon="i-heroicons-identification"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-start gap-1 px-2 py-3 bg-warning/10 rounded-lg">
          <UIcon name="i-heroicons-information-circle" class="text-warning" />
          <div class="text-xs text-warning-600">
            당사는 실제 카드 번호를 저장하지 않으며,안전하게 암호화되어
            저장됩니다.
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
            color="neutral"
            variant="outline"
            @click="emit('close', true)"
            :disabled="isPending"
          >
            취소
          </UButton>
          <UButton type="submit" :loading="isPending">카드 등록</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
