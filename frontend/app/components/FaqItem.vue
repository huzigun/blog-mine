<script lang="ts" setup>
const props = defineProps<{
  label: string;
  description: string;
  defaultOpen?: boolean;
}>();

const open = toRef<boolean>(props.defaultOpen ?? false);
const toggleOpen = () => {
  open.value = !open.value;
};
</script>

<template>
  <div class="border border-[#E2E2E2] rounded-xl p-10">
    <div
      class="text-2xl font-semibold cursor-pointer flex justify-between items-center"
      @click="toggleOpen"
    >
      {{ label }}
      <u-icon
        name="i-heroicons-chevron-down-16-solid transition-all"
        size="30"
        :class="{
          'rotate-180': !open,
        }"
      />
    </div>
    <div class="mt-3 text-xl" v-show="open">
      {{ description }}
    </div>
  </div>
</template>
