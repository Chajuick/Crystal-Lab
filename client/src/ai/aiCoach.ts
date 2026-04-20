import type { CampaignScenario } from "@/shared/types/domain";

export interface AiCoachResponse {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  message_feedback: {
    score_adjustment: number;
    reason: string;
  };
  sql_feedback: {
    score_adjustment: number;
    reason: string;
  };
}

export const aiCoachResponseSchema = {
  summary: "전체 평가 요약",
  strengths: ["...", "..."],
  weaknesses: ["...", "..."],
  suggestions: ["...", "..."],
  message_feedback: { score_adjustment: 0, reason: "..." },
  sql_feedback: { score_adjustment: 0, reason: "..." },
};

export function buildAiCoachPrompt(input: {
  scenario: CampaignScenario;
  sql: string;
  message: { title: string; body: string; cta: string; benefit: string };
  scores: {
    sqlAccuracy: number;
    segmentFit: number;
    sendingStrategy: number;
    messageQuality: number;
    channelFit: number;
    total: number;
  };
  matchedRequired: string[];
  missedRequired: string[];
  excludedRisk: string[];
  audienceEstimate: number;
  totalCustomers: number;
}): string {
  const sendRatioPct = Math.round((input.audienceEstimate / (input.totalCustomers || 1)) * 100);

  return [
    "당신은 CRM 실무 코치입니다. 학습자에게 구체적이고 실행 가능한 피드백을 줘야 합니다.",
    "반드시 JSON만 반환하세요. JSON 외 다른 텍스트를 포함하면 안 됩니다.",
    "피드백은 '~가 필요합니다' 같은 모호한 표현 대신, 실제 SQL 예시나 구체적 수치를 들어 설명하세요.",
    "",
    "## 캠페인 정보",
    `제목: ${input.scenario.title}`,
    `목표: ${input.scenario.objective}`,
    `채널: ${input.scenario.channel}`,
    "",
    "## 규칙 기반 채점 결과",
    `총점: ${input.scores.total}점`,
    `SQL 정확도: ${input.scores.sqlAccuracy}점 | 세그먼트 적합도: ${input.scores.segmentFit}점 | 발송 전략: ${input.scores.sendingStrategy}점`,
    `메시지 품질: ${input.scores.messageQuality}점 | 채널 적합도: ${input.scores.channelFit}점`,
    `발송 대상: 전체 ${input.totalCustomers}명 중 ${input.audienceEstimate}명 (${sendRatioPct}%)`,
    input.matchedRequired.length > 0 ? `충족된 필수 조건: ${input.matchedRequired.join(", ")}` : "충족된 필수 조건: 없음",
    input.missedRequired.length > 0 ? `누락된 필수 조건: ${input.missedRequired.join(", ")}` : "누락된 필수 조건: 없음",
    input.excludedRisk.length > 0 ? `처리 안 된 제외 조건: ${input.excludedRisk.join(", ")}` : "제외 조건: 모두 처리됨",
    "",
    "## 제출된 SQL",
    input.sql,
    "",
    "## 제출된 메시지",
    `제목: ${input.message.title}`,
    `본문: ${input.message.body}`,
    `CTA: ${input.message.cta}`,
    `혜택: ${input.message.benefit}`,
    "",
    "## 피드백 작성 지침",
    "- strengths: 잘한 점을 구체적 근거와 함께 (예: '옵트인 조건을 WHERE kakao_opt_in=1로 명시해 수신동의 위반 리스크를 차단했습니다')",
    "- weaknesses: 실제로 부족한 부분만 (점수가 낮은 항목 우선, 없으면 빈 배열)",
    "- suggestions: 개선 방법을 SQL 코드 조각이나 메시지 문구 예시로 구체적으로 제시",
    "- summary: 이 캠페인의 핵심 강점과 가장 중요한 개선 포인트 1가지를 2~3문장으로",
    "",
    `다음 JSON 스키마에 맞춰 반환하세요: ${JSON.stringify(aiCoachResponseSchema)}`,
  ].join("\n");
}

export async function requestAiCoachFeedback(prompt: string, apiKey: string): Promise<AiCoachResponse> {
  if (!apiKey) {
    throw new Error("Groq API 키가 설정되지 않았습니다. 내 정보 탭에서 키를 등록해 주세요.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Groq API 오류 (${response.status})`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq 응답에서 텍스트를 찾을 수 없습니다.");
  return JSON.parse(text) as AiCoachResponse;
}
