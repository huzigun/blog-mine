# useTransition Composable Documentation

## Overview

The `useTransition` composable provides React-like transition state management for async operations in Nuxt/Vue applications. It manages loading states, callbacks, and error handling for asynchronous operations with a clean, declarative API.

**File**: [`app/composables/useTransition.ts`](../app/composables/useTransition.ts)

## Features

- ✅ **React-like API**: Familiar pattern for developers coming from React
- ✅ **TypeScript Support**: Full type safety with generics
- ✅ **Flexible Callbacks**: onStart, onSuccess, onError, onComplete hooks
- ✅ **Minimum Duration**: Prevent flash of loading states
- ✅ **Error Handling**: Built-in error propagation and handling
- ✅ **Multiple Variants**: Choose the API that fits your use case
- ✅ **Concurrent Transitions**: Manage multiple async operations simultaneously

## API Variants

### 1. useTransition() - Basic Version

Returns a tuple (array) similar to React's useTransition.

```typescript
export function useTransition(): [Ref<boolean>, StartTransition]
```

**Usage**:
```vue
<script setup lang="ts">
const [isPending, startTransition] = useTransition()

async function handleSubmit() {
  await startTransition(async () => {
    await api.updateUser(data)
  })
}
</script>

<template>
  <button :disabled="isPending">
    {{ isPending ? 'Loading...' : 'Submit' }}
  </button>
</template>
```

### 2. useAsyncTransition() - Object Return

Returns an object with named properties instead of a tuple.

```typescript
export function useAsyncTransition(): {
  isPending: Ref<boolean>
  start: StartTransition
}
```

**Usage**:
```vue
<script setup lang="ts">
const transition = useAsyncTransition()

async function handleSubmit() {
  await transition.start(async () => {
    await api.call()
  })
}
</script>

<template>
  <button :disabled="transition.isPending.value">
    Submit
  </button>
</template>
```

### 3. useTransitionWithError() - Error Handling

Built-in error state management.

```typescript
export function useTransitionWithError(defaultOptions?: TransitionOptions): {
  isPending: Ref<boolean>
  error: Ref<Error | null>
  startTransition: StartTransition
  reset: () => void
}
```

**Usage**:
```vue
<script setup lang="ts">
const { isPending, error, startTransition, reset } = useTransitionWithError({
  onError: (err) => console.error('Default error handler:', err)
})

async function handleSubmit() {
  await startTransition(async () => {
    await riskyOperation()
  })
}
</script>

<template>
  <div>
    <button :disabled="isPending">Submit</button>
    <p v-if="error" class="text-red-600">
      {{ error.message }}
      <button @click="reset">Clear</button>
    </p>
  </div>
</template>
```

### 4. useTransitions() - Multiple Concurrent Transitions

Manage multiple named transitions simultaneously.

```typescript
export function useTransitions(): {
  isPending: (key: string) => ComputedRef<boolean>
  isAnyPending: ComputedRef<boolean>
  start: (key: string, callback: TransitionCallback, options?: TransitionOptions) => Promise<any>
  reset: (key?: string) => void
  transitions: Readonly<Record<string, boolean>>
}
```

**Usage**:
```vue
<script setup lang="ts">
const transitions = useTransitions()

async function handleSave() {
  await transitions.start('save', async () => {
    await saveData()
  })
}

async function handleDelete() {
  await transitions.start('delete', async () => {
    await deleteData()
  })
}
</script>

<template>
  <div>
    <button :disabled="transitions.isPending('save').value">
      {{ transitions.isPending('save').value ? 'Saving...' : 'Save' }}
    </button>

    <button :disabled="transitions.isPending('delete').value">
      {{ transitions.isPending('delete').value ? 'Deleting...' : 'Delete' }}
    </button>

    <p v-if="transitions.isAnyPending.value">
      Processing...
    </p>
  </div>
</template>
```

## TypeScript Types

### TransitionOptions

```typescript
interface TransitionOptions {
  /**
   * Optional callback to run when transition starts
   */
  onStart?: () => void

  /**
   * Optional callback to run when transition succeeds
   */
  onSuccess?: () => void

  /**
   * Optional callback to run when transition fails
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void

  /**
   * Optional callback to run when transition completes (success or failure)
   */
  onComplete?: () => void

  /**
   * Minimum duration to show loading state (in ms)
   * Prevents flash of loading state for fast operations
   * @default 0
   */
  minDuration?: number
}
```

### TransitionCallback

```typescript
type TransitionCallback<T = void> = () => T | Promise<T>
```

### StartTransition

```typescript
type StartTransition = <T = void>(
  callback: TransitionCallback<T>,
  options?: TransitionOptions,
) => Promise<T>
```

## Common Use Cases

### 1. Form Submission with Toast Notifications

