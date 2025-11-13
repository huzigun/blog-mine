import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto, UpdateCardDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { RequestUser } from '@modules/auth/strategies/jwt.strategy';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  /**
   * 내 카드 목록 조회
   * GET /cards
   */
  @Get()
  findAll(@GetRequestUser() user: RequestUser) {
    return this.cardService.findAll(user.id);
  }

  /**
   * 기본 카드 조회
   * GET /cards/default
   */
  @Get('default')
  findDefault(@GetRequestUser() user: RequestUser) {
    return this.cardService.findDefault(user.id);
  }

  /**
   * 특정 카드 조회
   * GET /cards/:id
   */
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    return this.cardService.findOne(id, user.id);
  }

  /**
   * 카드 등록
   * POST /cards
   */
  @Post()
  create(
    @GetRequestUser() user: RequestUser,
    @Body() createCardDto: CreateCardDto,
  ) {
    return this.cardService.create(user.id, createCardDto);
  }

  /**
   * 카드 정보 수정
   * PATCH /cards/:id
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardService.update(id, user.id, updateCardDto);
  }

  /**
   * 기본 카드로 설정
   * PATCH /cards/:id/default
   */
  @Patch(':id/default')
  setDefault(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    return this.cardService.setDefault(id, user.id);
  }

  /**
   * 카드 삭제
   * DELETE /cards/:id
   */
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    return this.cardService.remove(id, user.id);
  }

  /**
   * 모든 카드 삭제 (계정 삭제 시 사용)
   * DELETE /cards
   */
  @Delete()
  removeAll(@GetRequestUser() user: RequestUser) {
    return this.cardService.removeAll(user.id);
  }
}
