import { ArrowRight, BookOpen, ChevronRight, Database, FileText, LayoutDashboard, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { chapters, generateScenario, getCompanyById, getProductById } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";
import type { ChapterKey } from "@/shared/types/domain";

const HOW_IT_WORKS = [
  { icon: Database, step: "01", title: "데이터 탐색", desc: "고객·주문·세션 테이블을 살펴보고 미션에 필요한 컬럼을 파악합니다." },
  { icon: FileText, step: "02", title: "SQL 작성", desc: "브리핑 조건을 SQL로 옮겨 타겟 세그먼트를 추출합니다." },
  { icon: MessageSquare, step: "03", title: "메시지 작성", desc: "채널과 브랜드 톤에 맞게 발송 문구를 완성합니다." },
  { icon: LayoutDashboard, step: "04", title: "결과 확인", desc: "5개 항목 채점과 AI 코치 피드백으로 약점을 파악합니다." },
];

const TIER_META: Record<string, { color: string; glow: string; ring: string }> = {
  "새싹 마케터":          { color: "#4ade80", glow: "0 0 10px rgba(74,222,128,0.35)", ring: "rgba(74,222,128,0.25)" },
  "CRM 어시스턴트":       { color: "#10af29", glow: "0 0 14px rgba(16,175,41,0.45)", ring: "rgba(16,175,41,0.25)" },
  "세그먼트 플래너":      { color: "#22d3ee", glow: "0 0 16px rgba(34,211,238,0.50)", ring: "rgba(34,211,238,0.28)" },
  "CRM 실무자":           { color: "#60a5fa", glow: "0 0 18px rgba(96,165,250,0.55)", ring: "rgba(96,165,250,0.30)" },
  "리텐션 스페셜리스트":  { color: "#a78bfa", glow: "0 0 20px rgba(167,139,250,0.60)", ring: "rgba(167,139,250,0.35)" },
  "퍼포먼스 플래너":      { color: "#fbbf24", glow: "0 0 22px rgba(251,191,36,0.60)",  ring: "rgba(251,191,36,0.32)" },
  "CRM 전략가":           { color: "#f59e0b", glow: "0 0 24px rgba(245,158,11,0.65)",  ring: "rgba(245,158,11,0.36)" },
  "캠페인 디렉터":        { color: "#fcd34d", glow: "0 0 30px rgba(252,211,77,0.80)",  ring: "rgba(252,211,77,0.45)" },
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const BASE_DATE = new Date("2026-04-20T09:00:00");

function getTodayChallengeSeed() {
  const now = BASE_DATE;
  return Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`.replace(/\D/g, "")) % 97;
}

function getLast7Days(recordDates: Set<string>) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(BASE_DATE);
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return {
      iso,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: d.getDate(),
      cleared: recordDates.has(iso),
      isToday: i === 6,
    };
  });
}

export default function AppHome() {
  const [, navigate] = useLocation();
  const { isLoggedIn, username } = useLocalSession();
  const { progress, prepareMission } = useRetentionLabStore();

  const todayScenario = useMemo(() => generateScenario("advanced", getTodayChallengeSeed()), []);
  const company = useMemo(() => getCompanyById(todayScenario.companyId), [todayScenario.companyId]);
  const product = useMemo(() => getProductById(todayScenario.productId), [todayScenario.productId]);

  const tierMeta = TIER_META[progress.tier] ?? TIER_META["새싹 마케터"];

  const recordDates = useMemo(
    () => new Set(progress.records.map((r) => r.playedAt.slice(0, 10))),
    [progress.records],
  );
  const weekDays = useMemo(() => getLast7Days(recordDates), [recordDates]);
  const clearedCount = weekDays.filter((d) => d.cleared).length;

  useEffect(() => {
    if (!isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  return (
    <AppChrome title="홈" description="지금 무엇을 하면 되는지 한눈에 파악하고 바로 시작할 수 있는 허브입니다.">
      <div className="space-y-4">

        {/* ── 섹션 1: 환영 + 등급 / 챕터 진행도 ── */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

          {/* 환영 카드 */}
          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardContent className="p-6 lg:p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">
                {progress.records.length === 0 ? "처음 오셨군요" : "Welcome back"}
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">
                {username}님,{" "}
                {progress.records.length === 0 ? "환영합니다." : "오늘의 미션을 풀어볼까요?"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {progress.records.length === 0
                  ? "SQL 세그먼트 설계부터 CRM 메시지 작성, 결과 해석까지 하나의 흐름으로 반복 연습하는 실무형 시뮬레이터입니다."
                  : `누적 점수 ${progress.totalScore.toLocaleString()}점 · 연속 플레이 ${progress.streak}회`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                  onClick={() => {
                    prepareMission(todayScenario.chapter, getTodayChallengeSeed(), "daily");
                    navigate("/app/play");
                  }}
                >
                  오늘의 미션 <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button className="rounded-full" variant="outline" onClick={() => navigate("/app/play")}>
                  자유 플레이
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 등급 + 챕터 진행도 */}
          <Card className="border-border bg-card">
            <CardContent className="p-6 lg:p-7">
              {/* 티어 배지 */}
              <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">현재 등급</p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold"
                  style={{
                    borderColor: tierMeta.ring,
                    boxShadow: `0 0 0 4px ${tierMeta.ring}, ${tierMeta.glow}`,
                    color: tierMeta.color,
                  }}
                >
                  ★
                </div>
                <p
                  className="text-xl font-semibold tracking-[-0.03em]"
                  style={{ color: tierMeta.color, textShadow: tierMeta.glow }}
                >
                  {progress.tier}
                </p>
              </div>

              {/* 챕터 진행도 */}
              <div className="mt-5 space-y-3">
                {chapters.map((chapter) => {
                  const p = progress.chapterProgress[chapter.key as ChapterKey];
                  const unlocked = progress.totalScore >= chapter.minScore;
                  return (
                    <div key={chapter.key} className={unlocked ? "" : "opacity-40"}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground/70">{chapter.label}</span>
                        <span className="font-medium text-[#0d9823] dark:text-[#9bf5ad]">{p}%</span>
                      </div>
                      <Progress value={p} className="mt-1.5 h-1.5 [&>div]:bg-[#10af29]" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 섹션 2: 사용 가이드 + 챕터 구성 ── */}
        <div className="grid gap-4 lg:grid-cols-2">

          {/* 사용 가이드 */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                <BookOpen className="size-4 text-[#10af29]" /> 사용 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="rounded-[1.4rem] border border-border bg-muted p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#10af29]/10">
                      <Icon className="size-4 text-[#10af29]" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/40">{step}</p>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 챕터 구성 */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">챕터 구성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {chapters.map((chapter) => {
                const unlocked = progress.totalScore >= chapter.minScore;
                return (
                  <div
                    key={chapter.key}
                    className={`flex items-center justify-between rounded-[1.2rem] border p-3 ${
                      unlocked ? "border-border bg-muted" : "border-border bg-muted opacity-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{chapter.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {unlocked ? "진입 가능" : `${chapter.minScore.toLocaleString()}점 달성 후 해금`}
                      </p>
                    </div>
                    {unlocked
                      ? <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">열림</Badge>
                      : <Badge className="rounded-full border border-border bg-card text-muted-foreground">잠금</Badge>
                    }
                  </div>
                );
              })}
              <Button
                variant="outline"
                className="mt-2 w-full rounded-full border-border"
                onClick={() => navigate("/app/chapters")}
              >
                챕터 전체 보기 <ChevronRight className="ml-1 size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── 섹션 3: 7일 활동 + 일일 미션 ── */}
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">

          {/* 7일 활동 */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">최근 7일 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.iso} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{day.dayLabel}</span>
                    <div
                      className={`flex size-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition ${
                        day.cleared
                          ? "border-[#10af29] bg-[#10af29] text-white"
                          : day.isToday
                          ? "border-[#10af29]/50 bg-[#10af29]/8 text-[#10af29]"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {day.dayNum}
                    </div>
                    {day.cleared && (
                      <span className="text-[9px] font-medium text-[#10af29]">✓</span>
                    )}
                    {day.isToday && !day.cleared && (
                      <span className="text-[9px] text-muted-foreground">오늘</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[1.3rem] border border-border bg-muted p-4">
                {progress.records.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    아직 기록이 없습니다. <strong className="text-foreground">오늘이 첫날입니다.</strong> 아래에서 일일 미션을 시작해보세요.
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    최근 7일 중 <strong className="text-foreground">{clearedCount}일</strong> 활동했습니다.
                    {clearedCount >= 5 && " 꾸준히 잘 하고 있어요!"}
                    {clearedCount >= 3 && clearedCount < 5 && " 이번 주도 계속 이어가봐요."}
                    {clearedCount < 3 && " 조금 더 자주 들러봐요."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 일일 미션 바로가기 */}
          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">오늘의 미션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-[#10af29]/20 bg-card/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-medium leading-6 text-foreground">{todayScenario.title}</p>
                  <Badge className="shrink-0 rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">
                    Daily
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{todayScenario.objective}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  브랜드: {company.name} · {product.product_name}
                </p>
              </div>
              <Button
                onClick={() => {
                  prepareMission(todayScenario.chapter, getTodayChallengeSeed(), "daily");
                  navigate("/app/play");
                }}
                className="w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
              >
                오늘의 미션 시작 <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppChrome>
  );
}
