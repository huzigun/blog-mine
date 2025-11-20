# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a pnpm workspace monorepo blog application with two main packages:
- **backend**: NestJS REST API (port 9706)
- **frontend**: Nuxt 4 SSR application with @nuxt/ui component library (port 8706)

**Package Manager**: pnpm workspace (required)
**Workspace Root**: All commands should be run from the root directory unless targeting a specific package

## Architecture

### Backend (NestJS)
- **Framework**: NestJS v11 with TypeScript
- **Entry Point**: `src/main.ts` - bootstraps the app on port 9706 (configurable via PORT env var)
- **Configuration**: @nestjs/config with environment-based .env files
  - `.env` - common settings for all environments
  - `.env.development` - development-specific settings
  - `.env.production` - production-specific settings
  - `src/lib/config/` - typed configuration service and factory
- **Module System**: Scalable categorized architecture
  - `AppModule` - root module in `src/app.module.ts`
  - Controllers handle HTTP requests
  - Services contain business logic
  - Follows dependency injection pattern
- **Module Organization**: **IMPORTANT - Follow this structure for scalability**
  ```
  src/
  ├── modules/                    # Business domain modules (with controllers)
  │   ├── auth/                  # Authentication & authorization
  │   ├── user/                  # User management
  │   ├── persona/               # Persona management
  │   └── blog-post/             # Blog post generation
  │
  ├── lib/                       # Infrastructure & utilities (no controllers)
  │   ├── database/              # Prisma ORM (global module)
  │   ├── config/                # Configuration service (global)
  │   ├── date/                  # Date utilities (global)
  │   ├── integrations/          # External API integrations
  │   │   ├── nicepay/          # Payment gateway (Nicepay)
  │   │   ├── naver/            # Naver Search API
  │   │   └── openai/           # OpenAI API
  │   ├── http/                  # HTTP client utilities
  │   └── encrypt.ts             # Encryption utilities
  │
  ├── common/                    # Shared code
  │   ├── exceptions/            # Custom exceptions
  │   ├── filters/               # Exception filters
  │   ├── guards/                # Guards (in auth module)
  │   ├── interceptors/          # Interceptors
  │   └── decorators/            # Custom decorators
  │
  ├── app.module.ts
  └── main.ts
  ```
- **Import Path Aliases**: Configured in tsconfig.json for cleaner imports
  - `@modules/*` → `src/modules/*`
  - `@lib/*` → `src/lib/*`
  - `@common/*` → `src/common/*`
  - `@prisma/client` → `prisma/generated`
- **Database**: Prisma ORM with PostgreSQL
  - **Schema**: `prisma/schema.prisma` - database models and configuration
  - **Generated Client**: `prisma/generated/` - auto-generated Prisma Client (not in src/)
  - **Service**: `src/lib/database/prisma.service.ts` - NestJS service wrapping PrismaClient
  - **TypeScript Paths**: `@prisma/client` mapped to `./prisma/generated` in tsconfig.json
  - **Important**: Run `pnpm prisma generate` after schema changes to regenerate client
  - **Build Safety**: Generated client is outside `src/` to avoid being affected by TypeScript compilation
  - **Migrations**: Run with `DATABASE_URL="..." pnpm prisma migrate dev --name <migration-name>`
  - **Core Models**: User, Persona, BlogPost, KeywordTracking, BusinessInfo, Subscription, Payment, Credit
- **Build Output**: `dist/` directory (CommonJS modules)
- **TypeScript Config**: ES2023 target, decorators enabled, strict null checks

### Frontend (Nuxt)
- **Framework**: Nuxt 4 with Vue 3 Composition API
- **UI Library**: @nuxt/ui 4.1.0 (built on Tailwind CSS)
  - **IMPORTANT**: Use Nuxt UI v4 documentation at https://ui.nuxt.com (NOT v2 docs)
  - v4 unified Nuxt UI and Nuxt UI Pro into a single package
  - Breaking changes from v2/v3: See "Nuxt UI v4 Specific Guidelines" section below
  - **Color System**: Uses semantic colors (`success`, `error`, `neutral`) instead of descriptive (`green`, `red`, `gray`)
