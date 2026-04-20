import type { CampaignScenario, EvaluationFeedback } from "@/shared/types/domain";

function compact(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function makeFeedback(summary: string, strengths: string[], weaknesses: string[], suggestions: string[]): EvaluationFeedback {
  return { summary, strengths, weaknesses, suggestions };
}

export function evaluateMessageSubmission(input: { title: string; body: string; cta: string; benefit: string }, scenario: CampaignScenario) {
  const title = compact(input.title);
  const body = compact(input.body);
  const cta = compact(input.cta);
  const benefit = compact(input.benefit);
  const combined = `${title} ${body} ${cta} ${benefit}`.toLowerCase();

  const hasBenefit = /(할인|혜택|쿠폰|특가|보너스|단독|추가 적립|무료)/.test(combined) || benefit.length > 0;
  const hasUrgency = /(오늘|지금|이번|마감|한정|마지막|곧 종료)/.test(combined);
  const hasSpamTone = /(무조건|대박|역대급|폭탄|공짜|100%)/.test(combined);
  const hasAction = cta.length > 0 || /(확인|보러가기|받기|지금 열기|바로)/.test(combined);
  const length = `${title} ${body}`.length;

  let messageQuality = 56;
  let channelFit = 58;

  if (hasBenefit) messageQuality += 9;
  if (hasAction) messageQuality += 10;
  if (hasUrgency) messageQuality += 5;
  if (benefit.length > 0) channelFit += 4;
  if (hasSpamTone) {
    messageQuality -= 15;
    channelFit -= 12;
  }

  if (scenario.channel === "app_push") {
    if (length <= 52) {
      channelFit += 14;
    } else {
      channelFit -= 10;
    }
    if (title.length > 0) messageQuality += 6;
  }

  if (scenario.channel === "alimtalk") {
    if (length >= 35 && length <= 120) channelFit += 12;
    if (body.includes("안내") || body.includes("혜택") || body.includes("고객")) messageQuality += 6;
  }

  if (scenario.channel === "friend_message") {
    if (length >= 35 && length <= 140) channelFit += 10;
    if (body.includes("추천") || body.includes("제안") || body.includes("지금 확인")) messageQuality += 5;
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (hasAction) strengths.push("행동 유도 문구가 포함되어 있어 전환 유도력이 있습니다.");
  if (hasBenefit) strengths.push("혜택 또는 제안 포인트가 명확하게 드러납니다.");
  if (!hasSpamTone) strengths.push("과장된 표현이 적어 브랜드 신뢰를 해치지 않습니다.");

  if (!hasAction) {
    weaknesses.push("CTA가 약해 다음 행동이 선명하지 않습니다.");
    suggestions.push("'혜택 보기', '지금 확인하기'처럼 짧고 구체적인 CTA를 넣어 보세요.");
  }
  if (!hasBenefit) {
    weaknesses.push("고객이 왜 반응해야 하는지 이유가 부족합니다.");
    suggestions.push("할인, 단독 혜택, 추천 이유 중 하나를 분명히 제시해 보세요.");
  }
  if (hasSpamTone) {
    weaknesses.push("과장 표현이 있어 스팸처럼 느껴질 수 있습니다.");
    suggestions.push("강한 미끼 표현 대신 상품, 상황, 혜택을 담백하게 설명해 보세요.");
  }
  if (scenario.channel === "app_push" && length > 52) {
    weaknesses.push("앱푸시치고 문장이 길어 즉시성이 약합니다.");
    suggestions.push("핵심 상품명과 행동 문구만 남기고 길이를 줄여 보세요.");
  }

  const suggestedRewrite =
    scenario.channel === "app_push"
      ? "장바구니에 담아둔 상품, 오늘 혜택으로 다시 확인해보세요."
      : scenario.channel === "alimtalk"
        ? "최근 관심을 보인 상품에 사용할 수 있는 혜택을 준비했습니다. 지금 조건을 확인해보세요."
        : "고객님께 잘 맞는 제안을 다시 정리해두었습니다. 이번 주 안에 확인하시면 혜택 적용이 가능합니다.";

  return {
    score: {
      messageQuality: Math.max(10, Math.min(100, messageQuality)),
      channelFit: Math.max(10, Math.min(100, channelFit)),
    },
    detail: makeFeedback(
      "메시지 규칙 기반 검토가 완료되었습니다.",
      strengths.slice(0, 3),
      weaknesses.slice(0, 3),
      suggestions.slice(0, 3),
    ),
    channelAdvice:
      scenario.channel === "app_push"
        ? "앱푸시는 한 문장 안에서 상품과 행동 유도를 압축하는 것이 좋습니다."
        : scenario.channel === "alimtalk"
          ? "알림톡은 안내성, 신뢰감, 혜택 전달의 균형이 중요합니다."
          : "플러스친구 메시지는 친근하지만 너무 가볍지 않게 제안을 정리하는 것이 좋습니다.",
    suggestedRewrite,
  };
}
