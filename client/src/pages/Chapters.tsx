import { useEffect, useMemo } from "react";
import { LockKeyhole, Star } from "lucide-react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { chapters } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import type { ChapterKey } from "@/shared/types/domain";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

function getStars(progress: number) {
  if (progress >= 80) return 3;
  if (progress >= 45) return 2;
  if (progress >= 15) return 1;
  return 0;
}

export default function Chapters() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useLocalSession();
  const { progress, prepareMission } = useRetentionLabStore();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const chapterStages = useMemo(
    () =>
      chapters.map((chapter) => {
        const currentProgress = progress.chapterProgress[chapter.key as ChapterKey];
        const unlocked = progress.totalScore >= chapter.minScore;
        return {
          ...chapter,
          unlocked,
          progress: currentProgress,
          stars: getStars(currentProgress),
          stages: [
            { id: `${chapter.key}-1`, title: `${chapter.label} 1`, description: "핵심 필수 조건을 빠짐없이 반영하는 단계", difficulty: 1 },
            { id: `${chapter.key}-2`, title: `${chapter.label} 2`, description: "제외 조건과 채널 리스크를 함께 다루는 단계", difficulty: 2 },
            { id: `${chapter.key}-3`, title: `${chapter.label} 3`, description: "정밀 타겟팅과 메시지 설계를 함께 맞추는 단계", difficulty: 3 },
          ],
        };
      }),
    [progress.chapterProgress, progress.totalScore],
  );

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AppChrome title="챕터" description="챕터는 정식 성장형 스테이지 모드입니다. 잠금 상태, 별 개수, 난이도, 진행률을 확인하고 원하는 챕터로 진입할 수 있습니다.">
      <div className="space-y-4">
        {chapterStages.map((chapter) => (
          <Card key={chapter.key} className="border-border bg-card">
            <CardContent className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">{chapter.label}</p>
                  <Badge className={`rounded-full border ${chapter.unlocked ? "border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]" : "border-border bg-muted text-muted-foreground"}`}>
                    {chapter.unlocked ? "진입 가능" : `해금 점수 ${chapter.minScore}`}
                  </Badge>
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground">{chapter.description}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">보너스 목표: {chapter.bonus}</p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">진행률</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{chapter.progress}%</p>
                    <Progress value={chapter.progress} className="mt-3 h-2 [&>div]:bg-[#10af29]" />
                  </div>
                  <div className="rounded-[1.4rem] border border-border bg-muted p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">별 개수</p>
                    <div className="mt-3 flex gap-2">
                      {[0, 1, 2].map((index) => (
                        <Star key={index} className={`size-5 ${index < chapter.stars ? "fill-[#10af29] text-[#10af29]" : "text-foreground/20"}`} />
                      ))}
                    </div>
                  </div>
                  <div className={`rounded-[1.4rem] border p-4 ${chapter.unlocked ? "border-[#10af29]/25 bg-[#10af29]/8" : "border-border bg-muted"}`}>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">상태</p>
                    <p className={`mt-2 text-lg font-medium ${chapter.unlocked ? "text-[#0d9823] dark:text-[#9bf5ad]" : "text-muted-foreground"}`}>
                      {chapter.unlocked ? "플레이 가능" : "잠금"}
                    </p>
                  </div>
                </div>

                <Button
                  disabled={!chapter.unlocked}
                  onClick={() => {
                    prepareMission(chapter.key as ChapterKey);
                    navigate("/app/play");
                  }}
                  className="mt-6 rounded-full bg-[#10af29] text-white hover:bg-[#0d9823] disabled:opacity-40"
                >
                  {chapter.unlocked ? "이 챕터 플레이" : "점수 달성 후 해금"}
                </Button>
              </div>

              <div className="grid gap-3">
                {chapter.stages.map((stage) => (
                  <div key={stage.id} className="rounded-[1.5rem] border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium tracking-[-0.03em] text-foreground">{stage.title}</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{stage.description}</p>
                      </div>
                      {!chapter.unlocked ? <LockKeyhole className="size-5 text-foreground/30" /> : null}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>난이도</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <span key={index} className={`h-2.5 w-8 rounded-full ${index < stage.difficulty ? "bg-[#10af29]" : "bg-foreground/10"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppChrome>
  );
}