- **Validation**: Zod for type-safe schema validation
  - Schemas organized in `app/schemas/` (auth, user, blog)
  - See [frontend/VALIDATION.md](frontend/VALIDATION.md) for details
- **Modules**: @nuxt/image for optimized image handling
- **Entry Point**: `app/app.vue`
- **Build System**: Nuxt's built-in Vite-powered build
- **SSR**: Server-side rendering enabled by default
- **TypeScript**: Uses Nuxt-generated tsconfig references in `.nuxt/` directory

## Common Commands

### Workspace Commands (from root)
```bash
# Install all dependencies
pnpm install

# Development - run both backend and frontend concurrently
pnpm dev

# Development - run specific package
pnpm dev:backend    # NestJS in watch mode
pnpm dev:frontend   # Nuxt dev server

# Build all packages
pnpm build          # Backend first, then frontend

# Build specific package
pnpm build:backend
pnpm build:frontend

# Start production servers
pnpm start          # Both packages
pnpm start:backend  # NestJS production
pnpm start:frontend # Nuxt preview

# Testing (backend only)
pnpm test           # Unit tests
pnpm test:backend   # Explicit backend tests
pnpm test:e2e       # E2E tests

# Linting and formatting
pnpm lint           # Parallel linting
pnpm lint:backend   # ESLint with auto-fix
pnpm format         # Prettier formatting

# Clean build artifacts and dependencies
pnpm clean          # Clean all packages
pnpm clean:backend  # Remove dist/ and node_modules/
pnpm clean:frontend # Remove .nuxt/, .output/, node_modules/
```

### Individual Package Commands
```bash
# Target specific package with --filter
pnpm --filter backend [command]
pnpm --filter frontend [command]

# Run commands in all packages
pnpm -r [command]           # Recursive
pnpm --parallel [command]   # Parallel execution
```

## Development Workflow

### Backend
- NestJS uses decorator-based architecture (@Module, @Controller, @Injectable)
- **Environment Configuration**:
  - Copy `.env.example` to `.env` and configure for local development
  - Environment files are loaded based on NODE_ENV (defaults to development)
  - Access config via `ConfigService` injection with type safety
  - **DATABASE_URL** required for Prisma CLI operations
- **Prisma Workflow**:
  - Edit `prisma/schema.prisma` for schema changes
  - Run migrations: `DATABASE_URL="..." pnpm prisma migrate dev --name <name>`
  - Generate client: `pnpm prisma generate`
  - Studio (GUI): `DATABASE_URL="..." pnpm prisma studio`
- Tests use Jest framework with ts-jest
- Unit tests: `*.spec.ts` files alongside source
- E2E tests: `test/` directory with separate Jest config
- Use `nest generate` CLI for scaffolding (controllers, services, modules, etc.)

### Frontend
- Nuxt auto-imports components, composables, and utilities
- Pages use file-based routing (create `pages/` directory)
- API routes in `server/api/` directory
- Nuxt DevTools enabled for development

## Important Notes

- **Workspace Structure**: This is a pnpm workspace monorepo with packages in `backend/` and `frontend/`
- **Workspace Config**: `pnpm-workspace.yaml` defines workspace packages
- **Environment Variables**: Backend uses @nestjs/config with `.env` files (NOT committed to git)
  - `.env.example` is the template - copy and configure for your environment
  - Environment-specific files: `.env.development`, `.env.production`
  - **Production**: `backend/.env` file required on EC2 with proper permissions (chmod 600, chown ec2-user:docker)
- **Port Configuration**:
  - Local Development: Backend (9706), Frontend (8706)
  - Production: Backend (9706), Frontend (3000), Nginx (80)
