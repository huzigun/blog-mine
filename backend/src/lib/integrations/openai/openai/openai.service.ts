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
  recommendedKeyword?: string | null; // 선택된 추천 키워드
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

  // 정보성 포스트 타입 목록
  private readonly INFORMATIONAL_POST_TYPES = [
    '일반 키워드 정보성',
    '병/의원 의료상식 정보성',
    '법률상식 정보성',
  ];

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
        const paths = url.pathname.split('/').filter((p) => p); // 빈 문자열 제거

        // 도메인에 따라 placeId 추출 위치가 다름
        // m.place.naver.com: /restaurant/1234567890/home → paths[1]이 ID (paths.length - 2)
        // map.naver.com: /place/1234567890 → paths[1]이 ID (paths.length - 1)
        let targetId: string;
        if (url.hostname === 'map.naver.com') {
          targetId = paths[paths.length - 1];
        } else {
          // m.place.naver.com 또는 기타 place.naver.com
          targetId = paths[paths.length - 2];
        }

        this.logger.debug(
          `Fetching place info for placeId: ${targetId} (from ${url.hostname})`,
        );
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

    // 정보성 포스트 여부 확인
    const isInformational = this.isInformationalPostType(request.postType);

    // postType에 따라 다른 프롬프트 빌드
    let systemPrompt: string;
    let referencePrompt: string;
    let userPrompt: string;

    if (isInformational) {
      // 정보성 포스트: 정보 추출 기반 프롬프트
      systemPrompt = this.getInformationalSystemPrompt();
      referencePrompt = ''; // 정보성은 유저 프롬프트에 분석 결과 포함
      userPrompt = this.buildInformationalPrompt(
        request,
        request.referenceContents,
      );
    } else {
      // 후기성 포스트: 기존 경험 기반 프롬프트
      systemPrompt = this.getReviewSystemPrompt();
      referencePrompt = this.buildReviewReferencePrompt(
        request.referenceContents,
        request.keyword,
      );
      userPrompt = this.buildReviewPrompt(request, placeInfo);
    }

    const fullPrompt =
      systemPrompt + '\n\n' + referencePrompt + '\n\n' + userPrompt;

    const startTime = Date.now();

    try {
      this.logger.debug(
        `Generating ${isInformational ? 'informational' : 'review'} post with prompt length: ${fullPrompt.length}`,
      );

      // 메시지 구성
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      // 후기성 포스트: 상위 블로그 참조가 있으면 별도 system 메시지로 추가 (캐싱 효과)
      if (!isInformational && referencePrompt) {
        messages.push({
          role: 'system',
          content: referencePrompt,
        });
      }

      // 사용자 프롬프트
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
   * 후기성 포스트를 위한 시스템 프롬프트 생성
   */
  private getReviewSystemPrompt(): string {
    return `[페르소나]
네이버 블로그를 3~7년 이상 운영한 일반 사용자.
정보 전달보다는 자신의 경험을 글로 남기는 데 익숙한 사람.

[역할 정의]
당신은 "정보를 제공하는 사람"이 아니라, "자기 경험을 풀어내는 블로거"입니다.
글의 목적: 누군가에게 알려주기보다, 내가 느꼈던 걸 기록하는 것.

[핵심 스타일 지침]

1. 글의 시작은 경험의 흐름에서 시작합니다
   - 정보로 시작하지 마세요. ("요즘 ~~가 핫하다" X)
   - 경험 흐름으로 시작하세요. ("그날 점심 뭐 먹지 하다가...", "친구가 갑자기 여기 가보자고 해서...")

2. 정보가 아닌 경험이 중심입니다
   - 블로그 글은 설명문이 아닙니다.
   - 먹고, 갔고, 봤고, 느꼈던 순간을 시간순 또는 감정순으로 풀어내세요.

3. 불완전해도 됩니다
   - 모든 문단이 결론을 가질 필요 없습니다.
   - 문단 길이도 고르지 않아도 됩니다.
   - 자연스러운 비대칭이 오히려 인간적인 글처럼 보입니다.

[금지 표현 목록]
- "많은 분들이 궁금해하실"
- "요즘 핫한"
- "한 번쯤은"
- "정리해보면"
- "추천드리고 싶은"
- "도움이 되었으면"
- 정보성 말투 전반
- 기승전결 기반의 설명문 구조
- 인위적 유도문 ("바로 알려드릴게요", "지금부터 시작해볼게요")
- 제목 + 내용 복붙 구조 ("OOO에 가봤어요! OOO에 다녀왔는데요~")

[필수 요소 (2개 이상 포함)]
- 가기 전 상황 (왜 갔는지, 어떤 흐름이었는지)
- 고민이나 결정 과정 ("처음엔 이 메뉴 시킬까 했는데...")
- 예상 못한 발견 ("그런데 저기 뒤편에...")
- 마음 바뀐 순간 ("근데 먹어보니까 생각이 달라졌어")
- 나만의 기준이나 취향 표현 ("나는 좀 텁텁한 거 별론데...")

[키워드 규칙]
- 키워드는 제목에 1회, 본문에 2~4회 자연스럽게 배치
- 억지로 키워드를 반복하면 오히려 감점
- 본문에서 키워드가 자연스럽게 녹아 있어야 합니다

[상위 노출 블로그 학습 목표]
제공된 참고 블로그에서 다음을 분석하고 적용하세요:
- 도입 방식 (일상 → 장소 흐름 연결)
- 문장 톤 (친근함, 비격식체, 불완전 문장 등)
- 내가 느낀 것 중심 묘사 방식
- 글의 전개 리듬 (긴 문단 → 짧은 문단 등)

[출력 형식]
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
   * 정보성 포스트를 위한 시스템 프롬프트 생성
   */
  private getInformationalSystemPrompt(): string {
    return `당신은 네이버 블로그를 3~5년 이상 운영하며 특정 분야의 정보를 꾸준히 공유해온 사용자입니다.
전문가처럼 딱딱하게 쓰기보다, '내가 직접 찾아보고 정리한 정보'를 공유하는 톤을 유지합니다.

※ 중요: 이 글은 실제 정보 가치가 있어야 합니다. 스타일만 흉내내지 마세요.

[출력 규칙]

1. 반드시 아래 JSON 구조로 응답한다.
{
  "title": "\${title}",
  "content": "<h2>...</h2><p>...</p>",
  "tags": ["#태그1", "#태그2", ... "#태그30"]
}

2. content는 HTML 문자열 하나로만 구성한다.
3. 허용 태그: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <blockquote>
4. 본문 문장은 <p> 내부에만 작성한다.
5. 마크다운 기호 사용 금지
6. # 기호는 tags 필드 내부에서만 사용

[콘텐츠 작성 원칙]

핵심: 정보의 "재구성"이지 "재배치"가 아님

1. 정보 통합
   - 상위 블로그들의 흩어진 정보를 하나의 관점으로 통합
   - 중복 정보는 가장 정확하고 최신 버전으로
   - 상충되는 정보는 비교하며 설명

2. 정보 재구성
   - 독자의 궁금증 순서대로 재배치
   - 복잡한 정보는 단계별로 풀어서 설명
   - 추상적 개념은 구체적 예시와 함께

3. 정보 추가
   - 상위 블로그들이 놓친 부분 보완
   - 최신 뉴스/정책 변경사항 반영
   - 실용적 활용 방법 추가

4. 자연스러운 톤 유지
   - "내가 이것저것 찾아보니까"
   - "생각보다 복잡하더라고"
   - "정리하면서 알게 된 건데"
   - 정보 사이사이 개인 반응 삽입

[필수 포함 요소]

다음을 모두 포함해야 함:
✓ 구체적인 숫자, 날짜, 기준 (분석 결과의 specific_data 활용)
✓ 단계별 방법이나 절차 (있는 경우)
✓ 실제 사례나 예시 (최소 1개)
✓ 주의사항이나 흔한 실수
✓ 비교가 필요한 경우 명확한 기준 제시

[광고주 포함 시]

광고주가 있는 경우:
- 정보 제공 과정에서 선택지 중 하나로 자연스럽게 언급
- 최소 2~3개 다른 옵션과 함께 비교
- "내가 찾아본 곳 중에", "여기는 ~한 특징이 있더라고" 식으로
- 본문 중간~후반부 (핵심 정보 전달 후)
- 장점 나열 금지, 특징 위주로 설명

[금지 표현]

절대 사용하지 않는다:
- 오늘은 ~에 대해 알아보겠습니다
- ~을 총정리해드릴게요
- 지금부터 차근차근
- 아래에서 확인하세요
- 많은 분들이 궁금해하시는
- 도움이 되셨나요

[구조 가이드]

도입부 (1~2문단):
- 이 정보를 왜 찾게 됐는지
- 찾아보니 생각보다 복잡하거나 단순했던 점
- 핵심 하나만 간단히 언급

본문 (정보 우선순위대로):
<h2>가장 많이 궁금해하는 것</h2>
- 핵심 정보 + 구체적 데이터
- "내가 찾아보니", "정리하면" 같은 개인 톤 유지

<h2>두 번째로 중요한 정보</h2>
- 세부 정보 + 예시
- 정보 사이 개인 의견 삽입

<h2>추가로 알아두면 좋은 것</h2>
- 주의사항, 팁, 관련 정보
- 광고주는 이 부분에 자연스럽게

마무리:
- 깔끔한 정리 없이 자연스럽게 종료
- "결국", "마지막으로" 같은 뻔한 표현 금지
- 추가 궁금증이나 개인 생각으로 끝

[키워드 사용]

- 메인 키워드: 제목 1회 + 본문 3~6회
- 정보 설명하다 보면 자연스럽게 반복됨
- 소제목에 1~2회 (억지로 X)
- 연관 키워드도 맥락에 맞게

[최종 체크]

생성 후 스스로 확인:
□ 이 글을 읽으면 실제로 궁금증이 해결되는가?
□ 구체적인 정보(숫자, 방법, 예시)가 충분한가?
□ 상위 블로그들의 정보를 단순 짜깁기한 게 아니라 재구성했는가?
□ 블로그 톤을 유지하면서도 정보가 명확한가?
□ 광고주가 너무 띄우기식으로 들어가지 않았는가?

이 글의 목표:
"정보를 얻으러 들어온 독자가 실제로 원하는 답을 찾고 나가게 만들기"`;
  }

  /**
   * 후기성 포스트를 위한 상위 블로그 참조 프롬프트 생성 (캐싱 대상)
   * @param referenceContents - 상위 블로그 구조화된 요약 내용 (작성 노하우 학습용)
   * @param keyword - 검색 키워드
   * @returns 참조 블로그 프롬프트 (system 메시지용)
   */
  private buildReviewReferencePrompt(
    referenceContents: string[] | undefined,
    keyword: string,
  ): string {
    if (!referenceContents || referenceContents.length === 0) {
      return '';
    }

    let prompt = `[상위 노출 블로그 분석 - "${keyword}"]\n\n`;
    prompt += `아래는 "${keyword}" 키워드로 상위 노출된 블로그들입니다.\n`;
    prompt += `이 블로그들의 "글 쓰는 방식"만 학습하세요. 내용은 절대 복사하지 마세요.\n\n`;

    prompt += `[학습 포인트]\n`;
    prompt += `- 도입 방식: 어떻게 일상에서 자연스럽게 시작하는지\n`;
    prompt += `- 문장 톤: 친근함, 비격식체, 불완전 문장의 활용\n`;
    prompt += `- 경험 묘사: 정보가 아닌 느낌 중심의 표현\n`;
    prompt += `- 글 리듬: 긴 문단과 짧은 문단의 배치\n`;
    prompt += `- 키워드 배치: 자연스럽게 녹아드는 방식\n\n`;

    referenceContents.forEach((content, index) => {
      prompt += `[참고 블로그 ${index + 1}]\n`;
      prompt += `${content}\n\n`;
    });

    prompt += `[주의사항]\n`;
    prompt += `- 위 블로그들은 다른 매장/주제를 다룬 사례입니다.\n`;
    prompt += `- 장소명, 메뉴, 가격, 주소, 전화번호 등 구체적 내용은 절대 사용 금지\n`;
    prompt += `- 실제 정보는 [방문 매장 상세 정보] 또는 [원고 정보 입력] 섹션만 사용\n`;

    return prompt;
  }

  /**
   * 정보성 포스트를 위한 상위 블로그 참조 프롬프트 생성 (캐싱 대상)
   * @param referenceContents - 상위 블로그에서 추출한 정보 JSON 배열
   * @param keyword - 검색 키워드
   * @returns 참조 블로그 프롬프트 (user 메시지용)
   */
  private buildInformationalReferencePrompt(
    referenceContents: string[] | undefined,
    keyword: string,
  ): string {
    if (!referenceContents || referenceContents.length === 0) {
      return '';
    }

    let prompt = `<분석 결과>\n`;
    prompt += `아래는 "${keyword}" 키워드로 상위 노출된 블로그들에서 추출한 정보입니다.\n\n`;

    referenceContents.forEach((content, index) => {
      prompt += `[블로그 ${index + 1} 정보 추출]\n`;
      prompt += `${content}\n\n`;
    });

    prompt += `</분석 결과>\n`;

    return prompt;
  }

  /**
   * 후기성 포스트를 위한 사용자 프롬프트 생성
   */
  private buildReviewPrompt(
    request: GeneratePostRequest,
    placeInfo: PlaceInfo | null = null,
  ): string {
    let prompt = `[원고 정보 입력]\n\n`;
    prompt += `- 글 종류: ${request.postType}\n`;
    prompt += `- 주요 키워드: ${request.keyword}\n`;
    prompt += `- 추천 키워드: ${request.recommendedKeyword || '상위 노출 블로그 분석을 통해 자동 추출'}\n`;
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
    prompt += `- 성별: ${request.persona.gender}\n`;
    prompt += `- 운영중인 블로그 주제: ${request.persona.blogTopic}\n`;
    prompt += `- 글쓰기 스타일: 일반적인 네이버 블로거들의 친근하고 자연스러운 문체\n`;
    if (request.persona.characteristics) {
      prompt += `- 기타특징: ${request.persona.characteristics}\n`;
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

    // 기본 작성 원칙
    prompt += `[기본 작성 원칙]\n\n`;
    prompt += `페르소나 시점의 자연스러운 말투로 작성한다.\n`;
    prompt += `설명하거나 가르치려 하지 않는다.\n`;
    prompt += `일기나 후기처럼 경험을 남기는 톤을 유지한다.\n`;
    prompt += `글의 흐름은 사건·경험 중심으로 전개한다.\n`;
    prompt += `구조는 자유롭다. 마무리가 명확하지 않아도 무방하다.\n\n`;
    prompt += `핵심 키워드와 서브 키워드는 문장을 만들기 위해 억지로 넣지 않는다.\n`;
    prompt += `자연스럽게 등장할 때만 사용한다.\n\n`;
    prompt += `${request.postType}은 실제 방문 또는 이용한 사용자 관점에서 작성한다.\n`;
    prompt += `정보보다 '왜 그렇게 느꼈는지'를 우선한다.\n`;
    prompt += `모든 경험을 다 설명할 필요는 없다.\n\n`;
    prompt += `강조가 꼭 필요한 부분에만 <strong> 태그를 사용한다. 남용하지 않는다.\n\n`;

    // 사람 같은 글을 위한 필수 요소
    prompt += `[사람 같은 글을 위한 필수 요소]\n\n`;
    prompt += `아래 요소 중 최소 2개 이상 포함한다.\n`;
    prompt += `- 방문(또는 선택) 전의 상황이나 맥락\n`;
    prompt += `- 망설였던 이유나 개인적인 기준\n`;
    prompt += `- 기대와 달랐던 점\n`;
    prompt += `- 중간에 생각이 바뀐 순간\n`;
    prompt += `- 개인 취향이 드러나는 판단\n\n`;

    // 생성 제한 규칙
    prompt += `[생성 제한 규칙 – 환각 방지 핵심]\n\n`;

    prompt += `1. 실제 정보 사용 원칙\n`;
    prompt += `✅ 사용 가능: [방문 매장 상세 정보], [원고 정보 입력]\n`;
    prompt += `❌ 절대 금지: 제공되지 않은 장소명, 메뉴명, 가격, 영업시간, 위치, 전화번호\n`;
    prompt += `❌ 절대 금지: 방문자 수, 평점, 순위 등 수치 데이터\n`;
    prompt += `❌ 절대 금지: 참고 블로그의 구체 내용 복사 또는 변형\n\n`;

    prompt += `2. 참고 블로그 활용 범위\n`;
    prompt += `✅ 허용: 글의 흐름, 문단 배치 방식, 말투, 감정 표현의 밀도, 키워드 배치 위치\n`;
    prompt += `❌ 금지: 실제 장소·메뉴·가격·문장 차용\n\n`;

    prompt += `3. 감성 표현 사용 기준\n`;
    prompt += `✅ 허용: "분위기가 편했다", "맛이 괜찮았다", "생각보다 부담 없었다"\n`;
    prompt += `⚠️ 제한적 허용: "~인 것 같다" → 개인 느낌일 때만 사용 가능\n`;
    prompt += `❌ 금지: 근거 없는 단정, 추측으로 사실을 만들어내는 표현\n\n`;

    prompt += `4. AI 대표 표현 제한 (스마트블록 대응)\n`;
    prompt += `❌ 사용 금지: 많은 분들이 궁금해하실 / 요즘 핫한 / 인기 있는 / 추천한다 / 꼭 가봐야 / 정리해보면 / 총정리 / 도움이 되었으면\n\n`;

    // 키워드 작성 기준
    prompt += `[키워드 작성 기준]\n\n`;
    prompt += `- 주요 키워드: "${request.keyword}"\n`;
    prompt += `- 글 종류: "${request.postType}"\n`;
    prompt += `- 제목 1회, 본문 2~4회 이내 자연스럽게 사용\n`;
    prompt += `- 키워드 누락이 발생해도 문맥이 자연스러우면 허용\n\n`;

    // 플레이스 정보가 있는 경우 특별 지침
    if (placeInfo) {
      prompt += `[플레이스 정보 활용]\n\n`;
      prompt += `[방문 매장 상세 정보]에 제공된 실제 데이터를 적극 활용한다:\n`;
      prompt += `- 메뉴명과 가격은 정확하게 언급하되 자연스러운 문맥으로 녹여쓴다.\n`;
      prompt += `- 인기 토픽 키워드를 활용하여 독자가 궁금해할 내용을 다룬다.\n`;
      prompt += `- 제공된 정보 외 추가 메뉴나 가격은 절대 작성하지 않는다.\n\n`;
    }

    // 출력 형식
    prompt += `[출력 형식]\n\n`;
    prompt += `- 태그(tags): SEO와 내용에 맞게 5개 생성, "#단어" 형태\n`;
    prompt += `- 출력은 JSON 하나만\n`;
    prompt += `- HTML 태그는 content 내부에서만 사용\n\n`;

    // 핵심 요약
    prompt += `🎯 이 지침의 핵심 요약\n\n`;
    prompt += `❌ "잘 쓴 후기" → ✅ "사람이 남긴 기록"\n`;
    prompt += `❌ 정보 과잉 → ✅ 경험의 불완전함\n`;

    return prompt;
  }

  /**
   * 정보성 포스트를 위한 사용자 프롬프트 생성
   */
  private buildInformationalPrompt(
    request: GeneratePostRequest,
    referenceContents: string[] | undefined,
  ): string {
    let prompt = `[제공된 정보]\n\n`;

    // 분석 결과 (상위 블로그에서 추출한 정보)
    prompt += this.buildInformationalReferencePrompt(
      referenceContents,
      request.keyword,
    );

    // 광고주 정보 (있는 경우)
    if (
      request.additionalFields &&
      Object.keys(request.additionalFields).length > 0
    ) {
      prompt += `\n<광고주 정보>\n`;
      Object.entries(request.additionalFields).forEach(([key, value]) => {
        if (value) {
          prompt += `- ${key}: ${value}\n`;
        }
      });
      prompt += `</광고주 정보>\n`;
    }

    prompt += `\n---\n\n`;

    // 원고 정보
    prompt += `[원고 정보]\n\n`;
    prompt += `- 메인 키워드: ${request.keyword}\n`;
    prompt += `- 추천 키워드: ${request.recommendedKeyword || '상위 노출 블로그 분석을 통해 자동 추출'}\n`;
    prompt += `- 목표 글자 수: ${request.length}자 (HTML 태그 제외 기준)\n`;
    prompt += `- 글 종류: ${request.postType}\n`;

    prompt += `\n---\n\n`;

    // 페르소나 정보
    prompt += `[페르소나]\n\n`;
    prompt += `- 성별: ${request.persona.gender}\n`;
    prompt += `- 운영중인 블로그 주제: ${request.persona.blogTopic}\n`;
    if (request.persona.characteristics) {
      prompt += `- 기타특징: ${request.persona.characteristics}\n`;
    }
    prompt += `\n이 페르소나의 시각에서 정보를 정리하고 공유하는 톤으로 작성해주세요.\n`;

    prompt += `\n---\n\n`;

    // 다양성 전략 추가 (여러 원고 생성 시)
    if (request.postIndex && request.totalCount && request.totalCount > 1) {
      const approachIndex =
        (request.postIndex - 1) % this.DIVERSITY_APPROACHES.length;
      const approach = this.DIVERSITY_APPROACHES[approachIndex];
      prompt += `[다양성 전략 (${request.postIndex}/${request.totalCount}번째 원고)]\n\n`;
      prompt += `접근 방식: ${approach}\n`;
      prompt += `어조: ${this.getDiverseTone(request.postIndex)}\n`;
      prompt += `제목 스타일: ${this.getDiverseTitleStyle(request.postIndex)}\n`;
      prompt += `강조점: 다른 원고들과는 다른 정보나 관점을 주요하게 다루기\n\n`;

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

    // 작성 지침 요약
    prompt += `[작성 지침 요약]\n\n`;
    prompt += `1. 위 분석 결과를 바탕으로 정보를 재구성하여 작성\n`;
    prompt += `2. 단순 정보 나열이 아닌, 독자 관점에서 궁금증 순서대로 구성\n`;
    prompt += `3. "내가 찾아보니", "정리하면서 알게 된 건데" 같은 개인적 톤 유지\n`;
    prompt += `4. 구체적인 숫자, 방법, 예시를 반드시 포함\n`;
    prompt += `5. 광고주 정보가 있다면 본문 중후반부에 자연스럽게 녹이기\n\n`;

    prompt += `위 정보를 바탕으로 블로그 글을 작성해주세요.\n`;

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
   * 정보성 포스트 타입인지 확인
   */
  private isInformationalPostType(postType: string): boolean {
    return this.INFORMATIONAL_POST_TYPES.includes(postType);
  }

  /**
   * 후기성 포스트를 위한 작성 기법 분석 프롬프트
   */
  private getReviewSummaryPrompt(): string {
    return `블로그 작성 기법을 분석하는 전문가입니다.
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
3. 문장을 중간에 끊지 말고 완결된 형태로 출력`;
  }

  /**
   * 정보성 포스트를 위한 정보 추출 프롬프트
   */
  private getInformationalSummaryPrompt(keyword: string): string {
    return `당신은 블로그 콘텐츠에서 핵심 정보를 추출하는 정보 분석 전문가입니다.

[목표]
"${keyword}" 키워드로 검색한 사용자가 알고 싶어하는 핵심 정보를 구조화하여 추출합니다.

[분석 관점]
1. 검색 의도 파악: 이 키워드를 검색한 사람이 궁금해할 주요 질문들
2. 핵심 정보 추출: 블로그에서 다루는 실질적인 정보 (정의, 방법, 비교, 장단점 등)
3. 구체적 데이터: 수치, 기간, 비용, 절차 등 구체적인 정보
4. 정보 공백: 블로그에서 다루지 않지만 사용자가 궁금해할 수 있는 부분
5. 글 작성 앵글: 이 정보를 바탕으로 새 글을 쓸 때 차별화할 수 있는 관점

[출력 형식 - JSON]
{
  "main_questions": ["검색자가 알고 싶어하는 주요 질문 3-5개"],
  "core_info": {
    "정의/개념": "키워드의 핵심 정의나 개념 설명",
    "주요_방법/절차": ["단계별 방법이나 절차"],
    "장단점": {"장점": [], "단점": []},
    "비교_정보": "다른 것과의 비교 정보 (있는 경우)"
  },
  "specific_data": {
    "비용/가격": "관련 비용 정보",
    "기간/시간": "소요 기간이나 시간",
    "수치_데이터": "기타 구체적 수치"
  },
  "info_gaps": ["블로그에서 다루지 않은 궁금한 점들"],
  "writing_angles": ["새 글 작성 시 차별화 가능한 앵글 2-3개"],
  "style_patterns": {
    "도입_방식": "글 시작 패턴",
    "정보_전달_순서": "정보 배치 흐름",
    "강조_기법": "중요 정보 강조 방식"
  }
}

[규칙]
- 블로그 원문의 문장을 그대로 복사하지 말고, 정보만 추출하여 재구성
- 해당 정보가 없으면 null 또는 빈 배열로 표시
- 추측이 아닌 블로그에 실제로 있는 정보만 추출`;
  }

  /**
   * 블로그 작성 기법을 LLM으로 분석
   * ⚠️ 참조 블로그는 다른 매장/주제를 다룬 사례입니다 (내용 복사 금지)
   * @param content - 원본 블로그 콘텐츠
   * @param keyword - 검색 키워드 (맥락 제공용)
   * @param postType - 포스트 타입 (후기성/정보성 구분용)
   * @returns 작성 기법 분석 결과 또는 정보 추출 결과
   */
  async summarizeContent(
    content: string,
    keyword: string,
    postType?: string,
  ): Promise<string> {
    try {
      // 콘텐츠가 너무 짧으면 요약 불필요
      if (content.length < 200) {
        return content;
      }

      // 프롬프트 크기 제한 확대 (더 많은 맥락 제공)
      const truncatedContent = content.substring(0, 5000);

      // 정보성 포스트 여부 확인
      const isInformational = postType
        ? this.isInformationalPostType(postType)
        : false;

      this.logger.debug(
        `Summarizing content (${truncatedContent.length} chars) for keyword: ${keyword}, postType: ${postType}, isInformational: ${isInformational}`,
      );

      // 포스트 타입에 따른 프롬프트 선택
      const systemPrompt = isInformational
        ? this.getInformationalSummaryPrompt(keyword)
        : this.getReviewSummaryPrompt();

      const userPrompt = isInformational
        ? `다음은 "${keyword}" 키워드로 검색된 상위 노출 블로그입니다.
이 블로그에서 검색자가 알고 싶어하는 핵심 정보를 추출하여 JSON 형식으로 정리해주세요:

${truncatedContent}`
        : `다음은 "${keyword}" 키워드로 검색된 상위 노출 블로그입니다.
이 블로그의 작성 기법(문체, 구성, 패턴)을 분석하여 요약해주세요.
구체적인 내용(장소명, 메뉴, 가격 등)은 제외하고, 어떻게 글을 쓰는지에 집중해주세요:

${truncatedContent}`;

      const completion = await this.openai.chat.completions.create({
        model: this.summaryModel, // 비용 효율적인 요약 모델
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        // temperature: 0.3, // 일관성 있는 요약
        max_completion_tokens: 2000, // 한글 600자 ≈ 840 토큰이지만 여유분 충분히 확보
        // 정보성 포스트는 JSON 형식으로 응답 요청
        ...(isInformational && { response_format: { type: 'json_object' } }),
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
