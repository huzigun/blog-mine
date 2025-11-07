# API System Documentation

## Overview

The API system provides a centralized, type-safe HTTP client with automatic JWT token management, refresh token handling, and error recovery.

## Architecture

```
┌─────────────────┐
│   useApi()      │ ← Configured $fetch instance
└────────┬────────┘
         │
         ├─→ onRequest: Auto-inject JWT token
         ├─→ onResponse: Transform responses
         └─→ onResponseError: Auto-refresh expired tokens
```

## Core Components

### `useApi`

Pre-configured `$fetch` instance with automatic authentication and token refresh.

**Location**: [`app/composables/useApi.ts`](../app/composables/useApi.ts)

**Features**:

- Automatic JWT token injection
- Automatic token refresh on 401/498 errors
- Base URL configuration from runtime config
- Type-safe request/response handling

**Usage**:

```typescript
import { useApi } from '~/composables/useApi'

// GET request
const user = await useApi<User>('/user/me')

// POST request
const response = await useApi('/auth/logout', {
  method: 'POST',
  body: { /* data */ }
})

// With custom headers
const data = await useApi('/api/endpoint', {
  headers: {
    'Custom-Header': 'value'
  }
})
```

### `useApiFetch`

Wrapper around Nuxt's `useFetch` with `useApi` integration for SSR support.

**Usage**:

```typescript
// Auto-refresh on component mount
const { data, pending, error, refresh } = useApiFetch<User>('/user/profile')

// With options
const { data } = useApiFetch<Post[]>('/posts', {
  query: { limit: 10 },
  lazy: true, // Don't block navigation
  server: false, // Client-side only
})
```

### `useRefreshToken`

Utility function to manually refresh access tokens.

**Signature**:

```typescript
async function useRefreshToken(token?: string): Promise<string | null>
```

**Usage**:

```typescript
const newAccessToken = await useRefreshToken()
if (newAccessToken) {
  // Token refreshed successfully
} else {
  // Refresh failed - redirect to login
}
```

## Request Lifecycle

### 1. Request Interceptor (`onRequest`)

**Responsibilities**:

- Set base URL from runtime config
- Inject JWT access token from auth store
- Add Authorization header if authenticated

**Code Flow**:

```typescript
async function onRequest({ options }: FetchContext) {
  // 1. Set base URL
  options.baseURL = config.public.apiBaseUrl

  // 2. Get access token from Pinia store
  const auth = useAuth()
  const accessToken = auth.accessToken

  // 3. Inject Authorization header
  if (accessToken) {
    options.headers = new Headers({
      ...options.headers,
      Authorization: `Bearer ${accessToken}`
    })
  }
}
```

### 2. Response Error Handler (`onResponseError`)

**Responsibilities**:

- Detect token expiration (401/498 status codes)
- Attempt automatic token refresh
- Update request headers with new token
- Retry failed request automatically
- Redirect to login on refresh failure

**Code Flow**:

```typescript
async function onResponseError({ response, options }) {
  // 토큰 만료 에러 (498) 또는 인증 실패 (401) 처리
  if (
    (response.status === 498 && response._data?.message === 'Token expired') ||
    response.status === 401
  ) {
    const refreshToken = useCookie('refresh_token')
    const auth = useAuth()

    // 1. refresh token이 없으면 로그인 페이지로 이동
    if (!refreshToken.value) {
      auth.logout()
      navigateTo('/auth/login')
      return
    }

    try {
      // 2. 토큰 재발급 시도
      const data = await $fetch('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshToken.value }
      })

      // 3. 새로운 access token 저장
      auth.setAccessToken(data.accessToken)

      // 4. 요청 헤더에 새 토큰 업데이트
      options.headers = new Headers({
        ...options.headers,
        Authorization: `Bearer ${data.accessToken}`
      })

      // 5. 원래 요청 자동 재시도
      return $fetch(response.url, options)
    } catch (error) {
      // 6. 토큰 재발급 실패 시 로그아웃 및 로그인 페이지로 이동
      console.error('Token refresh failed:', error)
      auth.logout()
      navigateTo('/auth/login')
    }
  }
}
```

