import {
  CrawlerService,
  PlaceInfo,
} from '@lib/integrations/naver/naver-api/crawler.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Persona } from '@prisma/client';
import OpenAI from 'openai';
import { encoding_for_model, TiktokenModel } from 'tiktoken';

export interface GeneratePostRequest {
  keyword: string;
  postType: string;
  persona: Persona;
  subKeywords: string[] | null;
  length: number;
  additionalFields?: Record<string, any>;
  referenceContents?: string[]; // 상위 블로그 컨텐츠 참조
  postIndex?: number; // 현재 원고 번호 (1부터 시작)
  totalCount?: number; // 전체 원고 개수
  existingTitles?: string[]; // 이미 생성된 원고 제목들
  // 프롬프트 로깅을 위한 추가 필드
  userId?: number;
  blogPostId?: number;
  aiPostId?: number;
}

export interface GeneratePostResponse {
  content: string; // 생성된 원고 (JSON 문자열)
  usage: {
    promptTokens: number; // 입력 토큰 수
    completionTokens: number; // 출력 토큰 수
    totalTokens: number; // 총 토큰 수
  };
  // 프롬프트 로깅을 위한 추가 필드
  prompts?: {
    systemPrompt: string;
    userPrompt: string;
    fullPrompt: string;
  };
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;
  private readonly summaryModel: string;
  private readonly generationModel: string;
  private encoder: any; // tiktoken encoder

  // 원고 다양성을 위한 접근 방식
  private readonly DIVERSITY_APPROACHES = [
    '초보자도 쉽게 이해할 수 있도록 기초부터 차근차근 설명하는 방식',
    '실전 경험과 구체적인 사례를 중심으로 생생하게 전달하는 방식',
    '비교 분석을 통해 장단점을 명확히 보여주는 방식',
    '단계별 가이드 형태로 따라하기 쉽게 구성하는 방식',
    '흔한 실수와 해결 방법을 중심으로 실용적으로 접근하는 방식',
    '최신 트렌드와 변화를 반영하여 현대적으로 설명하는 방식',
    '깊이 있는 분석과 인사이트를 제공하는 전문가 시각의 방식',
    'Q&A 형식으로 독자의 궁금증을 하나씩 해결하는 방식',
  ];

