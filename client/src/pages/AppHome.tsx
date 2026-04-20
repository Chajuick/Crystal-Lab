import { ArrowRight, Clock3, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanyById, generateScenario, getProductById } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

function getTodayChallengeSeed() {
  const now = new Date();
  return Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`.replace(/\D/g, "")) % 97;
}

export default function AppHome() {
  const [, navigate] = useLocation();
  const { isLoggedIn, username } = useLocalSession();
  const { progress, prepareMission, selectedChapter, missionSeed } = useRetentionLabStore();
  const currentScenario = useMemo(() => generateScenario(selectedChapter, missionSeed), [missionSeed, selectedChapter]);
  const todayScenario = useMemo(() => generateScenario("advanced", getTodayChallengeSeed()), []);
  const company = useMemo(() => getCompanyById(todayScenario.companyId), [todayScenario.companyId]);
  const product = useMemo(() => getProductById(todayScenario.productId), [todayScenario.productId]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AppChrome title="홈" description="지금 무엇을 하면 되는지 바로 이해할 수 있도록, 다음 행동과 최근 결과만 정리한 시작 허브입니다.">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardContent className="p-6 lg:p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">Welcome back</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">{username}님, 오늘은 어떤 미션을 풀어볼까요?</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                홈은 설명 페이지가 아니라 시작 허브입니다. 오늘의 미션을 바로 시작하거나, 이어서 플레이하거나, 추천 미션으로 이동할 수 있습니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                  onClick={() => {
                    prepareMission(todayScenario.chapter, getTodayChallengeSeed());
                    navigate("/app/play");
                  }}
                >
                  오늘의 미션 시작 <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button className="rounded-full" variant="outline" onClick={() => navigate("/app/play")}>
                  이어서 플레이
                </Button>
                <Button className="rounded-full" variant="outline" onClick={() => navigate("/app/chapters")}>
                  챕터 보기
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "이름", value: username },
              { label: "현재 티어", value: progress.tier },
              { label: "누적 점수", value: progress.totalScore.toLocaleString() },
              { label: "연속 플레이", value: `${progress.streak}회` },
            ].map((item) => (
              <Card key={item.label} className="border-border bg-card">
                <CardContent className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">최근 플레이 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {progress.records.length > 0 ? (
                progress.records.slice(0, 4).map((record) => (
                  <div key={`${record.missionId}-${record.playedAt}`} className="flex flex-col justify-between gap-3 rounded-[1.4rem] border border-border p-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-lg font-medium tracking-[-0.03em] text-foreground">{record.scenarioTitle}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{new Date(record.playedAt).toLocaleString("ko-KR")}</p>
                    </div>
                    <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">{record.score}점</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">아직 플레이 기록이 없습니다. 오늘의 미션부터 시작해보세요.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">오늘의 미션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-border bg-muted p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-medium text-foreground">{todayScenario.title}</p>
                  <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">Daily</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{todayScenario.objective}</p>
                <p className="mt-4 text-sm text-muted-foreground">브랜드: {company.name} / 상품: {product.product_name}</p>
              </div>
              <Button
                onClick={() => {
                  prepareMission(todayScenario.chapter, getTodayChallengeSeed());
                  navigate("/app/play");
                }}
                className="w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
              >
                오늘의 미션 시작
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">이어하기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <div className="rounded-[1.5rem] border border-border p-5">
                <div className="flex items-center gap-2 text-foreground">
                  <PlayCircle className="size-4 text-[#10af29]" />
                  <span className="font-medium">현재 준비된 미션</span>
                </div>
                <p className="mt-3 text-lg font-medium tracking-[-0.03em] text-foreground">{currentScenario.title}</p>
                <p className="mt-2">{currentScenario.objective}</p>
              </div>
              <Button onClick={() => navigate("/app/play")} variant="outline" className="w-full rounded-full border-border">
                이어서 플레이
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">짧은 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
              <div className="flex items-start gap-3 rounded-[1.3rem] border border-border p-4">
                <Clock3 className="mt-1 size-4 shrink-0 text-[#10af29]" />
                <p>처음이라면 오늘의 미션으로 흐름을 익히고, 익숙해지면 챕터 또는 자유 플레이로 확장하는 방식이 가장 자연스럽습니다.</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.3rem] border border-border p-4">
                <Sparkles className="mt-1 size-4 shrink-0 text-[#10af29]" />
                <p>플레이 화면에서는 데이터 탐색, SQL 작성, 메시지 작성, 결과 확인이 순서대로 분리되어 있습니다.</p>
              </div>
              <div className="flex items-start gap-3 rounded-[1.3rem] border border-border p-4">
                <Trophy className="mt-1 size-4 shrink-0 text-[#10af29]" />
                <p>누적 점수와 최근 기록, 업적은 내정보에서 한 번에 확인할 수 있습니다.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppChrome>
  );
}
