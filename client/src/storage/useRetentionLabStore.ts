import { persist } from "zustand/middleware";
import { create } from "zustand";
import type { Achievement, ChapterKey, PlayerProgress, PlayerRunRecord } from "@/shared/types/domain";

const achievementTemplates: Achievement[] = [
  { id: "first-clear", title: "첫 SQL 성공", description: "첫 결과 리포트를 완료했습니다.", unlocked: false },
  { id: "score-90", title: "90점 돌파", description: "90점 이상 리포트를 달성했습니다.", unlocked: false },
  { id: "streak-5", title: "5연속 클리어", description: "연속 성공 보너스를 쌓았습니다.", unlocked: false },
  { id: "safe-send-10", title: "과발송 없이 10회", description: "낮은 리스크로 10회 플레이했습니다.", unlocked: false },
  { id: "cart-master", title: "장바구니 캠페인 마스터", description: "장바구니 미션에서 높은 점수를 기록했습니다.", unlocked: false },
  { id: "vip-expert", title: "VIP 타겟팅 전문가", description: "VIP 캠페인을 세밀하게 운영했습니다.", unlocked: false },
];

const tierTable = [
  { min: 0, name: "새싹 마케터" },
  { min: 800, name: "CRM 어시스턴트" },
  { min: 1800, name: "세그먼트 플래너" },
  { min: 3200, name: "CRM 실무자" },
  { min: 5200, name: "리텐션 스페셜리스트" },
  { min: 7800, name: "퍼포먼스 플래너" },
  { min: 10800, name: "CRM 전략가" },
  { min: 14500, name: "캠페인 디렉터" },
];

function getTier(totalScore: number) {
  return [...tierTable].reverse().find((tier) => totalScore >= tier.min)?.name ?? tierTable[0].name;
}

function createInitialProgress(): PlayerProgress {
  return {
    totalScore: 0,
    tier: tierTable[0].name,
    xp: 0,
    streak: 0,
    highestScore: 0,
    chapterProgress: {
      foundation: 0,
      practical: 0,
      advanced: 0,
      expert: 0,
    },
    records: [],
    achievements: achievementTemplates,
  };
}

function unlock(progress: PlayerProgress, id: string) {
  return progress.achievements.map((item) => (item.id === id ? { ...item, unlocked: true } : item));
}

export type PlayMode = "freeplay" | "chapter" | "daily";

interface RetentionLabState {
  progress: PlayerProgress;
  missionSeed: number;
  selectedChapter: ChapterKey;
  playMode: PlayMode;
  setSelectedChapter: (chapter: ChapterKey) => void;
  setMissionSeed: (seed: number) => void;
  prepareMission: (chapter: ChapterKey, seed?: number, mode?: PlayMode) => void;
  rollMission: () => void;
  saveRun: (record: PlayerRunRecord) => void;
  resetProgress: () => void;
}

export const useRetentionLabStore = create<RetentionLabState>()(
  persist(
    (set) => ({
      progress: createInitialProgress(),
      missionSeed: 7,
      selectedChapter: "foundation",
      playMode: "freeplay",
      setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),
      setMissionSeed: (seed) => set({ missionSeed: seed }),
      prepareMission: (chapter, seed, mode = "freeplay") =>
        set((state) => ({
          selectedChapter: chapter,
          missionSeed: seed ?? state.missionSeed,
          playMode: mode,
        })),
      rollMission: () => set((state) => ({ missionSeed: state.missionSeed + 1 })),
      saveRun: (record) =>
        set((state) => {
          const totalScore = state.progress.totalScore + record.score;
          const nextProgress: PlayerProgress = {
            ...state.progress,
            totalScore,
            tier: getTier(totalScore),
            xp: state.progress.xp + Math.max(40, Math.round(record.score * 0.8)),
            streak: record.score >= 70 ? state.progress.streak + 1 : 0,
            highestScore: Math.max(state.progress.highestScore, record.score),
            chapterProgress: {
              ...state.progress.chapterProgress,
              [record.chapter]: Math.min(100, state.progress.chapterProgress[record.chapter] + (record.score >= 80 ? 18 : 10)),
            },
            records: [record, ...state.progress.records].slice(0, 24),
            lastMissionId: record.missionId,
            achievements: [...state.progress.achievements],
          };

          if (nextProgress.records.length >= 1) {
            nextProgress.achievements = unlock(nextProgress, "first-clear");
          }
          if (record.score >= 90) {
            nextProgress.achievements = unlock(nextProgress, "score-90");
          }
          if (nextProgress.streak >= 5) {
            nextProgress.achievements = unlock(nextProgress, "streak-5");
          }
          if (nextProgress.records.filter((item) => item.score >= 78).length >= 10) {
            nextProgress.achievements = unlock(nextProgress, "safe-send-10");
          }
          if (record.scenarioTitle.includes("장바구니") && record.score >= 85) {
            nextProgress.achievements = unlock(nextProgress, "cart-master");
          }
          if (record.scenarioTitle.includes("VIP") && record.score >= 85) {
            nextProgress.achievements = unlock(nextProgress, "vip-expert");
          }

          return { progress: nextProgress };
        }),
      resetProgress: () => set({ progress: createInitialProgress(), missionSeed: 7, selectedChapter: "foundation" }),
    }),
    {
      name: "retention-lab-progress",
    },
  ),
);
