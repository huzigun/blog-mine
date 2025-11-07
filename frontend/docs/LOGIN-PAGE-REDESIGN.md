# Login Page Redesign - Sendon Style

## Overview

Redesigned the login page to match the clean, centered design from https://console.sendon.io/membership/login.

## Design Changes

### Before (Original Design)

**Layout**:
- Card-based layout with header/footer sections
- Gray background (`bg-gray-50`)
- Compact form with standard Nuxt UI styling
- Email/password labels inside UFormGroup components
- "Remember me" checkbox with "Forgot password" link
- Footer with signup link inside card

**Components**:
- UCard with template slots (header, default, footer)
- Standard UInput with icons
- UCheckbox for "remember me"
- UButton with default styling

### After (Sendon-Inspired Design)

**Layout**:
- Clean white background (`bg-white`)
- Centered column layout with all elements vertically stacked
- Logo at top (purple circle with power icon + "sendon" text)
- Large page title: "로그인"
- Form card with light gray background (`bg-gray-50`)
- Footer links below form card
- Certification badge at bottom
- Fixed customer service button (bottom-right)

**Visual Elements**:

1. **Logo Section**
   ```vue
   <div class="mb-8 flex items-center gap-2">
     <div class="w-10 h-10 bg-purple-600 rounded-full">
       <!-- Power icon SVG -->
     </div>
     <span class="text-2xl font-bold">sendon</span>
   </div>
   ```

2. **Page Title**
   ```vue
   <h1 class="text-3xl font-bold mb-8">로그인</h1>
   ```

3. **Form Card**
   - Background: `bg-gray-50` (light gray)
   - Rounded corners: `rounded-2xl`
   - Padding: `p-8`
   - Shadow: `shadow-sm`

4. **Input Fields**
   - Label: "아이디", "비밀번호" (Korean labels)
   - Size: `xl` with custom padding
   - Rounded: `rounded-lg`
   - Light gray placeholders

5. **Signup Link** (inside form)
   - Position: Right-aligned above button
   - Text: "센드온이 처음이신가요? 회원가입"
   - Purple link color

6. **Login Button**
   - Purple-to-blue gradient: `bg-linear-to-r from-purple-600 to-blue-600`
   - Large size: `px-6 py-4`
   - Rounded: `rounded-xl`
   - Font: Semibold

7. **Footer Links**
   - Position: Below form card
   - Links: "아이디 찾기 | 비밀번호 재설정"
   - Gray text with hover effect

8. **Certification Badge**
   - Blue background: `bg-blue-50`
   - Blue check icon in circle
   - Text: "대량문자 전송자격을 인증받은 사업자입니다"

9. **Customer Support Button**
   - Fixed position: `bottom-6 right-6`
   - Purple circle: `bg-purple-600`
   - Phone icon + "고객센터" text
   - Hover scale effect

## Component Structure

```vue
<template>
  <div class="min-h-screen bg-white flex flex-col items-center justify-center">
    <!-- Logo -->
    <div class="mb-8">...</div>

    <!-- Page Title -->
    <h1>로그인</h1>

    <!-- Login Card -->
    <div class="bg-gray-50 rounded-2xl p-8">
      <UForm>
        <!-- Email Field -->
        <UFormGroup label="아이디">
          <UInput ... />
        </UFormGroup>

        <!-- Password Field -->
        <UFormGroup label="비밀번호">
          <UInput ... />
        </UFormGroup>

        <!-- Signup Link -->
        <div>
          센드온이 처음이신가요? <NuxtLink>회원가입</NuxtLink>
        </div>

        <!-- Login Button -->
        <UButton>로그인</UButton>
      </UForm>
    </div>

    <!-- Footer Links -->
    <div>
      아이디 찾기 | 비밀번호 재설정
    </div>

    <!-- Certification Badge -->
    <div>...</div>

    <!-- Customer Support (Fixed) -->
    <button class="fixed bottom-6 right-6">...</button>
  </div>
</template>
```

## Key Design Decisions

### Color Palette

