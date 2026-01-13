<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <PostCreateForm
    post-type="일반 후기"
    page-title="일반 후기 원고 생성"
    page-description="다양한 서비스나 장소에 대한 경험과 느낌을 공유하는 블로그 원고를 생성합니다."
    category="review"
    api-type="general-review"
    requires-related-url
  />
</template>
