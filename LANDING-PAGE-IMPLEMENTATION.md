# Landing Page Implementation - Figma Design Integration

**Implementation Date**: 2025-01-04
**Status**: ✅ Design Tokens Applied, 🚧 Full Integration In Progress
**Figma Design**: [블로그마인AI 랜딩페이지 요청안](https://www.figma.com/design/fqmdW8Y6NUKMEeINLg5VnP/%EB%B8%94%EB%A1%9C%EA%B7%B8%EB%A7%88%EC%9D%B8AI-%EB%9E%9C%EB%94%A9%ED%8E%98%EC%9D%B4%EC%A7%80-%EC%9A%94%EC%B2%AD%EC%95%88?node-id=289-30170&m=dev)

## Overview

BlogMine AI 랜딩페이지를 Figma 디자인과 완전히 일치하도록 구현하는 작업입니다. Figma REST API를 통해 정확한 디자인 토큰(색상, 타이포그래피, 간격)을 추출하고 Tailwind CSS v4의 `@theme` 시스템에 적용했습니다.

## Completed Implementation

### 1. Design Token Extraction & Configuration

#### Colors (Exact from Figma)

**Primary Blue** - `#1f5eff`
```css
--color-primary-50: #eaf1ff;
--color-primary-100: #d6edff;
--color-primary-200: #7fb3ff;
--color-primary-300: #50a2ff;
--color-primary-400: #4a7dff;
--color-primary-500: #1f5eff;  /* Main brand color */
--color-primary-600: #1f5efe;
--color-primary-700: #1e437a;
--color-primary-800: #0f2046;
--color-primary-900: #0a0a0a;
--color-primary-950: #000000;
```

**Neutral/Gray Scale**
```css
--color-neutral-50: #ffffff;
--color-neutral-100: #d9d9d9;
--color-neutral-200: #d0d5db;
--color-neutral-300: #c7c7c7;
--color-neutral-400: #99a1ae;
--color-neutral-500: #616161;
--color-neutral-600: #333333;
--color-neutral-700: #212121;
--color-neutral-800: #1e2329;
--color-neutral-900: #1a1a2e;
--color-neutral-950: #0a0a0a;
```

**File**: [frontend/app/assets/css/main.css](frontend/app/assets/css/main.css#L4-L114)

#### Typography (Pretendard Variable)

**Font Configuration**
```css
--font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, ...;
```

**Font Sizes (Exact from Figma)**
```css
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 18px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 30px;
--font-size-4xl: 36px;
--font-size-5xl: 48px;
--font-size-6xl: 60px;
```

**Letter Spacing (Hero Section)**
```css
--letter-spacing-hero-h1: -1.44px;    /* 48px headline */
--letter-spacing-hero-h2: -0.96px;    /* 32px subheading */
--letter-spacing-tight: -0.42px;
--letter-spacing-normal: -0.48px;
```

**Pretendard Variable Font Loading**
```typescript
// nuxt.config.ts
app: {
  head: {
    link: [
      {
        rel: 'stylesheet',
        href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
      },
    ],
  },
}
```

### 2. Hero Section - Exact Figma Implementation

#### Layout Measurements

**Desktop (lg breakpoint)**
- Padding: `120px` top/bottom, `200px` left/right
- Gap between elements: `40px`

**Mobile**
- Padding: `64px` all sides
- Gap: `64px`

**Implementation**
```vue
<!-- frontend/app/pages/index.vue -->
<div class="relative container mx-auto max-w-7xl px-16 py-[120px] lg:px-[200px]">
  <div class="grid lg:grid-cols-2 gap-10 lg:gap-10 items-center">
    <!-- Content -->
  </div>
</div>
```

**File**: [frontend/app/pages/index.vue:167-171](frontend/app/pages/index.vue#L167-L171)

#### Typography Measurements

**H1 Headline** - "이제 '잘 되는 글'만 쓰세요."
- Font: Pretendard Variable
- Size: `48px` (desktop), `40px` (tablet), `32px` (mobile)
- Weight: `600` (semibold)
- Line Height: `1.5` (150%)
- Letter Spacing: `-1.44px`

**Subheading** - "AI로 패턴 분석부터 원고 생성, 배포, 추적까지 한 번에."
- Size: `24px` (desktop), `20px` (tablet), `18px` (mobile)
- Weight: `500` (medium)
- Letter Spacing: `-0.96px`

**Implementation**
```vue
<h1
  class="text-[32px] sm:text-[40px] lg:text-[48px] font-semibold text-neutral-900 dark:text-neutral-100 leading-[1.5]"
  style="letter-spacing: -1.44px;"
>
  이제 '잘 되는 글'만<br />쓰세요.
</h1>
<p
  class="text-lg sm:text-xl lg:text-2xl font-medium text-primary-600 dark:text-primary-400 leading-[1.5]"
  style="letter-spacing: -0.96px;"
>
  AI로 패턴 분석부터 원고 생성,<br />
  배포, 추적까지 한 번에.
</p>
```

**File**: [frontend/app/pages/index.vue:184-199](frontend/app/pages/index.vue#L184-L199)

### 3. Figma API Integration

#### MCP Server Configuration

**Configuration** - `.claude/settings.json` (project root)
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "figd_..."
      }
    }
  }
}
```

**Security**: Added `.claude` to `.gitignore` to protect access tokens

#### Design Extraction Method

Due to MCP server initialization timing, used Figma REST API directly:

**Extract Colors**
```bash
curl -H "X-Figma-Token: ..." \
  "https://api.figma.com/v1/files/fqmdW8Y6NUKMEeINLg5VnP" \
  | python3 -c "# Extract RGB → HEX conversion"
