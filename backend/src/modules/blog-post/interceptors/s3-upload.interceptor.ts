import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { S3Service } from '@lib/integrations/s3';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';

// CommonJS 모듈 - esModuleInterop 없이 사용
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');

/**
 * S3 직접 업로드 인터셉터
 * - 파일을 메모리에 버퍼링하지 않고 바로 S3로 스트리밍
 * - ZIP 파일만 허용, 최대 500MB
 */
@Injectable()
export class S3UploadInterceptor implements NestInterceptor {
  private readonly allowedMimes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
  ];

  constructor(private readonly s3Service: S3Service) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // JWT에서 userId 추출 (이미 JwtAuthGuard에 의해 설정됨)
    const userId = (req as Request & { user?: { id: number } }).user?.id;

    if (!userId) {
      throw new BadRequestException('인증 정보가 없습니다.');
    }

    // multer-s3 스토리지 설정
    const storage = multerS3({
      s3: this.s3Service.getS3Client(),
      bucket: this.s3Service.getBucket(),
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const timestamp = Date.now();
        const uuid = randomBytes(4).toString('hex');
        const safeFilename = this.sanitizeFilename(file.originalname);
        const key = `blog-mine/deploy-attachments/${userId}/${timestamp}_${uuid}_${safeFilename}`;
        cb(null, key);
      },
    });

    const upload = multer({
      storage,
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (_req, file, cb) => {
        if (
          this.allowedMimes.includes(file.mimetype) ||
          file.originalname.toLowerCase().endsWith('.zip')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('ZIP 파일만 업로드 가능합니다.'));
        }
      },
    }).single('attachmentFile');

    // multer 처리를 Promise로 래핑
    await new Promise<void>((resolve, reject) => {
      upload(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof Error) {
            reject(err);
          } else if (typeof err === 'string') {
            reject(new Error(err));
          } else {
            reject(new Error('파일 업로드 중 오류가 발생했습니다.'));
          }
        } else {
          resolve();
        }
      });
    });

    return next.handle();
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
      .replace(/__+/g, '_')
      .substring(0, 100);
  }
}