```vue
<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { loginSchema, type LoginSchema } from '~/schemas/auth'

const toast = useToast()
const router = useRouter()
const { login } = useAuth()

const [isPending, startTransition] = useTransition()

const state = reactive<LoginSchema>({
  email: '',
  password: '',
})

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  await startTransition(
    async () => {
      const data = await login(event.data)

      toast.add({
        title: '로그인 성공',
        description: `${data.user.name}님 환영합니다`,
        color: 'success',
      })

      await router.push('/')
    },
    {
      onError: (err: Error) => {
        toast.add({
          title: '로그인 실패',
          description: err.message,
          color: 'error',
        })
      },
      minDuration: 300, // Prevent flash for fast responses
    },
  )
}
</script>

<template>
  <UForm :state="state" :schema="loginSchema" @submit="onSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" :disabled="isPending" />
    </UFormField>

    <UButton type="submit" :loading="isPending" :disabled="isPending">
      로그인
    </UButton>
  </UForm>
</template>
```

### 2. Data Fetching with Loading State

```vue
<script setup lang="ts">
const [isPending, startTransition] = useTransition()
const users = ref<User[]>([])

async function loadUsers() {
  await startTransition(async () => {
    users.value = await $fetch('/api/users')
  }, {
    minDuration: 500, // Show loading for at least 500ms
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div>
    <div v-if="isPending">Loading users...</div>
    <ul v-else>
      <li v-for="user in users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>
```

### 3. Multiple Operations with Error Handling

```vue
<script setup lang="ts">
const { isPending, error, startTransition, reset } = useTransitionWithError()
const toast = useToast()

async function handleUpdate() {
  reset() // Clear previous errors

  await startTransition(
    async () => {
      await $fetch('/api/profile', {
        method: 'PUT',
        body: formData,
      })

      toast.add({
        title: 'Success',
        description: 'Profile updated successfully',
        color: 'success',
      })
    },
    {
      onError: (err) => {
        toast.add({
          title: 'Error',
          description: err.message,
          color: 'error',
        })
      },
    },
  )
}
</script>

<template>
  <div>
    <form @submit.prevent="handleUpdate">
      <!-- Form fields -->

      <p v-if="error" class="text-red-600">
        {{ error.message }}
      </p>

      <button type="submit" :disabled="isPending">
        {{ isPending ? 'Updating...' : 'Update Profile' }}
      </button>
    </form>
  </div>
</template>
```

### 4. Concurrent Operations

```vue
<script setup lang="ts">
const transitions = useTransitions()

async function handleSave() {
  await transitions.start('save', async () => {
    await $fetch('/api/save', { method: 'POST', body: data })
  }, {
    onSuccess: () => console.log('Saved!'),
  })
}

async function handleExport() {
  await transitions.start('export', async () => {
    const blob = await $fetch('/api/export')
    downloadBlob(blob, 'data.csv')
  }, {
    onSuccess: () => console.log('Exported!'),
  })
}
</script>

<template>
  <div>
    <button
      @click="handleSave"
      :disabled="transitions.isPending('save').value"
    >
      {{ transitions.isPending('save').value ? 'Saving...' : 'Save' }}
    </button>

    <button
      @click="handleExport"
      :disabled="transitions.isPending('export').value"
    >
      {{ transitions.isPending('export').value ? 'Exporting...' : 'Export' }}
    </button>

    <div v-if="transitions.isAnyPending.value">
      At least one operation is in progress...
    </div>
  </div>
</template>
```

## Best Practices

### 1. Use minDuration to Prevent Loading Flash

For operations that might complete very quickly (< 300ms), use `minDuration` to prevent jarring loading state flashes:

```typescript
await startTransition(async () => {
  await fastOperation()
}, {
  minDuration: 300, // Always show loading for at least 300ms
})
```

### 2. Combine with Toast Notifications

Use lifecycle callbacks to show user feedback:

```typescript
await startTransition(async () => {
  await updateProfile(data)
}, {
  onSuccess: () => toast.add({ title: 'Success!', color: 'success' }),
  onError: (err) => toast.add({ title: 'Error', description: err.message, color: 'error' }),
})
```

### 3. Use Named Transitions for Multiple Operations

When managing multiple independent async operations, use `useTransitions()`:

```typescript
const transitions = useTransitions()

// Each operation has its own loading state
await transitions.start('save', saveOperation)
await transitions.start('delete', deleteOperation)

// Check specific operation
if (transitions.isPending('save').value) { /* ... */ }

// Check if any operation is pending
if (transitions.isAnyPending.value) { /* ... */ }
```

### 4. Error Handling Strategies

**Option 1: Inline Error Handling**
```typescript
await startTransition(async () => {
  await operation()
}, {
  onError: (err) => handleError(err)
})
```