- **Primary Purple**: `purple-600` (#9333ea)
- **Primary Blue**: `blue-600` (#2563eb)
- **Background**: `white` / `gray-50`
- **Text**: `gray-900` (dark) / `gray-600` (secondary)
- **Badge Blue**: `blue-50` (light) / `blue-500` (icon)

### Typography

- **Logo**: `text-2xl font-bold`
- **Page Title**: `text-3xl font-bold`
- **Form Labels**: Default Nuxt UI FormGroup styling
- **Button**: `font-semibold text-base`
- **Footer Links**: `text-sm`
- **Badge**: `text-sm`

### Spacing

- **Logo to Title**: `mb-8`
- **Title to Form**: `mb-8`
- **Form Fields**: `space-y-5`
- **Form to Footer**: `mt-6`
- **Footer to Badge**: `mt-8`

### Responsive Design

- **Container Width**: `max-w-md` (448px)
- **Padding**: `px-4 py-12`
- **Mobile**: Maintains centered layout
- **Desktop**: Optimal form width with ample spacing

## Nuxt UI v4 Compatibility

### UInput

```vue
<UInput
  v-model="state.email"
  type="email"
  size="xl"
  class="w-full rounded-lg px-4 py-3.5"
  placeholder="아이디를 입력해주세요"
/>
```

**Note**: Used Tailwind classes directly instead of `:ui` prop for better type safety.

### UButton

```vue
<UButton
  type="submit"
  size="xl"
  block
  class="rounded-xl bg-linear-to-r from-purple-600 to-blue-600 font-semibold px-6 py-4"
>
  로그인
</UButton>
```

**Note**: Applied gradient and styling via Tailwind classes.

### UFormGroup

```vue
<UFormGroup label="아이디" name="email" class="space-y-2">
  <UInput ... />
</UFormGroup>
```

**Note**: Korean labels ("아이디", "비밀번호") for localization.

## Accessibility

✅ **Semantic HTML**: Proper heading hierarchy (h1 for page title)
✅ **Form Labels**: All inputs have associated labels via UFormGroup
✅ **Button States**: Loading and disabled states handled
✅ **Keyboard Navigation**: All interactive elements keyboard-accessible
✅ **Focus States**: Default Nuxt UI focus rings preserved
✅ **Color Contrast**: WCAG AA compliant color combinations

## Dark Mode Support

All components include dark mode variants:

- Background: `dark:bg-gray-950`
- Text: `dark:text-white` / `dark:text-gray-400`
- Card: `dark:bg-gray-900`
- Links: `dark:text-purple-400`
- Badge: `dark:bg-blue-950/30`

## Interactive Features

### Hover Effects

- **Links**: Underline on hover
- **Footer Links**: Color change on hover
- **Customer Support**: Scale effect (`hover:scale-110`)
- **Button**: Gradient color shift

### Loading States

- Button shows loading spinner
- Inputs disabled during submission
- Links disabled during loading

### Toast Notifications

- Success: "로그인 성공" with user name
- Error: "로그인 실패" with error message
- Info: "준비 중입니다" (for incomplete features)

## File Changes

**Modified**: [`frontend/app/pages/membership/login.vue`](../app/pages/membership/login.vue)

**Changes**:
1. Removed card-based layout
2. Added logo section
3. Centered layout with white background
4. Redesigned form card
5. Added footer links
6. Added certification badge
7. Added fixed customer support button
8. Updated Korean labels and text
9. Applied purple-blue gradient to button
10. Simplified to match Sendon's clean design

## Testing

### Visual Testing

```bash
# Start development server
pnpm --filter frontend dev

# Navigate to
http://localhost:3001/membership/login
```

### Expected Appearance

- ✅ White background with centered content
- ✅ Purple logo with "sendon" text at top
- ✅ Large "로그인" title
- ✅ Light gray form card with rounded corners
- ✅ Two input fields: 아이디, 비밀번호
- ✅ Signup link right-aligned above button
- ✅ Purple-blue gradient button
- ✅ Footer links below card
- ✅ Blue certification badge
- ✅ Purple customer service button (bottom-right)

### Functional Testing

- ✅ Form validation (Zod schema)
- ✅ Login submission
- ✅ Loading states
- ✅ Error handling
- ✅ Success redirect
- ✅ Toast notifications
- ✅ Link navigation

## Reference

**Design Reference**: https://console.sendon.io/membership/login

**Screenshot**: [`.playwright-mcp/sendon-login-reference.png`](../../.playwright-mcp/sendon-login-reference.png)

## Future Enhancements

### Planned Features

1. **아이디 찾기** (Find ID) - Modal or separate page
2. **비밀번호 재설정** (Password Reset) - Email-based reset flow
3. **회원가입** (Signup) - Registration page
4. **고객센터** (Customer Support) - Chat or support modal
5. **Logo Upload** - Replace placeholder with actual logo
6. **Social Login** - OAuth integration (Google, Naver, Kakao)
7. **Remember Me** - Persistent login option
8. **reCAPTCHA** - Bot protection

### Design Improvements

1. **Animations**: Smooth transitions for elements
2. **Micro-interactions**: Button press effects, input focus animations
3. **Skeleton Loading**: Loading placeholders
4. **Error States**: Inline field validation feedback
5. **Success Feedback**: Animated checkmark or celebration

## Related Documentation

- [Frontend Auth Store](./AUTH-STORE.md) - Pinia authentication store
- [Frontend API System](./API-SYSTEM.md) - HTTP client and token management
- [Validation Guide](../VALIDATION.md) - Form validation with Zod
- [Nuxt UI v4 Guide](../NUXT-UI-V4-MIGRATION.md) - Component patterns
