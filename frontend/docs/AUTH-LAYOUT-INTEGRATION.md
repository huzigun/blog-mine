# Auth Layout Integration

## Overview

Integrated the login page design with the shared `auth.vue` layout to enable consistent styling across all authentication pages.

## Architecture

```
┌─────────────────────────────────────┐
│     layouts/auth.vue                │
│  ┌───────────────────────────────┐  │
│  │ White Background              │  │
│  │ Centered Layout               │  │
│  │ Padding & Spacing             │  │
│  │                               │  │
│  │   ┌───────────────────────┐   │  │
│  │   │                       │   │  │
│  │   │  <slot />             │   │  │
│  │   │  (Page Content)       │   │  │
│  │   │                       │   │  │
│  │   └───────────────────────┘   │  │
│  │                               │  │
│  │   [Customer Support Button]   │  │
│  │   (Fixed Bottom-Right)        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Changes Made

### 1. Updated `layouts/auth.vue`

**File**: [`frontend/app/layouts/auth.vue`](../app/layouts/auth.vue)

**Before**:

```vue
<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <slot />
  </div>
</template>
```

**After**:

```vue
<template>
  <div class="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
    <!-- Main Content (page slot) -->
    <slot />

    <!-- Customer Support Button (Fixed Position) -->
    <button ...>고객센터</button>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()

function handleCustomerSupport() {
  toast.add({
    title: '고객센터',
    description: '준비 중입니다',
    color: 'info',
  })
}
</script>
```

**Key Changes**:

- ✅ White background (`bg-white`) matching Sendon design
- ✅ Centered flexbox layout (`flex flex-col items-center justify-center`)
- ✅ Padding and spacing (`px-4 py-12`)
- ✅ Shared customer support button (fixed position)
- ✅ Dark mode support (`dark:bg-gray-950`)

### 2. Simplified `pages/auth/login.vue`

**File**: [`frontend/app/pages/auth/login.vue`](../app/pages/auth/login.vue)

**Removed**:

- ❌ Duplicate `min-h-screen` wrapper
- ❌ Duplicate background styling
- ❌ Duplicate flexbox layout
- ❌ Duplicate padding
- ❌ Duplicate customer support button

**Kept**:

- ✅ Logo component
- ✅ Page title
- ✅ Form card
- ✅ Footer links
- ✅ Page-specific content only

**Template Structure**:

```vue
<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Page Title -->
  <h1>로그인</h1>

  <!-- Login Card -->
  <div class="bg-gray-50 rounded-2xl p-8">
    <UForm>...</UForm>
  </div>

  <!-- Footer Links -->
  <div>아이디 찾기 | 비밀번호 재설정</div>
</template>
```

### 3. Created `AuthLogo` Component

**File**: [`frontend/app/components/Auth/Logo.vue`](../app/components/Auth/Logo.vue)

**Purpose**: Reusable logo component for all authentication pages

**Usage**:

```vue
<template>
  <AuthLogo class="mb-8" />
</template>
```

**Benefits**:

- ✅ Consistent branding across auth pages
- ✅ Single source of truth for logo
- ✅ Easy to update globally
- ✅ Auto-imported by Nuxt (no import statement needed)

## Layout Hierarchy

### Before Integration

```
pages/auth/login.vue
├── <div class="min-h-screen bg-white ...">
│   ├── Logo
│   ├── Title
│   ├── Form Card
│   ├── Footer Links
│   └── Customer Support Button (fixed)
└── </div>
```

### After Integration

```
layouts/auth.vue
├── <div class="min-h-screen bg-white ...">
│   ├── <slot />
│   │   └── pages/auth/login.vue
│   │       ├── Logo (AuthLogo component)
│   │       ├── Title
│   │       ├── Form Card
│   │       └── Footer Links
│   └── Customer Support Button (fixed)
└── </div>
```

## Benefits of Integration

### 1. DRY Principle (Don't Repeat Yourself)

✅ **Layout styling** defined once in `auth.vue`
✅ **Customer support button** shared across all auth pages
✅ **Background and centering** consistent automatically

### 2. Maintainability

✅ **Single source of truth** for auth layout
✅ **Easy updates** - change layout once, applies everywhere
✅ **Less code duplication** in individual pages

### 3. Consistency

✅ **Uniform styling** across all auth pages (login, signup, password reset)
✅ **Shared components** (logo, customer support)
✅ **Predictable behavior** for users

### 4. Scalability

✅ **Easy to add new auth pages** (just use `layout: 'auth'`)
✅ **Shared features** propagate automatically
✅ **Centralized configuration**

## Usage for New Auth Pages

### Create a New Auth Page

```vue
<!-- pages/auth/signup.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'auth',  // ← Use auth layout
  middleware: ['guest'],
})
</script>