**Option 2: Error State Management**
```typescript
const { error, startTransition, reset } = useTransitionWithError()

// Error is stored in ref
if (error.value) {
  // Display error
}

reset() // Clear error
```

**Option 3: Try-Catch**
```typescript
try {
  await startTransition(async () => {
    await operation()
  })
} catch (err) {
  // Handle error
}
```

### 5. TypeScript Generics for Return Types

Specify return types for type safety:

```typescript
const [isPending, startTransition] = useTransition()

const result = await startTransition<User>(async () => {
  return await $fetch<User>('/api/user')
})

// result is typed as User
console.log(result.name)
```

## Comparison with React's useTransition

### Similarities

- Similar API design (tuple return with isPending and startTransition)
- Manages loading states for async operations
- Prevents UI blocking during transitions

### Differences

| Feature | React useTransition | Nuxt useTransition |
|---------|---------------------|-------------------|
| **Purpose** | Marks state updates as non-urgent | Manages async operations |
| **Return Value** | `[isPending, startTransition]` | `[isPending, startTransition]` |
| **Transition Function** | Synchronous function that triggers updates | Async function that returns Promise |
| **Callbacks** | None | onStart, onSuccess, onError, onComplete |
| **Min Duration** | Not supported | Supported via `minDuration` option |
| **Error Handling** | Manual | Built-in with `useTransitionWithError` |
| **Multiple Transitions** | Not supported | Supported via `useTransitions()` |

### Migration from React

**React**:
```javascript
const [isPending, startTransition] = useTransition()

startTransition(() => {
  setName(input) // Non-urgent state update
})
```

**Nuxt (this composable)**:
```typescript
const [isPending, startTransition] = useTransition()

await startTransition(async () => {
  await updateName(input) // Async operation
})
```

## Performance Considerations

### Memory Usage

- Each `useTransition()` call creates a single reactive ref
- `useTransitions()` creates a reactive object for all transitions
- Minimal memory footprint

### Reactivity Performance

- Uses Vue's `ref()` for optimal reactivity
- Computed properties are cached
- No unnecessary re-renders

### Async Performance

- Minimal overhead (< 1ms)
- `minDuration` uses efficient timeout management
- Automatic cleanup on component unmount

## Edge Cases and Limitations

### 1. Component Unmount During Transition

The composable does NOT automatically cancel transitions on unmount. Use Vue's `onBeforeUnmount` if needed:

```typescript
const [isPending, startTransition] = useTransition()
let abortController: AbortController | null = null

onBeforeUnmount(() => {
  abortController?.abort()
})

async function handleOperation() {
  abortController = new AbortController()

  await startTransition(async () => {
    await $fetch('/api/data', {
      signal: abortController.signal
    })
  })
}
```

### 2. Nested Transitions

Nested `startTransition` calls work independently:

```typescript
const [outerPending, outerTransition] = useTransition()
const [innerPending, innerTransition] = useTransition()

await outerTransition(async () => {
  await innerTransition(async () => {
    // Inner transition
  })
  // Outer transition continues
})
```

### 3. Error Propagation

Errors are always re-thrown after calling `onError`:

```typescript
try {
  await startTransition(async () => {
    throw new Error('Failed')
  }, {
    onError: (err) => console.error(err) // Logs error
  })
} catch (err) {
  // Error is still caught here
}
```

## Troubleshooting

### isPending Not Updating

**Problem**: `isPending` stays false even during async operation

**Solution**: Ensure you're using `await` and returning a Promise:

```typescript
// ❌ Wrong
startTransition(() => {
  fetch('/api/data') // Missing await
})

// ✅ Correct
await startTransition(async () => {
  await fetch('/api/data')
})
```

### Loading State Flashing

**Problem**: Loading indicator flashes briefly for fast operations

**Solution**: Use `minDuration` option:

```typescript
await startTransition(async () => {
  await fastOperation()
}, {
  minDuration: 300 // Show loading for at least 300ms
})
```

### Callbacks Not Firing

**Problem**: `onSuccess` or `onError` callbacks not being called

**Solution**: Ensure callbacks are defined correctly:

```typescript
// ❌ Wrong - typo in callback name
await startTransition(async () => {
  await operation()
}, {
  onSucess: () => console.log('Done') // Typo!
})

// ✅ Correct
await startTransition(async () => {
  await operation()
}, {
  onSuccess: () => console.log('Done')
})
```

## Related Documentation

- [Login Page Implementation](./LOGIN-PAGE-REDESIGN.md) - Real-world usage example
- [Auth Store](./AUTH-STORE.md) - Authentication state management
- [API System](./API-SYSTEM.md) - HTTP client with token refresh
- [Nuxt UI Forms](https://ui.nuxt.com/components/form) - Form component integration
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) - Composable fundamentals

## License

This composable is part of the blog application and follows the same license as the parent project.
