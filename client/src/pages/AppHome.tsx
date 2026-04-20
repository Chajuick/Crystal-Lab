import { ArrowRight, BookOpen, ChevronRight, Database, FileText, LayoutDashboard, MessageSquare, PlayCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCompanyById, generateScenario, getProductById, chapters } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";
import type { ChapterKey } from "@/shared/types/domain";

function getTodayChallengeSeed() {
  const now = new Date();
  return Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`.replace(/\D/g, "")) % 97;
}

const HOW_IT_WORKS = [
  { icon: Database, step: "01", title: "데이터 탐색", desc: "고객·주문·세션 테이블을 살펴보고 미션에 필요한 컬럼을 파악합니다." },
  { icon: FileText, step: "02", title: "SQL 작성", desc: "브리핑 조건을 SQL로 옮겨 타겟 세그먼트를 추출합니다." },
  { icon: MessageSquare, step: "03", title: "메시지 작성", desc: "채널과 브랜드 톤에 맞게 발송 문구를 완성합니다." },
  { icon: LayoutDashboard, step: "04", title: "결과 확인", desc: "5개 항목 채점과 AI 코치 피드백으로 약점을 파악합니다." },
];

export default function AppHome() {
  const [, navigate] = useLocation();
  const { isLoggedIn, username } = useLocalSession();
  const { progress, prepareMission, selectedChapter, missionSeed } = useRetentionLabStore();
  const currentScenario = useMemo(() => generateScenario(selectedChapter, missionSeed), [missionSeed, selectedChapter]);
  const todayScenario = useMemo(() => generateScenario("advanced", getTodayChallengeSeed()), []);
  const company = useMemo(() => getCompanyById(todayScenario.companyId), [todayScenario.companyId]);
  const product = useMemo(() => getProductById(todayScenario.productId), [todayScenario.productId]);

  const isNewUser = progress.records.length === 0;

  useEffect(() => {
    if (!isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  return (
    <AppChrome title="홈" description="지금 무엇을 하면 되는지 한눈에 파악하고 바로 시작할 수 있는 허브입니다.">
      {isNewUser ? (
        /* ── 첫 방문자 레이아웃 ── */
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            {/* 환영 + 앱 소개 */}
            <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
              <CardContent className="p-6 lg:p-8">
                <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">처음 오셨군요</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">{username}님, 환영합니다.</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                  수정 연구소는 SQL 세그먼트 설계부터 CRM 메시지 작성, 결과 해석까지 하나의 흐름으로 반복 연습하는 실무형 시뮬레이터입니다.
                  아래 순서대로 한 번만 따라가면 전체 흐름이 보입니다.
                </p>
                <Button
                  className="mt-6 rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                  onClick={() => {
                    prepareMission(todayScenario.chapter, getTodayChallengeSeed(), "daily");
                    navigate("/app/play");
                  }}
                >
                  오늘의 미션으로 시작하기 <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>

            {/* 사용 흐름 4단계 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                  <BookOpen className="size-4 text-[#10af29]" /> 이렇게 사용합니다
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
          </div>

          <div className="grid gap-4">
            {/* 오늘의 미션 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">오늘의 미션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-border bg-muted p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-medium leading-6 text-foreground">{todayScenario.title}</p>
                    <Badge className="shrink-0 rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">Daily</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{todayScenario.objective}</p>
                  <p className="mt-3 text-xs text-muted-foreground">브랜드: {company.name} · {product.product_name}</p>
                </div>
                <Button
                  onClick={() => {
                    prepareMission(todayScenario.chapter, getTodayChallengeSeed(), "daily");
                    navigate("/app/play");
                  }}
                  className="w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                >
                  시작하기 <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>

            {/* 챕터 안내 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">챕터 구성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {chapters.map((chapter) => {
                  const unlocked = progress.totalScore >= chapter.minScore;
                  return (
                    <div key={chapter.key} className={`flex items-center justify-between rounded-[1.2rem] border p-3 ${unlocked ? "border-border bg-muted" : "border-border bg-muted opacity-50"}`}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{chapter.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{unlocked ? "진입 가능" : `${chapter.minScore.toLocaleString()}점 달성 후 해금`}</p>
                      </div>
                      {unlocked
                        ? <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">열림</Badge>
                        : <Badge className="rounded-full border border-border bg-card text-muted-foreground">잠금</Badge>
                      }
                    </div>
                  );
                })}
                <Button variant="outline" className="mt-2 w-full rounded-full border-border" onClick={() => navigate("/app/chapters")}>
                  챕터 전체 보기 <ChevronRight className="ml-1 size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ── 재방문자 레이아웃 ── */
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            {/* 환영 카드 */}
            <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
              <CardContent className="p-6 lg:p-8">
                <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">Welcome back</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">{username}님, 오늘의 미션을 풀어볼까요?</h2>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "현재 티어", value: progress.tier },
                    { label: "누적 점수", value: progress.totalScore.toLocaleString() },
                    { label: "연속 플레이", value: `${progress.streak}회` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.3rem] border border-[#10af29]/15 bg-card/60 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
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
                  <Button className="rounded-full" variant="outline" onClick={() => navigate("/app/chapters")}>
                    챕터 보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 최근 플레이 기록 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">최근 플레이 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress.records.slice(0, 4).map((record) => (
                  <div key={`${record.missionId}-${record.playedAt}`} className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-border p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{record.scenarioTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(record.playedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <Badge className="shrink-0 rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">{record.score}점</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 챕터 진행도 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">챕터 진행도</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {chapters.map((chapter) => {
                  const p = progress.chapterProgress[chapter.key as ChapterKey];
                  const unlocked = progress.totalScore >= chapter.minScore;
                  return (
                    <div key={chapter.key} className={`rounded-[1.3rem] border p-4 ${unlocked ? "border-border bg-muted" : "border-border bg-muted opacity-40"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{chapter.label}</p>
                        <span className="text-xs font-medium text-[#0d9823] dark:text-[#9bf5ad]">{p}%</span>
                      </div>
                      <Progress value={p} className="mt-2 h-1.5 [&>div]:bg-[#10af29]" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {/* 오늘의 미션 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">오늘의 미션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-border bg-muted p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-medium leading-6 text-foreground">{todayScenario.title}</p>
                    <Badge className="shrink-0 rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">Daily</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{todayScenario.objective}</p>
                  <p className="mt-3 text-xs text-muted-foreground">브랜드: {company.name} · {product.product_name}</p>
                </div>
                <Button
                  onClick={() => {
                    prepareMission(todayScenario.chapter, getTodayChallengeSeed(), "daily");
                    navigate("/app/play");
                  }}
                  className="w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                >
                  오늘의 미션 시작
                </Button>
              </CardContent>
            </Card>

            {/* 이어하기 */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">이어하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-border bg-muted p-4">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="size-4 shrink-0 text-[#10af29]" />
                    <p className="text-sm font-medium text-foreground">{currentScenario.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{currentScenario.objective}</p>
                </div>
                <Button onClick={() => navigate("/app/play")} variant="outline" className="w-full rounded-full border-border">
                  이어서 플레이
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppChrome>
  );
}
