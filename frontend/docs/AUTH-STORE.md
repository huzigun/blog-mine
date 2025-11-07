# Authentication Store Documentation

## Overview

Pinia-based authentication store managing user state, JWT tokens, and authentication workflows with automatic token refresh integration.

## Architecture

```
┌──────────────────────┐
│   useAuth() Store    │
├──────────────────────┤
│ State:               │
│  - user              │
│  - accessToken       │
├──────────────────────┤
│ Getters:             │
│  - isAuthenticated   │
├──────────────────────┤
│ Actions:             │
│  - login()           │
│  - logout()          │
│  - fetchUser()       │
│  - setAccessToken()  │
│  - setUser()         │
│  - clearAuth()       │
└──────────────────────┘
```

## Store Definition

**Location**: [`app/stores/auth.ts`](../app/stores/auth.ts)

**Store ID**: `auth`

## State

### `user`

User profile information.

**Type**: `User | null`

```typescript
interface User {
  id: number
  email: string
  name: string | null
}
```

**Initial Value**: `null`

### `accessToken`

JWT access token for API authentication.

**Type**: `string | null`

**Initial Value**: `null`

**Storage**: Memory-only (Pinia state)

**Lifetime**: Short-lived (typically 15 minutes)

**Security Considerations**:

- ✅ Memory-only storage prevents XSS token theft
- ✅ Cleared on page refresh (requires re-authentication)
- ✅ Not persisted to localStorage/sessionStorage
- ⚠️ Lost on browser close/refresh

## Getters

### `isAuthenticated`

Returns authentication status based on token and user presence.

**Type**: `boolean`

**Logic**:

```typescript
isAuthenticated: (state) => !!state.accessToken && !!state.user
```

**Usage**:

```vue
<script setup>
const auth = useAuth()
</script>

<template>
  <div v-if="auth.isAuthenticated">
    Welcome, {{ auth.user?.name }}!
  </div>
  <div v-else>
    Please log in
  </div>
</template>
```

## Actions

### `login(credentials)`

Authenticate user and initialize session.

**Parameters**:

```typescript
interface LoginCredentials {
  email: string
  password: string
}
```

**Returns**: `Promise<AuthResponse>`

```typescript
interface AuthResponse {
  accessToken: string
  user: User
}
```

**Flow**:

```
1. POST /api/auth/login with credentials
2. Server sets refresh_token HTTP-only cookie
3. Store receives accessToken + user data
4. Update store state:
   - setAccessToken(accessToken)
   - setUser(user)
5. Return AuthResponse
```

**Usage**:

```vue
<script setup lang="ts">
const auth = useAuth()
const router = useRouter()
const toast = useToast()

async function handleLogin(credentials: LoginCredentials) {
  try {
    await auth.login(credentials)

    toast.add({
      title: 'Login successful',
      color: 'success'
    })

    router.push('/dashboard')
  } catch (error) {
    toast.add({
      title: 'Login failed',
      description: 'Invalid email or password',
      color: 'error'
    })
  }
}
</script>
```

### `logout()`

End user session and clear authentication state.

**Parameters**: None

**Returns**: `Promise<void>`

**Flow**:

```
1. Try: POST /auth/logout (clear server-side session)
2. Catch: Log error but continue
3. Finally:
   - clearAuth() (clear local state)
   - navigateTo('/auth/login')
```

**Usage**:

```vue
<script setup>
const auth = useAuth()

async function handleLogout() {
  await auth.logout()
  // Automatically redirects to login
}
</script>

<template>
  <UButton @click="handleLogout" color="neutral">
    Logout
  </UButton>
</template>
```

### `fetchUser()`

Fetch current user profile from API.

**Parameters**: None

**Returns**: `Promise<User | null>`

**Flow**:

```
1. Check if accessToken exists
   - No token: return null
2. Try: GET /user/me (uses useApi with auto-refresh)
3. Success:
   - setUser(user)
   - return user
4. Error:
   - clearAuth()
   - return null
```

**Usage**:

```typescript
// In middleware or plugin
const auth = useAuth()

const user = await auth.fetchUser()
if (!user) {
  // Not authenticated or token expired
  return navigateTo('/login')
}
```

### `setUser(user)`

Update user state.

**Parameters**:

```typescript
user: { id: number; email: string; name: string | null }
```

**Returns**: `void`

**Usage**:

```typescript
const auth = useAuth()

auth.setUser({
  id: 1,
  email: 'user@example.com',
  name: 'John Doe'
})
```

### `setAccessToken(token)`

Update access token state.

**Parameters**: `token: string`

**Returns**: `void`

**Usage**:

```typescript
const auth = useAuth()

// Typically called by API system after token refresh
auth.setAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
```

### `clearAuth()`

Clear all authentication state.

**Parameters**: None

**Returns**: `void`

**Effects**:

- Sets `user` to `null`
- Sets `accessToken` to `null`

**Usage**:

```typescript
const auth = useAuth()

// Clear auth state (typically on logout or token refresh failure)
auth.clearAuth()
```

## Integration with API System

The auth store integrates with the API system for automatic token management:

```typescript
// app/composables/useApi.ts

// Inject token into requests
async function onRequest({ options }) {
  const auth = useAuth()
  const accessToken = auth.accessToken

  if (accessToken) {
    options.headers = new Headers({
      ...options.headers,
      Authorization: `Bearer ${accessToken}`
    })
  }
}

// Update token after refresh
async function onResponseError({ response }) {
  if (response.status === 498) {
    const newToken = await refreshToken()
    const auth = useAuth()
    auth.setAccessToken(newToken) // ← Store integration
  }
}
```

See [API-SYSTEM.md](./API-SYSTEM.md) for complete API documentation.

## Authentication Flow

### Login Flow

```
┌──────────────┐
│ Login Page   │
└──────┬───────┘
       │
       ├─→ auth.login({ email, password })
       │
       ├─→ POST /api/auth/login
       │
       ├─→ Server Response:
       │   - Set refresh_token cookie (HTTP-only)
       │   - Return { accessToken, user }
       │
       ├─→ Store Updates:
       │   - setAccessToken(accessToken)
       │   - setUser(user)
       │
       └─→ Redirect to /dashboard
```

### Token Refresh Flow

```
┌──────────────┐
│ API Request  │ → 498 Token Expired
└──────┬───────┘
       │
       ├─→ POST /auth/refresh
       │   (with refresh_token cookie)
       │
       ├─→ Server Response:
       │   - Return { accessToken }
       │
       ├─→ Store Update:
       │   - auth.setAccessToken(accessToken)
       │
       └─→ Retry original request
```

### Logout Flow

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
       ├─→ auth.logout()
       │
       ├─→ POST /auth/logout
       │   (clear server session)
       │
       ├─→ clearAuth()
       │   - user = null
       │   - accessToken = null
       │
       └─→ navigateTo('/auth/login')
```

## Usage in Components

### Basic Authentication Check

```vue
<script setup lang="ts">
const auth = useAuth()
const router = useRouter()

// Redirect if not authenticated
if (!auth.isAuthenticated) {
  router.push('/login')
}
</script>

<template>
  <div v-if="auth.isAuthenticated">
    <h1>Welcome, {{ auth.user?.name }}!</h1>
    <p>{{ auth.user?.email }}</p>
  </div>
</template>
```

### Login Form

```vue
<script setup lang="ts">
import { loginSchema, type LoginSchema } from '~/schemas/auth'

const auth = useAuth()
const toast = useToast()
const router = useRouter()

