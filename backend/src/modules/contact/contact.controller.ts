import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * 문의 생성 (비회원 가능)
   * POST /contact
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createContactDto: CreateContactDto) {
    const contact = await this.contactService.create(createContactDto);

    return {
      success: true,
      message: '문의가 성공적으로 접수되었습니다.',
      data: {
        id: contact.id,
        createdAt: contact.createdAt,
      },
    };
  }
}
