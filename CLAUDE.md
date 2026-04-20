# Retention Lab — Claude Code 가이드

## 프로젝트 개요
CRM 마케터가 SQL 세그먼트 설계 + 메시지 작성 + 결과 평가를 하나의 흐름으로 반복 훈련하는 **학습 시뮬레이터**입니다.

## 기술 스택
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **UI**: Radix UI + shadcn/ui 컴포넌트 (`client/src/components/ui/`)
- **상태 관리**: Zustand + localStorage persist (`client/src/storage/useRetentionLabStore.ts`)
- **SQL 실행**: AlaSQL (브라우저 인메모리) (`client/src/features/sql-runner/browserSql.ts`)
- **서버**: Express (static serving + AI API proxy) (`server/index.ts`)
- **AI**: Google Gemini Flash (무료 티어, `/api/ai-evaluate` 엔드포인트)
- **라우터**: Wouter

## 디렉토리 구조
```
client/src/
  ai/             aiCoach.ts — Gemini 프롬프트 빌더 + API 호출
  components/
    app/          AppChrome.tsx (레이아웃), MissionWorkspace.tsx (핵심 워크스페이스)
    ui/           shadcn 컴포넌트들 (수정 금지)
  features/
    message-evaluation/  규칙 기반 메시지 채점
    sql-evaluation/      규칙 기반 SQL 채점
    sql-runner/          AlaSQL 실행 래퍼
    scoring/             buildEvaluation.ts — SQL+메시지 점수 통합
  game-engine/
    scenarios.ts  미션 시나리오 생성 (4 챕터 × 여러 템플릿)
  mock-data/
    factories.ts  인메모리 웨어하우스 데이터 생성 (100명 고객, 주문/세션 등)
  pages/          Landing, AppHome, Chapters, Play, Profile, NotFound
  shared/types/   domain.ts — 핵심 타입 정의
  storage/        useRetentionLabStore.ts — 플레이어 진행 상황 영속화
server/
  index.ts  Express 서버 (정적 파일 + /api/ai-evaluate)
```

## 개발 실행
```bash
# Vite 프론트엔드 (포트 3000)
pnpm dev

# AI 기능을 위한 Express 서버 (포트 4000, Vite가 /api/ 프록시)
pnpm dev:server

# .env 파일 생성 후 Gemini API 키 입력
cp .env.example .env
```

## 핵심 도메인 개념
- **Warehouse**: AlaSQL이 쿼리할 인메모리 테이블 집합 (customers, orders, sessions, carts, message_logs, ...)
- **CampaignScenario**: 미션 단위. chapter(난이도), requiredRules, excludedRules, bonusRules 포함
- **EvaluationResult**: 규칙 기반 채점 결과. totalScore, breakdown(5개 항목), aiReady(AI 프롬프트)
- **PlayerProgress**: Zustand persist로 localStorage에 저장. 티어, 누적 점수, 기록, 업적

## 채점 구조
| 항목 | 가중치 | 담당 모듈 |
|---|---|---|
| SQL 정확도 | 27% | evaluateSql.ts |
| 세그먼트 적합도 | 25% | evaluateSql.ts |
| 발송 전략 | 18% | evaluateSql.ts |
| 메시지 품질 | 18% | evaluateMessage.ts |
| 채널 적합도 | 12% | evaluateMessage.ts |

## AI 코치 흐름
1. `buildEvaluation()` → `aiReady.prompt` 생성 (buildAiCoachPrompt)
2. 리포트 탭에서 사용자가 "AI 코치 피드백 받기" 클릭
3. `requestAiCoachFeedback()` → POST `/api/ai-evaluate` (서버)
4. 서버 → Gemini Flash API 호출 → JSON 응답 파싱
5. `AiCoachResponse` (summary, strengths, weaknesses, suggestions, score_adjustment)

## 컬러 시스템
- 포인트: `#10af29` (녹색), 다크: `#111` / `#0a0a0a`
- 배경: `#f7f7f4` (warm off-white)
- 상태 텍스트: `text-black/62`, `text-white/66` 등 투명도 사용

## 주의사항
- `client/src/components/ui/` 폴더는 shadcn 자동 생성 파일 — 직접 수정하지 않음
- AlaSQL은 브라우저에서 실행되므로 서버 DB 없음. 모든 데이터는 `mock-data/factories.ts`
- `shared/const.ts`와 `client/src/const.ts` 두 곳에 상수 분리됨 (공유 vs 클라이언트 전용)
- `.env` 파일은 절대 커밋하지 않을 것 (`.gitignore` 확인)
