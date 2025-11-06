# Nuxt UI v4 Migration Guide

This document outlines the changes made to migrate from Nuxt UI v2 to v4, particularly focusing on the color system updates.

## Overview

Nuxt UI v4 introduced a new semantic color system that improves consistency and accessibility. The major change is replacing generic colors with semantic color names.

## Color System Changes

### Button Colors (`UButton`)

**Old (v2):**
```vue
<UButton color="gray">Button</UButton>
<UButton color="red">Error</UButton>
<UButton color="green">Success</UButton>
<UButton color="blue">Info</UButton>
<UButton color="yellow">Warning</UButton>
```

**New (v4):**
```vue
<UButton color="neutral">Button</UButton>
<UButton color="error">Error</UButton>
<UButton color="success">Success</UButton>
<UButton color="info">Info</UButton>
<UButton color="warning">Warning</UButton>
```

### Available Colors in v4

| Color | Use Case | Example |
|-------|----------|---------|
| `primary` | Primary actions, main CTAs | Login button, Submit button |
| `secondary` | Secondary actions | Cancel, Back buttons |
| `success` | Success states, confirmations | Success toast, Confirmation button |
| `info` | Informational content | Info toast, Help button |
| `warning` | Warning states | Warning toast, Caution button |
| `error` | Error states, destructive actions | Error toast, Delete button |
| `neutral` | Neutral/gray actions | Secondary links, Subtle buttons |

### Toast Notifications (`useToast`)

**Old (v2):**
```typescript
toast.add({
  title: 'Success',
  color: 'green',
})

toast.add({
  title: 'Error',
  color: 'red',
})
```

**New (v4):**
```typescript
toast.add({
  title: 'Success',
  color: 'success',
})

toast.add({
  title: 'Error',
  color: 'error',
})
```

## Migration Changes Made

### 1. [login.vue](app/pages/login.vue)

**Toast Notifications:**
```typescript
// Before
toast.add({ title: '로그인 성공', color: 'green' })
toast.add({ title: '로그인 실패', color: 'red' })

// After
toast.add({ title: '로그인 성공', color: 'success' })
toast.add({ title: '로그인 실패', color: 'error' })
```

**Button Colors:**
```vue
<!-- Before -->
<UButton color="gray" variant="link">비밀번호 찾기</UButton>

<!-- After -->
<UButton color="neutral" variant="link">비밀번호 찾기</UButton>
```

### 2. [index.vue](app/pages/index.vue)

**Toast Notifications:**
```typescript
// Before
toast.add({ title: '로그아웃', color: 'green' })

// After
toast.add({ title: '로그아웃', color: 'success' })
```

**Button Colors:**
```vue
<!-- Before -->
<UButton color="gray" variant="outline">로그아웃</UButton>

<!-- After -->
<UButton color="neutral" variant="outline">로그아웃</UButton>
```

## Complete Color Mapping

| v2 Color | v4 Color | Context |
|----------|----------|---------|
| `gray` | `neutral` | Neutral/secondary actions |
| `red` | `error` | Error states, destructive actions |
| `green` | `success` | Success states, confirmations |
| `blue` | `info` or `primary` | Info messages or primary actions |
| `yellow` | `warning` | Warning states |

## Benefits of v4 Color System

### 1. Semantic Clarity
Colors now convey meaning rather than just appearance:
```vue
<!-- More semantic -->
<UButton color="error">Delete</UButton>
<UButton color="success">Confirm</UButton>

<!-- Less semantic -->
<UButton color="red">Delete</UButton>
<UButton color="green">Confirm</UButton>
```

### 2. Better Accessibility
Semantic colors allow better theme customization and accessibility support.

### 3. Consistent Design System
Enforces consistent color usage across the application.

### 4. Type Safety
TypeScript provides better autocomplete and type checking:
```typescript
// TypeScript will suggest:
type ButtonColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
```

## Migration Checklist

- [x] Update `UButton` color props from `gray` → `neutral`
- [x] Update toast notifications from `green` → `success`
- [x] Update toast notifications from `red` → `error`
- [x] Verify TypeScript type checking passes
- [x] Test all UI components visually
- [ ] Update any custom CSS using old color classes
- [ ] Update documentation and style guides

## Future Considerations

### Custom Theme Colors

If you need custom colors, define them in your Nuxt UI configuration:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ui: {
    colors: {
      primary: 'blue',
      success: 'green',
      error: 'red',
      warning: 'yellow',
      info: 'sky',
      neutral: 'slate',
    },
  },
})
```

### Component-Specific Color Overrides

For one-off cases, use Tailwind classes instead of color props:

```vue
<UButton class="bg-purple-500 hover:bg-purple-600">
  Custom Color
</UButton>
```

## Resources

- [Nuxt UI v4 Documentation](https://ui.nuxt.com/)
- [Nuxt UI Color System](https://ui.nuxt.com/getting-started/theme)
- [Migration Guide](https://ui.nuxt.com/getting-started/migration)
- [Component API Reference](https://ui.nuxt.com/components)

## Testing

After migration, test the following:

1. **Button States**: Verify all button colors render correctly
2. **Toast Notifications**: Check success, error, warning, and info toasts
3. **Dark Mode**: Ensure colors work in both light and dark themes
4. **Accessibility**: Verify color contrast meets WCAG standards
5. **TypeScript**: Confirm no type errors in IDE

## Rollback Plan

If issues arise, you can temporarily use custom classes:

```vue
<!-- Temporary workaround -->
<UButton class="bg-gray-500 hover:bg-gray-600">
  Gray Button
</UButton>
```

However, it's recommended to use the semantic color system for consistency.
