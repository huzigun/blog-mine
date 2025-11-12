<script setup lang="ts">
interface DateValue {
  year: number;
  month: number;
  day: number;
}

interface DateRange {
  start: DateValue;
  end: DateValue;
}

interface Props {
  modelValue?: { start: string | null; end: string | null };
  placeholder?: string;
  numberOfMonths?: number;
  variant?: 'solid' | 'outline' | 'soft' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '기간 선택',
  numberOfMonths: 2,
  variant: 'subtle',
  size: 'sm',
});

const emit = defineEmits<{
  'update:modelValue': [value: { start: string | null; end: string | null }];
}>();

// Date range picker state
const dateRange = ref<any>(undefined);
const isOpen = ref(false);

// Date range 변경 시 emit
const handleDateRangeChange = (newRange: any) => {
  // Range가 완전히 선택되었을 때만 처리
  if (newRange?.start && newRange?.end) {
    // DateValue를 직접 YYYY-MM-DD 형식으로 변환 (UTC 변환 없이)
    const startStr = `${newRange.start.year}-${String(newRange.start.month).padStart(2, '0')}-${String(newRange.start.day).padStart(2, '0')}`;
    const endStr = `${newRange.end.year}-${String(newRange.end.month).padStart(2, '0')}-${String(newRange.end.day).padStart(2, '0')}`;

    emit('update:modelValue', {
      start: startStr,
      end: endStr,
    });

    // 완전한 range 선택 후에만 popover 닫기
    isOpen.value = false;
  }
};

// Date range 초기화
watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue?.start || !newValue?.end) {
      dateRange.value = undefined;
    }
  },
);

// Date range 표시 텍스트
const dateRangeText = computed(() => {
  if (!dateRange.value?.start || !dateRange.value?.end) {
    return props.placeholder;
  }
  const startDate = new Date(
    dateRange.value.start.year,
    dateRange.value.start.month - 1,
    dateRange.value.start.day,
  );
  const endDate = new Date(
    dateRange.value.end.year,
    dateRange.value.end.month - 1,
    dateRange.value.end.day,
  );
  const startStr = startDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const endStr = endDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${startStr} ~ ${endStr}`;
});
</script>

<template>
  <UPopover v-model:open="isOpen" :content="{ align: 'start' }">
    <template #default>
      <UButton
        variant="outline"
        color="neutral"
        block
        :label="dateRangeText"
        icon="i-heroicons-calendar-days"
        trailing-icon="i-heroicons-chevron-down"
      />
    </template>
    <template #content>
      <div class="p-2.5">
        <UCalendar
          v-model="dateRange"
          range
          :variant="variant"
          :size="size"
          :number-of-months="numberOfMonths"
          @update:model-value="handleDateRangeChange"
        />
      </div>
    </template>
  </UPopover>
</template>