- **Module Systems**: Backend uses CommonJS modules, frontend uses ESM
- **Auto-generated**: The `.nuxt/` directory is auto-generated - do not edit directly
- **Test Root**: Backend tests run from `src/` as root directory for module resolution
- **Dependencies**: Install from root with `pnpm install` to leverage workspace hoisting
- **Prisma Type Issues**: If IDE shows type errors for Prisma Client after location changes:
  1. VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
  2. VSCode: Cmd+Shift+P → "ESLint: Restart ESLint Server"
  3. If still failing: Restart IDE completely
  4. Verify with `pnpm tsc --noEmit` and `pnpm lint` - these should pass even if IDE shows errors

## Nuxt UI v4 Specific Guidelines

### Official Documentation
- **Primary Reference**: https://ui.nuxt.com (Nuxt UI v4 docs)
- **DO NOT use v2 documentation** - significant breaking changes exist
- **Migration Guide**: https://ui.nuxt.com/docs/getting-started/migration/v4

### Key Breaking Changes from v2/v3

#### 1. Form Component Behavior
```typescript
// v4: Schema transformations only apply to @submit data (NOT state)
// This prevents unexpected state mutations during validation
const onSubmit = async (event: FormSubmitEvent<LoginForm>) => {
  // event.data contains transformed/validated data
  // state remains unchanged
}
```

#### 2. Input Model Modifiers
```vue
<!-- v2/v3 -->
<UInput v-model.nullify="value" />

<!-- v4 -->
<UInput v-model.nullable="value" />  <!-- Converts empty to null -->
<UInput v-model.optional="value" />  <!-- Converts empty to undefined -->
```

#### 3. TypeScript Imports
```typescript
// v4: Import types from #ui/types
import type { FormError, FormSubmitEvent } from '#ui/types'

// Common types:
// - FormError: { path: string; message: string }
// - FormSubmitEvent<T>: Event with typed data property
```

#### 4. Component Renamings
- `ButtonGroup` → `FieldGroup`
- `PageMarquee` → `Marquee`
- `PageAccordion` removed (use `Accordion` with `unmount-on-hide="false"`)

#### 5. Nested Forms
```vue
<!-- v4: Nested forms require explicit enablement -->
<UForm nested name="address">
  <!-- Form fields -->
</UForm>
```

### Common Component Patterns (v4)

#### Form Validation
```vue
<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '#ui/types'

interface LoginForm {
  email: string
  password: string
}

const state = reactive<LoginForm>({
  email: '',
  password: '',
})

const validate = (state: LoginForm): FormError[] => {
  const errors: FormError[] = []
  if (!state.email) {
    errors.push({ path: 'email', message: 'Required' })
  }
  return errors
}

const onSubmit = async (event: FormSubmitEvent<LoginForm>) => {
  // Access validated data via event.data
  const { email, password } = event.data
}
</script>

<template>
  <UForm :state="state" :validate="validate" @submit="onSubmit">
    <UFormGroup label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormGroup>
    <UButton type="submit">Submit</UButton>
  </UForm>
</template>
```

#### Toast Notifications
```typescript
const toast = useToast()

// v4: Use semantic color names
// Success toast
toast.add({
  title: 'Success',
  description: 'Operation completed',
  color: 'success',  // v4: 'success' (was 'green' in v2)
})

// Error toast
toast.add({
  title: 'Error',
  description: 'Operation failed',
  color: 'error',  // v4: 'error' (was 'red' in v2)
})

// Info toast
toast.add({
  title: 'Info',
  description: 'Information message',
  color: 'info',  // v4: 'info' (was 'blue' in v2)
})

// Warning toast
toast.add({
  title: 'Warning',
  description: 'Warning message',
  color: 'warning',  // v4: 'warning' (was 'yellow' in v2)
})
```

#### Component Props (Common Patterns)
```vue
<!-- v4: Button with semantic colors -->
<UButton
  type="submit"
  color="primary"    <!-- v4 colors: primary|secondary|success|info|warning|error|neutral -->
  size="lg"
  block
  :loading="isLoading"
  :disabled="isDisabled"
>
  Submit
</UButton>

<!-- v4: Neutral button (replaces gray) -->
<UButton
  color="neutral"    <!-- v4: 'neutral' (was 'gray' in v2) -->
  variant="outline"
>
  Cancel
</UButton>

<UInput
  v-model="value"
  type="email"
  placeholder="Email"
  icon="i-heroicons-envelope"
  size="lg"
  :disabled="isDisabled"
/>

<UCard>
  <template #header>Header content</template>
  <template #default>Body content</template>
  <template #footer>Footer content</template>
</UCard>
```

