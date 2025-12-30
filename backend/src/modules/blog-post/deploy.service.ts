import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DeployOrderDto } from './dto';
import { PrismaService } from '@lib/database/prisma.service';
import { S3Service } from '@lib/integrations/s3';
import { HelloDmService } from '@lib/integrations/hello-dm/hello-dm.service';
import { CreditService } from '@modules/credit/credit.service';
import { DateService } from '@lib/date';

/**
 * 배포 처리 결과
 */
export interface DeployResult {
  success: boolean;
  blogPostId: number;
  helloPostNo?: number;
  creditUsed: number;
  message: string;
  attachmentUrl?: string;
  postsFileUrl?: string;
}

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly helloDmService: HelloDmService,
    private readonly creditService: CreditService,
    private readonly dateService: DateService,
  ) {}

  /**
   * HTML 태그를 제거하고 순수 텍스트로 변환
   * - <br>, <p>, <div> 등은 줄바꿈으로 변환
   * - 나머지 HTML 태그 제거
   * - 연속된 줄바꿈 정리
   * - HTML 엔티티 디코딩
   */
  private htmlToPlainText(html: string): string {
    if (!html) return '';

    let text = html;

    // 블록 요소를 줄바꿈으로 변환
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/tr>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');

    // 모든 HTML 태그 제거
    text = text.replace(/<[^>]+>/g, '');

    // HTML 엔티티 디코딩
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");
    text = text.replace(/&apos;/gi, "'");

    // 연속된 공백을 하나로 정리 (줄바꿈 제외)
    text = text.replace(/[^\S\n]+/g, ' ');

    // 연속된 줄바꿈을 최대 2개로 정리
    text = text.replace(/\n{3,}/g, '\n\n');

    // 각 줄의 앞뒤 공백 제거
    text = text
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // 앞뒤 공백 제거
    text = text.trim();

    return text;
  }

  /**
   * 원고 배포 요청 처리
   * 1. blogPostId 소유권 확인
   * 2. 상품 조회 및 크레딧 확인
   * 3. 원고 TXT 파일 생성 및 S3 업로드
   * 4. HelloDM API로 배포 신청
   * 5. 성공 시 post_no 기록 및 크레딧 차감 (트랜잭션)
   */
  async deployBlogPost(
    userId: number,
    blogPostId: number,
    dto: DeployOrderDto,
    attachmentFile?: Express.MulterS3.File,
  ): Promise<DeployResult> {
    this.logger.log(
      `배포 요청 시작 - userId: ${userId}, blogPostId: ${blogPostId}`,
    );

    // 1. blogPost 소유권 확인
    const blogPost = await this.prisma.blogPost.findFirst({
      where: {
        id: blogPostId,
        userId,
      },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!blogPost) {
      this.logger.warn(
        `BlogPost not found or not owned - id: ${blogPostId}, userId: ${userId}`,
      );
      throw new ForbiddenException(
        '원고를 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    // 이미 배포된 원고인지 확인
    if (blogPost.helloPostNo) {
      throw new BadRequestException(
        `이미 배포된 원고입니다. (HelloDM Post No: ${blogPost.helloPostNo})`,
      );
    }

    // 2. 상품 조회 및 크레딧 확인
    const product = await this.prisma.deployProduct.findFirst({
      where: {
        id: dto.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('유효하지 않은 배포 상품입니다.');
    }

    const creditCost = product.credit;

    // 크레딧 잔액 확인
    const balance = await this.creditService.getBalance(userId);
    if (balance.totalCredits < creditCost) {
      throw new BadRequestException(
        `크레딧이 부족합니다. (필요: ${creditCost}, 보유: ${balance.totalCredits})`,
      );
    }

    // 3. 원고 TXT 파일 생성 및 S3 업로드
    let postsFileUrl: string | undefined;

    if (blogPost.posts.length > 0) {
      const separator = '\n\n' + '='.repeat(60) + '\n\n';
      const txtContent = blogPost.posts
        .map((post, index) => {
          const title = post.title || '(제목 없음)';
          const content = this.htmlToPlainText(post.content || '(내용 없음)');
          return `[원고 ${index + 1}]\n[제목: ${title}]\n\n${content}`;
        })
        .join(separator);

      const timestamp = Date.now();
      const key = `blog-mine/deploy-posts/${userId}/${blogPostId}_${timestamp}.txt`;
      const buffer = Buffer.from(txtContent, 'utf-8');

      const uploadResult = await this.s3Service.uploadFile(
        key,
        buffer,
        'text/plain; charset=utf-8',
      );

      if (!uploadResult.success) {
        this.logger.error(`원고 파일 업로드 실패 - blogPostId: ${blogPostId}`);
        throw new BadRequestException('원고 파일 업로드에 실패했습니다.');
      }

      postsFileUrl = this.s3Service.getUrlFromKey(key);
      this.logger.log(`원고 파일 업로드 완료 - ${postsFileUrl}`);
    } else {
      throw new BadRequestException('배포할 원고가 없습니다.');
    }

    // 첨부파일 URL (이미 S3UploadInterceptor에서 업로드됨)
    const attachmentUrl = attachmentFile
      ? this.s3Service.getUrlFromKey(attachmentFile.key)
      : undefined;

    // 4. 트랜잭션: 크레딧 차감 → 배포 신청 → post_no 기록
    // 크레딧 차감이 실패하면 배포 신청 자체가 실행되지 않음
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 4-1. 크레딧 차감 (먼저 실행 - 실패 시 배포 안함)
        const account = await tx.creditAccount.findUnique({
          where: { userId },
        });

        if (!account) {
          throw new BadRequestException('크레딧 계정을 찾을 수 없습니다.');
        }

        if (account.totalCredits < creditCost) {
          throw new BadRequestException(
            `크레딧이 부족합니다. (필요: ${creditCost}, 보유: ${account.totalCredits})`,
          );
        }

        // 차감할 크레딧 계산 (우선순위: bonus → subscription → purchased)
        let remaining = creditCost;
        const updates: {
          bonusCredits?: { decrement: number };
          subscriptionCredits?: { decrement: number };
          purchasedCredits?: { decrement: number };
          totalCredits: { decrement: number };
          lastUsedAt: Date;
        } = {
          totalCredits: { decrement: creditCost },
          lastUsedAt: new Date(),
        };

        let usedCreditType: 'BONUS' | 'SUBSCRIPTION' | 'PURCHASED' =
          account.bonusCredits > 0
            ? 'BONUS'
            : account.subscriptionCredits > 0
              ? 'SUBSCRIPTION'
              : 'PURCHASED';

        if (account.bonusCredits >= remaining) {
          updates.bonusCredits = { decrement: remaining };
          usedCreditType = 'BONUS';
          remaining = 0;
        } else if (account.bonusCredits > 0) {
          updates.bonusCredits = { decrement: account.bonusCredits };
          remaining -= account.bonusCredits;
        }

        if (remaining > 0) {
          if (account.subscriptionCredits >= remaining) {
            updates.subscriptionCredits = { decrement: remaining };
            if (usedCreditType !== 'BONUS') usedCreditType = 'SUBSCRIPTION';
            remaining = 0;
          } else if (account.subscriptionCredits > 0) {
            updates.subscriptionCredits = {
              decrement: account.subscriptionCredits,
            };
            remaining -= account.subscriptionCredits;
          }
        }

        if (remaining > 0) {
          updates.purchasedCredits = { decrement: remaining };
          usedCreditType = 'PURCHASED';
        }

        // 크레딧 계정 업데이트 (차감)
        await tx.creditAccount.update({
          where: { userId },
          data: updates,
        });

        this.logger.log(
          `크레딧 차감 완료 - userId: ${userId}, amount: ${creditCost}`,
        );

        // 4-2. HelloDM API로 배포 신청 (크레딧 차감 성공 후 실행)
        const helloDmResult = await this.helloDmService.requestPost({
          adcompany: dto.companyName,
          adhp: dto.applicantPhone,
          ademail: dto.applicantEmail,
          title: dto.deployTitle,
          order_item: product.itemId,
          mosu: blogPost.posts.length,
          okday_cnt: dto.dailyUploadCount,
          guidelink: postsFileUrl,
          gdrive: attachmentUrl,
        });

        if (!helloDmResult.success) {
          this.logger.error(
            `HelloDM API 호출 실패 - blogPostId: ${blogPostId}, message: ${helloDmResult.message}`,
          );
          // 트랜잭션 롤백되어 크레딧 차감도 취소됨
          throw new BadRequestException(
            helloDmResult.message || '배포 신청에 실패했습니다.',
          );
        }

        const helloPostNo = helloDmResult.postNo;
        this.logger.log(
          `HelloDM API 성공 - blogPostId: ${blogPostId}, postNo: ${helloPostNo}`,
        );

        // 4-3. BlogPost에 helloPostNo와 deployedAt 기록
        await tx.blogPost.update({
          where: { id: blogPostId },
          data: {
            helloPostNo: helloPostNo,
            deployedAt: new Date(),
          },
        });

        // 4-4. 크레딧 거래 내역 생성 (성공 후 기록)
        await tx.creditTransaction.create({
          data: {
            accountId: account.id,
            userId,
            type: 'USAGE',
            amount: -creditCost,
            balanceBefore: account.totalCredits,
            balanceAfter: account.totalCredits - creditCost,
            creditType: usedCreditType,
            referenceType: 'blog_post_deploy',
            referenceId: blogPostId,
            metadata: JSON.stringify({
              productId: product.id,
              productName: product.name,
              helloPostNo,
            }),
          },
        });

        return { helloPostNo, usedCreditType };
      });

      this.logger.log(
        `배포 완료 - blogPostId: ${blogPostId}, postNo: ${result.helloPostNo}, creditUsed: ${creditCost}`,
      );

      return {
        success: true,
        blogPostId,
        helloPostNo: result.helloPostNo,
        creditUsed: creditCost,
        message: '배포가 성공적으로 완료되었습니다.',
        attachmentUrl,
        postsFileUrl,
      };
    } catch (error) {
      this.logger.error(
        `배포 실패 - blogPostId: ${blogPostId}, error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
