import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignScenario } from "@/shared/types/domain";

// ── Types ──────────────────────────────────────────────────────────────

interface StepOption {
  label: string;
  desc: string;
  isCorrect: boolean;
}

interface GuidedStep {
  prompt: string;
  detail: string;
  successMsg: string;
  explanation: string; // 왜 맞는지 + SQL 의미 해설
  options: StepOption[];
  sqlAdd: { join?: string; condition?: string; selectExtra?: string };
}

interface SqlState {
  tableSelected: boolean;
  operationSelected: boolean;
  selectExtras: string[];
  joins: string[];
  conditions: string[];
}

// ── Option pools ───────────────────────────────────────────────────────

const TABLE_POOL: StepOption[] = [
  { label: "customers", desc: "고객 기본 정보 (이름, 수신동의, 등급)", isCorrect: false },
  { label: "orders", desc: "주문 내역 (금액, 날짜, 상품)", isCorrect: false },
  { label: "sessions", desc: "접속·세션 기록 (최근 접속, 방문 횟수)", isCorrect: false },
  { label: "carts", desc: "장바구니 (담기, 이탈, 전환 상태)", isCorrect: false },
  { label: "message_logs", desc: "발송 로그 (채널, 클릭, 전환)", isCorrect: false },
  { label: "campaign_history", desc: "캠페인 이력 (전환, 발송 결과)", isCorrect: false },
];

const TABLE_LABELS = TABLE_POOL.map((t) => t.label);

const COLUMN_OPTIONS: StepOption[] = [
  { label: "app_installed = 1", desc: "앱 설치 고객만", isCorrect: false },
  { label: "push_opt_in = 1", desc: "앱푸시 수신 동의", isCorrect: false },
  { label: "kakao_opt_in = 1", desc: "카카오 수신 동의", isCorrect: false },
  { label: "marketing_opt_in = 1", desc: "마케팅 전체 동의", isCorrect: false },
  { label: "dormant_status = 0", desc: "활성 고객 (휴면 제외)", isCorrect: false },
  { label: "membership_grade IN ('GOLD','VIP')", desc: "상위 등급 고객만", isCorrect: false },
  { label: "session_count_7d < 3", desc: "최근 7일 접속 적은 고객", isCorrect: false },
  { label: "session_count_30d < 5", desc: "최근 30일 세션 적은 고객", isCorrect: false },
];

// ── SQL fragment builder ───────────────────────────────────────────────

function ruleToSqlFragment(keywords: string[], isExclusion: boolean): GuidedStep["sqlAdd"] {
  if (keywords.some((k) => ["sessions", "last_session_at", "session_count_7d", "session_count_30d"].includes(k))) {
    const cond = keywords.includes("last_session_at")
      ? "AND s.last_session_at >= '2026-04-06'"
      : keywords.includes("session_count_7d")
        ? "AND s.session_count_7d < 3"
        : "AND s.session_count_30d < 5";
    return { join: "LEFT JOIN sessions s ON c.customer_id = s.customer_id", condition: cond, selectExtra: "s.last_session_at" };
  }
  if (keywords.some((k) => ["orders", "ordered_at", "max", "category_name"].includes(k))) {
    if (isExclusion)
      return { condition: "AND c.customer_id NOT IN (\n    SELECT DISTINCT customer_id FROM orders\n    WHERE ordered_at >= '2026-03-21'\n  )" };
    return {
      join: "LEFT JOIN orders o ON c.customer_id = o.customer_id",
      condition: "AND o.ordered_at BETWEEN '2026-02-19' AND '2026-03-16'",
      selectExtra: "o.ordered_at",
    };
  }
  if (keywords.some((k) => ["carts", "cart_status", "added_at"].includes(k))) {
    return {
      join: "LEFT JOIN carts ct ON c.customer_id = ct.customer_id",
      condition: "AND ct.cart_status = 'abandoned'\n  AND ct.added_at >= '2026-04-13'",
      selectExtra: "ct.cart_status",
    };
  }
  if (keywords.some((k) => ["message_logs", "sent_at", "channel"].includes(k))) {
    if (isExclusion)
      return { condition: "AND c.customer_id NOT IN (\n    SELECT DISTINCT customer_id FROM message_logs\n    WHERE sent_at >= '2026-04-17'\n  )" };
    return {
      join: "LEFT JOIN message_logs ml ON c.customer_id = ml.customer_id",
      condition: "AND ml.sent_at >= '2026-04-13'",
    };
  }
  if (keywords.includes("app_installed")) return { condition: "AND c.app_installed = 1" };
  if (keywords.includes("dormant_status")) return { condition: "AND c.dormant_status = 0" };
  if (keywords.includes("membership_grade")) return { condition: "AND c.membership_grade IN ('GOLD', 'VIP')" };
  if (keywords.includes("marketing_opt_in")) return { condition: "AND c.marketing_opt_in = 1" };
  if (keywords.includes("clicked")) return { condition: "AND ml.clicked = 1" };
  if (keywords.includes("coupon_eligibility")) return { condition: "AND c.customer_id IN (SELECT customer_id FROM coupon_eligibility WHERE used = 0)" };
  return { condition: `-- ${keywords[0]}` };
}