### Authentication Flow Pattern

This project uses a secure JWT refresh token pattern with Nuxt UI v4:

```typescript
// composables/useAuth.ts
export const useAuth = () => {
  const user = useState<User | null>('user', () => null)
  const token = useCookie('access_token')
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const login = async (credentials: LoginCredentials) => {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })
    user.value = data.user
    return data
  }

  return { user, isAuthenticated, login, logout, refreshToken, fetchUser }
}
```

### Color System (v4)

Nuxt UI v4 uses semantic color names instead of descriptive colors for better accessibility and consistency.

#### Available Colors

| Color | Use Case | v2 Equivalent |
|-------|----------|---------------|
| `primary` | Primary actions, main CTAs | `blue` (varies) |
| `secondary` | Secondary actions | N/A |
| `success` | Success states, confirmations | `green` |
| `info` | Informational content | `blue` |
| `warning` | Warning states | `yellow` |
| `error` | Error states, destructive actions | `red` |
| `neutral` | Neutral/gray actions | `gray` |

#### Migration from v2

```typescript
// v2 → v4 Color Mapping
'gray'   → 'neutral'   // Neutral/secondary buttons
'green'  → 'success'   // Success messages
'red'    → 'error'     // Error messages
'blue'   → 'info' or 'primary'  // Info or primary actions
'yellow' → 'warning'   // Warnings
```

#### Examples

```vue
<!-- Buttons -->
<UButton color="primary">Primary Action</UButton>
<UButton color="neutral" variant="outline">Secondary Action</UButton>
<UButton color="error">Delete</UButton>

<!-- Toast Notifications -->
<script setup>
const toast = useToast()

toast.add({ title: 'Success', color: 'success' })
toast.add({ title: 'Error', color: 'error' })
toast.add({ title: 'Warning', color: 'warning' })
</script>
```

**Important**: Always use semantic colors (`success`, `error`, etc.) instead of descriptive colors (`green`, `red`) for v4 compatibility.

### Form Validation with Zod

This project uses **Zod** for type-safe schema validation with Nuxt UI forms.

#### Basic Pattern

```vue
<script setup lang="ts">
import { loginSchema, type LoginSchema } from '~/schemas/auth'

const state = reactive<LoginSchema>({
  email: '',
  password: '',
})

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  // event.data is validated and typed
  const { email, password } = event.data
}
</script>

<template>
  <UForm :state="state" :schema="loginSchema" @submit="onSubmit">
    <UFormGroup label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormGroup>
    <UButton type="submit">Submit</UButton>
  </UForm>
</template>
```

#### Schema Structure

Schemas are organized in `frontend/app/schemas/`:
- `auth.ts` - Authentication (login, register, password reset)
- `user.ts` - User profile and settings
- `blog.ts` - Blog posts, comments, categories

See [frontend/VALIDATION.md](frontend/VALIDATION.md) for complete validation documentation.

### Development Tips

1. **Type Safety**: Always import types from `#ui/types` for form components
2. **State Management**: Form state is NOT mutated by validation - only @submit data is transformed
3. **Icon System**: Use Heroicons with `i-heroicons-*` prefix (e.g., `i-heroicons-envelope`)
4. **Responsive Design**: Use Tailwind CSS classes directly on Nuxt UI components
5. **Dark Mode**: Nuxt UI v4 has built-in dark mode support via `dark:` classes
6. **Component Discovery**: Use Nuxt DevTools to explore available components and their props
7. **Color System**: Use semantic colors (`success`, `error`, `neutral`) not descriptive (`green`, `red`, `gray`)
8. **Validation**: Use Zod schemas with `:schema` prop for type-safe validation

### Troubleshooting Type Errors

