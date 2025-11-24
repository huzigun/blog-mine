import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';

export interface LogPromptParams {
  userId: number;
  blogPostId?: number;
  aiPostId?: number;
  systemPrompt: string;
  userPrompt: string;
  fullPrompt?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  response?: string;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  purpose?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PromptLogService {
  private readonly logger = new Logger(PromptLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 프롬프트 로그 저장
   */
  async logPrompt(params: LogPromptParams) {
    try {
      const log = await this.prisma.promptLog.create({
        data: {
          userId: params.userId,
          blogPostId: params.blogPostId,
          aiPostId: params.aiPostId,
          systemPrompt: params.systemPrompt,
          userPrompt: params.userPrompt,
          fullPrompt: params.fullPrompt,
          model: params.model,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens,
          response: params.response,
          responseTime: params.responseTime,
          success: params.success,
          errorMessage: params.errorMessage,
          purpose: params.purpose,
          metadata: params.metadata || {},
        },
      });

      this.logger.debug(
        `Prompt logged: ${log.id} (purpose: ${params.purpose}, success: ${params.success})`,
      );

      return log;
    } catch (error) {
      this.logger.error(`Failed to log prompt: ${error.message}`, error.stack);
      // 로깅 실패는 메인 프로세스에 영향을 주지 않음
      return null;
    }
  }

  /**
   * 특정 BlogPost의 프롬프트 로그 조회
   */
  async findByBlogPostId(blogPostId: number) {
    return this.prisma.promptLog.findMany({
      where: { blogPostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 특정 AIPost의 프롬프트 로그 조회
   */
  async findByAIPostId(aiPostId: number) {
    return this.prisma.promptLog.findMany({
      where: { aiPostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 사용자의 프롬프트 로그 조회 (최근 N개)
   */
  async findByUserId(userId: number, limit = 100) {
    return this.prisma.promptLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 프롬프트 통계 분석 (특정 purpose별)
   */
  async getStatsByPurpose(purpose: string) {
    const logs = await this.prisma.promptLog.findMany({
      where: { purpose },
      select: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        responseTime: true,
        success: true,
      },
    });

    if (logs.length === 0) {
      return null;
    }

    const successCount = logs.filter((log) => log.success).length;
    const totalPromptTokens = logs.reduce(
      (sum, log) => sum + (log.promptTokens || 0),
      0,
    );
    const totalCompletionTokens = logs.reduce(
      (sum, log) => sum + (log.completionTokens || 0),
      0,
    );
    const totalTokensSum = logs.reduce(
      (sum, log) => sum + (log.totalTokens || 0),
      0,
    );
    const totalResponseTime = logs.reduce(
      (sum, log) => sum + (log.responseTime || 0),
      0,
    );

    return {
      purpose,
      totalLogs: logs.length,
      successCount,
      failureCount: logs.length - successCount,
      successRate: (successCount / logs.length) * 100,
      avgPromptTokens: totalPromptTokens / logs.length,
      avgCompletionTokens: totalCompletionTokens / logs.length,
      avgTotalTokens: totalTokensSum / logs.length,
      avgResponseTime: totalResponseTime / logs.length,
    };
  }
}
