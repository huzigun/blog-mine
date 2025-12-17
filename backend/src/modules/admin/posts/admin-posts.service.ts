import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { Prisma, PostStatus } from '@prisma/client';

export interface AdminPostsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | PostStatus;
  sortBy?: 'createdAt' | 'keyword' | 'completedCount';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AdminPostsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 블로그 포스트 목록 조회 (관리자용)
   */
  async findAll(query: AdminPostsQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Query 파라미터는 문자열로 들어오므로 숫자로 변환
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Where 조건 구성
    const where: Prisma.BlogPostWhereInput = {};

    // 검색 조건 (키워드 또는 사용자 이메일)
    if (search) {
      where.OR = [
        { keyword: { contains: search, mode: 'insensitive' } },
        { displayId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // 상태 필터
    if (status !== 'all') {
      where.status = status;
    }

    // 정렬 조건
    const orderBy: Prisma.BlogPostOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 전체 개수 조회
    const total = await this.prisma.blogPost.count({ where });

    // 블로그 포스트 목록 조회
    const posts = await this.prisma.blogPost.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      select: {
        id: true,
        displayId: true,
        keyword: true,
        postType: true,
        subKeywords: true,
        length: true,
        count: true,
        status: true,
        completedCount: true,
        targetCount: true,
        creditCost: true,
        lastError: true,
        errorAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return {
      data: posts.map((post) => ({
        ...post,
        aiPostsCount: post._count.posts,
        _count: undefined,
      })),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 블로그 포스트 상세 조회
   */
  async findOne(postId: number) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        displayId: true,
        keyword: true,
        persona: true,
        postType: true,
        subKeywords: true,
        length: true,
        count: true,
        additionalFields: true,
        status: true,
        completedCount: true,
        targetCount: true,
        creditCost: true,
        lastError: true,
        errorAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            retryCount: true,
            lastError: true,
            promptTokens: true,
            completionTokens: true,
            totalTokens: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('블로그 포스트를 찾을 수 없습니다.');
    }

    return post;
  }

  /**
   * 블로그 포스트 통계 조회
   */
  async getStats() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalPosts,
      pendingPosts,
      inProgressPosts,
      completedPosts,
      failedPosts,
      todayPosts,
      monthlyPosts,
      totalAIPosts,
      monthlyAIPosts,
    ] = await Promise.all([
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: 'PENDING' } }),
      this.prisma.blogPost.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.blogPost.count({ where: { status: 'COMPLETED' } }),
      this.prisma.blogPost.count({ where: { status: 'FAILED' } }),
      // 오늘 생성된 포스트
      this.prisma.blogPost.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      // 이번달 생성된 포스트
      this.prisma.blogPost.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
      // 총 AI 포스트 수
      this.prisma.aIPost.count(),
      // 이번달 AI 포스트 수
      this.prisma.aIPost.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalPosts,
      pendingPosts,
      inProgressPosts,
      completedPosts,
      failedPosts,
      todayPosts,
      monthlyPosts,
      totalAIPosts,
      monthlyAIPosts,
    };
  }

  /**
   * 블로그 포스트 상태 변경 (실패 → 대기중으로 재시도)
   */
  async retryPost(postId: number, adminId: number) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('블로그 포스트를 찾을 수 없습니다.');
    }

    if (post.status !== 'FAILED') {
      throw new Error('실패한 포스트만 재시도할 수 있습니다.');
    }

    const updated = await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        status: 'PENDING',
        lastError: null,
        errorAt: null,
      },
      select: {
        id: true,
        displayId: true,
        status: true,
        keyword: true,
      },
    });

    return {
      ...updated,
      message: '포스트가 재시도 대기 상태로 변경되었습니다.',
    };
  }

  /**
   * AI 포스트의 프롬프트 로그 조회
   */
  async getPromptLog(aiPostId: number) {
    const promptLog = await this.prisma.promptLog.findFirst({
      where: { aiPostId },
      select: {
        id: true,
        userId: true,
        blogPostId: true,
        aiPostId: true,
        systemPrompt: true,
        userPrompt: true,
        fullPrompt: true,
        model: true,
        temperature: true,
        maxTokens: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        response: true,
        responseTime: true,
        success: true,
        errorMessage: true,
        purpose: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!promptLog) {
      throw new NotFoundException('프롬프트 로그를 찾을 수 없습니다.');
    }

    return promptLog;
  }
}
