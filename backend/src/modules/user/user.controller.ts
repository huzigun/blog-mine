import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  UpdateBusinessInfoDto,
  ChangePasswordDto,
  ChangeEmailRequestDto,
  VerifyEmailChangeDto,
  SetPasswordDto,
} from './dto';
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

    if (!userWithBusinessInfo) {
      throw new NotFoundException('User not found');
    }

    return {
      id: userWithBusinessInfo.id,
      email: userWithBusinessInfo.email,
      name: userWithBusinessInfo.name,
      createdAt: userWithBusinessInfo.createdAt,
      businessInfo: userWithBusinessInfo.businessInfo,
      kakaoId: userWithBusinessInfo.kakaoId,
      kakaoNickname: userWithBusinessInfo.kakaoNickname,
      kakaoProfileImage: userWithBusinessInfo.kakaoProfileImage,
      kakaoConnectedAt: userWithBusinessInfo.kakaoConnectedAt,
      hasPassword: userWithBusinessInfo.password !== null,
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

  /**
   * 비밀번호 변경
   * POST /user/change-password
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetRequestUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.id, dto);
  }

  /**
   * 이메일 변경 요청 (인증 코드 전송)
   * POST /user/request-email-change
   */
  @Post('request-email-change')
  @HttpCode(HttpStatus.OK)
  async requestEmailChange(
    @GetRequestUser() user: RequestUser,
    @Body() dto: ChangeEmailRequestDto,
  ) {
    return this.userService.requestEmailChange(user.id, dto);
  }

  /**
   * 이메일 변경 확인 (인증 코드 검증 후 이메일 업데이트)
   * POST /user/verify-email-change
   */
  @Post('verify-email-change')
  @HttpCode(HttpStatus.OK)
  async verifyEmailChange(
    @GetRequestUser() user: RequestUser,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    return this.userService.verifyAndChangeEmail(user.id, dto);
  }

  /**
   * 비밀번호 설정/변경 (카카오 사용자용)
   * POST /user/set-password
   */
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @GetRequestUser() user: RequestUser,
    @Body() dto: SetPasswordDto,
  ) {
    return this.userService.setPassword(user.id, dto);
  }
}
