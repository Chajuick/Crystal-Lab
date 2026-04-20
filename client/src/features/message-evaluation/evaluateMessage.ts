import type { CampaignScenario, EvaluationFeedback } from "@/shared/types/domain";

function compact(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

export function evaluateMessageSubmission(
  input: { title: string; body: string; cta: string; benefit: string },
  scenario: CampaignScenario,
) {
  const title = compact(input.title);
  const body = compact(input.body);
  const cta = compact(input.cta);
  const benefit = compact(input.benefit);
  const combined = `${title} ${body} ${cta} ${benefit}`.toLowerCase();
  const bodyAndTitle = `${title} ${body}`;
  const bodyLen = bodyAndTitle.length;

  // ── 콘텐츠 신호 감지 ──────────────────────────────────────
  const hasBenefit = /(할인|혜택|쿠폰|특가|포인트|적립|무료배송|단독|보너스)/.test(combined) || benefit.length > 3;
  const hasUrgency = /(오늘|지금|이번 주|마감|한정|마지막|곧 종료|~까지)/.test(combined);
  const hasAction = cta.length > 1 || /(확인|보러가기|받기|열기|바로|구경|신청|다운로드)/.test(combined);
  const hasPersonalization = /(님|고객님|\{이름\}|\{상품\}|\{브랜드\})/.test(combined);
  const hasSpamTone = /(무조건|대박|역대급|폭탄|공짜|100%|최저가 보장|미친 가격)/.test(combined);
  const hasContext = /(최근|구매|관심|담아|확인하신|돌아오|다시)/.test(combined);

  // 빈 필드 — 제출 최소 요건
  const bodyEmpty = body.length < 5;
  const ctaEmpty = cta.length < 2;
  const benefitEmpty = benefit.length < 2;

  // ── 메시지 품질 ───────────────────────────────────────────
  // 메시지가 '왜', '무엇을', '어떻게'를 담고 있는가
  let messageQuality = 20;

  if (bodyEmpty) {
    messageQuality -= 15; // 본문 없으면 메시지 자체가 불성립
  } else {
    if (hasBenefit) messageQuality += 20;       // 혜택/제안이 명확한가
    if (hasAction) messageQuality += 18;         // CTA가 있는가
    if (hasUrgency) messageQuality += 10;        // 긴박감이 있는가
    if (hasPersonalization) messageQuality += 12; // 개인화 신호
    if (hasContext) messageQuality += 8;          // 고객 행동 맥락 반영
    if (hasSpamTone) messageQuality -= 22;        // 스팸성 표현 강한 패널티
    if (ctaEmpty) messageQuality -= 12;           // CTA 없음
    if (benefitEmpty && !hasBenefit) messageQuality -= 8; // 혜택 전혀 없음
  }

  // ── 채널 적합성 ───────────────────────────────────────────
  // 채널 규칙을 얼마나 잘 지켰는가
  let channelFit = 30;

  if (scenario.channel === "app_push") {
    // 앱푸시: 제목+본문 합쳐 50자 이내, 즉시성·간결성이 핵심
    if (title.length === 0) channelFit -= 15;           // 푸시에서 제목 없으면 치명적
    else channelFit += 10;
    if (bodyLen <= 40) channelFit += 22;
    else if (bodyLen <= 60) channelFit += 12;
    else if (bodyLen <= 80) channelFit += 4;
    else channelFit -= 15;                              // 너무 긴 푸시
    if (hasUrgency) channelFit += 8;                    // 즉시성이 푸시 강점
    if (hasPersonalization) channelFit += 6;
  } else if (scenario.channel === "alimtalk") {
    // 알림톡: 안내·정보 전달 중심, 신뢰 어조, 40~130자 적절
    if (bodyLen >= 30 && bodyLen <= 130) channelFit += 20;
    else if (bodyLen < 30) channelFit -= 10;
    else channelFit -= 8;                               // 너무 긴 알림톡
    const formalTone = /(안내|확인|혜택|고객님|드립니다|가능합니다)/.test(combined);
    if (formalTone) channelFit += 12;
    if (hasSpamTone) channelFit -= 18;                  // 알림톡에서 스팸 어조는 차단 사유
    if (hasBenefit) channelFit += 6;
  } else if (scenario.channel === "friend_message") {
    // 친구톡: 브랜드 친근감, 제안형 어조, 40~150자
    if (bodyLen >= 35 && bodyLen <= 150) channelFit += 18;
    else if (bodyLen < 35) channelFit -= 8;
    else channelFit -= 6;
    const warmTone = /(추천|제안|어때요|함께|준비했|챙겨|놓치지)/.test(combined);
    if (warmTone) channelFit += 12;
    if (hasContext) channelFit += 8;                    // 행동 맥락 → 친구톡 설득력 ↑
    if (hasBenefit) channelFit += 6;
  }

  // 공통: 스팸 어조는 어떤 채널에서도 감점
  if (hasSpamTone) channelFit -= 10;

  // ── 텍스트 피드백 ─────────────────────────────────────────
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (hasBenefit) strengths.push("혜택·제안이 명확하게 드러나 반응 유도력이 있습니다.");
  if (hasAction) strengths.push("행동 유도 문구(CTA)가 포함되어 전환 흐름이 연결됩니다.");
  if (hasPersonalization) strengths.push("개인화 표현이 있어 수신자에게 맞춤 느낌을 줍니다.");
  if (!hasSpamTone && body.length > 4) strengths.push("과장 표현 없이 담백하게 전달해 신뢰도가 높습니다.");

  if (bodyEmpty) {
    weaknesses.push("본문이 비어 있어 메시지가 성립하지 않습니다.");
    suggestions.push("캠페인 목적과 혜택을 한 문장으로라도 작성해야 합니다.");
  } else {
    if (!hasAction) {
      weaknesses.push("CTA가 없어 다음 행동이 불명확합니다.");
      suggestions.push("'지금 확인하기', '혜택 받기' 같은 짧고 구체적인 CTA를 추가하세요.");
    }
    if (!hasBenefit) {
      weaknesses.push("고객이 반응해야 할 이유(혜택·제안)가 보이지 않습니다.");
      suggestions.push("할인율, 단독 쿠폰, 재방문 혜택 중 하나를 명시하세요.");
    }
    if (hasSpamTone) {
      weaknesses.push("과장 표현이 있어 스팸으로 분류되거나 브랜드 신뢰를 깎을 수 있습니다.");
      suggestions.push("'대박', '역대급' 같은 표현 대신 구체적 수치나 상황으로 대체하세요.");
    }
    if (scenario.channel === "app_push" && bodyLen > 60) {
      weaknesses.push("앱푸시 본문이 너무 깁니다. 즉시성이 낮아집니다.");
      suggestions.push("핵심 한 문장(40자 이내)으로 압축하세요.");
    }
    if (scenario.channel === "alimtalk" && bodyLen > 130) {
      weaknesses.push("알림톡 권장 길이를 초과해 가독성이 떨어집니다.");
      suggestions.push("130자 이내로 핵심 안내와 혜택만 남겨보세요.");
    }
    if (!hasUrgency) {
      weaknesses.push("긴박감 표현이 없어 즉시 행동 유도력이 다소 약합니다.");
      suggestions.push("'오늘까지', '이번 주 한정' 같은 기간 표현을 추가하면 클릭률이 높아집니다.");
    }
    if (!hasPersonalization) {
      weaknesses.push("개인화 요소가 없어 수신자 맞춤 느낌이 부족합니다.");
      suggestions.push("'{이름}님', '고객님이 관심 가진' 같은 표현으로 개인화 효과를 높여보세요.");
    }
  }

  const channelGuide: Record<string, string> = {
    app_push: "앱푸시는 제목+본문 40자 내외, 즉시성과 행동 유도를 한 문장에 압축하는 것이 효과적입니다.",
    alimtalk: "알림톡은 공식적이고 신뢰감 있는 어조로 혜택·조건을 간결하게 전달하는 것이 기본입니다.",
    friend_message: "친구톡은 브랜드 친근감을 살리되, 제안 맥락과 혜택을 자연스럽게 담아야 설득력이 생깁니다.",
  };

  const suggestedRewrites: Record<string, string> = {
    app_push: "놓친 혜택, 오늘까지예요 — 지금 바로 확인하세요.",
    alimtalk: "고객님께 준비한 혜택을 안내드립니다. 오늘까지 유효하니 지금 확인해보세요.",
    friend_message: "고객님이 관심 갖던 상품에 딱 맞는 혜택을 준비했어요. 이번 주 안에 확인하시면 바로 적용됩니다.",
  };

  return {
    score: {
      messageQuality: Math.max(5, Math.min(100, Math.round(messageQuality))),
      channelFit: Math.max(5, Math.min(100, Math.round(channelFit))),
    },
    detail: {
      summary: "메시지 규칙 기반 검토 완료.",
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      suggestions: suggestions.slice(0, 3),
    } as EvaluationFeedback,
    channelAdvice: channelGuide[scenario.channel] ?? channelGuide.app_push,
    suggestedRewrite: suggestedRewrites[scenario.channel] ?? suggestedRewrites.app_push,
  };
}
