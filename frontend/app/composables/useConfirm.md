# useConfirm Composable

사용자에게 확인 모달을 표시하고 선택을 기다리는 커스텀 composable입니다.

## 설치

이미 프로젝트에 포함되어 있습니다:
- `app/composables/useConfirm.ts` - Composable
- `app/components/ConfirmModal.vue` - Modal 컴포넌트

## 기본 사용법

```vue
<script setup>
const confirm = useConfirm();

const handleDelete = async () => {
  const result = await confirm({
    title: '삭제 확인',
    description: '정말 삭제하시겠습니까?',
  });

  if (result) {
    // 사용자가 확인 버튼을 클릭함
    await deleteItem();
  }
};
</script>
```

## API Reference

### Options

```typescript
interface ConfirmOptions {
  title?: string;           // 모달 제목 (기본값: "확인")
  description?: string;     // 모달 설명 (기본값: "이 작업을 수행하시겠습니까?")
  confirmText?: string;     // 확인 버튼 텍스트 (기본값: "확인")
  cancelText?: string;      // 취소 버튼 텍스트 (기본값: "취소")
  confirmColor?: 'primary' | 'error' | 'warning' | 'success'; // 확인 버튼 색상 (기본값: "primary")
  icon?: string;            // Heroicon 아이콘 (기본값: "i-heroicons-question-mark-circle")
}
```

### 반환값

`Promise<boolean>` - 사용자가 확인 버튼을 클릭하면 `true`, 취소하면 `false`

## 사용 예시

### 기본 확인 모달

```typescript
const confirm = useConfirm();

const result = await confirm({
  title: '확인',
  description: '이 작업을 계속하시겠습니까?',
});
```

### 삭제 확인 (Error 색상)

```typescript
const confirmed = await confirm({
  title: '페르소나 삭제',
  description: '정말 이 페르소나를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  confirmText: '삭제',
  cancelText: '취소',
  confirmColor: 'error',
  icon: 'i-heroicons-trash',
});

if (confirmed) {
  await deletePersona();
}
```

### 경고 확인 (Warning 색상)

```typescript
const confirmed = await confirm({
  title: '변경사항 저장',
  description: '저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?',
  confirmText: '저장',
  cancelText: '취소',
  confirmColor: 'warning',
  icon: 'i-heroicons-exclamation-triangle',
});
```

### 성공 확인 (Success 색상)

```typescript
const confirmed = await confirm({
  title: '작업 완료',
  description: '작업이 성공적으로 완료되었습니다. 계속하시겠습니까?',
  confirmText: '계속',
  cancelText: '닫기',
  confirmColor: 'success',
  icon: 'i-heroicons-check-circle',
});
```

### 테이블 행 삭제 예시

```typescript
const columns: ColumnDef<Item>[] = [
  {
    id: 'actions',
    cell: ({ row }) => {
      const handleDelete = async () => {
        const confirmed = await confirm({
          title: '항목 삭제',
          description: '이 항목을 삭제하시겠습니까?',
          confirmText: '삭제',
          confirmColor: 'error',
          icon: 'i-heroicons-trash',
        });

        if (confirmed) {
          await deleteItem(row.original.id);
        }
      };

      return h(UButton, {
        color: 'error',
        onClick: handleDelete,
      }, () => '삭제');
    },
  },
];
```

## 특징

- ✅ **Promise 기반**: async/await 패턴으로 간단한 사용
- ✅ **타입 안전**: TypeScript로 완전히 타입화됨
- ✅ **커스터마이징**: 제목, 설명, 버튼 텍스트, 색상, 아이콘 커스터마이징 가능
- ✅ **Nuxt UI v4 호환**: Nuxt UI v4의 Modal과 useOverlay를 사용
- ✅ **접근성**: 키보드 단축키(ESC) 지원
- ✅ **반응형**: 모바일 친화적인 디자인

## 주의사항

1. **비동기 함수에서 사용**: `useConfirm()`은 Promise를 반환하므로 반드시 `async` 함수 내에서 `await`와 함께 사용해야 합니다.

2. **ESC 키 또는 오버레이 클릭**: 사용자가 ESC 키를 누르거나 모달 외부를 클릭하면 `false`가 반환됩니다.

3. **Heroicons 사용**: 아이콘은 Heroicons에서 제공하는 아이콘을 사용합니다. 형식: `i-heroicons-[icon-name]`

## 관련 문서

- [Nuxt UI Modal](https://ui.nuxt.com/components/modal)
- [Nuxt UI useOverlay](https://ui.nuxt.com/composables/use-overlay)
- [Heroicons](https://heroicons.com/)
