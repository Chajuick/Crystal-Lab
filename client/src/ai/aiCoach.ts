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
  baselineSummary: string;
}): string {
  return [
    "당신은 CRM 실무 코치입니다.",
    "반드시 JSON만 반환하세요. JSON 외 다른 텍스트를 포함하면 안 됩니다.",
    "평가는 짧고 실무적으로 작성하세요. 각 항목 최대 2~3문장.",
    "기본 점수는 이미 규칙 기반 엔진이 계산했습니다. 당신은 해설과 소폭 보정 제안만 해야 합니다.",
    `캠페인 제목: ${input.scenario.title}`,
    `목표: ${input.scenario.objective}`,
    `채널: ${input.scenario.channel}`,
    `기본 요약: ${input.baselineSummary}`,
    `SQL:\n${input.sql}`,
    `메시지 제목: ${input.message.title}`,
    `메시지 본문: ${input.message.body}`,
    `CTA: ${input.message.cta}`,
    `혜택: ${input.message.benefit}`,
    "",
    `다음 JSON 스키마에 맞춰 반환하세요: ${JSON.stringify(aiCoachResponseSchema)}`,
  ].join("\n");
}

export async function requestAiCoachFeedback(prompt: string, apiKey: string): Promise<AiCoachResponse> {
  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 내 정보 탭에서 키를 등록해 주세요.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini API 오류 (${response.status})`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 응답에서 텍스트를 찾을 수 없습니다.");
  return JSON.parse(text) as AiCoachResponse;
}