**Important Changes**:

- ✅ **Automatic Retry**: Uses `return $fetch()` to automatically retry the original request
- ✅ **Header Update**: Updates Authorization header with new token before retry
- ✅ **No Manual Retry Flag**: Removed `options.retry = 1` in favor of explicit retry
- ✅ **Comprehensive Error Handling**: Handles both 401 and 498 status codes
- ✅ **Logout on Failure**: Properly logs out user when token refresh fails

## Token Management Strategy

### Access Token

- **Storage**: Pinia store (`auth.accessToken`)
- **Lifetime**: Short-lived (typically 15 minutes)
- **Usage**: Sent with every API request via Authorization header
- **Security**: Memory-only, cleared on page refresh

### Refresh Token

- **Storage**: HTTP-only cookie (`refresh_token`)
- **Lifetime**: Long-lived (typically 7-30 days)
- **Usage**: Only for `/auth/refresh` endpoint
- **Security**: HTTP-only, Secure, SameSite=Strict

### Token Refresh Flow

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ├─→ Inject access_token (onRequest)
         │
         ├─→ Backend validates token
         │
         ▼
   ┌─────────────┐
   │ 401 or 498? │ ◄─ Token expired
   └──────┬──────┘
          │
          ├─→ Get refresh_token from cookie
          │
          ├─→ POST /auth/refresh
          │
          ├─→ Update accessToken in store
          │
          ├─→ Update request headers
          │
          └─→ Retry original request (automatic)
                    │
                    ├─→ Success → Return data
                    └─→ Failure → Logout + Redirect to login
```

**Key Features**:

- ✅ **Automatic**: No manual intervention required
- ✅ **Transparent**: User doesn't notice token expiration
- ✅ **Seamless**: Original request retries with new token
- ✅ **No Interval Polling**: Token refresh only happens when needed (on 401/498 errors)
- ✅ **Efficient**: Eliminates unnecessary periodic token refresh calls

## Error Handling

### Retry Strategy

**Automatic retry on**:

- `401 Unauthorized` - Token expired or invalid
- `498 Token Expired` - Custom status for token expiration (with message "Token expired")

**Implementation**:

Token refresh and retry is handled in `onResponseError` hook, not through `retryStatusCodes`. This provides more control over the retry process:

```typescript
export const useApi = $fetch.create({
  onRequest,
  onResponse() {
    // Response transformation
  },
  onResponseError, // Handles token refresh + automatic retry
})
```

**Why not use `retryStatusCodes`?**

- Need to refresh token BEFORE retry
- Need to update request headers with new token
- Need custom logic for logout on refresh failure
- More control over retry behavior

### Error Recovery

| Error             | Action               | User Impact                |
| ----------------- | -------------------- | -------------------------- |
| 498 Token Expired | Auto-refresh + retry | Seamless (no interruption) |
| 401 Unauthorized  | Auto-refresh + retry | Seamless (no interruption) |
| Refresh failed    | Redirect to login    | Session ended              |
| Network error     | Throw error          | Handle in component        |
| 4xx/5xx errors    | Throw error          | Handle in component        |

## Configuration

### Runtime Config

**Location**: `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
    }
  }
})
```

**Environment Variables**:

```env
# .env
NUXT_PUBLIC_API_BASE_URL=https://api.example.com
```

## Integration with Auth Store

The API system is tightly integrated with the Pinia auth store:

```typescript
// app/composables/useApi.ts
import { useAuth } from '~/stores/auth'

// Get token from store
const auth = useAuth()
const accessToken = auth.accessToken

