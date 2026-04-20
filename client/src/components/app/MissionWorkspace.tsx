import { useEffect, useMemo, useState } from "react";
import { BarChart3, BrainCircuit, Loader2, Play, RefreshCw, WandSparkles } from "lucide-react";
import { requestAiCoachFeedback, type AiCoachResponse } from "@/ai/aiCoach";
import { getStoredApiKey } from "@/lib/useApiKey";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildEvaluation } from "@/features/scoring/buildEvaluation";
import { evaluateSqlSubmission } from "@/features/sql-evaluation/evaluateSql";
import { getCompanyById, generateScenario, getProductById, getStarterSql, getWarehouse } from "@/game-engine/scenarios";
import { formatSql, runSql } from "@/features/sql-runner/browserSql";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

const channelCopy = {
  app_push: "앱푸시",
  alimtalk: "카카오 알림톡",
  friend_message: "카카오 플러스친구",
} as const;

function buildZeroRowHint(params: {
  difficulty: number;
  sql: string;
  sqlResult: ReturnType<typeof runSql> | null;
  diagnosis: ReturnType<typeof evaluateSqlSubmission> | null;
}) {
  const { difficulty, sql, sqlResult, diagnosis } = params;

  if (!sqlResult || !sqlResult.ok || sqlResult.rowCount !== 0 || difficulty >= 3 || !diagnosis) {
    return null;
  }

  const likelySqlIssue = diagnosis.missedRequired.length > 0 || diagnosis.excludedRisk.length > 0;
  const joinSignals = [" join ", " left join ", " inner join ", " exists ", " in ("];
  const hasJoinOrSubquery = joinSignals.some((signal) => ` ${sql.toLowerCase()} `.includes(signal));

  if (likelySqlIssue) {
    return {
      tone: "warning" as const,
      title: "SQL 조건 누락 또는 제외 조건 해석을 먼저 점검해보세요.",
      body: `현재 미션에서는 0 rows가 나왔지만, 브리핑 기준 필수 조건이나 제외 조건이 아직 충분히 반영되지 않았을 가능성이 큽니다. 특히 ${diagnosis.missedRequired.concat(diagnosis.excludedRisk).slice(0, 2).join(", ")} 조건을 다시 확인해보세요.`,
    };
  }

  if (hasJoinOrSubquery) {
    return {
      tone: "warning" as const,
      title: "조인 방향이나 날짜 필터가 너무 강하게 걸렸을 수 있습니다.",
      body: "현재 쿼리는 문법상 실행되지만, JOIN 또는 서브쿼리 조건 때문에 대상자가 모두 탈락했을 가능성이 있습니다. 조인 기준과 최근 N일 필터를 한 단계씩 풀어 보며 어느 조건에서 0명이 되는지 확인해보세요.",
    };
  }

  return {
    tone: "info" as const,
    title: "이 미션은 후보군 자체가 매우 작을 가능성도 있습니다.",
    body: "입문·실무 기초 미션에서는 보통 SQL 실수보다 mock 데이터상 후보군이 적게 잡힌 영향일 수도 있습니다. 기본 조건을 유지한 채 기간 조건만 조금 완화해 보고, 여전히 0 rows면 데이터 후보군이 작은 상황으로 봐도 됩니다.",
  };
}

interface MissionWorkspaceProps {
  heading?: string;
  subheading?: string;
}

