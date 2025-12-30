import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// multer StorageEngine 타입 정의 (프로덕션 빌드에서 @types/multer 의존성 제거)
type StorageEngine = unknown;

// CommonJS 모듈 - esModuleInterop 없이 사용
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const multerS3: any = require('multer-s3');

// AUTO_CONTENT_TYPE 메서드 참조 (unbound-method 경고 방지)
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
const autoContentType = multerS3.AUTO_CONTENT_TYPE.bind(multerS3);

/**
 * 파일명 정규화 (특수문자 제거)
 * - multer-s3 콜백에서 this 스코핑 문제 방지를 위해 클래스 외부에 정의
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    .replace(/__+/g, '_')
    .substring(0, 100);
}

/**
 * S3 업로드 결과
 */
export interface S3UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * 업로드할 파일 정보
 */
export interface UploadFileInfo {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * S3에 업로드된 파일 정보
 * @deprecated Use Express.MulterS3.File from @types/multer-s3 instead
 */
export type S3File = Express.MulterS3.File;

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnDomain = 'cdn.atmsads.io';

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>(
      'AWS_REGION',
      'ap-northeast-2',
    );
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });

    this.logger.log(`S3 Service initialized - bucket: ${this.bucket}`);
  }

  /**
   * S3Client 인스턴스 반환 (multer-s3용)
   */
  getS3Client(): S3Client {
    return this.s3Client;
  }

  /**
   * 버킷 이름 반환
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * 배포 첨부파일용 multer-s3 스토리지 생성
   * - 스트리밍 방식으로 바로 S3에 업로드
   */
  createDeployAttachmentStorage(userId: number): StorageEngine {
    return multerS3({
      s3: this.s3Client,
      bucket: this.bucket,
      contentType: autoContentType,
      key: (_req, file, cb) => {
        const timestamp = Date.now();
        const uuid = randomBytes(4).toString('hex');
        const safeFilename = sanitizeFilename(file.originalname);
        const key = `blog-mine/deploy-attachments/${userId}/${timestamp}_${uuid}_${safeFilename}`;
        cb(null, key);
      },
    });
  }

  /**
   * 범용 multer-s3 스토리지 생성
   */
  createStorage(keyPrefix: string): StorageEngine {
    return multerS3({
      s3: this.s3Client,
      bucket: this.bucket,
      contentType: autoContentType,
      key: (_req, file, cb) => {
        const timestamp = Date.now();
        const uuid = randomBytes(4).toString('hex');
        const safeFilename = sanitizeFilename(file.originalname);
        const key = `${keyPrefix}/${timestamp}_${uuid}_${safeFilename}`;
        cb(null, key);
      },
    });
  }

  /**
   * 배포 첨부파일 업로드 (버퍼 방식 - 레거시 호환)
   * 경로: blog-mine/deploy-attachments/{userId}/{timestamp}_{uuid}_{filename}
   */
  async uploadDeployAttachment(
    userId: number,
    file: UploadFileInfo,
  ): Promise<S3UploadResult> {
    const timestamp = Date.now();
    const uuid = randomBytes(4).toString('hex');
    const safeFilename = sanitizeFilename(file.originalname);
    const key = `blog-mine/deploy-attachments/${userId}/${timestamp}_${uuid}_${safeFilename}`;

    return this.uploadFile(key, file.buffer, file.mimetype);
  }

  /**
   * 파일 업로드 (공통)
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<S3UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = this.getUrlFromKey(key);

      this.logger.log(`파일 업로드 성공 - key: ${key}`);

      return {
        success: true,
        key,
        url,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`파일 업로드 실패 - key: ${key}`, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`파일 삭제 성공 - key: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`파일 삭제 실패 - key: ${key}`, error);
      return false;
    }
  }

  /**
   * S3 Key를 CDN URL로 변환
   */
  getUrlFromKey(key: string): string {
    return `https://${this.cdnDomain}/${key}`;
  }
}
