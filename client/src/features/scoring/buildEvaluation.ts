import { buildAiCoachPrompt, aiCoachResponseSchema } from "@/ai/aiCoach";
import { evaluateMessageSubmission } from "@/features/message-evaluation/evaluateMessage";
import { evaluateSqlSubmission } from "@/features/sql-evaluation/evaluateSql";
import type { CampaignScenario, EvaluationResult, SqlRunResult, Warehouse } from "@/shared/types/domain";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromScore(score: number): EvaluationResult["grade"] {
  if (score >= 90) return "매우 적절";
  if (score >= 78) return "적절";
  if (score >= 62) return "부분적으로 적절";
  if (score >= 45) return "실무 위험 존재";
  return "비효율적";
}

export function buildEvaluation(input: {
  scenario: CampaignScenario;
  sql: string;
  sqlResult: SqlRunResult;
  warehouse: Warehouse;
  message: { title: string; body: string; cta: string; benefit: string };
}): EvaluationResult {
  const sqlEval = evaluateSqlSubmission(input.sql, input.sqlResult, input.scenario, input.warehouse);
  const msgEval = evaluateMessageSubmission(input.message, input.scenario);

  // 가중치: 세그먼트 정합성 최우선, 메시지 품질 2위, SQL 기술은 전제조건 수준
  const totalScore = clamp(
    sqlEval.score.sqlAccuracy * 0.15 +
      sqlEval.score.segmentFit * 0.30 +
      sqlEval.score.sendingStrategy * 0.15 +
      msgEval.score.messageQuality * 0.25 +
      msgEval.score.channelFit * 0.15,
  );

  const summary = `${input.scenario.title} 미션에 대해 규칙 기반 평가를 완료했습니다. SQL과 메시지 모두 실무 관점에서 보수적으로 채점되었습니다.`;

  return {
    totalScore,
    grade: gradeFromScore(totalScore),
    breakdown: {
      sqlAccuracy: sqlEval.score.sqlAccuracy,
      segmentFit: sqlEval.score.segmentFit,
      sendingStrategy: sqlEval.score.sendingStrategy,
      messageQuality: msgEval.score.messageQuality,
      channelFit: msgEval.score.channelFit,
    },
    sql: {
      ...sqlEval.detail,
      matchedRequired: sqlEval.matchedRequired,
      missedRequired: sqlEval.missedRequired,
      excludedRisk: sqlEval.excludedRisk,
      audienceFit: sqlEval.audienceFit,
      audienceEstimate: sqlEval.audienceEstimate,
      overSendRisk: sqlEval.overSendRisk,
    },
    message: {
      ...msgEval.detail,
      channelAdvice: msgEval.channelAdvice,
      suggestedRewrite: msgEval.suggestedRewrite,
    },
    aiReady: {
      prompt: buildAiCoachPrompt({
        scenario: input.scenario,
        sql: input.sql,
        message: input.message,
        baselineSummary: summary,
      }),
      schema: aiCoachResponseSchema,
    },
  };
}
