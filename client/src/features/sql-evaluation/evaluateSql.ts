import type { CampaignScenario, EvaluationFeedback, SqlRunResult, Warehouse } from "@/shared/types/domain";

function normalize(sql: string) {
  return sql.toLowerCase();
}

function hasAny(sql: string, keywords: string[]) {
  return keywords.some((keyword) => normalize(sql).includes(keyword.toLowerCase()));
}

function createFeedback(summary: string, strengths: string[], weaknesses: string[], suggestions: string[]): EvaluationFeedback {
  return { summary, strengths, weaknesses, suggestions };
}

export function evaluateSqlSubmission(sql: string, result: SqlRunResult, scenario: CampaignScenario, warehouse: Warehouse) {
  const normalized = normalize(sql);
  const matchedRequired = scenario.requiredRules.filter((rule) => hasAny(normalized, rule.keywords)).map((rule) => rule.label);
  const missedRequired = scenario.requiredRules.filter((rule) => !hasAny(normalized, rule.keywords)).map((rule) => rule.label);
  const excludedRisk = scenario.excludedRules.filter((rule) => !hasAny(normalized, rule.keywords)).map((rule) => rule.label);
  const bonusHit = scenario.bonusRules.filter((rule) => hasAny(normalized, rule.keywords)).length;

  const baseAudience = warehouse.customers.length;
  const audienceEstimate = result.rowCount;
  const ratio = baseAudience === 0 ? 0 : audienceEstimate / baseAudience;

  let sqlAccuracy = 54 + matchedRequired.length * 12 - missedRequired.length * 10;
  let segmentFit = 52 + matchedRequired.length * 10 - excludedRisk.length * 8;
  let sendingStrategy = 58 + bonusHit * 6 - excludedRisk.length * 7;

  if (!result.ok) {
    sqlAccuracy = 18;
    segmentFit = 22;
    sendingStrategy = 25;
  }

  if (ratio > 0.72) {
    segmentFit -= 12;
    sendingStrategy -= 10;
  }

  if (ratio < 0.02 && result.ok) {
    segmentFit -= 10;
  }

  const overSendRisk = !result.ok ? "높음" : ratio > 0.45 ? "높음" : ratio > 0.2 ? "보통" : "낮음";
  const audienceFit =
    !result.ok
      ? "쿼리 실행에 실패해 타겟 규모를 신뢰할 수 없습니다."
      : ratio > 0.55
        ? "타겟이 지나치게 넓어 과발송 위험이 있습니다."
        : ratio < 0.03
          ? "타겟이 지나치게 좁아 캠페인 규모가 부족할 수 있습니다."
          : "타겟 규모가 실무적으로 무난한 범위에 있습니다.";

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (matchedRequired.length >= Math.max(2, scenario.requiredRules.length - 1)) {
    strengths.push("필수 조건 반영이 비교적 명확합니다.");
  }
  if (bonusHit > 0) {
    strengths.push("보너스 조건을 고려해 세그먼트를 더 실무적으로 다듬었습니다.");
  }
  if (ratio >= 0.04 && ratio <= 0.28 && result.ok) {
    strengths.push("예상 발송 규모가 과도하게 넓지 않아 운영상 안정적입니다.");
  }

  if (!result.ok) {
    weaknesses.push("SQL 실행 오류가 있어 세그먼트 검증이 중단되었습니다.");
    suggestions.push("테이블명과 조인 조건을 다시 확인한 뒤 재실행해 보세요.");
  }
  if (missedRequired.length > 0) {
    weaknesses.push(`필수 조건 누락: ${missedRequired.join(", ")}`);
    suggestions.push(`누락된 조건을 WHERE 또는 JOIN 로직에 반영해 보세요: ${missedRequired.join(", ")}`);
  }
  if (excludedRisk.length > 0) {
    weaknesses.push(`제외 조건 누락 가능성: ${excludedRisk.join(", ")}`);
    suggestions.push("최근 발송 이력, 최근 구매, 수신 동의 여부를 함께 제외하면 더 안전합니다.");
  }
  if (ratio > 0.55) {
    weaknesses.push("타겟 모수가 지나치게 넓어 피로도 리스크가 큽니다.");
    suggestions.push("최근 구매, 최근 발송, 관심도 같은 좁히는 조건을 추가해 보세요.");
  }
  if (ratio < 0.03 && result.ok) {
    weaknesses.push("타겟이 너무 좁아 캠페인 임팩트가 약할 수 있습니다.");
    suggestions.push("필수 조건을 유지하면서도 기간 조건이나 집계 기준을 완화해 보세요.");
  }

  return {
    score: {
      sqlAccuracy: Math.max(10, Math.min(100, sqlAccuracy)),
      segmentFit: Math.max(10, Math.min(100, segmentFit)),
      sendingStrategy: Math.max(10, Math.min(100, sendingStrategy)),
    },
    detail: createFeedback(
      result.ok ? "규칙 기반 SQL 검토가 완료되었습니다." : "SQL 오류로 인해 보수적으로 평가했습니다.",
      strengths.slice(0, 3),
      weaknesses.slice(0, 3),
      suggestions.slice(0, 3),
    ),
    matchedRequired,
    missedRequired,
    excludedRisk,
    audienceFit,
    audienceEstimate,
    overSendRisk: overSendRisk as "낮음" | "보통" | "높음",
  };
}
