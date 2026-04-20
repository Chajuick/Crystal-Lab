import { useEffect, useMemo, useRef } from "react";
import { CheckCircle2, ChevronRight, LockKeyhole, Star } from "lucide-react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { MissionWorkspace } from "@/components/app/MissionWorkspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CHAPTER_STAGES, chapters } from "@/game-engine/scenarios";
import { useLocalSession } from "@/lib/useLocalSession";
import type { ChapterKey } from "@/shared/types/domain";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

function getStars(prog: number) {
  if (prog >= 80) return 3;
  if (prog >= 45) return 2;
  if (prog >= 15) return 1;
  return 0;
}

const DIFFICULTY_BARS: Record<ChapterKey, number> = {
  foundation: 1,
  practical: 2,
  advanced: 3,
  expert: 4,
};

export default function Chapters() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useLocalSession();
  const { progress, prepareMission, playMode, selectedChapter, missionSeed } = useRetentionLabStore();
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  const chapterList = useMemo(
    () =>
      chapters.map((ch) => ({
        ...ch,
        unlocked: progress.totalScore >= ch.minScore,
        currentProgress: progress.chapterProgress[ch.key as ChapterKey],
        stars: getStars(progress.chapterProgress[ch.key as ChapterKey]),
      })),
    [progress.chapterProgress, progress.totalScore],
  );

  function getStageStatus(chapterKey: ChapterKey, seed: number) {
    const records = progress.records.filter(
      (r) => r.chapter === chapterKey && r.missionId.split("-")[1] === String(seed),
    );
    if (records.length === 0) return { attempted: false, bestScore: null, cleared: false };
    const bestScore = Math.max(...records.map((r) => r.score));
    return { attempted: true, bestScore, cleared: bestScore >= 60 };
  }

  function handleStartStage(chapter: ChapterKey, seed: number) {
    prepareMission(chapter, seed, "chapter");
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const activeStageNum = useMemo(() => {
    if (playMode !== "chapter") return null;
    return CHAPTER_STAGES[selectedChapter]?.find((s) => s.seed === missionSeed)?.stageNum ?? null;
  }, [playMode, selectedChapter, missionSeed]);

  if (!isLoggedIn) return null;

  const isPlaying = playMode === "chapter";

  return (
    <AppChrome
      title="챕터"
      description="챕터별로 4개의 스테이지를 플레이합니다. 클리어한 스테이지는 언제든 재도전할 수 있습니다."
    >
      <div className="space-y-4">
        {chapterList.map((chapter) => {
          const diffBars = DIFFICULTY_BARS[chapter.key as ChapterKey];
          const stages = CHAPTER_STAGES[chapter.key as ChapterKey];
          const isActiveChapter = isPlaying && selectedChapter === chapter.key;

          return (
            <Card
              key={chapter.key}
              className={`border-border bg-card transition ${isActiveChapter ? "border-[#10af29]/35 ring-1 ring-[#10af29]/15" : ""}`}
            >
              <CardContent className="p-5 lg:p-6">
                {/* ── Chapter header ── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">{chapter.label}</p>
                      <Badge
                        className={`rounded-full border text-[11px] ${
                          chapter.unlocked
                            ? "border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {chapter.unlocked ? "진입 가능" : `해금 ${chapter.minScore}점`}
                      </Badge>
                      {isActiveChapter && activeStageNum !== null && (
                        <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[11px] text-[#0d9823] dark:text-[#9bf5ad]">
                          스테이지 {activeStageNum} 진행 중
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{chapter.description}</p>
                  </div>

                  {/* Mini stats */}
                  <div className="flex shrink-0 flex-wrap items-center gap-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">진행률</p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">{chapter.currentProgress}%</p>
                      <Progress value={chapter.currentProgress} className="mt-1.5 h-1.5 w-20 [&>div]:bg-[#10af29]" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">별</p>
                      <div className="mt-2 flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <Star key={i} className={`size-4 ${i < chapter.stars ? "fill-[#10af29] text-[#10af29]" : "text-foreground/15"}`} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">난이도</p>
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <span key={i} className={`h-2 w-5 rounded-full ${i < diffBars ? "bg-[#10af29]" : "bg-foreground/10"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Stage grid ── */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {stages.map((stage) => {
                    const { attempted, bestScore, cleared } = getStageStatus(chapter.key as ChapterKey, stage.seed);
                    const isThisStage = isActiveChapter && missionSeed === stage.seed;

                    return (
                      <button
                        key={stage.stageNum}
                        onClick={() => chapter.unlocked && handleStartStage(chapter.key as ChapterKey, stage.seed)}
                        disabled={!chapter.unlocked}
                        className={`group rounded-[1.5rem] border p-4 text-left transition-all ${
                          isThisStage
                            ? "border-[#10af29]/50 bg-[#10af29]/8"
                            : cleared
                              ? "border-[#10af29]/20 bg-card hover:border-[#10af29]/40"
                              : attempted
                                ? "border-amber-200/60 bg-amber-50/30 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/20"
                                : "border-border bg-muted hover:border-[#10af29]/30"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {/* Top: stage number + status */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {stage.stageNum}
                          </span>
                          {isThisStage && (
                            <span className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 px-2 py-0.5 text-[10px] text-[#0d9823] dark:text-[#9bf5ad]">
                              진행 중
                            </span>
                          )}
                          {cleared && !isThisStage && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-[#0d9823] dark:text-[#9bf5ad]">
                              <CheckCircle2 className="size-3" />
                              {bestScore}점
                            </span>
                          )}
                          {attempted && !cleared && !isThisStage && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">도전 중</span>
                          )}
                          {!attempted && !chapter.unlocked && (
                            <LockKeyhole className="size-3.5 text-foreground/25" />
                          )}
                        </div>

                        {/* Stage name + desc */}
                        <p className={`mt-2.5 text-sm font-medium leading-5 ${isThisStage ? "text-[#0d9823] dark:text-[#9bf5ad]" : "text-foreground"}`}>
                          {stage.name}
                        </p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{stage.description}</p>

                        {/* Hover CTA */}
                        {chapter.unlocked && (
                          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            <span>{cleared ? "다시 도전" : attempted ? "계속하기" : "시작하기"}</span>
                            <ChevronRight className="size-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* ── Workspace ── */}
        {isPlaying && (
          <div ref={workspaceRef} className="scroll-mt-4">
            <MissionWorkspace
              heading={`${chapterList.find((c) => c.key === selectedChapter)?.label ?? ""} · 스테이지 ${activeStageNum ?? ""}`}
              subheading="데이터 탐색부터 SQL 실행, 메시지 작성, 결과 리포트까지 한 흐름으로 수행합니다."
            />
          </div>
        )}
      </div>
    </AppChrome>
  );
}
