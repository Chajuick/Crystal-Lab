import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CalendarCheck2, Check, LogOut, Medal, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import { AppChrome } from "@/components/app/AppChrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useApiKey } from "@/lib/useApiKey";
import { useLocalSession } from "@/lib/useLocalSession";
import { useRetentionLabStore } from "@/storage/useRetentionLabStore";

function formatPlayedAt(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { isLoggedIn, username, logout } = useLocalSession();
  const { progress } = useRetentionLabStore();
  const { apiKey, save: saveApiKey } = useApiKey();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [keySaved, setKeySaved] = useState(false);
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  async function handleSaveKey() {
    if (!keyInput.trim()) return;
    setKeyValidating(true);
    setKeyError(null);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyInput.trim()}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? `오류 코드 ${res.status}`);
      }
      saveApiKey(keyInput.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "키 검증 실패");
    } finally {
      setKeyValidating(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const totalPlays = progress.records.length;
  const unlockedAchievements = useMemo(() => progress.achievements.filter((item) => item.unlocked).length, [progress.achievements]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <AppChrome title="내정보" description="이름, 티어, 누적 점수, 플레이 횟수, 챕터 진행도, 최근 기록과 설정을 한 곳에서 확인할 수 있습니다.">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          <Card className="border-[#10af29]/20 bg-[#10af29]/6 dark:bg-[#10af29]/10">
            <CardContent className="p-6 lg:p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">User Record</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground">{username}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">현재 티어는 {progress.tier}이며, 누적 점수와 플레이 히스토리는 브라우저 로컬 저장소에 유지됩니다.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "누적 점수", value: progress.totalScore.toLocaleString() },
                  { label: "플레이 횟수", value: `${totalPlays}회` },
                  { label: "연속 플레이", value: `${progress.streak}회` },
                  { label: "해금 업적", value: `${unlockedAchievements}개` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.4rem] border border-[#10af29]/15 bg-card/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-foreground/50">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-6 rounded-full border-border"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut className="mr-2 size-4 text-[#10af29]" /> 로그아웃
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">챕터 진행도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(progress.chapterProgress).map(([key, value]) => (
                <div key={key} className="rounded-[1.4rem] border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-medium capitalize tracking-[-0.03em] text-foreground">{key}</p>
                    <Badge className="rounded-full border border-[#10af29]/35 bg-[#10af29]/10 text-[#0d9823] dark:text-[#9bf5ad]">{value}%</Badge>
                  </div>
                  <Progress value={value} className="mt-3 h-2 [&>div]:bg-[#10af29]" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-[0.28em] text-foreground/50">최근 플레이 기록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {progress.records.length > 0 ? (
                progress.records.slice(0, 8).map((record) => (
                  <div key={`${record.missionId}-${record.playedAt}`} className="rounded-[1.4rem] border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-lg font-medium tracking-[-0.03em] text-foreground">{record.scenarioTitle}</p>
                      <Badge className="rounded-full border border-border bg-muted text-muted-foreground">{record.score}점</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{record.chapter}</span>
                      <span>·</span>
                      <span>{record.channel}</span>
                      <span>·</span>
                      <span>{formatPlayedAt(record.playedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">아직 저장된 플레이 기록이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                <BrainCircuit className="size-4 text-[#10af29]" /> AI 코치 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Groq API 키를 등록하면 결과 리포트에서 AI 코치 피드백을 받을 수 있습니다.
                키는 브라우저 로컬 저장소에만 저장됩니다.
              </p>
              <div className="rounded-[1.4rem] border border-border bg-muted p-4 text-xs text-muted-foreground leading-5">
                무료 키 발급: <span className="font-mono">console.groq.com</span>
                <br />완전 무료 · 하루 14,400 요청 · Llama 3.3 70B
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => { setKeyInput(e.target.value); setKeyError(null); }}
                  placeholder="AIza..."
                  className="rounded-full border-border font-mono text-sm"
                  disabled={keyValidating}
                />
                <Button
                  onClick={handleSaveKey}
                  disabled={keyValidating || !keyInput.trim()}
                  className={`shrink-0 rounded-full px-5 transition-colors ${keySaved ? "bg-[#10af29] text-white hover:bg-[#0d9823]" : "bg-foreground text-background hover:bg-foreground/90"}`}
                >
                  {keyValidating ? "검증 중…" : keySaved ? <><Check className="mr-1.5 size-4" /> 저장됨</> : "검증 후 저장"}
                </Button>
              </div>
              {keyError && (
                <p className="text-xs text-red-500">✕ {keyError}</p>
              )}
              {!keyError && apiKey && (
                <p className="text-xs text-[#0a7a1c] dark:text-[#9bf5ad]">● API 키가 등록되어 있습니다.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                  <CalendarCheck2 className="size-4 text-[#10af29]" /> 일일 기록
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                오늘의 미션을 완료할수록 최근 플레이 목록에 기록이 쌓이고, 반복 약점 분석이 더 정교해집니다.
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-foreground/50">
                  <Trophy className="size-4 text-[#10af29]" /> 업적 현황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progress.achievements.slice(0, 4).map((achievement) => (
                  <div key={achievement.id} className={`rounded-[1.2rem] border p-3 ${achievement.unlocked ? "border-[#10af29]/35 bg-[#10af29]/8" : "border-border bg-muted"}`}>
                    <div className="flex items-start gap-3">
                      <Medal className={`mt-1 size-4 ${achievement.unlocked ? "text-[#10af29]" : "text-foreground/30"}`} />
                      <div>
                        <p className="font-medium text-foreground">{achievement.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
