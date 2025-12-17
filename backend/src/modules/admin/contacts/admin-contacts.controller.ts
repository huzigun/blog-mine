import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  AdminContactsService,
  AdminContactsQuery,
  UpdateContactStatusDto,
  RespondContactDto,
} from './admin-contacts.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/contacts')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminContactsController {
  constructor(private readonly contactsService: AdminContactsService) {}

  /**
   * 문의 목록 조회
   */
  @Get()
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findAll(@Query() query: AdminContactsQuery) {
    return this.contactsService.findAll(query);
  }

  /**
   * 문의 통계 조회
   */
  @Get('stats')
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async getStats() {
    return this.contactsService.getStats();
  }

  /**
   * 문의 상세 조회
   */
  @Get(':id')
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactsService.findOne(id);
  }

  /**
   * 문의 상태 변경
   */
  @Patch(':id/status')
  @Roles('SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactStatusDto,
    @CurrentAdmin() admin: { userId: number },
  ) {
    return this.contactsService.updateStatus(id, dto, admin.userId);
  }

  /**
   * 문의 답변 등록
   */
  @Post(':id/respond')
  @Roles('SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondContactDto,
    @CurrentAdmin() admin: { userId: number },
  ) {
    return this.contactsService.respond(id, dto, admin.userId);
  }

  /**
   * 문의 삭제
   */
  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: { userId: number },
  ) {
    return this.contactsService.remove(id, admin.userId);
  }
}
