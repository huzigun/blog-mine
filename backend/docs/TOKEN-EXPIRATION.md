# Token Expiration Handling

## Overview

NestJS backend implementation for JWT token expiration with **HTTP 498 status code** to match frontend automatic token refresh logic.

## Architecture

```
┌─────────────────────┐
│  Protected Route    │
└──────────┬──────────┘
           │
           ├─→ JwtAuthGuard
           │   └─→ Check JWT validity
           │
           ├─→ Token Expired?
           │   └─→ YES: Throw TokenExpiredException (498)
           │   └─→ NO: Continue to controller
           │
           ├─→ HttpExceptionFilter
           │   └─→ Format 498 error response
           │
           └─→ Frontend receives 498
               └─→ Auto-refresh token and retry
```

## Components

### 1. TokenExpiredException

Custom exception for expired JWT tokens using HTTP 498 status code.

**Location**: [`src/common/exceptions/token-expired.exception.ts`](../src/common/exceptions/token-expired.exception.ts)

**Usage**:

```typescript
import { TokenExpiredException } from '../common/exceptions';

// Throw when token is expired
throw new TokenExpiredException('Token expired');

// Custom message
throw new TokenExpiredException('Session expired - please login again');
```

**Response Format**:

```json
{
  "statusCode": 498,
  "message": "Token expired",
  "error": "Token Expired"
}
```

### 2. JwtAuthGuard

Enhanced JWT authentication guard that detects token expiration and throws 498 status.

**Location**: [`src/auth/guards/jwt-auth.guard.ts`](../src/auth/guards/jwt-auth.guard.ts)

**Features**:
- Detects `TokenExpiredError` from passport-jwt
- Detects `JsonWebTokenError` for invalid tokens
- Converts to `TokenExpiredException` (498 status)
- Handles other authentication errors

**Error Detection**:

```typescript
handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
  // Token expired (from passport-jwt)
  if (info?.name === 'TokenExpiredError') {
    throw new TokenExpiredException('Token expired');
  }

  // Invalid token format
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

**Usage in Controllers**:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
export class UserController {
  @Get('me')
  @UseGuards(JwtAuthGuard) // ← Throws 498 on expired token
  async getProfile(@Request() req) {
    return req.user;
  }
}
```

### 3. HttpExceptionFilter

Global exception filter that formats error responses consistently, including 498 status.

**Location**: [`src/common/filters/http-exception.filter.ts`](../src/common/filters/http-exception.filter.ts)

**Features**:
- Handles all HTTP exceptions including custom 498 status
- Formats consistent error responses
- Logs errors for monitoring (with security context for 498)
- Includes timestamp, path, and method in responses

**Error Response Format**:

```json
{
  "statusCode": 498,
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/api/user/me",
  "method": "GET",
  "message": "Token expired",
  "error": "Token Expired"
}
```

**Logging Behavior**:

```typescript
// 5xx errors → Error level
if (status >= 500) {
  this.logger.error(`${request.method} ${request.url}`, ...);
}

// 498 Token expired → Warning level with user context
else if (status === 498) {
  this.logger.warn(
    `Token expired: ${request.method} ${request.url} - User: ${request.user?.id || 'unknown'}`
  );
}

// Other errors → Warning level
else {
  this.logger.warn(`${request.method} ${request.url}`, ...);
}
```

### 4. JwtStrategy

Passport JWT strategy for token validation.

**Location**: [`src/auth/strategies/jwt.strategy.ts`](../src/auth/strategies/jwt.strategy.ts)

**Configuration**:

```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false, // ← Enable expiration check
  secretOrKey: configService.jwtSecret,
});
```

**Note**: `passport-jwt` automatically checks token expiration when `ignoreExpiration: false`. If expired, it provides `TokenExpiredError` to the guard's `handleRequest` method.

## Integration Flow

### Request Flow with Expired Token