<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Page Title -->
  <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
    회원가입
  </h1>

  <!-- Form Card -->
  <div class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 shadow-sm">
    <!-- Your form content here -->
  </div>

  <!-- Footer Links (optional) -->
  <div class="mt-6">
    <!-- Additional links -->
  </div>
</template>
```

### Automatic Features

When using `layout: 'auth'`, you automatically get:

✅ White centered background
✅ Proper padding and spacing
✅ Customer support button (bottom-right)
✅ Dark mode support
✅ Responsive design
✅ Consistent styling with other auth pages

## Component Structure

### Layout Component

**Location**: `layouts/auth.vue`

**Responsibilities**:

- Page background and theme
- Centering and spacing
- Customer support button
- Dark mode variants

**Not Responsible For**:

- Page-specific content
- Form logic
- Navigation links (page-specific)

### Page Component

**Location**: `pages/auth/login.vue`

**Responsibilities**:

- Page-specific content (logo, title, form)
- Form validation and submission logic
- Page-specific navigation links
- Error handling

**Not Responsible For**:

- Layout wrapper
- Background styling
- Global navigation elements

### Shared Component

**Location**: `components/Auth/Logo.vue`

**Responsibilities**:

- Brand logo display
- Consistent styling

**Usage**:

- Auto-imported as `<AuthLogo />`
- Can accept class props for spacing

## Customization

### Override Layout for Specific Pages

If a page needs different styling:

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'custom',  // Use different layout
})
</script>
```

### Extend Auth Layout

To add page-specific elements while keeping layout:

```vue
<template>
  <AuthLogo class="mb-8" />

  <!-- Page-specific header -->
  <div class="mb-4 text-center text-sm text-gray-600">
    특별 프로모션 진행 중!
  </div>

  <!-- Standard content -->
  <h1>로그인</h1>
  <!-- ... -->
</template>
```

## Dark Mode Support

All layout components support dark mode automatically:

**Layout**:

- Background: `bg-white dark:bg-gray-950`
- Text: Auto-adjusts based on Nuxt UI defaults

**Components**:

- Logo: `text-gray-900 dark:text-white`
- Links: `text-purple-600 dark:text-purple-400`
- Cards: `bg-gray-50 dark:bg-gray-900`

## File Structure

```
frontend/app/
├── layouts/
│   └── auth.vue                    ← Layout wrapper (NEW)
├── components/
│   └── Auth/
│       └── Logo.vue                ← Shared logo (NEW)
└── pages/
    └── auth/
        └── login.vue               ← Simplified page (UPDATED)
```

## Migration Guide

### For Existing Auth Pages

To integrate existing auth pages with the new layout:

1. **Add layout meta**:

   ```vue
   definePageMeta({
     layout: 'auth',
   })
   ```

2. **Remove duplicate wrappers**:

   ```vue
   <!-- Remove this -->
   <div class="min-h-screen bg-white ...">
     <!-- Content -->
   </div>

   <!-- Keep only -->
   <template>
     <!-- Content -->
   </template>
   ```

3. **Remove duplicate elements**:
   - ❌ Remove customer support button
   - ❌ Remove background/centering classes
   - ❌ Remove full-screen wrapper

4. **Use shared components**:
   ```vue
   <!-- Replace inline logo with -->
   <AuthLogo class="mb-8" />
   ```

## Testing

### Visual Testing

**Start development server**:

```bash
pnpm --filter frontend dev
```

**Navigate to**:

```
http://localhost:3001/auth/login
```

**Expected Result**:

- ✅ White centered background
- ✅ Sendon logo at top
- ✅ Login form centered
- ✅ Customer support button (bottom-right)
- ✅ Consistent with reference design

### Test Dark Mode

1. Toggle dark mode in browser
2. Verify all colors adjust properly
3. Check logo, text, and button colors

### Test Responsive Design

1. Resize browser window
2. Test mobile viewport (375px)
3. Test tablet viewport (768px)
4. Test desktop viewport (1024px+)

## Related Documentation

- [Login Page Redesign](./LOGIN-PAGE-REDESIGN.md) - Original design implementation
- [Frontend Auth Store](./AUTH-STORE.md) - Authentication state management
- [Nuxt UI v4 Guide](../NUXT-UI-V4-MIGRATION.md) - Component patterns
