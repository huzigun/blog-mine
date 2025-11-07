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
- Retry failed request with new token
- Redirect to login on refresh failure

**Code Flow**:

```typescript
async function onResponseError({ response, options }) {
  if (response.status === 498) {
    // 1. Get refresh token from cookie
    const refreshToken = useCookie('refresh_token')

    try {
      // 2. Request new access token
      const response = await $fetch('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refreshToken.value }
      })

      // 3. Update access token in store
      const auth = useAuth()
      auth.setAccessToken(response.accessToken)

      // 4. Retry original request
      options.retry = 1
    } catch (error) {
      // 5. Refresh failed - redirect to login
      navigateTo('/login')
    }
  }
}
```

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
┌─────────┐
│ Request │ → 498 Token Expired
└────┬────┘
     │
     ├─→ Get refresh_token from cookie
     │
     ├─→ POST /auth/refresh
     │
     ├─→ Update accessToken in store
     │
     └─→ Retry original request (auto)
```

## Error Handling

### Retry Strategy

**Automatic retry on**:
- `401 Unauthorized` - Token expired or invalid
- `498 Token Expired` - Custom status for token expiration

**Configuration**:

```typescript
export const useApi = $fetch.create({
  retryStatusCodes: [401, 498],
  // ...
})
```

### Error Recovery

| Error | Action | User Impact |
|-------|--------|-------------|
| 498 Token Expired | Auto-refresh + retry | Seamless (no interruption) |
| 401 Unauthorized | Auto-refresh + retry | Seamless (no interruption) |
| Refresh failed | Redirect to login | Session ended |
| Network error | Throw error | Handle in component |
| 4xx/5xx errors | Throw error | Handle in component |

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