```
1. Client sends request with expired JWT
   GET /user/me
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

2. JwtAuthGuard intercepts request
   → passport-jwt validates token
   → Token is expired (exp < now)
   → Returns info.name = 'TokenExpiredError'

3. JwtAuthGuard.handleRequest() detects error
   → if (info?.name === 'TokenExpiredError')
   → throw new TokenExpiredException('Token expired')

4. HttpExceptionFilter catches exception
   → Format error response with 498 status
   → Log warning with user context
   → Return JSON response

5. Client receives 498 response
   {
     "statusCode": 498,
     "message": "Token expired",
     "error": "Token Expired",
     "timestamp": "...",
     "path": "/user/me",
     "method": "GET"
   }

6. Frontend detects 498 status
   → Automatically calls /auth/refresh
   → Gets new access token
   → Retries original request with new token
```

### Frontend Integration

**Frontend expects**:
- **Status Code**: `498`
- **Error Message**: `"Token expired"`

**Frontend response handler** ([`frontend/app/composables/useApi.ts:40`](../../frontend/app/composables/useApi.ts#L40)):

```typescript
async function onResponseError({ response, options }) {
  if (response.status === 498 && response._data?.message === 'Token expired') {
    // Automatic token refresh
    const newToken = await refreshToken()
    auth.setAccessToken(newToken)
    options.retry = 1 // Retry original request
  }
}
```

## Configuration

### JWT Token Expiration

**Location**: [`backend/.env`](../../backend/.env.example)

```env
# JWT Access Token (short-lived)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m  # ← 15 minutes recommended
```

### Application Setup

**Location**: [`src/main.ts`](../src/main.ts)

```typescript
import { HttpExceptionFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // ... other configuration
}
```

## Error Types

### Token Expiration (498)

**Trigger**: JWT token `exp` (expiration) claim is in the past

**Response**:

```json
{
  "statusCode": 498,
  "message": "Token expired",
  "error": "Token Expired",
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET"
}
```

**Frontend Action**: Automatic token refresh and retry

### Invalid Token (498)

**Trigger**: Malformed JWT, invalid signature, or missing token

**Response**:

```json
{
  "statusCode": 498,
  "message": "Invalid token",
  "error": "Token Expired",
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET"
}
```

**Frontend Action**: Redirect to login (refresh will fail)

### User Not Found (401)

**Trigger**: Valid token but user no longer exists

**Response**:

```json
{
  "statusCode": 401,
  "message": "User not found",
  "error": "Unauthorized",
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET"
}
```

**Frontend Action**: Redirect to login

## Testing

### Manual Testing with cURL

#### 1. Get Valid Token

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123...",
  "user": { ... }
}
```

#### 2. Test with Valid Token

```bash
curl http://localhost:3000/user/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response: 200 OK
{
  "id": 1,
  "email": "test@example.com",
  "name": "Test User"
}
```

#### 3. Wait for Token Expiration

```bash
# Wait 15+ minutes (or use short-lived token for testing)
# Then retry the same request
```

#### 4. Test with Expired Token

```bash
curl http://localhost:3000/user/me \
  -H "Authorization: Bearer <expired-token>"

# Response: 498 Token Expired
{
  "statusCode": 498,
  "message": "Token expired",
  "error": "Token Expired",
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET"
}
```

#### 5. Test with Invalid Token

```bash
curl http://localhost:3000/user/me \
  -H "Authorization: Bearer invalid-token-format"

# Response: 498 Token Expired
{
  "statusCode": 498,
  "message": "Invalid token",
  "error": "Token Expired",
  "timestamp": "2025-11-07T12:34:56.789Z",
  "path": "/user/me",
  "method": "GET"
}
```

### Testing Short Token Expiration

For testing purposes, temporarily reduce token expiration time:

**`.env.development`**:

```env
JWT_EXPIRES_IN=1m  # 1 minute for testing
```

**Restart server** after changing `.env`:

```bash
pnpm --filter backend dev
```

### Unit Testing

**Example test** (`jwt-auth.guard.spec.ts`):

```typescript
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenExpiredException } from '../../common/exceptions';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should throw TokenExpiredException on TokenExpiredError', () => {
    const mockContext = {} as ExecutionContext;

    expect(() => {
      guard.handleRequest(null, null, { name: 'TokenExpiredError' }, mockContext);
    }).toThrow(TokenExpiredException);
  });

  it('should throw TokenExpiredException on JsonWebTokenError', () => {
    const mockContext = {} as ExecutionContext;

    expect(() => {
      guard.handleRequest(null, null, { name: 'JsonWebTokenError' }, mockContext);
    }).toThrow(TokenExpiredException);
  });

  it('should return user on successful authentication', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockContext = {} as ExecutionContext;

    const result = guard.handleRequest(null, mockUser, null, mockContext);

    expect(result).toEqual(mockUser);
  });
});
```

## Security Considerations

### ✅ Best Practices

1. **Short Access Token Lifetime**: Use 15 minutes or less
2. **Automatic Refresh**: Frontend handles refresh transparently
3. **Secure Logging**: Log token expiration events for security monitoring
4. **Consistent Responses**: Always use 498 for token expiration
5. **No Token in Logs**: Never log actual token values

### ⚠️ Security Notes

1. **498 Status Code**: Non-standard but widely used for token expiration
2. **Token in Authorization Header**: Always use `Bearer` scheme
3. **CORS Configuration**: Ensure frontend origin is allowed
4. **Error Messages**: Don't leak sensitive information in error responses
5. **Rate Limiting**: Consider rate limiting on `/auth/refresh` endpoint

## Frontend-Backend Contract

### Required Response Format

**Status Code**: `498`

**Response Body**:

```typescript
{
  statusCode: 498,
  message: "Token expired", // ← Frontend checks this
  error: "Token Expired",
  timestamp: string,
  path: string,
  method: string
}
```

### Frontend Dependencies

Frontend relies on:
1. **Status Code**: Exactly `498` for token expiration
2. **Message**: `"Token expired"` in `response._data.message`
3. **Retry**: Backend must accept retry with new token

### Breaking Changes

⚠️ **Do NOT change**:
- Status code `498` (frontend hardcoded)
- Message `"Token expired"` (frontend checks exact string)
- Response structure (frontend expects specific fields)

## Monitoring and Logging

### Log Examples

**Token Expiration (Warning)**:

```
[Nest] 12345 - 11/07/2025, 12:34:56 PM   WARN [HttpExceptionFilter] Token expired: GET /user/me - User: 123
```

**Invalid Token (Warning)**:

```
[Nest] 12345 - 11/07/2025, 12:34:56 PM   WARN [HttpExceptionFilter] GET /user/me {"statusCode":498,"message":"Invalid token",...}
```

**Server Error (Error)**:

```
[Nest] 12345 - 11/07/2025, 12:34:56 PM   ERROR [HttpExceptionFilter] GET /user/me {"statusCode":500,"message":"Internal server error",...}
```

### Monitoring Recommendations

1. **Track 498 Rate**: Monitor token expiration frequency
2. **User Context**: Log user ID with 498 errors for security analysis
3. **Alert on Spikes**: Alert if 498 errors spike (potential attack)
4. **Audit Logs**: Maintain audit logs for token-related events

## Troubleshooting

### Frontend Not Refreshing Token

**Symptoms**: Frontend redirects to login instead of refreshing

**Causes**:
1. Status code is not exactly `498`
2. Message is not exactly `"Token expired"`
3. Response structure is different

**Solution**: Verify response matches frontend contract

### Token Always Expires Immediately

**Symptoms**: All requests return 498, even with fresh tokens

**Causes**:
1. `JWT_EXPIRES_IN` too short (e.g., `1s`)
2. Server time mismatch with client
3. Token generation bug

**Solution**: Check JWT configuration and server time

### CORS Errors on Token Refresh

**Symptoms**: Token refresh fails with CORS error

**Causes**:
1. Frontend origin not in CORS allowlist
2. `credentials: true` not set in CORS config

**Solution**: Update CORS configuration in `main.ts`

```typescript
app.enableCors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true, // ← Required for cookies
});
```

## Related Documentation

- [Authentication System](./AUTHENTICATION.md) - Complete authentication flow
- [JWT Configuration](../README.md#jwt-configuration) - JWT setup and configuration
- [Frontend API System](../../frontend/docs/API-SYSTEM.md) - Frontend token refresh implementation
- [Frontend Auth Store](../../frontend/docs/AUTH-STORE.md) - Frontend authentication state management
