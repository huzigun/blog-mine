# Database Schema Documentation

Complete database schema reference for the Blog Mine application.

## Overview

**Database**: PostgreSQL
**ORM**: Prisma
**Schema File**: [`prisma/schema.prisma`](prisma/schema.prisma)
**Latest Migration**: `20251112090829_add_credit_and_subscription_models`

## Table of Contents

- [Core Models](#core-models)
- [Authentication Models](#authentication-models)
- [Content Models](#content-models)
- [Subscription Models](#subscription-models)
- [Credit System Models](#credit-system-models)
- [Payment Models](#payment-models)
- [Enums](#enums)
- [Indexes](#indexes)
- [Relationships](#relationships)

## Core Models

### User

Primary user account model.

**Table**: `users`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | User ID |
| email | String | unique | Email address |
| name | String? | nullable | Display name |
| password | String | - | Hashed password |
| createdAt | DateTime | default(now) | Account creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `refreshTokens` → RefreshToken[] (1:N)
- `personas` → Persona[] (1:N)
- `blogPosts` → BlogPost[] (1:N)
- `keywordTrackings` → KeywordTracking[] (1:N)
- `businessInfo` → BusinessInfo? (1:1)
- `subscriptions` → UserSubscription[] (1:N)
- `usageLogs` → SubscriptionUsageLog[] (1:N)
- `payments` → Payment[] (1:N)
- `cards` → Card[] (1:N)
- `creditAccount` → CreditAccount? (1:1)
- `creditTransactions` → CreditTransaction[] (1:N)
- `subscriptionHistories` → SubscriptionHistory[] (1:N)

**Indexes**:
- `email` (unique)

---

### BusinessInfo

User business information for invoicing and legal purposes.

**Table**: `business_info`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Record ID |
| userId | Int | unique, FK | User ID |
| businessName | String? | nullable | Company name |
| businessNumber | String? | nullable | Business registration number |
| businessOwner | String? | nullable | Business owner name |
| businessAddress | String? | nullable | Business address |
| businessType | String? | nullable | Business type/category |
| businessCategory | String? | nullable | Industry category |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `userId` (unique)

---

## Authentication Models

### RefreshToken

JWT refresh token storage for token rotation.

**Table**: `refresh_tokens`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Token ID |
| token | String | unique | Refresh token (hashed) |
| userId | Int | FK | Associated user ID |
| expiresAt | DateTime | - | Token expiration timestamp |
| createdAt | DateTime | default(now) | Creation timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `token` (unique)
- `userId`

---

## Content Models

### Persona

AI content generation personas with unique writing styles.

**Table**: `personas`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Persona ID |
| userId | Int | FK | Owner user ID |
| name | String | - | Persona name |
| description | String? | nullable | Persona description |
| tone | String? | nullable | Writing tone |
| style | String? | nullable | Writing style |
| targetAudience | String? | nullable | Target audience |
| keywords | String[]? | nullable | Associated keywords |
| isActive | Boolean | default(true) | Active status |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)
- `blogPosts` → BlogPost[] (1:N)

**Indexes**:
- `userId, isActive`

---

### BlogPost

AI-generated blog posts with SEO optimization.

**Table**: `blog_posts`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Post ID |
| userId | Int | FK | Author user ID |
| personaId | Int? | FK, nullable | Associated persona |
| title | String | - | Post title |
| content | String | - | Post content (markdown) |
| summary | String? | nullable | Brief summary |
| keywords | String[]? | nullable | SEO keywords |
| targetUrl | String? | nullable | Target URL for ranking |
| status | String | default("draft") | Post status |
| publishedAt | DateTime? | nullable | Publication timestamp |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)
- `persona` ← Persona (N:1, SET NULL)

**Indexes**:
- `userId, status, createdAt`
- `personaId`

---

### KeywordTracking

Naver blog search ranking tracker with historical data.

**Table**: `keyword_trackings`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Tracking ID |
| userId | Int | FK | User ID |
| keyword | String | - | Target keyword |
| myBlogUrl | String | - | Blog URL to track |
| currentRank | Int? | nullable | Current ranking position |
| previousRank | Int? | nullable | Previous ranking position |
| bestRank | Int? | nullable | Best ranking achieved |
| lastCheckedAt | DateTime? | nullable | Last check timestamp |
| isActive | Boolean | default(true) | Active tracking status |
| checkFrequency | String | default("daily") | Check frequency |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `userId, keyword, myBlogUrl` (unique composite)
- `userId, isActive`
- `isActive`

---

## Subscription Models

### SubscriptionPlan

Subscription tier definitions with pricing and feature limits.

**Table**: `subscription_plans`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Plan ID |
| name | String | unique | Plan identifier (FREE, BASIC, PRO) |
| displayName | String | - | Display name |
| description | String? | nullable | Plan description |
| price | Int | default(0) | Monthly price (KRW) |
| yearlyPrice | Int? | nullable | Yearly price (KRW) |
| monthlyCredits | Int | default(0) | **Monthly credit allocation** |
| maxBlogPostsPerMonth | Int | - | Monthly post limit |
| maxPostLength | Int | - | Max characters per post |
| maxKeywordTrackings | Int | - | Max keyword tracking slots |
| maxPersonas | Int | - | Max persona count |
| allowPriorityQueue | Boolean | default(false) | Priority processing |
| allowAdvancedAnalytics | Boolean | default(false) | Advanced analytics access |
| allowApiAccess | Boolean | default(false) | API access |
| allowCustomPersonas | Boolean | default(false) | Custom persona creation |
| isActive | Boolean | default(true) | Plan availability |
| sortOrder | Int | default(0) | Display sort order |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `subscriptions` → UserSubscription[] (1:N)

**Indexes**:
- `name` (unique)
- `isActive, sortOrder`

---

### UserSubscription

User subscription state and billing information.

**Table**: `user_subscriptions`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Subscription ID |
| userId | Int | FK | User ID |
| planId | Int | FK | Plan ID |
| status | SubscriptionStatus | default(TRIAL) | Subscription status |
| startedAt | DateTime | default(now) | Subscription start date |
| expiresAt | DateTime | - | Expiration date |
| canceledAt | DateTime? | nullable | Cancellation date |
| autoRenewal | Boolean | default(true) | Auto-renewal enabled |
| nextBillingDate | DateTime? | nullable | Next billing date |
| lastPaymentDate | DateTime? | nullable | Last successful payment |
| lastPaymentAmount | Int? | nullable | Last payment amount |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)
- `plan` ← SubscriptionPlan (N:1, RESTRICT)

**Indexes**:
- `userId, status`
- `status, expiresAt`

---

### SubscriptionHistory

Complete history of subscription changes with plan snapshots.

**Table**: `subscription_histories`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | History record ID |
| userId | Int | FK | User ID |
| subscriptionId | Int? | FK, nullable | Subscription ID |
| planId | Int | - | Plan ID (snapshot) |
| planName | String | - | Plan name (snapshot) |
| planPrice | Int | - | Plan price (snapshot) |
| action | SubscriptionAction | - | Action type |
| oldStatus | SubscriptionStatus? | nullable | Previous status |
| newStatus | SubscriptionStatus? | nullable | New status |
| startedAt | DateTime? | nullable | Period start |
| expiresAt | DateTime? | nullable | Period end |
| creditsGranted | Int? | nullable | Credits granted |
| paymentId | Int? | nullable | Associated payment |
| reason | String? | nullable | Change reason |
| metadata | Json? | nullable | Additional data |
| createdAt | DateTime | default(now) | Record timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `userId, createdAt`
- `subscriptionId`

---

### SubscriptionUsageLog

Resource consumption tracking for analytics and billing.

**Table**: `subscription_usage_logs`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Log ID |
| userId | Int | FK | User ID |
| resource | String | - | Resource type |
| amount | Int | default(1) | Quantity used |
| metadata | Json? | nullable | Additional context |
| createdAt | DateTime | default(now) | Usage timestamp |

**Resource Types**:
- `blog_post`: Blog post generation
- `keyword_tracking`: Keyword rank check
- `persona`: Persona creation
- `api_call`: API request

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `userId, createdAt`
- `resource, createdAt`

---

## Credit System Models

### CreditAccount

User credit balance with type-based separation.

**Table**: `credit_accounts`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Account ID |
| userId | Int | unique, FK | User ID |
| subscriptionCredits | Int | default(0) | Credits from subscription |
| purchasedCredits | Int | default(0) | Credits from purchases |
| bonusCredits | Int | default(0) | Promotional credits |
| totalCredits | Int | default(0) | **Total available credits** |
| lastUsedAt | DateTime? | nullable | Last usage timestamp |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)
- `transactions` → CreditTransaction[] (1:N)

**Indexes**:
- `userId` (unique)

**Usage Priority**: Bonus → Subscription → Purchased

---

### CreditTransaction

Complete credit transaction history with audit trail.

**Table**: `credit_transactions`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Transaction ID |
| accountId | Int | FK | Credit account ID |
| userId | Int | FK | User ID (denormalized) |
| type | CreditTransactionType | - | Transaction type |
| amount | Int | - | Amount (+ grant, - usage) |
| balanceBefore | Int | - | Balance before transaction |
| balanceAfter | Int | - | Balance after transaction |
| creditType | CreditType | - | Credit type affected |
| description | String? | nullable | Transaction description |
| referenceType | String? | nullable | Related entity type |
| referenceId | Int? | nullable | Related entity ID |
| metadata | Json? | nullable | Additional data |
| expiresAt | DateTime? | nullable | Credit expiration |
| createdAt | DateTime | default(now) | Transaction timestamp |

**Relations**:
- `account` ← CreditAccount (N:1, CASCADE)
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `userId, createdAt`
- `accountId, createdAt`
- `type, createdAt`

**Polymorphic References**:
- `referenceType: "subscription"` + `referenceId` → UserSubscription
- `referenceType: "payment"` + `referenceId` → Payment
- `referenceType: "blog_post"` + `referenceId` → BlogPost

---

## Payment Models

### Payment

Payment transaction records.

**Table**: `payments`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Payment ID |
| userId | Int | FK | User ID |
| amount | Int | - | Amount in smallest unit |
| currency | String | default("KRW") | Currency code |
| status | PaymentStatus | default(PENDING) | Payment status |
| paymentMethod | String? | nullable | Payment method |
| transactionId | String? | unique, nullable | PG transaction ID |
| receiptUrl | String? | nullable | Receipt URL |
| refundedAt | DateTime? | nullable | Refund timestamp |
| refundAmount | Int? | nullable | Refunded amount |
| refundReason | String? | nullable | Refund reason |
| metadata | Json? | nullable | Additional data |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `transactionId` (unique)
- `userId, createdAt`
- `status`

---

### Card

Saved payment methods with 나이스페이먼츠 integration.

**Table**: `cards`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Card ID |
| userId | Int | FK | User ID |
| customerKey | String | unique | Nicepay customer key |
| authenticatedAt | DateTime? | nullable | Authentication timestamp |
| method | String? | nullable | Payment method |
| billingKey | String? | nullable | Billing key (encrypted) |
| cardCompany | String? | nullable | Card issuer company |
| issuerCode | String? | nullable | Issuer code |
| acquirerCode | String? | nullable | Acquirer code |
| number | String? | nullable | Masked card number |
| cardType | String? | nullable | Card type |
| ownerType | String? | nullable | Owner type |
| isAuthenticated | Boolean | default(false) | Authentication status |
| isDefault | Boolean | default(false) | Default payment method |
| createdAt | DateTime | default(now) | Creation timestamp |
| updatedAt | DateTime | updatedAt | Last update timestamp |

**Relations**:
- `user` ← User (N:1, CASCADE)

**Indexes**:
- `customerKey` (unique)
- `userId`

---

### NicepayResult

Complete payment gateway response logs from 나이스페이먼츠.

**Table**: `nicepay_results`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | Int | PK, auto | Result ID |
| moid | String | unique | Payment unique ID |
| signature | String | - | Payment signature |
| userId | String | - | User ID |
| resultCode | String? | nullable | Result code |
| resultMsg | String? | nullable | Result message |
| msgSource | String? | nullable | Payment channel |
| amt | String? | nullable | Amount |
| mid | String? | nullable | Merchant ID |
| buyerEmail | String? | nullable | Buyer email |
| buyerTel | String? | nullable | Buyer phone |
| buyerName | String? | nullable | Buyer name |
| goodsName | String? | nullable | Product name |
| tid | String? | nullable | Transaction ID |
| authCode | String? | nullable | Authorization code |
| authDate | String? | nullable | Authorization date |
| payMethod | String? | nullable | Payment method |
| ... | ... | ... | (50+ additional fields) |
| createdAt | DateTime | default(now) | Request timestamp |
| approvedAt | DateTime? | nullable | Approval timestamp |

**Field Groups**:
- Basic info: result, amount, merchant, buyer
- Card info: card company, number, quota, interest
- Virtual account: bank code, account number, expiry
- Bank transfer: bank code, bank name
- Cancellation: cancel amount, date, reason
- Error: error code, error message

**Indexes**:
- `moid` (unique)

---

## Enums

### SubscriptionStatus

User subscription state.

```prisma
enum SubscriptionStatus {
  TRIAL       // Free trial period
  ACTIVE      // Active subscription
  PAST_DUE    // Payment failed, grace period
  CANCELED    // User canceled
  EXPIRED     // Subscription expired
}
```

---

### PaymentStatus

Payment transaction status.

```prisma
enum PaymentStatus {
  PENDING   // Payment pending
  COMPLETED // Payment successful
  FAILED    // Payment failed
  REFUNDED  // Payment refunded
}
```

---

### CreditTransactionType

Credit transaction types.

```prisma
enum CreditTransactionType {
  SUBSCRIPTION_GRANT // Credits from subscription
  PURCHASE           // Credits purchased
  BONUS              // Bonus credits
  PROMO              // Promotional credits
  USAGE              // Credit consumption
  REFUND             // Credit refund
  EXPIRE             // Credit expiration
  ADMIN_ADJUSTMENT   // Manual admin change
}
```

---

### CreditType

Credit source classification.

```prisma
enum CreditType {
  SUBSCRIPTION // From subscription plan
  PURCHASED    // From direct purchase
  BONUS        // Promotional/bonus
}
```

---

### SubscriptionAction

Subscription change actions.

```prisma
enum SubscriptionAction {
  CREATED        // New subscription
  RENEWED        // Subscription renewed
  UPGRADED       // Plan upgraded
  DOWNGRADED     // Plan downgraded
  CANCELLED      // Subscription canceled
  EXPIRED        // Subscription expired
  REACTIVATED    // Subscription reactivated
  PAYMENT_FAILED // Payment failed
}
```

---

## Indexes

### Performance Optimization

**Critical Query Patterns**:

1. **User Lookups**:
   - `users.email` (unique)
   - Fast login and authentication

2. **Subscription Queries**:
   - `user_subscriptions(userId, status)`
   - `user_subscriptions(status, expiresAt)`
   - Active subscription checks and expiry monitoring

3. **Credit Queries**:
   - `credit_accounts.userId` (unique)
   - `credit_transactions(userId, createdAt)`
   - `credit_transactions(accountId, createdAt)`
   - `credit_transactions(type, createdAt)`
   - Fast balance lookups and history retrieval

4. **Usage Analytics**:
   - `subscription_usage_logs(userId, createdAt)`
   - `subscription_usage_logs(resource, createdAt)`
   - Resource consumption reports

5. **Payment Tracking**:
   - `payments.transactionId` (unique)
   - `payments(userId, createdAt)`
   - `payments.status`
   - Payment history and status checks

6. **Content Management**:
   - `blog_posts(userId, status, createdAt)`
   - `keyword_trackings(userId, isActive)`
   - `keyword_trackings.isActive`
   - Content filtering and active tracking

---

## Relationships

### Entity Relationship Diagram

```
┌──────────┐
│   User   │
└────┬─────┘
     │
     ├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
     │              │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│RefreshT.│  │ Persona  │  │BlogPost  │  │Keyword   │  │Business  │  │UserSubs. │
└─────────┘  └──────────┘  └──────────┘  │Tracking  │  │Info      │  └────┬─────┘
                                          └──────────┘  └──────────┘       │
                                                                            │
     ┌──────────────────────────────────────────────────────────────────┬─┘
     │                                                                   │
     ▼                                                                   ▼
┌──────────┐                                                    ┌──────────────┐
│CreditAcc.│◄──┐                                                │Subscription  │
└────┬─────┘   │                                                │Plan          │
     │         │                                                └──────────────┘
     ▼         │
┌──────────┐   │
│CreditTrn.├───┘
└──────────┘

     │
     ├──────────────┬──────────────┬──────────────┐
     │              │              │              │
     ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Subscript.│  │Usage     │  │Payment   │  │  Card    │
│History   │  │Log       │  └──────────┘  └──────────┘
└──────────┘  └──────────┘
```

### Cascade Delete Policies

**CASCADE** (delete children when parent deleted):
- User → All related records
- CreditAccount → CreditTransaction
- All user-owned content

**RESTRICT** (prevent deletion if children exist):
- SubscriptionPlan (cannot delete if active subscriptions)

**SET NULL** (nullify foreign key):
- BlogPost.personaId (if persona deleted)

---

## Migration Strategy

### Latest Migration

**Name**: `20251112090829_add_credit_and_subscription_models`

**Changes**:
- ✅ 5 new enums
- ✅ 10 new tables
- ✅ 25+ new indexes
- ✅ Foreign key constraints
- ✅ Cascade delete policies

### Future Migrations

**Recommended**:
1. Add partial indexes for soft-deleted records
2. Add composite indexes for complex queries
3. Add check constraints for business rules
4. Consider partitioning for large transaction tables

---

## Database Commands

### Development

```bash
# Run migrations (requires DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm prisma migrate dev --name <migration-name>

# Generate Prisma Client
pnpm prisma generate

# Open Prisma Studio (GUI)
DATABASE_URL="postgresql://..." pnpm prisma studio

# Reset database (WARNING: deletes all data)
DATABASE_URL="postgresql://..." pnpm prisma migrate reset
```

### Production

```bash
# Deploy pending migrations
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy

# Verify migration status
DATABASE_URL="postgresql://..." pnpm prisma migrate status
```

---

## Best Practices

### Query Optimization

1. **Use Indexes**: All foreign keys have indexes
2. **Batch Operations**: Use `createMany` for bulk inserts
3. **Select Specific Fields**: Avoid `select *`, specify needed fields
4. **Pagination**: Use cursor-based pagination for large datasets
5. **Caching**: Cache frequently accessed data (plans, user profiles)

### Data Integrity

1. **Transactions**: Use Prisma transactions for multi-model operations
2. **Validation**: Validate data before database operations
3. **Constraints**: Rely on database constraints (unique, foreign keys)
4. **Audit Trail**: CreditTransaction maintains complete history
5. **Soft Deletes**: Consider adding `deletedAt` for important models

### Security

1. **Password Hashing**: Always hash passwords (bcrypt)
2. **Token Storage**: Hash refresh tokens before storage
3. **Sensitive Data**: Encrypt card billing keys
4. **Audit Logging**: Log all credit and payment transactions
5. **Access Control**: Verify user ownership in queries

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and development guide
- [prisma/schema.prisma](prisma/schema.prisma) - Complete Prisma schema
- [Backend Documentation](../backend/README.md) - NestJS backend guide
