<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <PostCreateForm
    post-type="병/의원 의료상식 정보성"
    page-title="병/의원 의료상식 정보성 원고 생성"
    page-description="병원 및 의료 관련 상식을 제공하는 블로그 원고를 생성합니다."
    category="info"
    api-type="medical"
  />
</template>
