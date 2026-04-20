import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, Layers3, LogOut, Moon, PlaySquare, Sun, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocalSession } from "@/lib/useLocalSession";

interface AppChromeProps {
  title: string;
  description: string;
  children: ReactNode;
}

const navItems: Array<{ href: string; label: string; icon: LucideIcon; short: string }> = [
  { href: "/app/home", label: "홈", icon: Home, short: "시작 허브" },
  { href: "/app/chapters", label: "챕터", icon: Layers3, short: "정식 진행" },
  { href: "/app/play", label: "플레이", icon: PlaySquare, short: "자유 · 일일" },
  { href: "/app/profile", label: "내정보", icon: UserRound, short: "기록 · 설정" },
];

export function AppChrome({ title, description, children }: AppChromeProps) {
  const [location, navigate] = useLocation();
  const { username, logout } = useLocalSession();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 pb-24 pt-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4 lg:px-6 lg:pb-6 lg:pt-6">
        {/* Desktop sidebar — always dark by design */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-4">
          <Card className="border-white/10 bg-[#0a0a0a] text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="space-y-6 p-5">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-white/45">
                <span>Retention Lab</span>
                <span>App</span>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/40">Signed in as</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{username}</p>
                <p className="mt-3 text-sm leading-6 text-white/60">실무형 CRM 시뮬레이터의 각 사용 영역을 분리된 작업 구조로 탐색할 수 있습니다.</p>
              </div>
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={`w-full rounded-[1.3rem] border px-4 py-3 text-left transition ${
                        active
                          ? "border-[#10af29]/55 bg-[#10af29]/10 shadow-[0_0_0_1px_rgba(16,175,41,0.12)]"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-2 ${active ? "bg-[#10af29] text-white" : "bg-white/8 text-white/70"}`}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="mt-1 text-xs leading-5 text-white/50">{item.short}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                {toggleTheme && (
                  <button
                    onClick={toggleTheme}
                    className="flex flex-1 items-center gap-2 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.06]"
                  >
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {theme === "dark" ? "라이트 모드" : "다크 모드"}
                  </button>
                )}
              </div>
              <div className="rounded-[1.35rem] border border-[#10af29]/22 bg-[#10af29]/10 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9bf5ad]">계정 제어</p>
                <Button
                  variant="outline"
                  className="mt-3 w-full rounded-full border-[#10af29]/30 bg-transparent text-[#9bf5ad] hover:bg-[#10af29]/8 hover:text-[#9bf5ad]"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 size-4" /> 로그아웃
                </Button>
              </div>
            </div>
          </Card>
        </aside>

        <main className="flex min-h-[calc(100vh-2rem)] flex-col rounded-[2rem] border border-border bg-card shadow-[0_20px_90px_rgba(0,0,0,0.07)] dark:shadow-[0_20px_90px_rgba(0,0,0,0.3)]">
          <header className="border-b border-border px-5 py-5 lg:px-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-foreground/50">{navItems.find((item) => item.href === location)?.label ?? "앱"}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {toggleTheme && (
                  <Button variant="outline" size="sm" className="rounded-full border-border" onClick={toggleTheme}>
                    {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  </Button>
                )}
                <div className="rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
                  현재 사용자: <span className="font-medium text-foreground">{username}</span>
                </div>
                <Button variant="outline" className="rounded-full border-border" onClick={handleLogout}>
                  <LogOut className="mr-2 size-4 text-[#10af29]" /> 로그아웃
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 px-4 py-4 lg:px-6 lg:py-6">{children}</div>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-[4.75rem] z-40 px-3 lg:hidden">
        <div className="mx-auto flex max-w-2xl justify-between">
          {toggleTheme && (
            <Button size="sm" variant="outline" className="rounded-full border-border bg-card/96 backdrop-blur" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-full border-border bg-card/96 backdrop-blur" onClick={handleLogout}>
            <LogOut className="mr-2 size-4 text-[#10af29]" /> 로그아웃
          </Button>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/96 px-3 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`rounded-2xl px-3 py-2 text-center transition ${active ? "bg-[#10af29] text-white" : "bg-muted text-muted-foreground"}`}
              >
                <Icon className="mx-auto size-4" />
                <p className="mt-1 text-[11px] font-medium">{item.label}</p>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
