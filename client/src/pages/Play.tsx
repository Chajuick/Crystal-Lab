import { useEffect, useMemo } from "react";
import { CalendarDays, Dice6 } from "lucide-react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { MissionWorkspace } from "@/components/app/MissionWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chapters, generateScenario } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import type { ChapterKey } from "@/shared/types/domain";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

function getTodayChallengeSeed() {
  const now = new Date();
  return Number(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`.replace(/\D/g, "")) % 97;
}

export default function Play() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useLocalSession();
  const { selectedChapter, missionSeed, prepareMission, rollMission, progress } = useRetentionLabStore();
  const todayScenario = useMemo(() => generateScenario("advanced", getTodayChallengeSeed()), []);
  const currentScenario = useMemo(() => generateScenario(selectedChapter, missionSeed), [missionSeed, selectedChapter]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AppChrome title="플레이" description="플레이는 반복 학습 허브입니다. 자유 플레이와 오늘의 미션을 분리해 두고, 아래에서 실제 작업을 이어갑니다.">
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                <Dice6 className="size-4 text-[#10af29]" /> 자유 플레이
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">원하는 난이도나 분야를 골라 반복 연습하는 공간입니다. 챕터와 별개로 가볍게 여러 번 시도할 수 있습니다.</p>
              <div className="flex flex-wrap gap-2">
                {chapters.map((chapter) => {
                  const unlocked = progress.totalScore >= chapter.minScore;
                  const selected = selectedChapter === chapter.key;
                  return (
                    <button
                      key={chapter.key}
                      disabled={!unlocked}
                      onClick={() => prepareMission(chapter.key as ChapterKey)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        selected ? "border-[#10af29] bg-[#10af29] text-white" : "border-border bg-card text-muted-foreground hover:border-[#10af29]/40"
                      } ${unlocked ? "opacity-100" : "opacity-40"}`}
                    >
                      {chapter.label}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-[1.5rem] border border-border bg-muted p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">현재 선택된 자유 플레이 미션</p>
                <p className="mt-3 text-xl font-medium tracking-[-0.03em] text-foreground">{currentScenario.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{currentScenario.objective}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]" onClick={() => prepareMission(selectedChapter)}>
                  이 설정으로 시작
                </Button>
                <Button className="rounded-full" variant="outline" onClick={rollMission}>
                  추천 미션 바꾸기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                <CalendarDays className="size-4 text-[#10af29]" /> 오늘의 미션
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">하루 1회 기준의 랜덤 미션입니다. 완료 시 기록과 성취 흐름을 쌓기 좋게 설계된 도전 카드입니다.</p>
              <div className="rounded-[1.5rem] border border-[#10af29]/20 bg-card/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-medium tracking-[-0.03em] text-foreground">{todayScenario.title}</p>
                  <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/14 text-[#0d9823] dark:text-[#9bf5ad]">Daily</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{todayScenario.objective}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]"
                  onClick={() => prepareMission(todayScenario.chapter, getTodayChallengeSeed())}
                >
                  오늘의 미션 불러오기
                </Button>
                <div className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
                  일일 도전은 누적 기록과 함께 내정보에 반영됩니다.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <MissionWorkspace heading="플레이 워크스페이스" subheading="지금 선택된 자유 플레이 또는 오늘의 미션을 아래 작업 흐름에서 바로 수행할 수 있습니다." />
      </div>
    </AppChrome>
  );
}