  constructor(
    private readonly configService: ConfigService,
    private crawler: CrawlerService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not configured - OpenAI features will be disabled',
      );
      // OpenAI 기능 없이도 서버는 시작되도록 null 허용
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({
        apiKey,
      });
    }

    // 모델 설정 (환경변수 또는 기본값)
    this.summaryModel =
      this.configService.get<string>('OPENAI_SUMMARY_MODEL') || 'gpt-4o-mini';
    this.generationModel =
      this.configService.get<string>('OPENAI_GENERATION_MODEL') || 'gpt-4o';

    // tiktoken encoder 초기화
    try {
      this.encoder = encoding_for_model('gpt-5' as TiktokenModel);
      this.logger.log('Tiktoken encoder initialized');
    } catch {
      this.logger.warn(
        'Failed to initialize tiktoken encoder, will use fallback estimation',
      );
      this.encoder = null;
    }

    this.logger.log('OpenAI service initialized');
    this.logger.log(`Summary model: ${this.summaryModel}`);
    this.logger.log(`Generation model: ${this.generationModel}`);
  }

  /**
   * 블로그 원고 생성
   */
  async generatePost(
    request: GeneratePostRequest,
  ): Promise<GeneratePostResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI service is not configured. Please set OPENAI_API_KEY environment variable.',
      );
    }

    let placeInfo: PlaceInfo | null = null;
    if (request.additionalFields && request.additionalFields['placeUrl']) {
      try {
        const url = new URL(request.additionalFields['placeUrl']);
        const paths = url.pathname.split('/');
        const targetId = paths[paths.length - 2];
        this.logger.debug(`Fetching place info for placeId: ${targetId}`);
        placeInfo = await this.crawler.getPlaceInfo(targetId);
        if (placeInfo) {
          this.logger.debug(
            `Place info retrieved: ${placeInfo.name} (${placeInfo.menu?.length || 0} menu items)`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to fetch place info: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
        // 플레이스 정보 없이도 원고 생성은 계속 진행
      }
    }

    const systemPrompt = this.getSystemPrompt();
    const referencePrompt = this.buildReferencePrompt(
      request.referenceContents,
      request.keyword,
    );
    const userPrompt = this.buildPrompt(request, placeInfo);
    const fullPrompt =
      systemPrompt + '\n\n' + referencePrompt + '\n\n' + userPrompt;

    const startTime = Date.now();

    try {
      this.logger.debug(
        `Generating post with prompt length: ${fullPrompt.length} (reference: ${referencePrompt.length})`,
      );

      // 메시지 구성: system(페르소나) + system(참조 블로그 - 캐싱 대상) + user(다양성 지침)
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      // 상위 블로그 참조가 있으면 별도 system 메시지로 추가 (캐싱 효과)
      if (referencePrompt) {
        messages.push({
          role: 'system',
          content: referencePrompt,
        });
      }

      // 사용자 프롬프트 (다양성 전략 포함)
      messages.push({
        role: 'user',
        content: userPrompt,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.generationModel, // 고품질 컨텐츠 생성 모델
        messages,
        max_completion_tokens: this.calculateMaxTokens(
          fullPrompt,
          request.length,
        ),
        response_format: { type: 'json_object' }, // JSON 응답 요청
        // seed를 다양하게 설정하여 원고마다 다른 결과 생성
        ...(request.postIndex && request.totalCount && request.totalCount > 1
          ? { seed: this.calculateSeed(request.postIndex) }
          : {}),
      });

      // 응답 구조 디버깅
      this.logger.debug(
        `OpenAI response: choices=${completion.choices?.length}, finish_reason=${completion.choices?.[0]?.finish_reason}`,
      );

      const choice = completion.choices?.[0];

      if (!choice) {
        this.logger.error('No choices in OpenAI response');
        throw new Error('No response from OpenAI API');
      }

      // refusal 체크 (OpenAI API v4+)
      if (choice.message?.refusal) {
        this.logger.error(`OpenAI refused request: ${choice.message.refusal}`);
        throw new Error(
          `Content generation refused: ${choice.message.refusal}`,
        );
      }

      const content = choice.message?.content;

      if (!content || content.trim() === '') {
        this.logger.error(
          `Empty content returned. finish_reason: ${choice.finish_reason}`,
        );
        throw new Error(
          `No content generated (finish_reason: ${choice.finish_reason})`,
        );
      }

      // 토큰 사용량 추출
      const usage = completion.usage;
      if (!usage) {
        this.logger.warn('No usage information in OpenAI response');
      }

      const tokenUsage = {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      };

      this.logger.debug(
        `Token usage: prompt=${tokenUsage.promptTokens}, completion=${tokenUsage.completionTokens}, total=${tokenUsage.totalTokens}`,
      );

      // JSON 파싱 및 검증
      try {
        const parsed = JSON.parse(content) as {
          title?: string;
          content?: string;
          tags?: string[];
        };

        if (!parsed.title || !parsed.content) {
          throw new Error('Missing required fields: title or content');
        }

        // tags 필드 검증 및 기본값 설정
        if (!parsed.tags || !Array.isArray(parsed.tags)) {
          this.logger.warn('Tags field missing or invalid, using empty array');
          parsed.tags = [];
        }

        this.logger.debug(
          `Generated content: title="${parsed.title.substring(0, 30)}...", html_length=${parsed.content.length}, tags_count=${parsed.tags.length}`,
        );

        // JSON 문자열과 토큰 사용량 반환
        return {
          content: JSON.stringify(parsed),
          usage: tokenUsage,
          prompts: {
            systemPrompt,
            userPrompt,
            fullPrompt,
          },
        };
      } catch (parseError: any) {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to parse JSON response: ${parseError.message}`,
        );
        // JSON 파싱 실패 시 원본과 토큰 사용량 반환 (fallback)
        return {
          content,
          usage: tokenUsage,
          prompts: {
            systemPrompt,
            userPrompt,
            fullPrompt,
          },
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to generate post after ${responseTime}ms: ${error.message}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 시스템 프롬프트 생성 (출력 규칙만)
   */
  private getSystemPrompt(): string {
    return `당신은 실제 경험을 생생하게 전달하는 블로그 작가입니다.

[핵심 원칙 - 자연스러운 서술형 글쓰기]

1. 분류/카테고리 형태 금지:
   - ❌ "도입:", "주문:", "분위기:", "총평:" 같은 라벨 사용 금지
   - ❌ "첫째,", "둘째,", "1.", "2." 같은 번호 매기기 금지
   - ❌ 각 문단을 카테고리로 나누는 형식 금지
   - ✅ 자연스럽게 이야기가 흘러가듯 서술

2. 자연스러운 흐름:
   - 실제 블로거가 경험을 이야기하듯 쓴다
   - 문단 간 자연스러운 연결 (그래서, 그런데, 특히, 무엇보다)
   - 독자와 대화하듯 편안한 어조 유지
   - 감정과 생각을 자연스럽게 녹여서 표현

3. 소제목 사용 규칙:
   - <h2>, <h3>는 글의 흐름을 위한 자연스러운 전환점에만 사용
   - 소제목도 분류형이 아닌 호기심을 유발하는 문장형으로
   - 예: ❌ "메뉴 소개" → ✅ "이 집의 시그니처를 드디어 만나다"
   - 예: ❌ "분위기" → ✅ "문을 열자마자 느껴진 것"

[출력 규칙]

1. 반드시 아래 JSON 구조로 응답한다: { "title": "\${title}", "content": "<p>...</p>...", "tags": ["#태그1", "#태그2", ... "#태그30"] }
2. content는 HTML 문자열 하나로만 구성한다.
3. 허용 태그: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <blockquote>
4. 본문 문장은 <p> 내부에만 넣으며 소제목은 <h2>, <h3> 사용.
5. -, •, ~, +, >, | 등 마크다운 불릿은 절대 사용하지 않는다.
6. 단, tags 필드 내부에서만 # 사용을 허용한다.
7. 참고 블로그 내용은 참고만 하고 문장을 복사하지 않는다.
8. 출력은 JSON 한 덩어리로만 제공한다.`;
  }

  /**
   * 상위 블로그 참조 프롬프트 생성 (캐싱 대상)
   * @param referenceContents - 상위 블로그 구조화된 요약 내용 (작성 노하우 학습용)
   * @param keyword - 검색 키워드
   * @returns 참조 블로그 프롬프트 (system 메시지용)
   */
  private buildReferencePrompt(
    referenceContents: string[] | undefined,
    keyword: string,
  ): string {
    if (!referenceContents || referenceContents.length === 0) {
      return '';
    }

    let prompt = `[상위 노출 블로그 작성 노하우 분석]\n\n`;
    prompt += `[중요] 아래 블로그들은 다른 매장/주제를 다룬 사례입니다.\n`;
    prompt += `목적: "${keyword}" 키워드로 상위 노출된 블로그들의 작성 기법을 학습\n`;
    prompt += `활용: 문체, 구성, 패턴만 참고 (장소명, 메뉴, 가격 등 구체 내용은 절대 사용 금지)\n\n`;

    prompt += `[학습 대상]\n`;
    prompt += `1. 글 구성: 정보 배치 순서, 소제목 활용, 문단 흐름\n`;
    prompt += `2. 문체와 어조: 말투, 독자 소통 방식, 감정 표현\n`;
    prompt += `3. 정보 전달: 우선순위, 설명 방식, 궁금증 해결 패턴\n`;
    prompt += `4. 키워드 활용: 자연스러운 녹임, 빈도, 제목/소제목 배치\n`;
    prompt += `5. 차별화: 독특한 관점, 강조 포인트\n\n`;

    referenceContents.forEach((content, index) => {
      prompt += `[참고 블로그 ${index + 1}]\n`;
      prompt += `${content}\n\n`;
    });

    prompt += `[활용 지침]\n`;
    prompt += `학습 대상: 글 구조, 문장 스타일, 정보 배치 순서, 키워드 활용 기법, 독자 참여 유도\n`;
    prompt += `복사 금지: 장소명, 업체명, 메뉴, 가격, 주소, 전화번호, 영업시간, 특정 문장\n`;
    prompt += `실제 정보 출처: [방문 매장 상세 정보] 또는 [원고 정보 입력] 섹션만 사용\n`;

    return prompt;
  }

  /**
   * 사용자 프롬프트 생성
   */
  private buildPrompt(
    request: GeneratePostRequest,
    placeInfo: PlaceInfo | null = null,
  ): string {
    let prompt = `[원고 정보 입력]\n\n`;
    prompt += `- 글 종류: ${request.postType}\n`;
    prompt += `- 주요 키워드: ${request.keyword}\n`;
    prompt += `- 서브 키워드: ${request.subKeywords && request.subKeywords.length > 0 ? request.subKeywords.join(', ') : '상위 노출 블로그 분석을 통해 자동 추출'}\n`;
    prompt += `- 목표 글자 수: ${request.length}자 (HTML 태그 제외 기준)\n`;

    // 추가 정보 (플레이스 링크, 위치 정보 등)
    if (
      request.additionalFields &&
      Object.keys(request.additionalFields).length > 0
    ) {
      const fields = request.additionalFields;
      if (fields.placeLink) {
        prompt += `- 플레이스 정보 링크: ${fields.placeLink}\n`;
      }
      prompt += `- 추가 정보:`;
      Object.entries(fields).forEach(([key, value]) => {
        if (value && key !== 'placeLink') {
          prompt += ` • ${key}: ${value}`;
        }
      });
      prompt += `\n`;
    }

    prompt += `\n---\n\n`;

    // 플레이스 상세 정보 (크롤링 데이터)
    if (placeInfo) {
      prompt += `[방문 매장 상세 정보]\n\n`;
      prompt += `※ 아래 정보는 네이버 플레이스에서 수집한 실제 매장 정보입니다. 글 작성 시 반드시 참고하세요.\n\n`;

      prompt += `• 매장명: ${placeInfo.name}\n`;

      if (placeInfo.tags && placeInfo.tags.length > 0) {
        prompt += `• 카테고리: ${placeInfo.tags.join(', ')}\n`;
      }

      if (placeInfo.contact) {
        prompt += `• 전화번호: ${placeInfo.contact}\n`;
      }

      if (placeInfo.reviews && placeInfo.reviews.length > 0) {
        prompt += `• 리뷰 현황: ${placeInfo.reviews.join(' | ')}\n`;
      }

      if (placeInfo.service) {
        prompt += `• 제공 서비스: ${placeInfo.service}\n`;
      }

      if (placeInfo.topics && placeInfo.topics.length > 0) {
        prompt += `• 인기 토픽 키워드: ${placeInfo.topics.join(', ')}\n`;
      }

      // 메뉴 정보 (가장 중요한 정보)
      if (placeInfo.menu && placeInfo.menu.length > 0) {
        prompt += `\n• 메뉴 목록:\n`;
        placeInfo.menu.forEach((menuItem, index) => {
          prompt += `  ${index + 1}. ${menuItem.name} - ${menuItem.priceText}\n`;
        });
      }

      if (placeInfo.imageUrl) {
        prompt += `\n• 대표 이미지: ${placeInfo.imageUrl}\n`;
      }

      prompt += `\n💡 작성 가이드:\n`;
      prompt += `- 위 정보를 바탕으로 실제 방문한 것처럼 생생하고 구체적으로 작성하세요.\n`;
      prompt += `- 메뉴와 가격은 정확하게 언급하되, 자연스럽게 녹여쓰세요.\n`;
      prompt += `- 인기 토픽 키워드를 활용하여 독자의 관심사를 반영하세요.\n`;
      prompt += `- 리뷰 현황을 참고하여 매장의 인기도를 은연중에 전달하세요.\n`;

      prompt += `\n---\n\n`;
    }

    // 페르소나 정보 (원고 정보 입력 다음에 배치)
    prompt += `[페르소나]\n\n`;
    prompt += `- 나이: ${request.persona.age}세\n`;
    prompt += `- 성별: ${request.persona.gender}\n`;
    prompt += `- 직업: ${request.persona.occupation}\n`;
    prompt += `- 결혼 여부: ${request.persona.isMarried ? '기혼' : '미혼'}\n`;
    prompt += `- 자녀 여부: ${request.persona.hasChildren ? '있음' : '없음'}\n`;
    prompt += `- 글쓰기 스타일: 일반적인 네이버 블로거들의 친근하고 자연스러운 문체\n`;
    if (request.persona.additionalInfo) {
      prompt += `- 추가 정보: ${request.persona.additionalInfo}\n`;
    }
    prompt += `\n이 페르소나의 시각과 경험을 바탕으로, 일반적인 네이버 블로거처럼 친근하고 자연스러운 글을 작성해주세요.\n`;

    prompt += `\n---\n\n`;

    // 다양성 전략 추가 (여러 원고 생성 시)
    if (request.postIndex && request.totalCount && request.totalCount > 1) {
      const approachIndex =
        (request.postIndex - 1) % this.DIVERSITY_APPROACHES.length;
      const approach = this.DIVERSITY_APPROACHES[approachIndex];
      prompt += `[다양성 전략 (${request.postIndex}/${request.totalCount}번째 원고)]\n\n`;
      prompt += `접근 방식: ${approach}\n`;
      prompt += `어조: ${this.getDiverseTone(request.postIndex)}\n`;
      prompt += `예시 스타일: ${this.getDiverseExample(request.postIndex)}\n`;
      prompt += `제목 스타일: ${this.getDiverseTitleStyle(request.postIndex)}\n`;
      prompt += `강조점: 다른 원고들과는 다른 측면을 주요하게 다루기\n`;
      prompt += `구성: 도입-본문-결론의 순서와 비중을 다르게 배치\n\n`;

      // 이미 생성된 제목 중복 방지
      if (request.existingTitles && request.existingTitles.length > 0) {
        prompt += `⚠️ 제목 중복 방지: 다음 제목들과는 다른 제목을 사용\n`;
        request.existingTitles.forEach((title, index) => {
          prompt += `${index + 1}. ${title}\n`;
        });
        prompt += `\n`;
      }

      prompt += `---\n\n`;
    }

    prompt += `[작성 지침 - 자연스러운 서술형 글쓰기]\n\n`;
    prompt += `1. 이야기하듯 자연스럽게:\n`;
    prompt += `   - "도입:", "메뉴:", "총평:" 같은 분류 라벨 절대 금지\n`;
    prompt += `   - 친구에게 경험을 들려주듯 편안하게 서술\n`;
    prompt += `   - 각 문단이 자연스럽게 다음 문단으로 연결되도록\n\n`;
    prompt += `2. 페르소나의 자연스러운 말투로 작성한다.\n`;
    prompt += `3. 글의 흐름: 자연스러운 도입 → 경험 서술 → 여운 있는 마무리\n`;
    prompt += `4. 핵심 키워드와 서브 키워드는 문맥에 자연스럽게 녹여쓴다.\n`;
    prompt += `5. ${request.postType}의 작성 목적에 충실하며, 실제 방문 또는 이용한 사용자 관점에서 생생하게 묘사한다.\n`;
    prompt += `6. 강조가 필요한 부분은 <strong> 태그 사용.\n\n`;

    prompt += `[생성 제한 규칙 - 반드시 준수]\n\n`;
    prompt += `⚠️ 환각(Hallucination) 방지를 위한 엄격한 규칙:\n\n`;
    prompt += `1. 실제 내용 vs 작성 기법 구분:\n`;
    prompt += `   ✅ 실제 글의 구체적 내용:\n`;
    prompt += `      - [방문 매장 상세 정보] 또는 [원고 정보 입력] 섹션의 정보만 사용\n`;
    prompt += `      - 장소명, 메뉴, 가격, 영업시간, 위치 등 모든 사실 정보의 출처\n`;
    prompt += `   \n`;
    prompt += `   ✅ 참고 블로그의 작성 기법만 학습:\n`;
    prompt += `      - [상위 노출 블로그 작성 노하우 분석] → 문체, 구성, 패턴만 참고\n`;
    prompt += `      - 참고 블로그의 구체적 내용(장소명, 메뉴, 가격 등)은 절대 사용 금지\n`;
    prompt += `   \n`;
    prompt += `   ❌ 절대 금지:\n`;
    prompt += `      - 제공되지 않은 구체적 사실, 수치, 데이터 작성\n`;
    prompt += `      - 참고 블로그의 내용을 실제 글에 복사\n`;
    prompt += `      - 추측이나 상상으로 정보 생성\n\n`;
    prompt += `2. 일반적 감성 표현은 허용:\n`;
    prompt += `   ✅ 허용: "분위기가 좋다", "맛있다", "친절하다" 등 일반적 평가\n`;
    prompt += `   ✅ 허용: "추천한다", "인기 있다" 등 일반적 의견\n`;
    prompt += `   ❌ 금지: 제공되지 않은 구체적 메뉴명, 가격, 영업시간, 위치, 전화번호\n`;
    prompt += `   ❌ 금지: 제공되지 않은 수치 데이터 (방문자 수, 평점, 순위 등)\n\n`;
    prompt += `3. 키워드 중심 작성:\n`;
    prompt += `   - 주요 키워드: "${request.keyword}"\n`;
    prompt += `   - 글 종류: "${request.postType}"\n`;
    prompt += `   - 위 두 가지를 중심으로 작성하며, 무관한 정보는 배제\n\n`;
    prompt += `4. 불확실한 정보 처리:\n`;
    prompt += `   - 참고 정보가 불명확하면 → 일반적 표현으로 대체\n`;
    prompt += `   - 확실하지 않은 사실은 → 작성하지 않음\n`;
    prompt += `   - 추측성 표현 사용 금지 (예: "~인 것 같다", "아마도 ~일 것이다")\n\n`;

    prompt += `[상세 작성 지침]\n\n`;

    // 플레이스 정보가 있는 경우 특별 지침
    if (placeInfo) {
      prompt += `※ 플레이스 정보 활용:\n`;
      prompt += `1. [방문 매장 상세 정보]에 제공된 실제 데이터를 적극 활용한다:\n`;
      prompt += `   - 메뉴명과 가격은 정확하게 언급하되 자연스러운 문맥으로 녹여쓴다.\n`;
      prompt += `   - 인기 토픽 키워드를 활용하여 독자가 궁금해할 내용을 다룬다.\n`;
      prompt += `   - 리뷰 현황을 참고하여 매장의 신뢰도와 인기를 간접적으로 전달한다.\n`;
      prompt += `   - 카테고리와 서비스 정보를 바탕으로 매장 특징을 구체적으로 묘사한다.\n`;
      prompt += `2. 메뉴 설명 시 구체적인 가격대와 특징을 함께 언급하여 정보성을 높인다.\n`;
      prompt += `3. 제공된 정보 외 추가 메뉴나 가격은 절대 작성하지 않는다.\n\n`;
      prompt += `※ 출력 형식:\n`;
      prompt += `- 태그(tags)는 매장 정보, 메뉴, 인기 토픽을 반영하여 30개 생성하며 "#단어" 형태를 따른다.\n`;
      prompt += `- 최종 출력은 JSON 형식 하나로만 제공하며, HTML은 content 안에만 넣는다.\n`;
    } else if (request.additionalFields && request.additionalFields.placeLink) {
      prompt += `※ 플레이스 링크 활용:\n`;
      prompt += `- 플레이스 링크 정보는 반드시 실제 확인한 내용만 반영한다 (메뉴·가격·위치·주차·영업시간 등).\n`;
      prompt += `- 확인되지 않은 정보는 일반적 표현으로만 작성한다.\n\n`;
      prompt += `※ 출력 형식:\n`;
      prompt += `- 태그(tags)는 글 내용과 SEO에 맞게 30개 생성하며 "#단어" 형태를 따른다.\n`;
      prompt += `- 최종 출력은 JSON 형식 하나로만 제공하며, HTML은 content 안에만 넣는다.\n`;
    } else {
      prompt += `※ 출력 형식:\n`;
      prompt += `- 태그(tags)는 글 내용과 SEO에 맞게 30개 생성하며 "#단어" 형태를 따른다.\n`;
      prompt += `- 최종 출력은 JSON 형식 하나로만 제공하며, HTML은 content 안에만 넣는다.\n`;
    }

    return prompt;
  }

  /**
   * 문자열의 토큰 수 계산
   * tiktoken 사용 또는 fallback 추정
   */
  private countTokens(text: string): number {
    if (this.encoder) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const tokens = this.encoder.encode(text);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return tokens.length as number;
      } catch {
        this.logger.warn('Tiktoken encoding failed, using fallback');
      }
    }

    // Fallback: 한글/영문 혼합 추정 (한글 1자 ≈ 1.4 토큰, 영문 1단어 ≈ 1.3 토큰)
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const otherChars = text.length - koreanChars;
    return Math.ceil(koreanChars * 1.4 + otherChars * 0.4);
  }

  /**
   * Seed 값 계산 (원고 다양성 확보)
   * @param postIndex - 현재 원고 번호 (1부터 시작)
   * @returns seed 값 (OpenAI API의 deterministic 출력 제어용)
   */
  private calculateSeed(postIndex: number): number {
    // 각 원고마다 고유한 seed 값 생성
    // 소수를 곱하여 충분히 떨어진 seed 값 생성
    const baseSeed = 42; // 기본 시드
    const primeMultiplier = 1009; // 소수 곱셈으로 충분히 분산

    return baseSeed + postIndex * primeMultiplier;
  }

  /**
   * 원고 번호에 따른 다양한 어조 반환
   */
  private getDiverseTone(postIndex: number): string {
    const tones = [
      '친근하고 편안한 대화체',
      '전문적이고 신뢰감 있는 설명체',
      '열정적이고 동기부여하는 격려체',
      '차분하고 논리적인 분석체',
      '유머러스하고 재미있는 스토리텔링체',
      '따뜻하고 공감하는 조언체',
      '간결하고 명확한 요약체',
      '호기심을 자극하는 질문체',
    ];
    return tones[(postIndex - 1) % tones.length];
  }

  /**
   * 원고 번호에 따른 다양한 예시 스타일 반환
   */
  private getDiverseExample(postIndex: number): string {
    const examples = [
      '실생활 사례 중심의 구체적인 예시 활용',
      '통계와 데이터를 활용한 객관적 예시 제시',
      '비유와 은유를 활용한 쉬운 예시 설명',
      '단계별 프로세스를 보여주는 실용적 예시',
      '성공/실패 사례 대비를 통한 예시 제공',
      '업계 전문가 관점의 심화 예시 활용',
      '일상적인 상황에서 찾은 친근한 예시',
      '최신 트렌드와 연관된 시의성 있는 예시',
    ];
    return examples[(postIndex - 1) % examples.length];
  }

  /**
   * 원고 번호에 따른 다양한 제목 스타일 반환
   */
  private getDiverseTitleStyle(postIndex: number): string {
    const titleStyles = [
      '질문형 제목 (예: ~할 수 있을까요?)',
      '숫자 활용형 제목 (예: 5가지 방법)',
      '감정 자극형 제목 (예: 놀라운, 완벽한)',
      '해결책 제시형 제목 (예: ~하는 법)',
      '시간 강조형 제목 (예: 2025년 최신)',
      '비교/대조형 제목 (예: A vs B)',
      '궁금증 유발형 제목 (예: ~의 진실)',
      '실용 가이드형 제목 (예: 완벽 가이드)',
    ];
    return titleStyles[(postIndex - 1) % titleStyles.length];
  }

  /**
   * 동적 max_completion_tokens 계산
   * 입력 프롬프트 토큰 + 목표 출력 토큰 + 여유분
   */
  private calculateMaxTokens(promptText: string, targetLength: number): number {
    // 입력 프롬프트 토큰 계산
    const inputTokens = this.countTokens(promptText);

    // 목표 출력 토큰 계산 (한글 1자 ≈ 1.4 토큰)
    const targetOutputTokens = Math.ceil(targetLength * 1.4);

    // HTML 태그 오버헤드: 약 60% 추가 (풍부한 구조, 긴 글일수록 더 많은 태그)
    // (태그: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <blockquote> 등)
    const htmlOverhead = Math.ceil(targetOutputTokens * 0.6);

    // JSON 구조 오버헤드: {"title":"...","content":"...","tags":[...]}
    const jsonOverhead = 200;

    // 여유분: 길이에 따라 동적 조정 (넉넉하게)
    const marginRate =
      targetLength <= 500 ? 1.8 : targetLength <= 1500 ? 1.7 : 1.6;
    const outputTokens = Math.ceil(
      (targetOutputTokens + htmlOverhead + jsonOverhead) * marginRate,
    );

    // 최소 출력 토큰 보장 (동적 조정: 더 넉넉하게)
    const minTokens = Math.max(6000, Math.ceil(targetLength * 5));
    const finalOutputTokens = Math.max(outputTokens, minTokens);

    // gpt-4o 출력 토큰 제한 (16K) 이내로 제한
    const maxOutputLimit = 16000;
    const safeOutputTokens = Math.min(finalOutputTokens, maxOutputLimit);

    this.logger.debug(
      `Token calculation: input=${inputTokens}, target=${targetLength}chars, target_tokens=${targetOutputTokens}, html_overhead=${htmlOverhead}, margin_rate=${marginRate}, calculated=${finalOutputTokens}, final=${safeOutputTokens}`,
    );

    return safeOutputTokens;
  }

  /**
   * 블로그 작성 기법을 LLM으로 분석
   * ⚠️ 참조 블로그는 다른 매장/주제를 다룬 사례입니다 (내용 복사 금지)
   * @param content - 원본 블로그 콘텐츠
   * @param keyword - 검색 키워드 (맥락 제공용)
   * @returns 작성 기법 분석 결과 (문체, 구성, 패턴 등, 400-600자)
   */
  async summarizeContent(content: string, keyword: string): Promise<string> {
    try {
      // 콘텐츠가 너무 짧으면 요약 불필요
      if (content.length < 200) {
        return content;
      }

      // 프롬프트 크기 제한 확대 (더 많은 맥락 제공)
      const truncatedContent = content.substring(0, 5000);

      this.logger.debug(
        `Summarizing content (${truncatedContent.length} chars) for keyword: ${keyword}`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.summaryModel, // 비용 효율적인 요약 모델
        messages: [
          {
            role: 'system',
            content: `블로그 작성 기법을 분석하는 전문가입니다.
제공된 블로그에서 "어떻게 글을 쓰는가"에 대한 노하우를 추출해 요약하세요.

[중요] 이 블로그는 다른 매장/주제를 다룬 사례입니다.
목적: 작성 기법 학습 (문체, 구성, 패턴 등)
금지: 구체적 내용 복사 (장소명, 메뉴, 가격 등)

[분석 규칙]
1. 분석 요소:
   a) 글 구성: 도입부, 본문 전개 순서, 소제목 활용, 마무리 기법
   b) 문체와 어조: 말투, 문장 길이, 리듬감, 감정 표현
   c) 정보 전달: 우선순위, 설명 방식, 궁금증 해결 패턴
   d) 키워드 활용: 자연스러운 녹임, 빈도, 제목/소제목 배치
   e) 차별화: 독특한 관점, 강조 포인트

