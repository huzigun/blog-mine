# Validation Guide - Zod Integration

This document describes the validation patterns used in the frontend application with Zod and Nuxt UI.

## Overview

The frontend uses **Zod** for schema validation with **Nuxt UI 4** form components for type-safe, declarative validation.

### Key Benefits

- ✅ **Type Safety**: TypeScript types automatically inferred from Zod schemas
- ✅ **Declarative Validation**: Define validation rules in one place
- ✅ **Reusable Schemas**: Share validation logic across components
- ✅ **Better DX**: Auto-completion and type checking in IDE
- ✅ **Consistent Error Messages**: Centralized error message management

## Installation

Dependencies are already installed in `package.json`:

```json
{
  "dependencies": {
    "zod": "^3.24.0",
    "@vee-validate/zod": "^4.15.1",
    "vee-validate": "^4.15.1"
  }
}
```

## Schema Structure

Schemas are organized by domain in the `app/schemas/` directory:

```
app/schemas/
├── auth.ts      # Authentication-related schemas
├── user.ts      # User profile and settings schemas
└── blog.ts      # Blog post, comment, category schemas
```

## Basic Usage

### 1. Define Schema

Create a Zod schema in the appropriate file:

```typescript
// app/schemas/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string({ required_error: '비밀번호를 입력해주세요' })
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
})

export type LoginSchema = z.infer<typeof loginSchema>
```

### 2. Use in Component

Apply the schema to a Nuxt UI form:

```vue
<script setup lang="ts">
import { loginSchema, type LoginSchema } from '~/schemas/auth'

const state = reactive<LoginSchema>({
  email: '',
  password: '',
})

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  // Form data is validated and typed
  console.log(event.data)
}
</script>

<template>
  <UForm
    :state="state"
    :schema="loginSchema"
    @submit="onSubmit"
  >
    <UFormGroup label="이메일" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormGroup>

    <UFormGroup label="비밀번호" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormGroup>

    <UButton type="submit">로그인</UButton>
  </UForm>
</template>
```

## Available Schemas

### Authentication (`schemas/auth.ts`)

- **`loginSchema`** - User login validation
- **`registerSchema`** - User registration with password confirmation
- **`forgotPasswordSchema`** - Password reset request
- **`resetPasswordSchema`** - New password with confirmation

### User Management (`schemas/user.ts`)

- **`updateProfileSchema`** - Profile information update
- **`changePasswordSchema`** - Password change with current password validation
- **`changeEmailSchema`** - Email change with password confirmation

### Blog (`schemas/blog.ts`)

- **`postSchema`** - Blog post creation/editing
- **`commentSchema`** - Comment creation with optional parent (reply)
- **`categorySchema`** - Category management
- **`tagSchema`** - Tag creation
- **`postFilterSchema`** - Search and filtering with pagination

## Advanced Patterns

### Custom Validation with `.refine()`

```typescript
export const registerSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'], // Error shown on confirmPassword field
})
```

### Regex Validation

```typescript
export const postSchema = z.object({
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'URL slug는 소문자, 숫자, 하이픈만 사용 가능합니다'
    )
    .optional(),
})
```

### Enum Validation

```typescript
export const postFilterSchema = z.object({
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'publishedAt', 'title', 'views'])
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
})
```

### Optional Fields with Defaults

```typescript
export const postSchema = z.object({
  published: z.boolean().default(false),
  tags: z.array(z.string()).max(10).optional(),
})
```

### Array Validation

```typescript
export const postSchema = z.object({
  tags: z
    .array(z.string())
    .max(10, '태그는 최대 10개까지 추가 가능합니다')
    .optional(),
})
```

## Composables

### `useFormValidation()`

Utility composable for advanced validation scenarios:

```typescript
const { validateWithSchema, zodErrorToFormErrors, asyncValidate } = useFormValidation()

// Manual validation
const errors = validateWithSchema(loginSchema, formData)

// Async validation (e.g., check if email exists)
const error = await asyncValidate(async () => {
  const response = await $fetch('/api/check-email', {
    params: { email: state.email }
  })
  if (response.exists) {
    throw new Error('이미 사용 중인 이메일입니다')
  }
})
```

## Common Validation Rules

### Email
```typescript
z.string().email('올바른 이메일 형식이 아닙니다')
```

### URL
```typescript
z.string().url('올바른 URL 형식이 아닙니다')
```

### String Length
```typescript
z.string().min(8, '최소 8자').max(100, '최대 100자')
```

### Password Strength
```typescript
z.string()
  .min(8)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    '대문자, 소문자, 숫자, 특수문자 포함 필요'
  )
```

### Numbers
```typescript
z.number().int().positive()
z.number().min(1).max(100)
```

### Dates
```typescript
z.date()
z.string().datetime() // ISO 8601 string
```

## Error Messages

### Korean Localization

All validation error messages are in Korean:

```typescript
const schema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다'),
})
```

### Custom Error Messages

```typescript
const schema = z.object({
  password: z
    .string()
    .min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다' }),
})
```

## Best Practices

### 1. Co-locate Type Exports

Always export both schema and inferred type:

```typescript
export const loginSchema = z.object({ /* ... */ })
export type LoginSchema = z.infer<typeof loginSchema>
```

### 2. Use Semantic Naming

- Schema: `{domain}Schema` (e.g., `loginSchema`, `postSchema`)
- Type: `{Domain}Schema` (e.g., `LoginSchema`, `PostSchema`)

### 3. Provide Clear Error Messages

Write user-friendly Korean error messages:

```typescript
// ❌ Bad
z.string().min(8)

// ✅ Good
z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다')
```

### 4. Use Optional Carefully

```typescript
// Optional field (can be undefined)
bio: z.string().max(500).optional()

// Required field with default
published: z.boolean().default(false)
```

### 5. Validate at Form Level

Let Nuxt UI handle validation automatically:

```vue
<!-- UForm automatically validates using :schema prop -->
<UForm :state="state" :schema="loginSchema" @submit="onSubmit">
```

## Migration from Manual Validation

### Before (Manual)

```typescript
const validate = (state: LoginForm): FormError[] => {
  const errors: FormError[] = []

  if (!state.email) {
    errors.push({ path: 'email', message: '이메일을 입력해주세요' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    errors.push({ path: 'email', message: '올바른 이메일 형식이 아닙니다' })
  }

  return errors
}
```

### After (Zod)

```typescript
import { loginSchema, type LoginSchema } from '~/schemas/auth'

// Schema automatically handles all validation
const state = reactive<LoginSchema>({
  email: '',
  password: '',
})
```

## Testing Schemas

```typescript
import { describe, it, expect } from 'vitest'
import { loginSchema } from '~/schemas/auth'

describe('loginSchema', () => {
  it('should validate correct data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })

    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['email'])
    }
  })
})
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [Nuxt UI Forms](https://ui.nuxt.com/components/form)
- [VeeValidate](https://vee-validate.logaretm.com/)
- [TypeScript Integration](https://zod.dev/?id=type-inference)
