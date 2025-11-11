import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { PersonaService } from './persona.service';
import { CreatePersonaDto, UpdatePersonaDto, PaginationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  /**
   * 새로운 페르소나를 생성합니다.
   */
  @Post()
  create(
    @Body() createPersonaDto: CreatePersonaDto,
    @GetRequestUser() user: RequestUser,
  ) {
    // userId를 현재 로그인한 사용자로 설정
    return this.personaService.create(user.id, createPersonaDto);
  }

  /**
   * 모든 페르소나를 페이지네이션과 함께 조회합니다 (관리자용).
   */
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.personaService.findAll(paginationDto);
  }

  /**
   * 현재 사용자의 모든 페르소나를 페이지네이션과 함께 조회합니다.
   */
  @Get('my')
  findMyPersonas(
    @GetRequestUser() user: RequestUser,
    @Query() paginationDto: PaginationDto,
  ) {
    console.log(paginationDto);
    return this.personaService.findByUserId(user.id, paginationDto);
  }

  /**
   * ID로 특정 페르소나를 조회합니다.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personaService.findOne(id);
  }

  /**
   * 페르소나 정보를 수정합니다.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonaDto: UpdatePersonaDto,
    @GetRequestUser() user: RequestUser,
  ) {
    return this.personaService.update(id, user.id, updatePersonaDto);
  }

  /**
   * 페르소나를 삭제합니다.
   */
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    return this.personaService.remove(id, user.id);
  }
}
