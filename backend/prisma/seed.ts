import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 구독 플랜 생성
  const plans = [
    {
      name: 'FREE',
      displayName: '무료 체험',
      description: '7일간 서비스를 체험해보세요',
      price: 0,
      yearlyPrice: 0,
      monthlyCredits: 10,
      maxBlogPostsPerMonth: 5,
      maxPostLength: 300,
      maxKeywordTrackings: 3,
      maxPersonas: 1,
      allowPriorityQueue: false,
      allowAdvancedAnalytics: false,
      allowApiAccess: false,
      allowCustomPersonas: false,
    },
    {
      name: 'BASIC',
      displayName: '베이직',
      description: '개인 블로거를 위한 기본 플랜',
      price: 9900,
      yearlyPrice: 99000, // 2개월 할인
      monthlyCredits: 50,
      maxBlogPostsPerMonth: 30,
      maxPostLength: 500,
      maxKeywordTrackings: 10,
      maxPersonas: 3,
      allowPriorityQueue: false,
      allowAdvancedAnalytics: false,
      allowApiAccess: false,
      allowCustomPersonas: true,
    },
    {
      name: 'PRO',
      displayName: '프로',
      description: '전문 블로거를 위한 프리미엄 플랜',
      price: 29900,
      yearlyPrice: 299000, // 2개월 할인
      monthlyCredits: 200,
      maxBlogPostsPerMonth: 100,
      maxPostLength: 1000,
      maxKeywordTrackings: 50,
      maxPersonas: 10,
      allowPriorityQueue: true,
      allowAdvancedAnalytics: true,
      allowApiAccess: false,
      allowCustomPersonas: true,
    },
    {
      name: 'ENTERPRISE',
      displayName: '엔터프라이즈',
      description: '대규모 팀을 위한 무제한 플랜',
      price: 99900,
      yearlyPrice: 999000, // 2개월 할인
      monthlyCredits: 1000,
      maxBlogPostsPerMonth: null, // 무제한
      maxPostLength: null, // 무제한
      maxKeywordTrackings: null, // 무제한
      maxPersonas: null, // 무제한
      allowPriorityQueue: true,
      allowAdvancedAnalytics: true,
      allowApiAccess: true,
      allowCustomPersonas: true,
    },
  ];

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(
      `✅ Created/Updated plan: ${created.displayName} (ID: ${created.id})`,
    );
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
