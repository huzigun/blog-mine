<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <PostCreateForm
    post-type="법률상식 정보성"
    page-title="법률상식 정보성 원고 생성"
    page-description="법률 관련 상식을 제공하는 블로그 원고를 생성합니다."
    category="info"
    api-type="legal"
    requires-place-url
  />
</template>
