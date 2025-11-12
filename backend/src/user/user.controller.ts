import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateBusinessInfoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 사용자 정보 조회
   * GET /user/me
   */
  @Get('me')
  async getMe(@GetRequestUser() user: RequestUser) {
    const userWithBusinessInfo =
      await this.userService.findByIdWithBusinessInfo(user.id);

    return {
      id: userWithBusinessInfo.id,
      email: userWithBusinessInfo.email,
      name: userWithBusinessInfo.name,
      createdAt: userWithBusinessInfo.createdAt,
      businessInfo: userWithBusinessInfo.businessInfo,
    };
  }

  /**
   * 사업자 정보 조회
   * GET /user/business-info
   */
  @Get('business-info')
  async getBusinessInfo(@GetRequestUser() user: RequestUser) {
    return this.userService.getBusinessInfo(user.id);
  }

  /**
   * 사업자 정보 생성 또는 업데이트
   * PUT /user/business-info
   */
  @Put('business-info')
  async updateBusinessInfo(
    @GetRequestUser() user: RequestUser,
    @Body() dto: UpdateBusinessInfoDto,
  ) {
    return this.userService.upsertBusinessInfo(user.id, dto);
  }
}
