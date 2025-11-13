import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { NiceBillingService } from '@lib/integrations/nicepay/nice.billing.service';
import { CreateCardDto, UpdateCardDto } from './dto';

@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly niceBillingService: NiceBillingService,
  ) {}

  /**
   * 사용자의 모든 카드 조회
   */
  async findAll(userId: number) {
    return this.prisma.card.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * 특정 카드 조회
   */
  async findOne(id: number, userId: number) {
    const card = await this.prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      throw new NotFoundException('카드를 찾을 수 없습니다.');
    }

    return card;
  }

  /**
   * 사용자의 기본 카드 조회
   */
  async findDefault(userId: number) {
    return this.prisma.card.findFirst({
      where: { userId, isDefault: true },
    });
  }

  /**
   * 카드 등록
   * 1. NicePay 빌링키 발급 요청
   * 2. 발급된 빌링키를 customerKey로 사용하여 카드 정보 저장
   */
  async create(userId: number, createCardDto: CreateCardDto) {
    // 1. NicePay 빌링키 발급
    const billingResult = await this.niceBillingService.getBillingKey(
      {
        cardNo: createCardDto.cardNo,
        expireYear: createCardDto.expireYear,
        expireMonth: createCardDto.expireMonth,
        idNo: createCardDto.idNo,
        cardPw: createCardDto.cardPw,
      },
      userId.toString(),
    );

    if (!billingResult.success || !billingResult.originalData) {
      throw new BadRequestException(
        `카드 등록에 실패했습니다: ${billingResult.message}`,
      );
    }

    const { BID, CardCode, CardName, CardCl, cardNo } =
      billingResult.originalData;

    if (!BID) {
      throw new InternalServerErrorException(
        '빌링키 발급에 실패했습니다. 다시 시도해주세요.',
      );
    }

    // customerKey 중복 확인 (빌링키 기준)
    const existingCard = await this.prisma.card.findUnique({
      where: { customerKey: BID },
    });

    if (existingCard) {
      throw new BadRequestException('이미 등록된 카드입니다.');
    }

    // 첫 카드인 경우 자동으로 기본 카드로 설정
    const cardCount = await this.prisma.card.count({
      where: { userId },
    });

    const isFirstCard = cardCount === 0;

    // 기본 카드로 설정하는 경우 기존 기본 카드 해제
    if (createCardDto.isDefault || isFirstCard) {
      await this.prisma.card.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 2. 카드 정보 저장
    return this.prisma.card.create({
      data: {
        userId,
        customerKey: BID, // 빌링키를 customerKey로 사용
        billingKey: BID, // 빌링키 저장 (암호화되어 있음)
        method: 'CARD',
        cardCompany: CardName || undefined,
        issuerCode: CardCode || undefined,
        number: cardNo, // 마스킹된 카드번호
        cardType: CardCl === '0' ? 'credit' : 'check', // 0: 신용카드, 1: 체크카드
        isAuthenticated: true,
        isDefault: createCardDto.isDefault || isFirstCard,
        authenticatedAt: new Date(),
      },
    });
  }

  /**
   * 카드 정보 수정
   */
  async update(id: number, userId: number, updateCardDto: UpdateCardDto) {
    // 카드 존재 확인
    await this.findOne(id, userId);

    // 기본 카드로 변경하는 경우 기존 기본 카드 해제
    if (updateCardDto.isDefault) {
      await this.prisma.card.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.card.update({
      where: { id },
      data: updateCardDto,
    });
  }

  /**
   * 기본 카드 설정
   */
  async setDefault(id: number, userId: number) {
    // 카드 존재 확인
    await this.findOne(id, userId);

    // 기존 기본 카드 해제
    await this.prisma.card.updateMany({
      where: { userId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });

    // 해당 카드를 기본으로 설정
    return this.prisma.card.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  /**
   * 카드 삭제
   */
  async remove(id: number, userId: number) {
    // 카드 존재 확인
    const card = await this.findOne(id, userId);

    // 기본 카드인 경우 다른 카드를 기본으로 설정
    if (card.isDefault) {
      const otherCard = await this.prisma.card.findFirst({
        where: { userId, NOT: { id } },
        orderBy: { createdAt: 'desc' },
      });

      if (otherCard) {
        await this.prisma.card.update({
          where: { id: otherCard.id },
          data: { isDefault: true },
        });
      }
    }

    await this.prisma.card.delete({
      where: { id },
    });

    return { success: true, message: '카드가 삭제되었습니다.' };
  }

  /**
   * 사용자의 모든 카드 삭제 (계정 삭제 시 사용)
   */
  async removeAll(userId: number) {
    await this.prisma.card.deleteMany({
      where: { userId },
    });

    return { success: true, message: '모든 카드가 삭제되었습니다.' };
  }
}