// Update token after refresh
auth.setAccessToken(newAccessToken)
```

See [AUTH-STORE.md](./AUTH-STORE.md) for authentication store documentation.

## Auth Plugin Changes

### Before: Periodic Token Refresh ❌

Previously, the auth plugin used a `setInterval` to refresh tokens every 10 minutes:

```typescript
// ❌ Old approach - unnecessary polling
export default defineNuxtPlugin(() => {
  if (accessToken.value) {
    // 10분마다 토큰 갱신
    setInterval(async () => {
      await refreshToken()
    }, 10 * 60 * 1000)
  }
})
```

**Problems**:

- ❌ Unnecessary API calls every 10 minutes
- ❌ Wastes server resources
- ❌ May refresh tokens that aren't close to expiring
- ❌ Doesn't handle edge cases (tab switching, network issues)

### After: On-Demand Token Refresh ✅

Now, the auth plugin only restores user session on page load:

```typescript
// ✅ New approach - efficient on-demand refresh
export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()
  const accessToken = useCookie('access_token')

  // Only restore user session on page load
  if (accessToken.value) {
    try {
      await fetchUser()
    } catch (error) {
      console.error('Failed to restore user session:', error)
      accessToken.value = null
    }
  }
})
```

**Benefits**:

- ✅ No periodic polling - tokens refresh only when needed
- ✅ Automatic refresh on 401/498 errors via `useApi`
- ✅ Reduces unnecessary API calls by ~95%
- ✅ Better server resource utilization
- ✅ Simpler, more maintainable code

### Migration Impact

**No Breaking Changes**: The switch from periodic refresh to on-demand refresh is completely transparent to users and application code. All existing functionality continues to work exactly the same way.

**Performance Improvement**:

- **Before**: ~144 token refresh calls per day per user (10-minute intervals)
- **After**: ~1-10 token refresh calls per day per user (only on actual expiration)
- **Reduction**: ~95-99% fewer token refresh API calls

## Best Practices

### ✅ Do

```typescript
// Use useApi for direct API calls
const user = await useApi<User>('/user/me')

// Use useApiFetch for reactive data
const { data } = useApiFetch<Post[]>('/posts')

// Handle errors in components
try {
  await useApi('/endpoint')
} catch (error) {
  toast.add({ title: 'Error', color: 'error' })
}
```

### ❌ Don't

```typescript
// Don't use raw $fetch for authenticated endpoints
const data = await $fetch('/user/me') // ❌ No token injection

// Don't manually manage Authorization headers
const data = await useApi('/endpoint', {
  headers: {
    Authorization: `Bearer ${token}` // ❌ Redundant
  }
})

// Don't handle token refresh manually
if (error.status === 401) {
  await refreshToken() // ❌ Already handled
}
```

## TypeScript Support

### Type-Safe Requests

```typescript
interface User {
  id: number
  email: string
  name: string | null
}

interface CreatePostData {
  title: string
  content: string
}

interface Post {
  id: number
  title: string
  content: string
  authorId: number
}

// Type-safe GET
const user = await useApi<User>('/user/me')
//    ^? const user: User

// Type-safe POST with body
const post = await useApi<Post>('/posts', {
  method: 'POST',
  body: {
    title: 'Hello',
    content: 'World'
  } satisfies CreatePostData
})
```

### Generic Response Types

```typescript
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

const response = await useApi<ApiResponse<User>>('/user/me')
console.log(response.data.email) // Type-safe
```

## Examples

### Component Usage

```vue
<script setup lang="ts">
const auth = useAuth()

// Reactive data fetching with auto-refresh
const { data: posts, pending, error, refresh } = useApiFetch<Post[]>('/posts', {
  lazy: true,
  server: false
})

// Direct API call
async function createPost(postData: CreatePostData) {
  try {
    const newPost = await useApi<Post>('/posts', {
      method: 'POST',
      body: postData
    })

    // Refresh posts list
    await refresh()

    toast.add({
      title: 'Post created',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Failed to create post',
      color: 'error'
    })
  }
}
</script>
```

### Middleware Usage

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth()

  if (!auth.isAuthenticated) {
    // Attempt to fetch user (triggers token refresh if needed)
    const user = await auth.fetchUser()

    if (!user) {
      return navigateTo('/login')
    }
  }
})
```

## Related Documentation

- [Authentication Store](./AUTH-STORE.md) - Pinia store for user authentication
- [Nuxt UI v4 Guide](../NUXT-UI-V4-MIGRATION.md) - UI components and patterns
- [Validation Guide](../VALIDATION.md) - Zod schema validation