function explainFragmentByKeywords(keywords: string[], isExclusion: boolean): string {
  if (keywords.some((k) => ["sessions", "last_session_at", "session_count_7d", "session_count_30d"].includes(k))) {
    return "LEFT JOIN sessions s ON c.customer_id = s.customer_id — JOIN으로 세션 테이블을 customers에 연결합니다. LEFT JOIN을 쓰면 세션 기록이 아예 없는 고객도 결과에서 누락되지 않아요. 이후 AND 조건으로 최근 접속 일자나 세션 횟수를 기준으로 필터링합니다.";
  }
  if (keywords.some((k) => ["orders", "ordered_at", "max", "category_name"].includes(k))) {
    if (isExclusion)
      return "AND c.customer_id NOT IN (SELECT DISTINCT customer_id FROM orders WHERE ...) — 서브쿼리로 최근 구매 고객의 ID 목록을 뽑은 뒤, 그 목록에 없는 고객만 남깁니다. 이미 구매한 고객에게 구매 유도 메시지를 보내면 불필요한 발송이 되거나 오히려 신뢰를 깎을 수 있어요.";
    return "LEFT JOIN orders o ON c.customer_id = o.customer_id — 주문 테이블을 연결해서 특정 기간에 구매한 고객을 필터합니다. AND o.ordered_at BETWEEN ... 조건으로 날짜 범위를 지정해요. 구매 이력 기반 타겟팅의 전형적인 패턴입니다.";
  }
  if (keywords.some((k) => ["carts", "cart_status", "added_at"].includes(k))) {
    return "LEFT JOIN carts ct ... AND ct.cart_status = 'abandoned' — 장바구니 테이블을 연결해서 이탈 상태(abandoned)인 고객만 필터합니다. 상품을 담고도 결제하지 않은 고객은 '아직 관심 있지만 망설이는' 상태이므로, 재방문 캠페인의 핵심 타겟이에요.";
  }
  if (keywords.some((k) => ["message_logs", "sent_at", "channel"].includes(k))) {
    if (isExclusion)
      return "AND c.customer_id NOT IN (SELECT DISTINCT customer_id FROM message_logs WHERE sent_at >= ...) — 최근 발송 이력이 있는 고객을 제외합니다. 짧은 간격으로 반복 발송하면 수신 거부율이 높아지고 채널 건강도가 나빠져요. 적절한 발송 간격을 유지하는 것이 CRM 운영의 기본입니다.";
    return "LEFT JOIN message_logs ml ... AND ml.sent_at >= ... — 발송 로그 테이블을 연결해서 특정 기간 이후 메시지를 수신한 고객을 확인합니다. 클릭·전환 여부 분석이나 최근 발송 여부 체크에 활용해요.";
  }
  if (keywords.includes("app_installed")) return "AND c.app_installed = 1 — 앱 설치 여부(app_installed)가 1인 고객만 통과시킵니다. 앱푸시는 앱이 설치된 기기에만 도달하므로, 미설치 고객에게 보내면 발송 실패로 집계돼 채널 지표가 나빠져요.";
  if (keywords.includes("dormant_status")) return "AND c.dormant_status = 0 — 휴면 상태가 아닌(0) 활성 고객만 남깁니다. 장기간 접속이 없는 휴면 고객은 일반 캠페인 대신 별도의 '재활성화 캠페인'으로 접근하는 게 효과적이에요. 일반 발송 모수에 포함하면 수신 거부율이 올라갑니다.";
  if (keywords.includes("membership_grade")) return "AND c.membership_grade IN ('GOLD', 'VIP') — IN 연산자로 여러 등급을 한 번에 지정합니다. 등급 기반 타겟팅은 혜택 수준을 고객 가치에 맞게 설정할 때 쓰는 전형적인 패턴이에요. = 하나 대신 IN (...)을 쓰면 여러 조건을 깔끔하게 묶을 수 있어요.";
  if (keywords.includes("marketing_opt_in")) return "AND c.marketing_opt_in = 1 — 마케팅 통합 수신 동의 컬럼입니다. 채널별 opt_in이 없을 때 이 컬럼으로 대체하기도 하지만, 채널별 동의가 명확히 구분된 경우에는 해당 컬럼을 직접 쓰는 게 더 정확해요.";
  return "해당 조건을 SQL WHERE 절에 추가했습니다.";
}