const state = reactive<LoginSchema>({
  email: '',
  password: '',
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true

  try {
    await auth.login(event.data)

    toast.add({
      title: 'Login successful',
      color: 'success'
    })

    router.push('/dashboard')
  } catch (error: any) {
    toast.add({
      title: 'Login failed',
      description: error.data?.message || 'Invalid credentials',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :schema="loginSchema" @submit="onSubmit">
    <UFormGroup label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormGroup>

    <UFormGroup label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormGroup>

    <UButton type="submit" :loading="loading" block>
      Login
    </UButton>
  </UForm>
</template>
```

### Protected Route Middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth()

  // Skip middleware for public routes
  if (to.path === '/login' || to.path === '/register') {
    return
  }

  // Check authentication
  if (!auth.isAuthenticated) {
    // Try to restore session
    const user = await auth.fetchUser()

    if (!user) {
      // No valid session - redirect to login
      return navigateTo('/login')
    }
  }

  // User is authenticated - allow access
})
```

### User Profile Component

```vue
<script setup lang="ts">
const auth = useAuth()

// Reactive user data
const user = computed(() => auth.user)

// Fetch latest user data on mount
onMounted(async () => {
  if (auth.isAuthenticated) {
    await auth.fetchUser()
  }
})

async function handleLogout() {
  await auth.logout()
}
</script>

<template>
  <div v-if="user">
    <h2>{{ user.name || 'Anonymous' }}</h2>
    <p>{{ user.email }}</p>

    <UButton @click="handleLogout" color="neutral">
      Logout
    </UButton>
  </div>
</template>
```

## Security Considerations

### ✅ Secure Practices

1. **Access Token in Memory**: Never persists to localStorage/sessionStorage
2. **HTTP-Only Cookies**: Refresh token stored in HTTP-only cookie (XSS-safe)
3. **Automatic Refresh**: Seamless token refresh without user interruption
4. **Logout Cleanup**: Complete state clearing on logout
5. **Error Handling**: Graceful degradation on API failures

### ⚠️ Security Notes

1. **Page Refresh**: Access token lost on page refresh (requires re-authentication or token refresh)
2. **CORS Configuration**: Ensure backend allows credentials in CORS policy
3. **Cookie Security**: Refresh token cookie must use Secure, SameSite=Strict flags
4. **Token Expiration**: Keep access token lifetime short (15 min recommended)

## State Persistence

### Current Implementation: Memory-Only

**Pros**:

- ✅ XSS-safe (no token in localStorage)
- ✅ Simple implementation
- ✅ Automatic cleanup on browser close

**Cons**:

- ❌ Lost on page refresh
- ❌ Lost on browser close
- ❌ Requires re-authentication or token refresh

### Alternative: Pinia Plugin Persistence

If you need to persist state across page refreshes:

```typescript
// plugins/auth-persistence.ts
import { createPersistedState } from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(
    createPersistedState({
      storage: sessionStorage, // Use sessionStorage, not localStorage
      paths: ['auth'], // Only persist auth store
      key: 'auth-state',
    })
  )
})

// stores/auth.ts
export const useAuth = defineStore('auth', {
  state: () => ({ /* ... */ }),
  persist: {
    paths: ['user', 'accessToken'], // Persist specific state
  }
})
```

**Note**: Persisting tokens to storage has security implications. Consider using HTTP-only cookie strategy instead.

## TypeScript Support

### Type Definitions

**Location**: [`app/type/auth.d.ts`](../app/type/auth.d.ts)

```typescript
interface User {
  id: number
  email: string
  name: string | null
}

interface AuthResponse {
  accessToken: string
  user: User
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  name?: string
}
```

### Type-Safe Store Usage

```typescript
import { useAuth } from '~/stores/auth'

const auth = useAuth()

// Type-safe state access
const user: User | null = auth.user
const token: string | null = auth.accessToken
const isAuth: boolean = auth.isAuthenticated

// Type-safe actions
await auth.login({ email: 'user@example.com', password: 'secret' })
//    ^? (parameter) credentials: LoginCredentials

const fetchedUser = await auth.fetchUser()
//    ^? const fetchedUser: User | null
```

## Testing

### Unit Testing with Vitest

```typescript
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '~/stores/auth'

describe('useAuth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with null state', () => {
    const auth = useAuth()

    expect(auth.user).toBeNull()
    expect(auth.accessToken).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('sets user and token on login', async () => {
    const auth = useAuth()

    auth.setUser({
      id: 1,
      email: 'test@example.com',
      name: 'Test User'
    })
    auth.setAccessToken('test-token')

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.email).toBe('test@example.com')
  })

  it('clears state on logout', () => {
    const auth = useAuth()

    auth.setUser({ id: 1, email: 'test@example.com', name: 'Test' })
    auth.setAccessToken('token')
    auth.clearAuth()

    expect(auth.user).toBeNull()
    expect(auth.accessToken).toBeNull()
  })
})
```

## Related Documentation

- [API System](./API-SYSTEM.md) - HTTP client and token refresh
- [Validation Guide](../VALIDATION.md) - Form validation with Zod
- [Nuxt UI v4 Guide](../NUXT-UI-V4-MIGRATION.md) - UI components
