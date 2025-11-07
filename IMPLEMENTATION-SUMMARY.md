# Token Expiration Implementation Summary

## Overview

Implemented backend JWT token expiration handling with **HTTP 498 status code** to match frontend automatic token refresh logic.

## Changes Made

### Backend Changes

#### 1. Custom Exception: `TokenExpiredException`

**File**: [`backend/src/common/exceptions/token-expired.exception.ts`](backend/src/common/exceptions/token-expired.exception.ts)

```typescript
export class TokenExpiredException extends HttpException {
  constructor(message = 'Token expired') {
    super(
      {
        statusCode: 498,
        message,
        error: 'Token Expired',
      },
      498 as HttpStatus,
    );
  }
}
```

**Purpose**: Custom exception that returns HTTP 498 status code for token expiration.

#### 2. Enhanced JWT Guard

**File**: [`backend/src/auth/guards/jwt-auth.guard.ts`](backend/src/auth/guards/jwt-auth.guard.ts)

**Key Changes**:
- Added `handleRequest` method to intercept JWT validation errors
- Detects `TokenExpiredError` from passport-jwt
- Throws `TokenExpiredException` (498 status) instead of default 401
- Handles invalid token formats with same 498 response

**Error Handling Logic**:

```typescript
handleRequest<TUser = any>(
  err: Error | null,
  user: TUser | false,
  info: JwtError | null,
): TUser {
  // Token expired → 498
  if (info?.name === 'TokenExpiredError') {
    throw new TokenExpiredException('Token expired');
  }

  // Invalid token → 498
  if (info?.name === 'JsonWebTokenError') {
    throw new TokenExpiredException('Invalid token');
  }

  // Other errors
  if (err || !user) {
    throw err || new TokenExpiredException('Authentication failed');
  }

  return user;
}
```

#### 3. Global Exception Filter

**File**: [`backend/src/common/filters/http-exception.filter.ts`](backend/src/common/filters/http-exception.filter.ts)

**Features**:
- Formats all HTTP exceptions consistently
- Handles custom 498 status code
- Logs token expiration events for security monitoring
- Includes timestamp, path, and method in responses

**Response Format**:

```json
{
  "statusCode": 498,
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET",
  "message": "Token expired",
  "error": "Token Expired"
}
```

**Logging**:
- Server errors (5xx): ERROR level
- Token expiration (498): WARN level with user context
- Client errors (4xx): WARN level

#### 4. Application Bootstrap

**File**: [`backend/src/main.ts`](backend/src/main.ts)

**Changes**:
- Added global `HttpExceptionFilter`
- Ensures consistent error responses across all endpoints

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

#### 5. Index Files

**Files**:
- [`backend/src/common/exceptions/index.ts`](backend/src/common/exceptions/index.ts)
- [`backend/src/common/filters/index.ts`](backend/src/common/filters/index.ts)

**Purpose**: Export common exceptions and filters for easy imports.

### Frontend Integration

