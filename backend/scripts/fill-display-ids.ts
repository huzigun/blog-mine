/**
 * 빈 displayId를 채워넣는 스크립트
 *
 * 사용법:
 * npx ts-node scripts/fill-display-ids.ts
 *
 * 또는 (prisma 환경에서)
 * npx tsx scripts/fill-display-ids.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE36_MAX = 46655; // ZZZ in Base36

/**
 * 숫자를 Base36 문자열로 변환 (3자리 패딩)
 */
function toBase36Padded(num: number): string {
  if (num < 0 || num > BASE36_MAX) {
    return String(num); // 범위 초과 시 숫자 그대로
  }

  const d2 = Math.floor(num / (36 * 36));
  const d1 = Math.floor((num % (36 * 36)) / 36);
  const d0 = num % 36;

  return BASE36_CHARS[d2] + BASE36_CHARS[d1] + BASE36_CHARS[d0];
}

/**
 * KST 기준 날짜 문자열 생성 (YYYYMMDD)
 */
function getDatePrefix(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

async function main() {
  console.log('🔍 빈 displayId가 있는 BlogPost 조회 중...');

  // displayId가 빈 문자열인 레코드 조회
  const postsWithoutDisplayId = await prisma.blogPost.findMany({
    where: {
      displayId: '',
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  if (postsWithoutDisplayId.length === 0) {
    console.log('✅ 모든 BlogPost에 displayId가 있습니다.');
    return;
  }

  console.log(`📝 ${postsWithoutDisplayId.length}개의 BlogPost에 displayId가 없습니다.`);

  // 날짜별로 그룹화
  const postsByDate = new Map<string, typeof postsWithoutDisplayId>();

  for (const post of postsWithoutDisplayId) {
    const datePrefix = getDatePrefix(post.createdAt);
    if (!postsByDate.has(datePrefix)) {
      postsByDate.set(datePrefix, []);
    }
    postsByDate.get(datePrefix)!.push(post);
  }

  // 각 날짜별로 처리
  for (const [datePrefix, posts] of postsByDate) {
    console.log(`\n📅 ${datePrefix}: ${posts.length}개 처리 중...`);

    // 해당 날짜의 기존 displayId 중 가장 큰 시퀀스 찾기
    const existingPost = await prisma.blogPost.findFirst({
      where: {
        displayId: {
          startsWith: datePrefix,
        },
        NOT: {
          displayId: '',
        },
      },
      orderBy: {
        displayId: 'desc',
      },
      select: {
        displayId: true,
      },
    });

    let nextSequence = 0;

    if (existingPost && existingPost.displayId) {
      const lastShortCode = existingPost.displayId.substring(8);

      if (lastShortCode.length === 3 && /^[0-9A-Z]{3}$/.test(lastShortCode)) {
        const d2 = BASE36_CHARS.indexOf(lastShortCode[0]);
        const d1 = BASE36_CHARS.indexOf(lastShortCode[1]);
        const d0 = BASE36_CHARS.indexOf(lastShortCode[2]);
        nextSequence = d2 * 36 * 36 + d1 * 36 + d0 + 1;
      } else {
        nextSequence = parseInt(lastShortCode, 10) + 1;
      }
    }

    // 각 포스트에 displayId 부여
    for (const post of posts) {
      const displayId = datePrefix + toBase36Padded(nextSequence);

      await prisma.blogPost.update({
        where: { id: post.id },
        data: { displayId },
      });

      console.log(`  ✓ BlogPost ${post.id} → ${displayId}`);
      nextSequence++;
    }
  }

  console.log('\n✅ 모든 빈 displayId가 채워졌습니다.');
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
