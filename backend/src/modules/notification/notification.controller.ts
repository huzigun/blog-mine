import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Sse,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SseAuthGuard } from '@modules/auth/guards/sse-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { NotificationService } from './notification.service';
import { FilterNotificationDto } from './dto';

interface MessageEvent {
  data: string;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * 알림 목록 조회
   * GET /notifications
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @GetRequestUser('id') userId: number,
    @Query() filter: FilterNotificationDto,
    @Query('isRead') isReadRaw?: string,
  ) {
    // enableImplicitConversion이 'false' 문자열을 true로 변환하는 버그 우회
    // 쿼리스트링 원본 값을 직접 파싱
    if (isReadRaw === 'false') {
      filter.isRead = false;
    } else if (isReadRaw === 'true') {
      filter.isRead = true;
    } else if (isReadRaw === undefined) {
      filter.isRead = undefined;
    }

    return this.notificationService.findAll(userId, filter);
  }

  /**
   * 읽지 않은 알림 수 조회
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@GetRequestUser('id') userId: number) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * SSE 스트림 연결
   * GET /notifications/stream
   * EventSource는 Authorization 헤더를 지원하지 않으므로
   * 쿼리스트링으로 토큰을 전달받아 인증 (SseAuthGuard)
   */
  @Sse('stream')
  @UseGuards(SseAuthGuard)
  stream(@GetRequestUser('id') userId: number): Observable<MessageEvent> {
    return this.notificationService.subscribe(userId);
  }

  /**
   * 단일 알림 읽음 처리
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @GetRequestUser('id') userId: number,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  /**
   * 전체 알림 읽음 처리
   * PATCH /notifications/read-all
   */
  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@GetRequestUser('id') userId: number) {
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * 알림 삭제
   * DELETE /notifications/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @GetRequestUser('id') userId: number,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    await this.notificationService.delete(userId, notificationId);
  }
}
