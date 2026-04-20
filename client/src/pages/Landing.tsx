/*
Design reminder for Landing.tsx
- The landing page should explain what the app is, how it is used, and why it is useful before entry.
- Keep a single primary entry action instead of redundant login/start duplication.
- Use the prepared monochrome assets as editorial proof points, not as decoration only.
*/

import { FormEvent, useState } from "react";
import { ArrowRight, DatabaseZap, MessagesSquare, Trophy, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocalSession } from "@/lib/useLocalSession";


export default function Landing() {
  const [, navigate] = useLocation();
  const { login, username } = useLocalSession();
  const [name, setName] = useState(username);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    login(name);
    navigate("/app/home");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1560px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#0a0a0a] text-white shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col justify-between px-6 py-7 lg:px-10 lg:py-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/42">수정 연구소</p>
                  <div className="mt-6 inline-flex rounded-full border border-[#10af29]/30 bg-[#10af29]/10 px-4 py-2 text-sm text-[#9bf5ad]">
                    SQL 세그먼트 설계와 CRM 메시지 판단을 함께 훈련하는 실무형 학습 앱
                  </div>
                  <h1 className="mt-6 max-w-[8ch] text-5xl font-semibold tracking-[-0.08em] lg:text-7xl">CRM 실무 감각을 훈련하는 시뮬레이터</h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 lg:text-lg">
                    이 앱은 단순 SQL 연습장이 아니라, <strong className="text-white">어떤 고객을 고르고</strong>, <strong className="text-white">어떤 채널로</strong>, <strong className="text-white">어떤 메시지를 보낼지</strong>를 하나의 흐름으로 연습하는 CRM 마케팅 시뮬레이터입니다.
                  </p>
                </div>

                <div className="mt-10 grid gap-3 md:grid-cols-3">
                  {[
                    {
                      title: "무엇을 하는 앱인가",
                      text: "고객 데이터 탐색, SQL 세그먼트 작성, 메시지 작성, 결과 리포트까지 실무 흐름을 한 번에 학습합니다.",
                    },
                    {
                      title: "어떻게 쓰면 되나",
                      text: "이름을 입력하고 입장한 뒤 홈에서 오늘의 미션 또는 챕터를 고르고, 플레이 화면에서 실제 워크플로를 수행하면 됩니다.",
                    },
                    {
                      title: "왜 유용한가",
                      text: "정답 암기보다 판단 훈련에 가깝게 설계되어 있어 세그먼트 정확도와 메시지 적합도를 함께 익히기 좋습니다.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">{item.title}</p>
                      <p className="mt-3 text-sm leading-7 text-white/66">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[340px] border-t border-white/10 lg:min-h-full lg:border-l lg:border-t-0">
                <div className="h-full w-full bg-gradient-to-br from-[#0a1a0d] via-[#0d2e14] to-[#0a0a0a]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-18 select-none pointer-events-none">
                  <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#10af29]">SQL · SEGMENT · MESSAGE</div>
                  <div className="font-mono text-xs text-white/30 leading-6 text-center px-6">
                    SELECT c.customer_id<br />FROM customers c<br />WHERE c.push_opt_in = 1<br />  AND c.app_installed = 1<br />ORDER BY last_session_at DESC
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              </div>
            </div>
          </section>

          <section className="flex items-stretch">
            <Card className="w-full rounded-[2.2rem] border-black/10 bg-white shadow-[0_20px_90px_rgba(0,0,0,0.07)]">
              <CardContent className="p-6 lg:p-8">
                <div className="rounded-full border border-[#10af29]/30 bg-[#10af29]/8 px-4 py-2 text-sm text-[#0d9823]">
                  로그인 전에는 앱 성격과 사용 방식을 먼저 이해하고, 한 번의 진입 액션으로 바로 들어갑니다.
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-[-0.05em] text-black">바로 시작하기</h2>
                <p className="mt-3 text-sm leading-7 text-black/62">
                  사용자명을 입력하면 별도 회원가입 없이 앱에 입장합니다. 이후 <strong className="text-black">홈 · 챕터 · 플레이 · 내정보</strong> 구조 안에서 학습을 이어갈 수 있습니다.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black">사용자명</label>
                    <Input value={name} onChange={(event) => setName(event.target.value)} className="h-12 rounded-full border-black/10" placeholder="예: 김마케터" />
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
                        <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-[#10af29] text-white">{index + 1}</div>
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

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden rounded-[2rem] border-black/10 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.05)] lg:col-span-2">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="p-6 lg:p-8">
                <p className="text-[11px] uppercase tracking-[0.28em] text-black/42">앱 사용 흐름</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-black">브리핑을 읽고, 데이터를 보고, SQL과 메시지까지 이어서 판단합니다.</h3>
                <p className="mt-4 text-sm leading-7 text-black/62">
                  실제 사용은 설명 페이지를 오래 읽는 방식이 아니라, 미션을 선택한 뒤 플레이 화면에서 필요한 테이블을 확인하고 SQL을 실행하며, 이어서 메시지를 작성하고 결과 리포트를 확인하는 식으로 진행됩니다.
                </p>
                <div className="mt-6 rounded-[1.5rem] border border-black/8 bg-[#f7f7f4] p-4 text-sm leading-7 text-black/60">
                  따라서 랜딩은 앱의 성격과 사용법을 짧고 명확하게 설명하는 역할만 맡고, 실제 작업은 로그인 후 분리된 앱 화면에서 수행하도록 설계했습니다.
                </div>
              </div>
              <div className="h-full min-h-[280px] w-full bg-gradient-to-br from-[#f0f8f2] to-[#e8f5ea] flex items-center justify-center">
                <div className="font-mono text-xs text-[#10af29]/60 leading-6 text-center">
                  데이터 탐색 → SQL 작성 → 메시지 작성 → 결과 리포트
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="overflow-hidden rounded-[2rem] border-black/10 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.05)]">
              <div className="h-48 w-full bg-gradient-to-br from-[#f7f7f4] to-[#eef4ef] flex items-center justify-center">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#10af29]/50">Mission Briefing</span>
              </div>
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/42">Mission Briefing</p>
                <p className="mt-3 text-sm leading-7 text-black/62">미션은 목표, 조건, 제외 규칙을 갖춘 브리핑 형태로 제시되어 실무 판단 문맥을 먼저 잡아줍니다.</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[2rem] border-black/10 bg-[#111] text-white shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
              <div className="h-48 w-full bg-gradient-to-br from-[#0d1f0f] to-[#0a0a0a] flex items-center justify-center">
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#9bf5ad]/40">Growth Loop</span>
              </div>
              <CardContent className="p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">Growth Loop</p>
                <p className="mt-3 text-sm leading-7 text-white/64">누적 점수, 챕터 진행도, 업적과 기록이 쌓이며 학습 루프를 유지할 수 있도록 설계되어 있습니다.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
