import { FormEvent, useState } from "react";
import { ArrowRight, DatabaseZap, MessagesSquare, Trophy, UserRound, CheckCircle2, TrendingUp, Target, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocalSession } from "@/lib/useLocalSession";


const FEATURES = [
  { icon: Target, title: "Mission Briefing", desc: "목표·조건·제외 규칙이 담긴 브리핑으로 실무 판단 문맥을 먼저 설정합니다. 현실적인 고객 데이터 200명이 기반입니다." },
  { icon: TrendingUp, title: "Growth Loop", desc: "누적 점수, 챕터 진행도, 업적이 쌓이며 학습 루프를 유지합니다. 챕터 해금으로 난이도가 올라갑니다." },
  { icon: Zap, title: "AI 코치", desc: "규칙 기반 채점 후 Gemini가 SQL 논리, 세그먼트 적합도, 메시지 개선 포인트를 항목별로 설명합니다." },
  { icon: CheckCircle2, title: "오늘의 미션", desc: "날짜 기반 랜덤 미션으로 매일 새로운 시나리오를 풀며 누적 기록을 쌓을 수 있습니다." },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const { login, username } = useLocalSession();
  const [name, setName] = useState(username);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    login(name);
    navigate("/app/home");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1560px] px-4 py-4 lg:px-6 lg:py-6">

        {/* ── 메인 그리드: 히어로(다크) + 로그인 카드 ── */}
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">

          {/* 히어로 — 다크 */}
          <section className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0a0a0a] text-white shadow-[0_8px_32px_rgba(0,0,0,0.22)]">
            <div className="flex h-full flex-col px-6 py-8 lg:px-10 lg:py-12">
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">수정 연구소</p>
                <div className="mt-6 inline-flex rounded-full border border-[#10af29]/30 bg-[#10af29]/10 px-4 py-2 text-sm text-[#9bf5ad]">
                  SQL 세그먼트 설계와 CRM 메시지 판단을 함께 훈련하는 실무형 학습 앱
                </div>
                <h1 className="mt-6 text-5xl font-semibold tracking-[-0.08em] lg:text-7xl">
                  CRM 시뮬레이터
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 lg:text-lg">
                  단순 SQL 연습장이 아니라, <strong className="text-white">어떤 고객을 고르고</strong>, <strong className="text-white">어떤 채널로</strong>,{" "}
                  <strong className="text-white">어떤 메시지를 보낼지</strong>를 하나의 흐름으로 연습하는 CRM 마케팅 시뮬레이터입니다.
                </p>
              </div>

              <div className="mt-auto pt-10 grid gap-3 md:grid-cols-3">
                {[
                  { title: "무엇을 하는 앱인가", text: "고객 데이터 탐색, SQL 세그먼트 작성, 메시지 작성, 결과 리포트까지 실무 흐름을 한 번에 학습합니다." },
                  { title: "어떻게 쓰면 되나", text: "이름을 입력해 입장한 뒤 홈에서 오늘의 미션 또는 챕터를 고르고, 플레이 화면에서 워크플로를 수행합니다." },
                  { title: "왜 유용한가", text: "정답 암기보다 판단 훈련에 가깝게 설계되어 세그먼트 정확도와 메시지 적합도를 함께 익히기 좋습니다." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-white/66">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 로그인 카드 */}
          <section className="flex items-stretch">
            <Card className="w-full rounded-[2.2rem] border-black/10 bg-white shadow-[0_20px_90px_rgba(0,0,0,0.07)]">
              <CardContent className="p-6 lg:p-8">
                <div className="rounded-full border border-[#10af29]/30 bg-[#10af29]/8 px-4 py-2 text-sm text-[#0d9823]">
                  별도 회원가입 없이 이름 하나로 바로 입장합니다.
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-black">바로 시작하기</h2>
                <p className="mt-3 text-sm leading-7 text-black/62">
                  사용자명을 입력하면 바로 앱에 입장합니다. 이후 <strong className="text-black">홈 · 챕터 · 플레이 · 내정보</strong> 구조 안에서 학습을 이어갈 수 있습니다.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">사용자명</label>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-12 rounded-full border-black/10"
                      placeholder="예: 김마케터"
                    />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-full bg-[#10af29] text-white hover:bg-[#0d9823]">
                    앱 입장하기 <ArrowRight className="ml-2 size-4" />
                  </Button>
                </form>

                <div className="mt-6 grid gap-3">
                  {[
                    { icon: UserRound, title: "입장", text: "이름을 입력하고 바로 앱으로 들어갑니다." },
                    { icon: DatabaseZap, title: "플레이", text: "데이터 탐색과 SQL 작성으로 타겟 세그먼트를 만듭니다." },
                    { icon: MessagesSquare, title: "메시지 작성", text: "채널과 상황에 맞는 CRM 메시지를 작성합니다." },
                    { icon: Trophy, title: "리포트 확인", text: "점수와 피드백, 누적 기록으로 성장 흐름을 확인합니다." },
                  ].map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="flex items-start gap-3 rounded-[1.35rem] border border-black/8 bg-[#f7f7f4] p-4">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#10af29] text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-black">
                            <Icon className="size-4 text-[#10af29]" />
                            <span className="font-medium">{step.title}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-black/60">{step.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* ── 하단: 기능 4개 카드 ── */}
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="rounded-[2rem] border-black/8 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
              <CardContent className="p-6">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#10af29]/10">
                  <Icon className="size-5 text-[#10af29]" />
                </div>
                <p className="mt-4 text-base font-semibold tracking-[-0.03em] text-black">{title}</p>
                <p className="mt-3 text-sm leading-7 text-black/60">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

      </div>
    </div>
  );
}