// ── Options per rule ───────────────────────────────────────────────────

function optionsForRule(keywords: string[]): StepOption[] {
  const primaryKw = keywords[0];
  const isTableStep = TABLE_LABELS.includes(primaryKw);

  if (isTableStep) {
    return TABLE_POOL.slice(0, 5).map((t) => ({ ...t, isCorrect: t.label === primaryKw }));
  }

  const correctCol = COLUMN_OPTIONS.find((o) => o.label.startsWith(primaryKw));
  const distractors = COLUMN_OPTIONS.filter((o) => !o.label.startsWith(primaryKw)).slice(0, 3);
  if (!correctCol) return distractors.slice(0, 4).map((o, i) => ({ ...o, isCorrect: i === 0 }));
  return [{ ...correctCol, isCorrect: true }, ...distractors];
}

// ── Step builder ───────────────────────────────────────────────────────

function buildSteps(scenario: CampaignScenario): GuidedStep[] {
  const chanLabel: Record<string, string> = {
    app_push: "앱푸시",
    alimtalk: "알림톡",
    friend_message: "카카오 플러스친구",
  };
  const isAppPush = scenario.channel === "app_push";
  const optInCol = isAppPush ? "push_opt_in" : "kakao_opt_in";
  const optInCondition = isAppPush ? "AND c.push_opt_in = 1" : "AND c.kakao_opt_in = 1";

  const steps: GuidedStep[] = [
    // Step 1 — Table
    {
      prompt: "고객 목록을 불러오려면 어떤 테이블을 써야 할까요?",
      detail: "CRM 캠페인의 타겟은 항상 '고객'입니다. 고객 기본 정보가 담긴 테이블을 골라보세요.",
      successMsg: "정확해요! customers가 CRM 세그먼트의 출발점입니다.",
      explanation:
        "FROM customers c — customers 테이블에는 고객 이름, 수신 동의 여부, 멤버십 등급, 가입일 같은 핵심 정보가 모여 있어요. 'c'는 테이블 별칭(alias)으로, 이후에 c.customer_id처럼 짧게 참조할 수 있습니다. 모든 CRM 쿼리는 이 테이블에서 시작해서 필요한 데이터를 JOIN으로 붙여나가는 구조예요.",
      options: TABLE_POOL.slice(0, 5).map((t) => ({ ...t, isCorrect: t.label === "customers" })),
      sqlAdd: {},
    },
    // Step 2 — Operation
    {
      prompt: "데이터를 '조회'하는 SQL 명령어는 무엇인가요?",
      detail: "데이터를 읽기만 해야 해요. 실수로 수정하거나 삭제하면 안 됩니다.",
      successMsg: "맞아요! SELECT는 데이터를 읽기만 하는 명령어입니다.",
      explanation:
        "SELECT c.customer_id, c.customer_name, c.membership_grade ... — SELECT는 '어떤 컬럼을 가져올지' 나열하는 구문입니다. UPDATE나 DELETE와 달리 데이터를 변경하지 않아서 안전해요. 세그먼트를 추출할 때는 항상 SELECT를 써서 대상자 목록만 조회합니다. 이후 FROM → JOIN → WHERE 순서로 조건을 쌓아갑니다.",
      options: [
        { label: "SELECT", desc: "데이터를 조회합니다", isCorrect: true },
        { label: "UPDATE", desc: "기존 데이터를 수정합니다", isCorrect: false },
        { label: "DELETE", desc: "데이터를 삭제합니다", isCorrect: false },
        { label: "INSERT INTO", desc: "새 데이터를 추가합니다", isCorrect: false },
      ],
      sqlAdd: {},
    },
    // Step 3 — Opt-in
    {
      prompt: `이 캠페인은 '${chanLabel[scenario.channel]}'로 발송해요. 수신 동의 조건은?`,
      detail: "수신 동의 없이 발송하면 법적 리스크가 생깁니다. CRM에서 이 조건은 절대 빠지면 안 돼요.",
      successMsg: `정확해요! ${optInCol} = 1로 수신 동의한 고객만 골라냅니다.`,
      explanation: isAppPush
        ? "AND c.push_opt_in = 1 — 앱푸시 수신 동의 컬럼이 1(동의)인 고객만 WHERE 조건을 통과시킵니다. 이 한 줄이 없으면 미동의 고객에게도 발송돼 개인정보보호법 위반이 될 수 있어요. CRM에서 채널별 opt_in 체크는 '선택'이 아닌 '필수'입니다."
        : "AND c.kakao_opt_in = 1 — 카카오 채널 수신 동의 컬럼이 1인 고객만 통과시킵니다. 알림톡·친구톡은 카카오 수신 동의가 없는 고객에게 발송하면 수신 거부 처리되거나 계정 제재를 받을 수 있어요. 채널별 동의 컬럼을 반드시 구분해서 사용해야 합니다.",
      options: [
        { label: `${optInCol} = 1`, desc: isAppPush ? "앱푸시 수신 동의" : "카카오 수신 동의", isCorrect: true },
        { label: isAppPush ? "kakao_opt_in = 1" : "push_opt_in = 1", desc: "다른 채널 수신 동의", isCorrect: false },
        { label: "dormant_status = 0", desc: "활성 고객 조건 (채널 동의 아님)", isCorrect: false },
        { label: "조건 없이 전체 발송", desc: "동의 여부를 무시하고 전송", isCorrect: false },
      ],
      sqlAdd: { condition: optInCondition },
    },
  ];

  // Step 4+ — Required rules (opt-in 계열 제외)
  const coveredKeywords = new Set([optInCol, "push_opt_in", "kakao_opt_in", "marketing_opt_in"]);
  const remainingRequired = scenario.requiredRules.filter(
    (r) => !r.keywords.some((kw) => coveredKeywords.has(kw)),
  );

  remainingRequired.forEach((rule) => {
    const primaryKw = rule.keywords[0];
    const isTableStep = TABLE_LABELS.includes(primaryKw);
    steps.push({
      prompt: `미션 조건: "${rule.label}" — 어떤 ${isTableStep ? "테이블" : "조건"}을 써야 할까요?`,
      detail: `힌트: ${rule.sqlHint}`,
      successMsg: `좋아요! ${primaryKw}를 사용해서 "${rule.label}" 조건을 반영할 수 있어요.`,
      explanation: explainFragmentByKeywords(rule.keywords, false),
      options: optionsForRule(rule.keywords),
      sqlAdd: ruleToSqlFragment(rule.keywords, false),
    });
  });

  // Step last — First excluded rule
  if (scenario.excludedRules.length > 0) {
    const excRule = scenario.excludedRules[0];
    const primaryKw = excRule.keywords[0];
    const isTableStep = TABLE_LABELS.includes(primaryKw);
    steps.push({
      prompt: `제외 조건: "${excRule.label}" — 이 이력을 확인할 ${isTableStep ? "테이블" : "조건"}은?`,
      detail: "이미 구매했거나 최근 발송받은 고객을 제외해야 해요. 제외 조건도 캠페인 품질의 핵심입니다.",
      successMsg: `맞아요! ${primaryKw} 데이터로 해당 고객을 제외할 수 있어요.`,
      explanation: explainFragmentByKeywords(excRule.keywords, true),
      options: optionsForRule(excRule.keywords),
      sqlAdd: ruleToSqlFragment(excRule.keywords, true),
    });
  }

  return steps;
}