3. 제외 대상: 장소명, 업체명, 메뉴, 가격, 주소, 전화번호, 영업시간, 특정 문장 인용

[출력 규칙]
1. 분석한 규칙을 400자 미만으로 요약하여 작성한다.
2. 요약 내용에 제외 대상을 포함하지 않는다.
3. 문장을 중간에 끊지 말고 완결된 형태로 출력`,
          },
          {
            role: 'user',
            content: `다음은 "${keyword}" 키워드로 검색된 상위 노출 블로그입니다.
이 블로그의 작성 기법(문체, 구성, 패턴)을 분석하여 요약해주세요.
구체적인 내용(장소명, 메뉴, 가격 등)은 제외하고, 어떻게 글을 쓰는지에 집중해주세요:

${truncatedContent}`,
          },
        ],
        // temperature: 0.3, // 일관성 있는 요약
        max_completion_tokens: 2000, // 한글 600자 ≈ 840 토큰이지만 여유분 충분히 확보
      });

      const choice = completion.choices?.[0];

      if (!choice) {
        this.logger.warn('No choices in summary response');
        return this.fallbackSummary(content);
      }

      // refusal 체크
      if (choice.message?.refusal) {
        this.logger.warn(`Summary refused: ${choice.message.refusal}`);
        return this.fallbackSummary(content);
      }

      const summary = choice.message?.content?.trim();

      if (!summary) {
        this.logger.warn(
          `No summary generated, finish_reason: ${choice.finish_reason}`,
        );
        return this.fallbackSummary(content);
      }

      this.logger.debug(
        `Summary generated: ${summary.length} chars (tokens: prompt=${completion.usage?.prompt_tokens}, completion=${completion.usage?.completion_tokens})`,
      );
      return summary;
    } catch (error: any) {
      this.logger.error(
        `Failed to summarize content: ${error.message}`,
        error.stack,
      );
      // 요약 실패 시 fallback 요약 반환
      return this.fallbackSummary(content);
    }
  }

  /**
   * LLM 요약 실패 시 사용할 fallback 요약
   * 핵심 정보를 최대한 보존하면서 앞부분 추출
   */
  private fallbackSummary(content: string): string {
    // 최대 800자까지 추출 (더 많은 컨텍스트 제공)
    let summary = content.substring(0, 800);

    // 문장이 중간에 끊기지 않도록 마지막 완전한 문장까지만 포함
    const lastPeriod = summary.lastIndexOf('.');
    const lastExclamation = summary.lastIndexOf('!');
    const lastQuestion = summary.lastIndexOf('?');

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentenceEnd > 400) {
      // 최소 400자는 보장하면서 문장 완결
      summary = summary.substring(0, lastSentenceEnd + 1);
    }

    this.logger.debug(
      `Using fallback summary: ${summary.length} chars (from ${content.length} chars)`,
    );

    return summary.trim();
  }
}