If you encounter TypeScript errors:

1. **Restart Nuxt dev server** after installing/updating @nuxt/ui
2. **Check import paths**: Use `#ui/types` not `@nuxt/ui/types`
3. **Verify Nuxt 4 compatibility**: Nuxt UI v4 requires Nuxt 4
4. **Clear `.nuxt` cache**: Run `pnpm clean:frontend` and restart dev server
5. **Check official docs**: API may have changed - verify at https://ui.nuxt.com
6. **Color prop errors**: Use semantic colors (`success`, `error`, `neutral`) not v2 colors (`green`, `red`, `gray`)

### Additional Resources

- [Nuxt UI v4 Migration Guide](frontend/NUXT-UI-V4-MIGRATION.md) - Complete v2 to v4 migration reference
- [Validation Guide](frontend/VALIDATION.md) - Zod schema validation documentation
- [Official Nuxt UI v4 Docs](https://ui.nuxt.com) - Primary reference for components and API

## Business Logic: Credit & Subscription System

This project implements a comprehensive credit-based subscription system for the "BloC" service.

### System Overview

**Credit System Architecture**:
- Users receive credits based on their subscription tier
- Credits are consumed when using paid services (blog post generation, etc.)
- Users can purchase additional credits when needed
- Complete transaction history maintained for audit trail

**Key Design Patterns**:
- **Separate Balance + History Tables**: `CreditAccount` (current balance) + `CreditTransaction` (history)
- **Type-based Credit Separation**: Subscription, Purchased, Bonus credits tracked separately
- **Snapshot Pattern**: `SubscriptionHistory` stores point-in-time plan information
- **Polymorphic References**: Flexible associations using referenceType + referenceId

### Database Models

#### Subscription Models

**`SubscriptionPlan`** - Subscription tier definitions:
- Pricing: Monthly and yearly rates
- **`monthlyCredits`**: Credits granted per month
- Feature limits: Blog posts, post length, keyword trackings, personas
- Feature flags: Priority queue, advanced analytics, API access, custom personas

**`UserSubscription`** - User subscription state:
- Status: TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED
- Period tracking: startedAt, expiresAt, canceledAt
- Auto-renewal configuration
- Payment history: Last payment date and amount

**`SubscriptionHistory`** - Complete subscription change log:
- Action: CREATED, RENEWED, UPGRADED, DOWNGRADED, CANCELLED, EXPIRED, REACTIVATED, PAYMENT_FAILED
- Plan snapshot: planName, planPrice at time of change
- Status transition: oldStatus → newStatus
- Credits granted per event
- Payment reference linkage

#### Credit Models

**`CreditAccount`** (1:1 with User) - Current credit balance:
```prisma
subscriptionCredits  Int  // Credits from subscription
purchasedCredits     Int  // Credits bought separately
bonusCredits         Int  // Promotional/bonus credits
totalCredits         Int  // Sum of all types
lastUsedAt           DateTime?
```

**`CreditTransaction`** - Complete transaction history:
```prisma
type              CreditTransactionType  // Transaction type
amount            Int                    // Positive: grant, Negative: usage
balanceBefore     Int                    // Balance before transaction
balanceAfter      Int                    // Balance after transaction
creditType        CreditType             // Which credit type affected
referenceType     String?                // Related entity (subscription, payment, blog_post)
referenceId       Int?                   // Related entity ID
expiresAt         DateTime?              // For promotional credits
```

**Transaction Types**:
- `SUBSCRIPTION_GRANT`: Credits from subscription renewal
- `PURCHASE`: Credits bought with payment
- `BONUS`: Bonus credits from promotions
- `PROMO`: Promotional credits
- `USAGE`: Credit consumption (negative amount)
- `REFUND`: Credit refund
- `EXPIRE`: Credit expiration
- `ADMIN_ADJUSTMENT`: Manual admin changes

#### Payment Models

**`Payment`** - Payment transaction records:
- Amount, currency, status (PENDING, COMPLETED, FAILED, REFUNDED)
- Payment method and PG transaction ID
- Refund tracking: refundedAt, refundAmount, refundReason
- Metadata for additional payment information

**`Card`** - Saved payment methods:
- Integration with 나이스페이먼츠 (Nicepay)
- Card information: company, type, masked number
- Authentication status and default card flag

**`NicepayResult`** - Payment gateway response logs:
- Complete payment approval data from 나이스페이먼츠
- Includes buyer info, card details, virtual account, bank transfer, cancellation info
- All fields mapped to snake_case database columns

### Business Logic Patterns

#### 1. Credit Grant on Subscription

```typescript
async function grantSubscriptionCredits(
  userId: number,
  subscriptionId: number,
  planId: number
) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
  const account = await prisma.creditAccount.findUnique({ where: { userId } })

  // Create transaction
  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      userId,
      type: 'SUBSCRIPTION_GRANT',
      amount: plan.monthlyCredits,
      balanceBefore: account.totalCredits,
      balanceAfter: account.totalCredits + plan.monthlyCredits,
      creditType: 'SUBSCRIPTION',
      referenceType: 'subscription',
      referenceId: subscriptionId,
    }
  })

  // Update account balance
  await prisma.creditAccount.update({
    where: { userId },
    data: {
      subscriptionCredits: { increment: plan.monthlyCredits },
      totalCredits: { increment: plan.monthlyCredits },
    }
  })
}
```

#### 2. Credit Usage

```typescript
async function useCreditForBlogPost(userId: number, postId: number, cost: number) {
  const account = await prisma.creditAccount.findUnique({ where: { userId } })

  if (account.totalCredits < cost) {
    throw new Error('Insufficient credits')
  }

  // Deduct credits with priority: bonus → subscription → purchased
  let remaining = cost
  const updates = { totalCredits: -cost }

  if (account.bonusCredits >= remaining) {
    updates.bonusCredits = -remaining
    remaining = 0
  } else {
    updates.bonusCredits = -account.bonusCredits
    remaining -= account.bonusCredits
  }

  if (remaining > 0 && account.subscriptionCredits >= remaining) {
    updates.subscriptionCredits = -remaining
    remaining = 0
  } else if (remaining > 0) {
    updates.subscriptionCredits = -account.subscriptionCredits
    remaining -= account.subscriptionCredits
  }

  if (remaining > 0) {
    updates.purchasedCredits = -remaining
  }

  // Create transaction record
  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      userId,
      type: 'USAGE',
      amount: -cost,
      balanceBefore: account.totalCredits,
      balanceAfter: account.totalCredits - cost,
      creditType: determineUsedCreditType(updates),
      referenceType: 'blog_post',
      referenceId: postId,
    }
  })

  // Update account
  await prisma.creditAccount.update({
    where: { userId },
    data: { ...updates, lastUsedAt: new Date() }
  })
}
```

#### 3. Credit Purchase

```typescript
async function purchaseCredits(
  userId: number,
  amount: number,
  paymentId: number
) {
  const account = await prisma.creditAccount.findUnique({ where: { userId } })

  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      userId,
      type: 'PURCHASE',
      amount,
      balanceBefore: account.totalCredits,
      balanceAfter: account.totalCredits + amount,
      creditType: 'PURCHASED',
      referenceType: 'payment',
      referenceId: paymentId,
    }
  })

  await prisma.creditAccount.update({
    where: { userId },
    data: {
      purchasedCredits: { increment: amount },
      totalCredits: { increment: amount },
    }
  })
}
```

#### 4. Subscription History Tracking

```typescript
async function recordSubscriptionChange(
  userId: number,
  subscriptionId: number,
  action: SubscriptionAction,
  oldStatus: SubscriptionStatus | null,
  newStatus: SubscriptionStatus,
  plan: SubscriptionPlan,
  creditsGranted?: number,
  paymentId?: number
) {
  await prisma.subscriptionHistory.create({
    data: {
      userId,
      subscriptionId,
      action,
      oldStatus,
      newStatus,
      // Snapshot plan info
      planId: plan.id,
      planName: plan.displayName,
      planPrice: plan.price,
      creditsGranted,
      paymentId,
      startedAt: new Date(),
      expiresAt: calculateExpiryDate(plan),
    }
  })
}
```

### Usage Tracking

**`SubscriptionUsageLog`** tracks resource consumption:
- Resource types: `blog_post`, `keyword_tracking`, `persona`, `api_call`
- Amount consumed per usage
- Metadata for additional context
- Indexed by userId and resource for analytics

### Implementation Checklist

To implement the credit system functionality:

- [ ] Create `CreditService` in `backend/src/credit/`
- [ ] Create `SubscriptionService` in `backend/src/subscription/`
- [ ] Implement credit grant on subscription creation/renewal
- [ ] Implement credit usage on blog post generation
- [ ] Implement credit purchase flow with payment integration
- [ ] Add credit balance check middleware/guard
- [ ] Create subscription upgrade/downgrade logic
- [ ] Add usage tracking hooks
- [ ] Implement subscription history recording
- [ ] Create API endpoints for credit/subscription management
- [ ] Add frontend UI for credit balance display
- [ ] Add frontend credit purchase flow
- [ ] Add frontend subscription management page

### Database Relationships

```
User (1) ──── (1) CreditAccount
  │                    │
  │                    │
  │                    └──── (*) CreditTransaction
  │
  ├──── (*) UserSubscription ──── (1) SubscriptionPlan
  ├──── (*) SubscriptionHistory
  ├──── (*) SubscriptionUsageLog
  ├──── (*) Payment
  ├──── (*) Card
  └──── (*) BlogPost, Persona, KeywordTracking
```

### Migration History

**Latest Migration**: `20251112090829_add_credit_and_subscription_models`

Created:
- 5 new enums (SubscriptionStatus, PaymentStatus, CreditTransactionType, CreditType, SubscriptionAction)
- 10 new tables (business_info, subscription_plans, user_subscriptions, subscription_usage_logs, payments, cards, nicepay_results, credit_accounts, credit_transactions, subscription_histories)
- Proper indexes for query optimization
- Foreign key constraints with CASCADE deletes

## Deployment

### Production Architecture

```
User → CloudFront (HTTPS) → EC2 Nginx (HTTP:80) → Docker Containers → RDS PostgreSQL
       ├─ blogmine.ai.kr (Frontend)
       └─ api.blogmine.ai.kr (Backend)
```

**Infrastructure**:
- **CDN**: CloudFront single distribution (Price Class 200)
- **Compute**: EC2 Graviton (ARM64) - t4g.medium
- **Containers**: Docker Compose with Docker Hub images
- **Database**: RDS PostgreSQL
- **DNS**: Route53

### Deployment Guides

- **[DEPLOY-ARM-EC2.md](DEPLOY-ARM-EC2.md)** - EC2 Graviton ARM64 deployment guide
- **[CLOUDFRONT-UNIFIED-DEPLOYMENT.md](CLOUDFRONT-UNIFIED-DEPLOYMENT.md)** - CloudFront setup with domain routing
- **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)** - Complete deployment verification checklist

### Docker Build & Deploy

```bash
# Local: Build ARM64 images and push to Docker Hub
./docker-build-arm.sh

# EC2: Pull and run containers
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest
docker-compose -f docker-compose.prod-hub.yml up -d
```

### Key Configuration Files

- `docker-compose.prod-hub.yml` - Production container orchestration
- `nginx-unified.conf` - Domain-based routing (blogmine.ai.kr, api.blogmine.ai.kr)
- `backend/.env` - Environment variables (must have 600 permissions)
- `docker-build-arm.sh` - ARM64 multi-stage Docker build script

### Environment Variable Requirements

Production deployment requires `backend/.env` with:
- Database connection (RDS PostgreSQL)
- JWT secrets
- API keys (OpenAI, Naver)
- CORS origin
- Payment gateway credentials (Nicepay)

See [DEPLOY-ARM-EC2.md](DEPLOY-ARM-EC2.md#4-환경-변수-설정) for complete environment variable setup.