// ── SQL assembler ──────────────────────────────────────────────────────

function assembleSql(s: SqlState): string {
  if (!s.tableSelected) return "-- 단계를 진행하면 여기에 SQL이 채워집니다";
  if (!s.operationSelected) return "FROM customers c";

  const selects = ["c.customer_id", "c.customer_name", "c.membership_grade", ...s.selectExtras];
  const lines: string[] = [`SELECT\n  ${selects.join(",\n  ")}\nFROM customers c`];

  if (s.joins.length > 0) lines.push(s.joins.join("\n"));

  if (s.conditions.length > 0) {
    const [first, ...rest] = s.conditions;
    const whereFirst = first.replace(/^AND /, "");
    lines.push("WHERE " + whereFirst + (rest.length > 0 ? "\n  " + rest.join("\n  ") : ""));
  }

  lines.push("ORDER BY c.customer_id", "LIMIT 50;");
  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────

interface GuidedSqlBuilderProps {
  scenario: CampaignScenario;
  onComplete: (sql: string) => void;
  onSkip: () => void;
}

export function GuidedSqlBuilder({ scenario, onComplete, onSkip }: GuidedSqlBuilderProps) {
  const steps = useMemo(() => buildSteps(scenario), [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState<"wrong" | null>(null);
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sqlState, setSqlState] = useState<SqlState>({
    tableSelected: false,
    operationSelected: false,
    selectExtras: [],
    joins: [],
    conditions: [],
  });

  const isComplete = currentStep >= steps.length;
  const liveSql = assembleSql(sqlState);
  const progress = Math.round((currentStep / steps.length) * 100);

  function applyStep(stepIndex: number, sqlAdd: GuidedStep["sqlAdd"]) {
    const isTableStep = stepIndex === 0;
    const isOpStep = stepIndex === 1;
    setSqlState((prev) => ({
      tableSelected: prev.tableSelected || isTableStep,
      operationSelected: prev.operationSelected || isOpStep,
      selectExtras:
        sqlAdd.selectExtra && !prev.selectExtras.includes(sqlAdd.selectExtra)
          ? [...prev.selectExtras, sqlAdd.selectExtra]
          : prev.selectExtras,
      joins:
        sqlAdd.join && !prev.joins.includes(sqlAdd.join)
          ? [...prev.joins, sqlAdd.join]
          : prev.joins,
      conditions: sqlAdd.condition ? [...prev.conditions, sqlAdd.condition] : prev.conditions,
    }));
  }

  function handleOption(option: StepOption) {
    if (showModal) return;
    setChosenLabel(option.label);

    if (option.isCorrect) {
      applyStep(currentStep, steps[currentStep].sqlAdd);
      setShowModal(true);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setChosenLabel(null);
      }, 900);
    }
  }

  function handleConfirm() {
    setShowModal(false);
    setChosenLabel(null);
    setCurrentStep((s) => s + 1);
  }

  // ── Complete screen ─────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-8 text-[#10af29]" />
              <div>
                <p className="text-lg font-semibold text-foreground">SQL이 완성됐어요!</p>
                <p className="text-sm text-muted-foreground">단계별로 필수 조건을 모두 반영했습니다.</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              이 SQL을 실행해서 대상자를 확인해보세요. 더 정확하게 다듬고 싶다면 직접 수정할 수도 있습니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onComplete(liveSql)} className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]">
                이 SQL로 실행하기 <ChevronRight className="ml-1 size-4" />
              </Button>
              <Button onClick={onSkip} variant="outline" className="rounded-full border-border">
                직접 수정하기
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-foreground/50">완성된 SQL</p>
            <pre className="overflow-auto rounded-[1.4rem] bg-[#0d0d0d] p-5 text-sm font-mono leading-6 text-white">{liveSql}</pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Step screen ─────────────────────────────────────────────────────
  const step = steps[currentStep];
  const modalSqlFragment = [step.sqlAdd.join, step.sqlAdd.condition].filter(Boolean).join("\n");

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Left: step panel */}
        <Card className="border-border bg-card">
          <CardContent className="space-y-5 p-6">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>STEP {currentStep + 1} / {steps.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-[#10af29] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Prompt */}
            <div>
              <p className="text-lg font-semibold leading-7 text-foreground">{step.prompt}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </div>

            {/* Wrong feedback banner */}
            {feedback === "wrong" && (
              <div className="flex items-start gap-2 rounded-[1.3rem] border border-destructive/30 bg-destructive/6 p-4">
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm text-muted-foreground">아쉽게도 틀렸어요. 다시 골라보세요!</p>
              </div>
            )}

            {/* Options grid */}
            <div className="grid gap-2 sm:grid-cols-2">
              {step.options.map((opt) => {
                const chosen = chosenLabel === opt.label;
                const isRed = chosen && feedback === "wrong";
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleOption(opt)}
                    disabled={showModal}
                    className={`rounded-[1.3rem] border p-4 text-left transition ${
                      isRed
                        ? "border-destructive/40 bg-destructive/6"
                        : "border-border bg-muted hover:border-[#10af29]/40 hover:bg-muted/80"
                    }`}
                  >
                    <p className={`font-mono text-sm font-medium ${isRed ? "text-destructive" : "text-foreground"}`}>
                      {opt.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button onClick={onSkip} className="text-xs text-muted-foreground transition hover:text-foreground">
                직접 입력으로 전환 →
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Right: live SQL preview */}
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-foreground/50">지금까지 만든 SQL</p>
            <pre className="min-h-[220px] overflow-auto rounded-[1.4rem] bg-[#0d0d0d] p-5 text-sm font-mono leading-6 text-white">{liveSql}</pre>

            {sqlState.conditions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/50">추가된 조건</p>
                {sqlState.conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#10af29]" />
                    <code className="text-xs leading-5 text-foreground/70">{c.replace(/\n\s*/g, " ")}</code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Correct-answer modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg space-y-5 rounded-[2rem] border border-[#10af29]/20 bg-card p-7 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#10af29]/12">
                <CheckCircle2 className="size-5 text-[#10af29]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{step.successMsg}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">STEP {currentStep + 1} 완료</p>
              </div>
            </div>

            {/* SQL fragment added */}
            {modalSqlFragment && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">이번 단계에서 추가된 SQL</p>
                <pre className="overflow-auto rounded-[1.4rem] bg-[#0d0d0d] px-5 py-4 text-sm font-mono leading-6 text-[#9bf5ad]">
                  {modalSqlFragment}
                </pre>
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">이게 무슨 의미냐면</p>
              <p className="text-sm leading-7 text-muted-foreground">{step.explanation}</p>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
            >
              확인, 다음 단계로 →
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
