<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <PostCreateForm
    post-type="제품 후기"
    page-title="제품 후기 원고 생성"
    page-description="실제로 사용한 제품에 대한 경험과 느낌을 공유하는 블로그 원고를 생성합니다."
    category="review"
    api-type="product"
    :requires-product-url="true"
  />
</template>
