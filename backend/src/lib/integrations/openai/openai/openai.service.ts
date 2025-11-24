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

  constructor(private readonly configService: ConfigService) {
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

    const systemPrompt = this.getSystemPrompt(request.persona);
    const referencePrompt = this.buildReferencePrompt(
      request.referenceContents,
      request.keyword,
    );
    const userPrompt = this.buildPrompt(request);
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
        };

        if (!parsed.title || !parsed.content) {
          throw new Error('Missing required fields: title or content');
        }

        this.logger.debug(
          `Generated content: title="${parsed.title.substring(0, 30)}...", html_length=${parsed.content.length}`,
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
   * 시스템 프롬프트 생성 (페르소나 기반)
   */
  private getSystemPrompt(persona: Persona): string {
    return `당신은 전문적인 블로그 작가입니다.

다음 페르소나로 글을 작성해주세요:
- 성별: ${persona.gender}
- 나이: ${persona.age}세
- 직업: ${persona.occupation}
- 결혼 여부: ${persona.isMarried ? '기혼' : '미혼'}
- 자녀 유무: ${persona.hasChildren ? '있음' : '없음'}
- 글쓰기 스타일: ${persona.blogStyle}
- 글 분위기: ${persona.blogTone}
${persona.additionalInfo ? `- 추가 정보: ${persona.additionalInfo}` : ''}

이 페르소나의 시각과 경험을 바탕으로 자연스럽고 진정성 있는 글을 작성해주세요.
SEO에 최적화된 구조로 작성하되, 과도한 키워드 반복은 피해주세요.

**중요: 반드시 다음 JSON 형식으로 응답해주세요:**
{
  "title": "블로그 제목",
  "content": "<h2>소제목</h2><p>본문 내용...</p><h3>세부 제목</h3><p>본문...</p>"
}

HTML 태그 사용 규칙:
- <h2>: 큰 섹션 제목
- <h3>: 세부 소제목
- <p>: 문단
- <strong>: 강조
- <ul>, <li>: 목록
- <blockquote>: 인용구
- 모든 HTML은 content 필드의 단일 문자열로 작성`;
  }

  /**
   * 상위 블로그 참조 프롬프트 생성 (캐싱 대상)
   * @param referenceContents - 상위 블로그 요약 내용
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

    let prompt = `📚 참고할 상위 노출 블로그 핵심 내용 (총 ${referenceContents.length}개):\n\n`;
    prompt += `다음은 현재 "${keyword}" 키워드로 상위에 노출되는 블로그들의 핵심 내용을 요약한 것입니다.\n`;
    prompt += `이 내용들을 참고하여 트렌드와 사용자들이 찾는 정보를 파악하고, 더 나은 콘텐츠를 작성해주세요.\n\n`;

    referenceContents.forEach((content, index) => {
      prompt += `[참고 ${index + 1}] ${content}\n\n`;
    });

    return prompt;
  }

  /**
   * 사용자 프롬프트 생성
   */
  private buildPrompt(request: GeneratePostRequest): string {
    let prompt = `다음 주제로 블로그 글을 작성해주세요:\n\n`;
    prompt += `🎯 주요 키워드: ${request.keyword}\n`;
    prompt += `📝 포스트 유형: ${request.postType}\n`;
    prompt += `📏 목표 글자 수: 약 ${request.length}자 (HTML 태그를 제외한 순수 텍스트 기준)\n`;

    // 다양성 전략 추가 (여러 원고 생성 시)
    if (request.postIndex && request.totalCount && request.totalCount > 1) {
      const approachIndex =
        (request.postIndex - 1) % this.DIVERSITY_APPROACHES.length;
      const approach = this.DIVERSITY_APPROACHES[approachIndex];
      prompt += `\n🎨 이번 원고의 접근 방식 (${request.postIndex}/${request.totalCount}번째):\n`;
      prompt += `${approach}\n\n`;
      prompt += `**중요: 다음 다양성 전략을 반드시 적용해주세요:**\n`;
      prompt += `1. 구성: 도입-본문-결론의 순서와 비중을 다르게 배치\n`;
      prompt += `2. 어조: ${this.getDiverseTone(request.postIndex)}\n`;
      prompt += `3. 예시: ${this.getDiverseExample(request.postIndex)}\n`;
      prompt += `4. 강조점: 다른 원고들과는 다른 측면을 주요하게 다루기\n`;
      prompt += `5. 제목 스타일: ${this.getDiverseTitleStyle(request.postIndex)}\n\n`;
    }

    // 이미 생성된 제목 중복 방지
    if (request.existingTitles && request.existingTitles.length > 0) {
      prompt += `\n⚠️ 제목 중복 방지: 다음 제목들과는 다른 제목을 사용해주세요:\n`;
      request.existingTitles.forEach((title, index) => {
        prompt += `${index + 1}. ${title}\n`;
      });
    }

    if (request.subKeywords && request.subKeywords.length > 0) {
      prompt += `🔖 서브 키워드: ${request.subKeywords.join(', ')}\n`;
    } else {
      prompt += `🔖 서브 키워드: 상위 노출 블로그 분석을 통해 자동 추출된 키워드를 자연스럽게 포함\n`;
    }

    if (
      request.additionalFields &&
      Object.keys(request.additionalFields).length > 0
    ) {
      prompt += `\n📋 추가 정보:\n`;
      Object.entries(request.additionalFields).forEach(([key, value]) => {
        if (value) {
          prompt += `- ${key}: ${value}\n`;
        }
      });
    }

    prompt += `\n✍️ 작성 지침:
1. 도입부: 독자의 관심을 끄는 흥미로운 시작
2. 본문: 구체적인 정보와 경험을 바탕으로 상세하게 작성
3. 마무리: 핵심 내용 요약과 독자에게 도움이 되는 조언
4. 자연스러운 문장 구조와 적절한 문단 나누기
5. 실제 경험에 기반한 듯한 진정성 있는 내용
6. 참고 블로그의 장점은 흡수하되, 독창적이고 차별화된 내용으로 작성

**중요: 목표 글자 수는 HTML 태그를 제외한 실제 텍스트만 계산합니다.**
예시: <p>안녕하세요</p> → 글자 수는 5자 (태그는 글자 수에 포함하지 않음)

**응답 형식: JSON으로 title과 HTML content를 포함해주세요.**`;

    return prompt;
  }

  /**
   * 문자열의 토큰 수 계산
   * tiktoken 사용 또는 fallback 추정
   */
  private countTokens(text: string): number {
    if (this.encoder) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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

    // JSON 구조 오버헤드: {"title":"...","content":"..."}
    const jsonOverhead = 150;

    // 여유분: 길이에 따라 동적 조정 (짧은 글: 50%, 긴 글: 40%)
    const marginRate =
      targetLength <= 500 ? 1.5 : targetLength <= 1500 ? 1.45 : 1.4;
    const outputTokens = Math.ceil(
      (targetOutputTokens + htmlOverhead + jsonOverhead) * marginRate,
    );

    // 최소 출력 토큰 보장 (동적 조정: 300자=4000, 3000자=12000)
    const minTokens = Math.max(4000, Math.ceil(targetLength * 4));
    const finalOutputTokens = Math.max(outputTokens, minTokens);

    this.logger.debug(
      `Token calculation: input=${inputTokens}, target=${targetLength}chars, target_tokens=${targetOutputTokens}, html_overhead=${htmlOverhead}, margin_rate=${marginRate}, final=${finalOutputTokens}`,
    );

    return finalOutputTokens;
  }

  /**
   * 블로그 콘텐츠를 LLM으로 요약
   * @param content - 원본 콘텐츠
   * @param keyword - 검색 키워드 (맥락 제공용)
   * @returns 요약된 콘텐츠 (최대 200자)
   */
  async summarizeContent(content: string, keyword: string): Promise<string> {
    try {
      // 콘텐츠가 너무 짧으면 요약 불필요
      if (content.length < 200) {
        return content;
      }

      // 프롬프트 크기 제한 (토큰 제한 방지)
      const truncatedContent = content.substring(0, 2000);

      this.logger.debug(
        `Summarizing content (${truncatedContent.length} chars) for keyword: ${keyword}`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.summaryModel, // 비용 효율적인 요약 모델
        messages: [
          {
            role: 'system',
            content:
              '당신은 블로그 콘텐츠를 간결하게 요약하는 전문가입니다. 핵심 정보만 추출하여 200자 이내로 간단히 요약해주세요.',
          },
          {
            role: 'user',
            content: `다음은 "${keyword}" 키워드로 검색된 블로그 글입니다. 이 글의 핵심 내용을 200자 이내로 요약해주세요:\n\n${truncatedContent}`,
          },
        ],
        // temperature: 0.3, // 일관성 있는 요약을 위해 낮은 temperature
        max_completion_tokens: 350, // 한글 200자 ≈ 286 토큰 + 여유분
      });

      const choice = completion.choices?.[0];

      if (!choice) {
        this.logger.warn('No choices in summary response');
        return content.substring(0, 200);
      }

      // refusal 체크
      if (choice.message?.refusal) {
        this.logger.warn(`Summary refused: ${choice.message.refusal}`);
        return content.substring(0, 200);
      }

      const summary = choice.message?.content?.trim();

      if (!summary) {
        this.logger.warn(
          `No summary generated, finish_reason: ${choice.finish_reason}`,
        );
        return content.substring(0, 200);
      }

      this.logger.debug(`Summary generated: ${summary.length} chars`);
      return summary;
    } catch (error: any) {
      this.logger.error(
        `Failed to summarize content: ${error.message}`,
        error.stack,
      );
      // 요약 실패 시 원본의 앞부분 반환 (200자)
      return content.substring(0, 200);
    }
  }
}