**File**: [`frontend/app/composables/useApi.ts:40`](frontend/app/composables/useApi.ts#L40)

**Frontend already expects**:
- **Status Code**: `498`
- **Error Message**: `"Token expired"`

**Auto-refresh flow**:

```typescript
async function onResponseError({ response, options }) {
  if (response.status === 498 && response._data?.message === 'Token expired') {
    // Get new access token
    const newToken = await refreshToken()
    auth.setAccessToken(newToken)

    // Retry original request with new token
    options.retry = 1
  }
}
```

## Request Flow

### Before Implementation

```
1. Client → Expired JWT → Backend
2. Backend → 401 Unauthorized
3. Frontend → Manual error handling
4. User → Forced to re-login
```

### After Implementation

```
1. Client → Expired JWT → Backend
2. JwtAuthGuard detects TokenExpiredError
3. Throws TokenExpiredException (498)
4. HttpExceptionFilter formats response
5. Frontend receives 498 "Token expired"
6. Frontend auto-refreshes token
7. Frontend retries request with new token
8. Success → No user interruption
```

## Error Scenarios

| Scenario | Status | Message | Frontend Action |
|----------|--------|---------|-----------------|
| Token expired | 498 | "Token expired" | Auto-refresh + retry |
| Invalid token | 498 | "Invalid token" | Auto-refresh (will fail) → login |
| User not found | 401 | "User not found" | Redirect to login |
| Auth failed | 498 | "Authentication failed" | Redirect to login |

## Testing

### Verification Steps

1. **Start backend**:
   ```bash
   pnpm --filter backend dev
   ```

2. **Get access token** (login):
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

3. **Test with valid token**:
   ```bash
   curl http://localhost:3000/user/me \
     -H "Authorization: Bearer <access-token>"
   # Expected: 200 OK with user data
   ```

4. **Wait for token expiration** (15 minutes or adjust `JWT_EXPIRES_IN`)

5. **Test with expired token**:
   ```bash
   curl http://localhost:3000/user/me \
     -H "Authorization: Bearer <expired-token>"
   # Expected: 498 Token Expired
   {
     "statusCode": 498,
     "message": "Token expired",
     "error": "Token Expired",
     "timestamp": "...",
     "path": "/user/me",
     "method": "GET"
   }
   ```

### Quick Testing (Short Token Lifetime)

**Temporary `.env.development`**:

```env
JWT_EXPIRES_IN=1m  # 1 minute for testing
```

**Restart backend** and test token expiration flow.

## Code Quality

✅ **Linting**: All ESLint checks passed
✅ **Type Checking**: All TypeScript types validated
✅ **Security**: Type-safe request handling with proper error boundaries
✅ **Logging**: Security monitoring for token expiration events

## Documentation

### Created Documentation

1. **[Backend Token Expiration Guide](backend/docs/TOKEN-EXPIRATION.md)**
   - Complete implementation reference
   - Testing instructions
   - Security considerations
   - Frontend integration contract

2. **[Frontend API System Documentation](frontend/docs/API-SYSTEM.md)**
   - HTTP client architecture
   - Token refresh flow
   - Type-safe API usage

3. **[Frontend Auth Store Documentation](frontend/docs/AUTH-STORE.md)**
   - Pinia authentication store
   - State management
   - Component integration

### Updated Documentation

- **[CLAUDE.md](CLAUDE.md)**: Project overview with authentication patterns
- **[Frontend VALIDATION.md](frontend/VALIDATION.md)**: Form validation with Zod
- **[Frontend NUXT-UI-V4-MIGRATION.md](frontend/NUXT-UI-V4-MIGRATION.md)**: Nuxt UI v4 patterns

## File Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── exceptions/
│   │   │   ├── token-expired.exception.ts  ← NEW
│   │   │   └── index.ts                    ← NEW
│   │   └── filters/
│   │       ├── http-exception.filter.ts    ← NEW
│   │       └── index.ts                    ← NEW
│   ├── auth/
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts          ← UPDATED
│   │   └── strategies/
│   │       └── jwt.strategy.ts            ← UPDATED
│   └── main.ts                            ← UPDATED
└── docs/
    └── TOKEN-EXPIRATION.md                 ← NEW

frontend/
├── app/
│   ├── composables/
│   │   └── useApi.ts                      ← UNCHANGED (already compatible)
│   └── stores/
│       └── auth.ts                        ← UNCHANGED (already compatible)
└── docs/
    ├── API-SYSTEM.md                       ← NEW
    └── AUTH-STORE.md                       ← NEW
```

## Security Considerations

✅ **Type Safety**: All error handling is type-safe
✅ **Logging**: Token expiration logged with user context
✅ **No Token Leakage**: Actual tokens never logged
✅ **Consistent Responses**: All errors formatted consistently
✅ **Security Monitoring**: 498 errors tracked separately for analysis

## Next Steps

### Recommended Enhancements

1. **Rate Limiting**: Add rate limiting on `/auth/refresh` endpoint
2. **Monitoring**: Set up alerts for high 498 error rates
3. **Analytics**: Track token expiration patterns
4. **Testing**: Add E2E tests for token refresh flow

### Integration Testing

```typescript
// Example E2E test
describe('Token Refresh Flow', () => {
  it('should auto-refresh expired token and retry request', async () => {
    // 1. Login and get tokens
    const { accessToken, refreshToken } = await login()

    // 2. Wait for token expiration
    await sleep(15 * 60 * 1000) // 15 minutes

    // 3. Make request with expired token
    const response = await fetch('/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    // 4. Verify 498 response
    expect(response.status).toBe(498)
    expect(response.data.message).toBe('Token expired')

    // 5. Frontend auto-refreshes and retries
    // (Handled by useApi automatically)
  })
})
```

## Summary

✅ **Backend**: Returns HTTP 498 with "Token expired" message
✅ **Frontend**: Auto-detects 498 and refreshes token
✅ **Integration**: Seamless token refresh without user interruption
✅ **Security**: Type-safe error handling with monitoring
✅ **Documentation**: Comprehensive guides for both frontend and backend
✅ **Quality**: All linting and type checks passed

## Related Links

- [Backend Token Expiration Guide](backend/docs/TOKEN-EXPIRATION.md)
- [Frontend API System](frontend/docs/API-SYSTEM.md)
- [Frontend Auth Store](frontend/docs/AUTH-STORE.md)
- [Project Overview](CLAUDE.md)