```

**Extract Typography**
```bash
curl -H "X-Figma-Token: ..." \
  "https://api.figma.com/v1/files/fqmdW8Y6NUKMEeINLg5VnP" \
  | python3 -c "# Extract font styles, sizes, letter-spacing"
```

**Extract Layout Measurements**
```bash
curl -H "X-Figma-Token: ..." \
  "https://api.figma.com/v1/files/fqmdW8Y6NUKMEeINLg5VnP/nodes?ids=289:29717" \
  | python3 -c "# Extract padding, gap, layout properties"
```

#### Image Assets

Successfully extracted 100+ image asset URLs from Figma:
```bash
curl -H "X-Figma-Token: ..." \
  "https://api.figma.com/v1/files/fqmdW8Y6NUKMEeINLg5VnP/images"
```

**Status**: URLs available but not yet integrated into components

## Figma Design Structure

Based on REST API extraction, the landing page has these sections:

1. **Hero Section** - Main headline, stats counter, CTA
2. **Feature Cards 4 (Pain Points)** - 3 problem cards
3. **How It Works** - 5-step process
4. **Inside the BloC** - 3 feature cards
5. **Pricing** - 4 tier plans
6. **FAQ** - 5 questions
7. **Final CTA**
8. **Footer**

## Technical Implementation Details

### Tailwind CSS v4 Integration

**Configuration Method**: Using `@theme static` blocks in CSS files (not separate config files)

**Example**:
```css
/* frontend/app/assets/css/main.css */
@theme static {
  --font-sans: 'Pretendard Variable', ...;
  --color-primary-500: #1f5eff;
  --font-size-5xl: 48px;
  --letter-spacing-hero-h1: -1.44px;
}
```

### Nuxt UI v4 Components

Using semantic color names:
- `color="primary"` - Primary blue (#1f5eff)
- `color="neutral"` - Gray scale
- `color="success"`, `color="error"`, etc.

**Example**:
```vue
<UButton
  color="primary"
  size="xl"
  to="/auth/register"
  icon="i-heroicons-rocket-launch"
>
  지금 바로 시작하기
