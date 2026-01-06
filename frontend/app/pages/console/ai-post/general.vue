<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <PostCreateForm
    post-type="일반 키워드 정보성"
    page-title="일반 키워드 정보성 원고 생성"
    page-description="키워드에 대한 정보와 설명을 제공하는 블로그 원고를 생성합니다."
    category="info"
    api-type="general"
  />
</template>