export function MissionWorkspace({
  heading = "실행 워크스페이스",
  subheading = "데이터 탐색부터 SQL 실행, 메시지 작성, 결과 리포트까지 한 흐름으로 수행합니다.",
}: MissionWorkspaceProps) {
  const warehouse = useMemo(() => getWarehouse(), []);
  const { progress, missionSeed, selectedChapter, playMode, rollMission, saveRun } = useRetentionLabStore();
  const scenario = useMemo(() => generateScenario(selectedChapter, missionSeed), [missionSeed, selectedChapter]);
  const company = useMemo(() => getCompanyById(scenario.companyId), [scenario.companyId]);
  const product = useMemo(() => getProductById(scenario.productId), [scenario.productId]);

  const [tab, setTab] = useState("dataset");
  const [activeTable, setActiveTable] = useState<keyof typeof warehouse>("customers");
  const [sql, setSql] = useState(() => getStarterSql(scenario));
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageCta, setMessageCta] = useState("혜택 보기");
  const [messageBenefit, setMessageBenefit] = useState("");
  const [sqlResult, setSqlResult] = useState<ReturnType<typeof runSql> | null>(null);
  const [evaluation, setEvaluation] = useState<ReturnType<typeof buildEvaluation> | null>(null);
  const [lastSavedMissionId, setLastSavedMissionId] = useState<string | null>(null);
  const [aiCoachFeedback, setAiCoachFeedback] = useState<AiCoachResponse | null>(null);
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachError, setAiCoachError] = useState<string | null>(null);

  useEffect(() => {
    setSql(getStarterSql(scenario));
    setSqlResult(null);
    setEvaluation(null);
    setAiCoachFeedback(null);
    setAiCoachError(null);
    setTab("dataset");
    setMessageTitle(scenario.channel === "app_push" ? `${product.product_name}, 오늘 다시 확인해보세요` : `${product.product_name} 제안을 준비했습니다`);
    setMessageBody(
      scenario.channel === "app_push"
        ? `${product.brand_name} ${product.product_name} 혜택이 지금 열려 있습니다.`
        : `${company.name}에서 ${product.product_name} 관련 제안을 준비했습니다. 최근 행동 흐름을 기준으로 선별된 고객에게만 안내하는 캠페인입니다.`,
    );
    setMessageCta(scenario.channel === "app_push" ? "지금 확인" : "혜택 보기");
    setMessageBenefit("한정 혜택 제공");
    setLastSavedMissionId(null);
  }, [scenario.id, company.name, product.brand_name, product.product_name, scenario.channel]);

  const tablePreview = useMemo(() => {
    const rows = warehouse[activeTable] as unknown as Array<Record<string, unknown>>;
    return {
      count: rows.length,
      columns: rows[0] ? Object.keys(rows[0]) : [],
      rows: rows.slice(0, 8),
    };
  }, [activeTable, warehouse]);

  const zeroRowHint = useMemo(() => {
    if (!sqlResult) return null;
    const diagnosis = evaluateSqlSubmission(sql, sqlResult, scenario, warehouse);
    return buildZeroRowHint({ difficulty: scenario.difficulty, sql, sqlResult, diagnosis });
  }, [scenario, sql, sqlResult, warehouse]);

  function handleRunSql() {
    const result = runSql(sql, warehouse);
    setSqlResult(result);
    setTab("sql");
  }

  async function handleRequestAiCoach() {
    if (!evaluation) return;
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setAiCoachError("AI 코치를 사용하려면 내 정보 탭에서 Gemini API 키를 먼저 등록해 주세요.");
      return;
    }
    setAiCoachLoading(true);
    setAiCoachError(null);
    try {
      const result = await requestAiCoachFeedback(evaluation.aiReady.prompt, apiKey);
      setAiCoachFeedback(result);
    } catch (e) {
      setAiCoachError(e instanceof Error ? e.message : "AI 피드백 요청에 실패했습니다.");
    } finally {
      setAiCoachLoading(false);
    }
  }

  function handleCreateReport() {
    const result = runSql(sql, warehouse);
    setSqlResult(result);

    const nextEvaluation = buildEvaluation({
      scenario,
      sql,
      sqlResult: result,
      warehouse,
      message: { title: messageTitle, body: messageBody, cta: messageCta, benefit: messageBenefit },
    });

    setEvaluation(nextEvaluation);
    setTab("report");

    if (lastSavedMissionId !== scenario.id) {
      saveRun({
        missionId: scenario.id,
        scenarioTitle: scenario.title,
        chapter: scenario.chapter,
        channel: scenario.channel,
        score: nextEvaluation.totalScore,
        playedAt: new Date().toISOString(),
        weaknessTags: [...nextEvaluation.sql.missedRequired, ...nextEvaluation.sql.excludedRisk].slice(0, 4),
      });
      setLastSavedMissionId(scenario.id);
    }
  }

  return (
    <div className="space-y-4">
      {/* Mission header */}
      <Card className="border-border bg-card">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">{heading}</p>
              <Badge className={`rounded-full border text-[11px] uppercase tracking-[0.18em] ${
                playMode === "chapter"
                  ? "border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]"
                  : playMode === "daily"
                    ? "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                    : "border-border bg-muted text-muted-foreground"
              }`}>
                {playMode === "chapter" ? "챕터 모드" : playMode === "daily" ? "오늘의 미션" : "자유 플레이"}
              </Badge>
            </div>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{scenario.title}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{subheading}</p>
            <p className="mt-4 text-sm leading-7 text-foreground/70">{scenario.objective}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-border bg-muted p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">채널</p>
              <p className="mt-2 text-lg font-medium text-foreground">{channelCopy[scenario.channel]}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border bg-muted p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">브랜드</p>
              <p className="mt-2 text-lg font-medium text-foreground">{company.name}</p>
            </div>
            <div className="rounded-[1.4rem] border border-[#10af29]/25 bg-[#10af29]/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">현재 티어</p>
              <p className="mt-2 text-lg font-medium text-foreground">{progress.tier}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start rounded-[1.4rem] border border-border bg-muted p-2">
          <TabsTrigger value="dataset" className="rounded-full px-4">데이터 탐색</TabsTrigger>
          <TabsTrigger value="sql" className="rounded-full px-4">SQL 작성</TabsTrigger>
          <TabsTrigger value="message" className="rounded-full px-4">메시지 작성</TabsTrigger>
          <TabsTrigger value="report" className="rounded-full px-4">결과 확인</TabsTrigger>
        </TabsList>

        {/* Dataset tab */}
        <TabsContent value="dataset" className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">Available Tables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.keys(warehouse)
                  .filter((key) => key !== "companies")
                  .map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveTable(key as keyof typeof warehouse)}
                      className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${
                        activeTable === key
                          ? "border-[#10af29] bg-[#10af29] text-white"
                          : "border-border bg-card text-muted-foreground hover:border-[#10af29]/40"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
              </div>
              <div className="rounded-[1.5rem] border border-border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">Table Overview</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{String(activeTable)}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{tablePreview.count} rows</p>
                    <p>{tablePreview.columns.length} columns</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tablePreview.columns.slice(0, 10).map((column) => (
                    <Badge key={column} className="rounded-full border border-border bg-card text-muted-foreground">
                      {column}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">Preview Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[430px] rounded-[1.5rem] border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tablePreview.columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tablePreview.rows.map((row, index) => (
                      <TableRow key={`${String(activeTable)}-${index}`}>
                        {tablePreview.columns.map((column) => (
                          <TableCell key={column}>{String(row[column] ?? "-")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SQL tab */}
        <TabsContent value="sql" className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">SQL Composer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SQL editor stays dark — code editors look better on dark background */}
              <Textarea
                value={sql}
                onChange={(event) => setSql(event.target.value)}
                className="min-h-[300px] rounded-[1.5rem] border-border bg-[#0d0d0d] font-mono text-sm leading-6 text-white placeholder:text-white/25"
                placeholder="SELECT ..."
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRunSql} className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]">
                  <Play className="mr-2 size-4" /> SQL 실행
                </Button>
                <Button onClick={() => setSql(formatSql(sql))} variant="outline" className="rounded-full border-border">
                  쿼리 정리
                </Button>
                <Button onClick={() => setSql(getStarterSql(scenario))} variant="outline" className="rounded-full border-border">
                  예시 불러오기
                </Button>
                {playMode !== "chapter" && (
                  <Button onClick={rollMission} variant="outline" className="rounded-full border-border">
                    <RefreshCw className="mr-2 size-4" /> 다른 미션
                  </Button>
                )}
                <Button
                  onClick={() => setSql(`${sql}\n-- Hint: ${scenario.requiredRules[0]?.sqlHint ?? "필수 조건부터 반영하세요."}`)}
                  variant="outline"
                  className="rounded-full border-border"
                >
                  <WandSparkles className="mr-2 size-4" /> 힌트 추가
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">SQL Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">실행 결과</p>
                  <p className="text-sm text-muted-foreground">{sqlResult?.rowCount ?? 0} rows</p>
                </div>
                <p className={`mt-3 text-sm ${sqlResult?.ok === false ? "text-destructive" : "text-muted-foreground"}`}>
                  {sqlResult?.ok === false ? sqlResult.error : "대상자 수와 컬럼 구성을 기준으로 조건을 반복 보정해보세요."}
                </p>
              </div>

              {zeroRowHint ? (
                <div className={`rounded-[1.4rem] border p-4 ${zeroRowHint.tone === "warning" ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" : "border-[#10af29]/20 bg-[#10af29]/6"}`}>
                  <p className={`text-sm font-medium ${zeroRowHint.tone === "warning" ? "text-amber-900 dark:text-amber-300" : "text-[#0f7f24] dark:text-[#9bf5ad]"}`}>{zeroRowHint.title}</p>
                  <p className={`mt-2 text-sm leading-6 ${zeroRowHint.tone === "warning" ? "text-amber-800/90 dark:text-amber-400/80" : "text-muted-foreground"}`}>{zeroRowHint.body}</p>
                </div>
              ) : null}

              <ScrollArea className="h-[300px] rounded-[1.5rem] border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(sqlResult?.columns ?? []).map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sqlResult?.rows ?? []).slice(0, 10).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {(sqlResult?.columns ?? []).map((column) => (
                          <TableCell key={column}>{String(row[column] ?? "-")}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <Button onClick={() => setTab("message")} variant="outline" className="w-full rounded-full border-border">
                메시지 작성으로 이동
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message tab */}
        <TabsContent value="message" className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">Message Composer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Input value={messageTitle} onChange={(event) => setMessageTitle(event.target.value)} className="rounded-full border-border md:col-span-2" placeholder="제목" />
              <Input value={messageCta} onChange={(event) => setMessageCta(event.target.value)} className="rounded-full border-border" placeholder="CTA" />
              <Input value={messageBenefit} onChange={(event) => setMessageBenefit(event.target.value)} className="rounded-full border-border" placeholder="혜택 또는 강조 포인트" />
              <Textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="min-h-[220px] rounded-[1.5rem] border-border md:col-span-2" placeholder="메시지 본문" />
              <div className="rounded-[1.4rem] border border-border bg-muted p-4 text-sm leading-6 text-muted-foreground md:col-span-2">
                채널 가이드: {channelCopy[scenario.channel]} / {company.brandTone}
              </div>
              <Button onClick={handleCreateReport} className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823] md:col-span-2">
                결과 리포트 생성
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">Brief Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                현재 브랜드는 <span className="font-medium text-foreground">{company.name}</span>이며, 톤은 <span className="font-medium text-foreground">{company.brandTone}</span>입니다.
                할인만 강조하기보다 행동 맥락이 보이는 제안형 표현이 더 자연스럽습니다.
              </p>
              <div className="rounded-[1.4rem] border border-[#10af29]/20 bg-card/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">KPI 힌트</p>
                <p className="mt-3">{scenario.kpiHint}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[#10af29]/20 bg-card/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">권장 흐름</p>
                <p className="mt-3">제목은 짧고 명확하게, 본문은 행동 맥락을 설명하고, CTA는 단일 행동으로 좁히는 구성이 좋습니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report tab */}
        <TabsContent value="report">
          {evaluation ? (
            <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
              <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">Result Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-6xl font-semibold tracking-[-0.06em] text-foreground">{evaluation.totalScore}</p>
                      <p className="mt-2 text-sm text-muted-foreground">최종 점수</p>
                    </div>
                    <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/14 px-3 py-1 text-[#0d9823] dark:text-[#9bf5ad]">{evaluation.grade}</Badge>
                  </div>

                  {[
                    { label: "SQL 정확도", value: evaluation.breakdown.sqlAccuracy },
                    { label: "세그먼트 적합도", value: evaluation.breakdown.segmentFit },
                    { label: "발송 전략", value: evaluation.breakdown.sendingStrategy },
                    { label: "메시지 품질", value: evaluation.breakdown.messageQuality },
                    { label: "채널 적합도", value: evaluation.breakdown.channelFit },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.3rem] border border-[#10af29]/15 bg-card/50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">{item.label}</p>
                        <p className="font-medium text-foreground">{item.value}</p>
                      </div>
                      <Progress value={item.value} className="mt-3 h-2 [&>div]:bg-[#10af29]" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">강한 점</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                    {evaluation.sql.strengths.concat(evaluation.message.strengths).slice(0, 4).map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">아쉬운 점</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                    {evaluation.sql.weaknesses.concat(evaluation.message.weaknesses).slice(0, 4).map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">다음 개선 제안</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                    {evaluation.sql.suggestions.concat(evaluation.message.suggestions).slice(0, 5).map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <BarChart3 className="size-10 text-[#10af29]" />
                <p className="mt-4 text-xl font-medium text-foreground">아직 결과 리포트가 없습니다.</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">SQL 실행과 메시지 작성을 마친 뒤 결과 리포트를 생성하면 이 영역에 점수와 개선 제안이 표시됩니다.</p>
                <Button onClick={() => setTab("message")} className="mt-5 rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]">
                  메시지 작성으로 이동
                </Button>
              </CardContent>
            </Card>
          )}

          {evaluation && (
            <Card className="border-border bg-card mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                  <BrainCircuit className="size-4 text-[#10af29]" /> AI 코치 피드백
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!aiCoachFeedback && !aiCoachLoading && !aiCoachError && (
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <p className="text-sm leading-6 text-muted-foreground">
                      규칙 기반 채점 위에 AI 코치가 실무적 관점에서 추가 해설과 보완 제안을 제공합니다.<br />
                      내 정보 탭에서 Gemini API 키를 등록하면 사용할 수 있습니다. (무료)
                    </p>
                    <Button onClick={handleRequestAiCoach} className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]">
                      <BrainCircuit className="mr-2 size-4" /> AI 코치 피드백 받기
                    </Button>
                  </div>
                )}

                {aiCoachLoading && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="size-5 animate-spin text-[#10af29]" />
                    <span className="text-sm text-muted-foreground">AI 코치가 분석 중입니다…</span>
                  </div>
                )}

                {aiCoachError && (
                  <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4">
                    <p className="text-sm font-medium text-destructive">AI 피드백 오류</p>
                    <p className="mt-1 text-sm text-muted-foreground">{aiCoachError}</p>
                    <Button onClick={handleRequestAiCoach} variant="outline" className="mt-3 rounded-full border-border">
                      다시 시도
                    </Button>
                  </div>
                )}

                {aiCoachFeedback && (
                  <div className="space-y-4">
                    <div className="rounded-[1.4rem] border border-[#10af29]/20 bg-[#10af29]/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#0a7a1c] dark:text-[#9bf5ad]">AI 총평</p>
                      <p className="mt-2 text-sm leading-6 text-foreground/80">{aiCoachFeedback.summary}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">SQL 분석</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{aiCoachFeedback.sql_feedback.reason}</p>
                        {aiCoachFeedback.sql_feedback.score_adjustment !== 0 && (
                          <p className={`mt-2 text-sm font-medium ${aiCoachFeedback.sql_feedback.score_adjustment > 0 ? "text-[#0a7a1c] dark:text-[#9bf5ad]" : "text-destructive"}`}>
                            {aiCoachFeedback.sql_feedback.score_adjustment > 0 ? "+" : ""}{aiCoachFeedback.sql_feedback.score_adjustment} 점 보정 제안
                          </p>
                        )}
                      </div>
                      <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">메시지 분석</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{aiCoachFeedback.message_feedback.reason}</p>
                        {aiCoachFeedback.message_feedback.score_adjustment !== 0 && (
                          <p className={`mt-2 text-sm font-medium ${aiCoachFeedback.message_feedback.score_adjustment > 0 ? "text-[#0a7a1c] dark:text-[#9bf5ad]" : "text-destructive"}`}>
                            {aiCoachFeedback.message_feedback.score_adjustment > 0 ? "+" : ""}{aiCoachFeedback.message_feedback.score_adjustment} 점 보정 제안
                          </p>
                        )}
                      </div>
                    </div>

                    {aiCoachFeedback.strengths.length > 0 && (
                      <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50 mb-3">강점</p>
                        <div className="space-y-1">
                          {aiCoachFeedback.strengths.map((item, i) => (
                            <p key={i} className="text-sm leading-6 text-muted-foreground">• {item}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiCoachFeedback.suggestions.length > 0 && (
                      <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50 mb-3">개선 제안</p>
                        <div className="space-y-1">
                          {aiCoachFeedback.suggestions.map((item, i) => (
                            <p key={i} className="text-sm leading-6 text-muted-foreground">• {item}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