</UButton>
```

### Dark Mode Support

All design tokens support dark mode with appropriate variations:
```css
--color-primary-50: #eaf1ff;  /* Light mode background */
--color-primary-900: #0a0a0a; /* Dark mode background */
```

## File Structure

```
frontend/
├── app/
│   ├── assets/css/
│   │   └── main.css                 # Tailwind v4 theme with Figma tokens
│   ├── pages/
│   │   └── index.vue                # Landing page implementation
│   └── layouts/
│       └── landing.vue              # Landing layout wrapper
├── nuxt.config.ts                   # Pretendard Variable font config
└── package.json                     # Dependencies
```

## Remaining Tasks

### High Priority
- [ ] Integrate Figma image assets into Hero section
- [ ] Apply exact measurements to Pain Points section
- [ ] Apply exact measurements to How It Works section
- [ ] Apply exact measurements to FAQ section
- [ ] Implement Pricing section with Figma design

### Medium Priority
- [ ] Extract and apply exact spacing for all sections
- [ ] Verify responsive breakpoints match Figma mobile designs
- [ ] Add microinteractions and animations from Figma
- [ ] Implement "Inside the BloC" feature cards
- [ ] Create Final CTA section with exact design

### Low Priority
- [ ] Footer implementation
- [ ] Page transition animations
- [ ] Scroll-triggered animations
- [ ] Performance optimization (image lazy loading, etc.)

## Design Token Reference

### Spacing Scale (from Figma)
- `64px` - Mobile padding, section gap
- `120px` - Desktop vertical padding
- `200px` - Desktop horizontal padding
- `40px` - Element gap (desktop)

### Typography Scale
| Element | Desktop | Tablet | Mobile | Weight | Tracking |
|---------|---------|--------|--------|--------|----------|
| H1 | 48px | 40px | 32px | 600 | -1.44px |
| H2 | 32px | 24px | 20px | 600 | -0.96px |
| Body | 16px | 16px | 14px | 500 | -0.48px |

### Color Usage Guidelines

**Primary Blue (#1f5eff)**
- Main CTA buttons
- Links and interactive elements
- Brand accents

**Neutral/Gray**
- Text content (neutral-900 in light mode)
- Backgrounds (neutral-50, neutral-100)
- Borders and dividers (neutral-200, neutral-300)

## Testing Checklist

- [ ] Typography matches Figma pixel-perfect
- [ ] Colors match Figma hex values exactly
- [ ] Spacing/padding matches Figma measurements
- [ ] Responsive breakpoints work correctly
- [ ] Dark mode displays properly
- [ ] Font weight and letter-spacing applied
- [ ] Hero section layout matches Figma
- [ ] All sections render correctly

## Known Issues

1. **Figma MCP Server**: Not available during development session - used REST API as fallback
2. **Image Assets**: URLs extracted but not yet integrated into components
3. **Sections**: Only Hero section fully implemented with exact measurements
4. **Animations**: Static implementation - Figma animations not yet replicated

## Next Session Preparation

**Recommended Starting Point**: Continue with exact Figma implementation

**Immediate Next Steps**:
1. Read extracted Figma image asset URLs
2. Integrate hero images into Hero section
3. Extract exact measurements for Pain Points section
4. Apply measurements to remaining sections sequentially

**Context to Preserve**:
- All design tokens are configured in [main.css](frontend/app/assets/css/main.css)
- Hero section template in [index.vue](frontend/app/pages/index.vue)
- Figma file URL and access patterns documented
- 100+ image assets available via Figma API

## References

- **Figma Design**: [요청안 링크](https://www.figma.com/design/fqmdW8Y6NUKMEeINLg5VnP/%EB%B8%94%EB%A1%9C%EA%B7%B8%EB%A7%88%EC%9D%B8AI-%EB%9E%9C%EB%94%A9%ED%8E%98%EC%9D%B4%EC%A7%80-%EC%9A%94%EC%B2%AD%EC%95%88?node-id=289-30170&m=dev)
- **Tailwind CSS v4 Docs**: https://tailwindcss.com/docs/v4-beta
- **Nuxt UI v4 Docs**: https://ui.nuxt.com
- **Pretendard Font**: https://github.com/orioncactus/pretendard
- **Project CLAUDE.md**: [Main documentation](CLAUDE.md)

---

**Last Updated**: 2025-01-04
**Implementation Progress**: 30% (Design tokens complete, Hero section precise, remaining sections in progress)
