[출력 규칙]

1. 반드시 아래 JSON 구조로 응답한다: { "title": "${title}", "content":
   "<h2>...</h2><p>...</p>", "tags": ["#태그1", "#태그2", ... "#태그30"] }
2. content는 HTML 문자열 하나로만 구성한다.
3. 허용 태그: <h2>, <h3>, <p>, <strong>, <ul>, <li>, <blockquote>
4. 본문 문장은 <p> 내부에만 넣으며 제목은 <h2>, <h3> 사용.
5. , -, •, ~, +, >, | 등 마크다운 불릿은 절대 사용하지 않는다.
6. 단, tags 필드 내부에서만 # 사용을 허용한다.
7. 참고 블로그 내용은 참고만 하고 문장을 복사하지 않는다.
8. 목표 글자 수는 HTML 태그 제외 기준으로 약 ${targetLength}자로 맞춘다.
9. 플레이스 링크(${placeLink})가 제공될 경우, 반드시 해당 링크에 직접 접속하여
   메뉴·가격·위치·주차·영업시간 등 실제 확인 가능한 정보를 기반으로 작성한다.
10. 출력은 JSON 한 덩어리로만 제공한다.

---

[원고 정보 입력]

- 글 종류: ${postType}
- 주요 키워드: ${mainKeyword}
- 서브 키워드: ${subKeywords}
- 목표 글자 수: ${targetLength}
- 플레이스 정보 링크: ${placeLink}
- 추가 정보: • location: ${locationInfo} • visitDate: ${visitDate} •
  companyName: ${companyName} • mainAttraction: ${mainAttraction}

---

[페르소나]

- 나이: ${personaAge}
- 성별: ${personaGender}
- 직업: ${personaJob}
- 결혼 여부: ${personaMarital}
- 자녀 여부: ${personaChildren}
- 글쓰기 스타일: ${personaWritingStyle}
- 글 분위기: ${personaTone}
- 추가 정보: ${personaAdditionalInfo}

---

[참고할 내용]

아래는 “${mainKeyword}” 상위 노출 블로그들의 공통 패턴을 요약한 참고 정보이다.

흐름·구성·트렌드 파악용으로만 활용하며, 특정 문장·표현은 복사하지 않는다.

${referenceSummaries}

---

[작성 지침]

1. 페르소나 시점의 자연스러운 말투로 작성한다.
2. 도입–본문–마무리 구조를 명확히 한다.
3. 핵심 키워드와 서브 키워드는 자연스럽게 녹여쓴다.
4. ${postType}의 작성 목적에 충실하며, 실제 방문 또는 이용한 사용자 관점에서
   자연스럽고 구체적으로 묘사한다.
5. 강조가 필요한 부분은 <strong> 태그 사용.
6. 플레이스 링크 정보는 반드시 실제 확인한 내용만 반영한다.
7. 태그(tags)는 글 내용과 SEO에 맞게 30개 생성하며 "#단어" 형태를 따른다.
8. 최종 출력은 JSON 형식 하나로만 제공하며, HTML은 content 안에만 넣는다.
