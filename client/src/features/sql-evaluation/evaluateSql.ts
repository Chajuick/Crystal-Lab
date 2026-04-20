import type { CampaignScenario, EvaluationFeedback, SqlRunResult, Warehouse } from "@/shared/types/domain";

function norm(sql: string) {
  return sql.toLowerCase();
}

function has(sql: string, keywords: string[]) {
  return keywords.some((kw) => norm(sql).includes(kw.toLowerCase()));
}

function hasOptInCheck(sql: string) {
  return /push_opt_in|kakao_opt_in|marketing_opt_in/.test(norm(sql));
}

function hasDormantExclusion(sql: string) {
  return /dormant/.test(norm(sql));
}

function hasRecentSendExclusion(sql: string) {
  return /message_log|campaign_history|sent_at/.test(norm(sql));
}

export function evaluateSqlSubmission(sql: string, result: SqlRunResult, scenario: CampaignScenario, warehouse: Warehouse) {
  const n = norm(sql);

  const matchedRequired = scenario.requiredRules.filter((r) => has(n, r.keywords));
  const missedRequired = scenario.requiredRules.filter((r) => !has(n, r.keywords));
  const excludedRisk = scenario.excludedRules.filter((r) => !has(n, r.keywords));
  const bonusHit = scenario.bonusRules.filter((r) => has(n, r.keywords)).length;

  const totalRequired = scenario.requiredRules.length || 1;
  const matchRatio = matchedRequired.length / totalRequired;

  const audienceEstimate = result.rowCount;
  const baseAudience = warehouse.customers.length || 1;
  const sendRatio = audienceEstimate / baseAudience;

  // ── SQL 정확도 (기술 정확성) ──────────────────────────────
  // SQL이 실행됐는지가 전제조건. 실행 실패면 상한 25.
  let sqlAccuracy = result.ok ? 40 : 10;
  if (result.ok) {
    sqlAccuracy += Math.round(matchRatio * 42);         // 필수 조건 반영도 최대 +42
    sqlAccuracy -= missedRequired.length * 8;           // 누락당 -8
    if (result.rowCount === 0) sqlAccuracy -= 15;       // 결과 없음 → 쿼리 의미 없음
  }

  // ── 세그먼트 정합성 (올바른 타겟) ────────────────────────
  // 실무에서 가장 중요: 맞는 사람에게 보내는가
  let segmentFit = result.ok ? 35 : 8;
  if (result.ok) {
    segmentFit += Math.round(matchRatio * 38);          // 필수 조건 정합도 최대 +38
    segmentFit -= excludedRisk.length * 10;             // 제외 조건 누락당 -10 (컴플라이언스)
    if (!hasOptInCheck(n)) segmentFit -= 18;            // 옵트인 미체크 → 수신동의 위반 리스크
    if (!hasDormantExclusion(n) && scenario.excludedRules.some((r) => r.label.includes("휴면")))
      segmentFit -= 8;                                  // 휴면 미제외
    if (sendRatio > 0.55) segmentFit -= 18;             // 과발송: 55%+ 위험
    else if (sendRatio > 0.35) segmentFit -= 10;        // 과발송: 35%+ 경고
    if (sendRatio >= 0.03 && sendRatio <= 0.30) segmentFit += 10; // 적절 범위 보너스
  }

  // ── 발송 전략 (운영 리스크 관리) ─────────────────────────
  let sendingStrategy = result.ok ? 40 : 10;
  if (result.ok) {
    sendingStrategy += bonusHit * 10;                   // 보너스 조건당 +10
    if (hasOptInCheck(n)) sendingStrategy += 12;        // 수신동의 확인 시 +12
    if (hasRecentSendExclusion(n)) sendingStrategy += 8; // 최근 발송 이력 제외 +8
    if (hasDormantExclusion(n)) sendingStrategy += 6;   // 휴면 제외 +6
    if (sendRatio > 0.55) sendingStrategy -= 22;        // 과발송 강한 패널티
    else if (sendRatio > 0.35) sendingStrategy -= 12;
    else if (sendRatio < 0.02) sendingStrategy -= 10;   // 너무 좁음
    excludedRisk.forEach(() => { sendingStrategy -= 7; }); // 제외 조건 누락당
  }

  // ── 텍스트 피드백 ─────────────────────────────────────────
  const overSendRisk: "낮음" | "보통" | "높음" = !result.ok
    ? "높음"
    : sendRatio > 0.40
    ? "높음"
    : sendRatio > 0.20
    ? "보통"
    : "낮음";

  const audienceFit = !result.ok
    ? "쿼리 실행 실패로 타겟 규모를 신뢰할 수 없습니다."
    : sendRatio > 0.55
    ? "전체 고객의 절반 이상에게 발송 — 피로도·비용 리스크가 큽니다."
    : sendRatio > 0.35
    ? "발송 규모가 다소 넓습니다. 세분화 조건을 추가해 보세요."
    : sendRatio < 0.02
    ? "타겟이 지나치게 좁아 캠페인 임팩트가 약할 수 있습니다."
    : "발송 규모가 실무적으로 적절한 범위입니다.";

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (matchRatio >= 0.8 && result.ok) strengths.push("필수 타겟 조건을 충실히 반영했습니다.");
  if (bonusHit > 0) strengths.push("보너스 조건으로 세그먼트를 더 정교하게 다듬었습니다.");
  if (hasOptInCheck(n)) strengths.push("수신 동의 여부를 확인해 컴플라이언스 리스크를 낮췄습니다.");
  if (sendRatio >= 0.03 && sendRatio <= 0.30 && result.ok) strengths.push("발송 규모가 과도하지 않아 운영상 안정적입니다.");

  if (!result.ok) {
    weaknesses.push("SQL 실행 오류로 세그먼트 검증이 불가합니다.");
    suggestions.push("테이블명, 컬럼명, JOIN 조건을 재확인하세요.");
  }
  if (missedRequired.length > 0) {
    weaknesses.push(`필수 조건 누락: ${missedRequired.map((r) => r.label).join(", ")}`);
    suggestions.push("미션 브리핑의 필수 조건을 WHERE / JOIN에 모두 반영해야 합니다.");
  }
  if (!hasOptInCheck(n) && result.ok) {
    weaknesses.push("수신 동의(opt_in) 조건이 없습니다 — 실무에서는 발송 전 필수 확인 항목입니다.");
    suggestions.push("push_opt_in = 1 또는 marketing_opt_in = 1 조건을 반드시 추가하세요.");
  }
  if (excludedRisk.length > 0) {
    weaknesses.push(`제외 조건 미처리: ${excludedRisk.map((r) => r.label).join(", ")}`);
    suggestions.push("최근 구매·발송 고객, 휴면 고객을 제외하면 타겟 정밀도가 올라갑니다.");
  }
  if (sendRatio > 0.40 && result.ok) {
    weaknesses.push(`발송 대상이 전체의 ${Math.round(sendRatio * 100)}%로 과도합니다.`);
    suggestions.push("활동 기간, 구매 빈도, 세션 횟수 등 추가 필터로 모수를 좁혀보세요.");
  }

  return {
    score: {
      sqlAccuracy: Math.max(5, Math.min(100, Math.round(sqlAccuracy))),
      segmentFit: Math.max(5, Math.min(100, Math.round(segmentFit))),
      sendingStrategy: Math.max(5, Math.min(100, Math.round(sendingStrategy))),
    },
    detail: {
      summary: result.ok ? "규칙 기반 SQL 검토 완료." : "SQL 오류로 보수적 평가.",
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      suggestions: suggestions.slice(0, 3),
    } as EvaluationFeedback,
    matchedRequired: matchedRequired.map((r) => r.label),
    missedRequired: missedRequired.map((r) => r.label),
    excludedRisk: excludedRisk.map((r) => r.label),
    audienceFit,
    audienceEstimate,
    overSendRisk,
  };
}
