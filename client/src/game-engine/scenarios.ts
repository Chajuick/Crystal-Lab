import { createWarehouse } from "@/mock-data/factories";
import type {
  CampaignChannel,
  CampaignScenario,
  CampaignType,
  ChapterKey,
  CompanyProfile,
  MissionRule,
  ProductRow,
  Warehouse,
} from "@/shared/types/domain";

const warehouse = createWarehouse();

export const chapters: { key: ChapterKey; label: string; description: string; bonus: string; minScore: number }[] = [
  {
    key: "foundation",
    label: "입문",
    description: "기본 수신 동의, 최근 접속, 단순 WHERE를 활용하는 기초 세그먼트 훈련입니다.",
    bonus: "정확한 필수 조건 반영 시 안정적 기본 점수",
    minScore: 0,
  },
  {
    key: "practical",
    label: "실무 기초",
    description: "JOIN, 최근 구매 여부, 발송 제외 조건을 함께 다루는 실무형 미션입니다.",
    bonus: "발송 피로도 통제 시 추가 보너스",
    minScore: 800,
  },
  {
    key: "advanced",
    label: "응용",
    description: "장바구니, 관심도, 채널 차등 발송을 다루는 응용 미션입니다.",
    bonus: "타겟 정밀도와 카피 품질 동시 달성 시 보너스",
    minScore: 2200,
  },
  {
    key: "expert",
    label: "고급",
    description: "복합 제외 조건, 구매 주기, 전략적 우선순위를 조합하는 고난도 미션입니다.",
    bonus: "과발송 없이 높은 전환 가능성을 확보하면 대형 보너스",
    minScore: 4200,
  },
];

const templatePool: Array<{
  chapter: ChapterKey;
  title: string;
  objective: string;
  campaignType: CampaignType;
  channel: CampaignChannel;
  productMatcher: (product: ProductRow) => boolean;
  requiredRules: MissionRule[];
  excludedRules: MissionRule[];
  bonusRules: MissionRule[];
  briefingTemplate: (company: CompanyProfile, product: ProductRow) => string;
  difficulty: number;
  rewardMultiplier: number;
}> = [
  {
    chapter: "foundation",
    title: "최근 접속 웰컴 전환 캠페인",
    objective: "최근 14일 내 접속했고 앱 설치 및 푸시 수신 동의를 유지하며 최근 30일 구매 이력이 없는 고객에게 첫 구매를 유도하세요.",
    campaignType: "first_purchase",
    channel: "app_push",
    productMatcher: (product) => ["트렌치코트", "세럼", "조명", "케이블"].includes(product.category_name),
    requiredRules: [
      { label: "최근 14일 내 접속 고객", sqlHint: "sessions.last_session_at 기준 최근 14일 필터", keywords: ["sessions", "last_session_at"] },
      { label: "앱 설치 고객", sqlHint: "customers.app_installed = 1", keywords: ["app_installed"] },
      { label: "푸시 수신 동의 고객", sqlHint: "customers.push_opt_in = 1", keywords: ["push_opt_in"] },
    ],
    excludedRules: [{ label: "최근 30일 구매 고객 제외", sqlHint: "orders 최근 구매 이력 제외", keywords: ["orders", "ordered_at"] }],
    bonusRules: [{ label: "최근 3일 메시지 발송 이력 제외", sqlHint: "message_logs.sent_at 조건", keywords: ["message_logs", "sent_at"] }],
    briefingTemplate: (company, product) => `${company.industry} 브랜드 '${company.name}'에서 ${product.product_name} 첫 구매 전환 캠페인을 요청했습니다. 최근 14일 내 접속했고 앱이 설치되어 있으며 푸시 수신에 동의한 고객 중, 최근 30일 동안 구매 이력이 없는 고객을 대상으로 앱푸시를 발송해야 합니다.`,
    difficulty: 1,
    rewardMultiplier: 1,
  },
  // ── Foundation Stage 2 (seed=1 → index 1) ────────────────────────────
  {
    chapter: "foundation",
    title: "앱 설치 고객 첫 구매 유도",
    objective: "앱이 설치돼 있고 푸시 수신에 동의한 활성 고객(휴면 아님)에게 첫 구매를 유도하는 앱푸시를 발송하세요.",
    campaignType: "first_purchase",
    channel: "app_push",
    productMatcher: (product) => ["세럼", "크림", "비타민", "조명"].includes(product.category_name),
    requiredRules: [
      { label: "앱 설치 고객", sqlHint: "customers.app_installed = 1", keywords: ["app_installed"] },
      { label: "푸시 수신 동의 고객", sqlHint: "customers.push_opt_in = 1", keywords: ["push_opt_in"] },
      { label: "활성 고객 (휴면 아님)", sqlHint: "customers.dormant_status = 0", keywords: ["dormant_status"] },
    ],
    excludedRules: [{ label: "최근 7일 발송 이력 고객 제외", sqlHint: "message_logs.sent_at 기준 최근 7일", keywords: ["message_logs", "sent_at"] }],
    bonusRules: [],
    briefingTemplate: (company, product) => `${company.name}에서 ${product.product_name} 첫 구매 유도 앱푸시 캠페인을 요청했습니다. 앱이 설치되어 있고 푸시 수신 동의를 유지하며 휴면이 아닌 활성 고객만 대상으로 하고, 최근 7일 내 발송 이력이 있는 고객은 피로도 관리 차원에서 제외해야 합니다.`,
    difficulty: 1,
    rewardMultiplier: 1,
  },
  // ── Foundation Stage 3 (seed=2 → index 2) ────────────────────────────
  {
    chapter: "foundation",
    title: "활성 고객 알림톡 혜택 안내",
    objective: "카카오 수신 동의를 유지한 활성 고객에게 알림톡으로 혜택을 안내하세요. 최근 발송 고객은 피로도 관리를 위해 제외합니다.",
    campaignType: "reactivation",
    channel: "alimtalk",
    productMatcher: (product) => ["크림", "세럼", "프로바이오틱스", "비타민"].includes(product.category_name),
    requiredRules: [
      { label: "카카오 수신 동의 고객", sqlHint: "customers.kakao_opt_in = 1", keywords: ["kakao_opt_in"] },
      { label: "활성 고객 (휴면 아님)", sqlHint: "customers.dormant_status = 0", keywords: ["dormant_status"] },
    ],
    excludedRules: [{ label: "최근 5일 발송 이력 고객 제외", sqlHint: "message_logs.sent_at 기준 최근 5일", keywords: ["message_logs", "sent_at"] }],
    bonusRules: [],
    briefingTemplate: (company, product) => `${company.name}에서 ${product.product_name} 기본 혜택 안내 알림톡 캠페인을 요청했습니다. 카카오 수신 동의를 유지한 활성 고객에게 발송하며, 최근 5일 이내 메시지를 받은 고객은 제외해야 합니다.`,
    difficulty: 1,
    rewardMultiplier: 1,
  },
  // ── Foundation Stage 4 (seed=3 → index 3) ────────────────────────────
  {
    chapter: "foundation",
    title: "우수 등급 친구톡 프로모션",
    objective: "GOLD 또는 VIP 등급이면서 카카오 수신 동의를 유지한 고객에게 친구톡으로 프로모션을 안내하세요.",
    campaignType: "vip_offer",
    channel: "friend_message",
    productMatcher: (product) => product.price > 30000,
    requiredRules: [
      { label: "GOLD 또는 VIP 등급 고객", sqlHint: "customers.membership_grade IN ('GOLD','VIP')", keywords: ["membership_grade"] },
      { label: "카카오 수신 동의 고객", sqlHint: "customers.kakao_opt_in = 1", keywords: ["kakao_opt_in"] },
    ],
    excludedRules: [{ label: "최근 5일 발송 이력 고객 제외", sqlHint: "message_logs.sent_at 기준 최근 5일", keywords: ["message_logs", "sent_at"] }],
    bonusRules: [],
    briefingTemplate: (company, product) => `${company.name}에서 상위 등급 고객을 위한 ${product.product_name} 친구톡 프로모션을 요청했습니다. GOLD 또는 VIP 등급이면서 카카오 수신 동의를 유지한 고객만 선별하고, 최근 5일 이내 메시지를 받은 고객은 제외해야 합니다.`,
    difficulty: 1,
    rewardMultiplier: 1,
  },
  {
    chapter: "practical",
    title: "재구매 리마인드 세그먼트",
    objective: "해당 카테고리를 과거에 구매했고 마지막 구매가 최근 35~90일 사이이며 카카오 수신 동의를 유지한 고객 중 최근 7일 발송 이력과 휴면 상태를 제외해 재구매를 유도하세요.",
    campaignType: "repurchase",
    channel: "friend_message",
    productMatcher: (product) => ["세럼", "크림", "프로바이오틱스", "비타민"].includes(product.category_name),
    requiredRules: [
      { label: "해당 카테고리 과거 구매 고객", sqlHint: "orders.category_name 기준 구매 이력", keywords: ["orders", "category_name"] },
      { label: "최근 35~90일 내 마지막 구매", sqlHint: "MAX(ordered_at) 또는 날짜 조건", keywords: ["max", "ordered_at"] },
      { label: "카카오 수신 동의 고객", sqlHint: "customers.kakao_opt_in = 1", keywords: ["kakao_opt_in"] },
    ],
    excludedRules: [
      { label: "최근 7일 발송 이력 제외", sqlHint: "message_logs.sent_at 기준 제외", keywords: ["message_logs", "sent_at"] },
      { label: "휴면 상태 심한 고객 제외", sqlHint: "customers.dormant_status 조합 확인", keywords: ["dormant_status"] },
    ],
    bonusRules: [{ label: "쿠폰 사용 가능 고객 우선 고려", sqlHint: "coupon_eligibility.used = 0", keywords: ["coupon_eligibility", "used"] }],
    briefingTemplate: (company, product) => `${company.name}에서 ${product.category_name} 재구매 주기 고객 리마인드 캠페인을 의뢰했습니다. 해당 카테고리 구매 이력이 있고 마지막 구매가 최근 35일 이상 90일 이하인 고객 중 카카오 수신 동의 고객만 선별해야 하며, 최근 7일 발송 이력이 있거나 휴면 상태가 강한 고객은 제외해야 합니다.`,
    difficulty: 2,
    rewardMultiplier: 1.25,
  },
  {
    chapter: "advanced",
    title: "장바구니 이탈 회수 미션",
    objective: "최근 7일 내 해당 상품을 장바구니에 담았다가 abandoned 상태로 남겼고 아직 그 상품을 구매하지 않았으며 마케팅 수신이 가능한 고객을 대상으로 최근 3일 동일 채널 발송자를 제외해 회수하세요.",
    campaignType: "cart_recovery",
    channel: "alimtalk",
    productMatcher: (product) => ["트렌치코트", "셔츠", "충전기", "조명", "디퓨저"].includes(product.category_name),
    requiredRules: [
      { label: "장바구니 abandoned 상태", sqlHint: "carts.cart_status = 'abandoned'", keywords: ["carts", "cart_status"] },
      { label: "최근 7일 내 담기 이력", sqlHint: "carts.added_at 조건", keywords: ["added_at"] },
      { label: "해당 상품 미구매 고객", sqlHint: "orders.product_id 제외", keywords: ["product_id", "orders"] },
    ],
    excludedRules: [
      { label: "최근 3일 동일 채널 발송 고객 제외", sqlHint: "message_logs.channel, sent_at 조합", keywords: ["channel", "sent_at"] },
      { label: "마케팅 수신 미동의 제외", sqlHint: "marketing_opt_in = 1", keywords: ["marketing_opt_in"] },
    ],
    bonusRules: [{ label: "관심 카테고리 점수 70 이상 우선", sqlHint: "customer_category_interest.interest_score", keywords: ["interest_score"] }],
    briefingTemplate: (company, product) => `${company.industry} 브랜드 '${company.name}'가 ${product.product_name} 장바구니 이탈 고객 회수를 요청했습니다. 최근 7일 안에 이 상품을 장바구니에 담은 뒤 abandoned 상태로 남겼고 아직 같은 상품을 구매하지 않은 고객만 대상으로 삼아야 하며, 마케팅 수신 미동의 고객과 최근 3일 내 동일 채널 발송 고객은 제외해야 합니다.`,
    difficulty: 3,
    rewardMultiplier: 1.5,
  },
  {
    chapter: "expert",
    title: "휴면 복귀 전략 캠페인",
    objective: "최근 30일 미접속이거나 최근 30일 세션 수가 낮고, 최근 60~180일 구매 이력이 있으며 카카오·마케팅 동의를 모두 유지한 고객만 골라 최근 발송·최근 동일 상품 구매·최근 전환 고객을 제외하세요.",
    campaignType: "winback",
    channel: "friend_message",
    productMatcher: (product) => ["비타민", "루테인", "원피스", "니트", "조명", "보조배터리"].includes(product.category_name),
    requiredRules: [
      { label: "최근 30일 미접속 또는 세션 낮음", sqlHint: "sessions.last_session_at / session_count_30d", keywords: ["session_count_30d", "last_session_at"] },
      { label: "최근 60~180일 구매 이력 보유", sqlHint: "orders 날짜 구간 필터", keywords: ["ordered_at", "orders"] },
      { label: "카카오 수신 동의 및 마케팅 동의", sqlHint: "kakao_opt_in, marketing_opt_in 조합", keywords: ["kakao_opt_in", "marketing_opt_in"] },
    ],
    excludedRules: [
      { label: "최근 5일 발송 이력 제외", sqlHint: "message_logs.sent_at", keywords: ["message_logs"] },
      { label: "최근 동일 상품 구매 고객 제외", sqlHint: "orders.product_id 제외", keywords: ["product_id"] },
      { label: "최근 전환 성공 고객 제외", sqlHint: "campaign_history.converted = 1 고려", keywords: ["campaign_history", "converted"] },
    ],
    bonusRules: [{ label: "쿠폰 미사용 고객 + 관심도 상위 고객 우선", sqlHint: "coupon_eligibility.used, interest_score", keywords: ["coupon_eligibility", "interest_score"] }],
    briefingTemplate: (company, product) => `${company.name}에서 휴면 직전 고객 복귀 캠페인을 요청했습니다. 최근 30일 동안 접속이 없거나 최근 30일 세션 수가 낮지만, 최근 60일 이상 180일 이하 구간에 구매 이력이 있고 카카오 및 마케팅 수신 동의를 모두 유지한 고객을 선별해야 합니다. 최근 5일 발송 이력이 있거나 같은 상품을 최근에 구매했거나 최근 전환 성공 이력이 있는 고객은 제외해야 합니다.`,
    difficulty: 4,
    rewardMultiplier: 1.9,
  },
  {
    chapter: "practical",
    title: "VIP 전용 혜택 선별",
    objective: "GOLD 또는 VIP 등급이면서 최근 45일 내 구매 또는 클릭 경험이 있고 카카오 수신 동의를 유지한 고객만 선별하되 최근 7일 메시지 전환 고객은 제외하세요.",
    campaignType: "vip_offer",
    channel: "friend_message",
    productMatcher: (product) => product.price > 40000,
    requiredRules: [
      { label: "membership_grade GOLD 또는 VIP", sqlHint: "customers.membership_grade 필터", keywords: ["membership_grade"] },
      { label: "최근 45일 구매 또는 클릭 경험", sqlHint: "orders / message_logs 클릭 기록 확인", keywords: ["clicked", "orders"] },
      { label: "카카오 동의 고객", sqlHint: "kakao_opt_in = 1", keywords: ["kakao_opt_in"] },
    ],
    excludedRules: [{ label: "최근 7일 메시지 전환 고객 제외", sqlHint: "campaign_history.converted = 1 고려", keywords: ["campaign_history"] }],
    bonusRules: [{ label: "평균 객단가 상위 고객 우대", sqlHint: "AVG(order_amount) 집계", keywords: ["avg", "order_amount"] }],
    briefingTemplate: (company, product) => `${company.name}가 상위 고객만을 위한 ${product.product_name} 프리뷰 혜택 캠페인을 의뢰했습니다. GOLD 또는 VIP 등급 고객 중 최근 45일 안에 구매 이력이 있거나 메시지 클릭 경험이 있고 카카오 수신 동의를 유지한 고객만 대상으로 해야 하며, 최근 7일 안에 메시지 전환이 발생한 고객은 제외해야 합니다.`,
    difficulty: 2,
    rewardMultiplier: 1.35,
  },
  {
    chapter: "advanced",
    title: "앱 재방문 촉진 캠페인",
    objective: "앱 설치와 푸시 수신 동의를 유지한 고객 중 최근 14일 기준 세션 활동이 낮은 고객을 선별하고 최근 5일 푸시 발송 고객을 제외해 재방문을 유도하세요.",
    campaignType: "app_reengagement",
    channel: "app_push",
    productMatcher: (product) => ["보조배터리", "마우스", "디퓨저", "니트"].includes(product.category_name),
    requiredRules: [
      { label: "app_installed = 1", sqlHint: "앱 설치 여부 확인", keywords: ["app_installed"] },
      { label: "최근 14일 세션 낮음", sqlHint: "session_count_7d 또는 session_count_30d", keywords: ["session_count_7d", "session_count_30d"] },
      { label: "push_opt_in = 1", sqlHint: "푸시 수신 가능 고객만", keywords: ["push_opt_in"] },
    ],
    excludedRules: [{ label: "최근 5일 푸시 발송 고객 제외", sqlHint: "message_logs channel 조건", keywords: ["message_logs", "channel"] }],
    bonusRules: [{ label: "위시리스트 보유 고객 우선", sqlHint: "wishlist_events 존재 여부", keywords: ["wishlist_events"] }],
    briefingTemplate: (company, product) => `${company.name} 앱의 재방문율이 둔화되어 ${product.product_name}를 중심으로 재활성화 푸시를 요청했습니다. 앱이 설치되어 있고 푸시 수신 동의를 유지한 고객 중 최근 14일 기준 세션 활동이 낮은 고객을 대상으로 해야 하며, 최근 5일 안에 푸시를 받은 고객은 제외해야 합니다.`,
    difficulty: 3,
    rewardMultiplier: 1.45,
  },
];

function randomFrom<T>(seed: number, list: T[]): T {
  return list[seed % list.length];
}

export function getWarehouse(): Warehouse {
  return warehouse;
}

export function generateScenario(chapter: ChapterKey, seed: number): CampaignScenario {
  const candidates = templatePool.filter((template) => template.chapter === chapter);
  const template = randomFrom(seed, candidates);
  const productCandidates = warehouse.product_catalog.filter(template.productMatcher);
  const product = randomFrom(seed * 7 + 3, productCandidates);
  const company = warehouse.companies.find((item) => item.name === product.brand_name) ?? warehouse.companies[0];

  return {
    id: `${chapter}-${seed}-${product.product_id}`,
    chapter,
    title: template.title,
    campaignType: template.campaignType,
    companyId: company.id,
    productId: product.product_id,
    channel: template.channel,
    objective: template.objective,
    requiredRules: template.requiredRules,
    excludedRules: template.excludedRules,
    bonusRules: template.bonusRules,
    briefing: template.briefingTemplate(company, product),
    kpiHint: `${company.kpiHint} 핵심 상품은 ${product.product_name}입니다.`,
    difficulty: template.difficulty,
    rewardMultiplier: template.rewardMultiplier,
  };
}

export function getCompanyById(id: string) {
  return warehouse.companies.find((company) => company.id === id) ?? warehouse.companies[0];
}

export function getProductById(productId: number) {
  return warehouse.product_catalog.find((product) => product.product_id === productId) ?? warehouse.product_catalog[0];
}

export const CHAPTER_STAGES: Record<ChapterKey, Array<{ stageNum: number; seed: number; name: string; description: string }>> = {
  foundation: [
    { stageNum: 1, seed: 1, name: "앱 설치 고객 첫 구매 유도", description: "앱 설치 + 푸시 동의 + 활성 고객, JOIN 없이 WHERE만으로 세그먼트 완성" },
    { stageNum: 2, seed: 2, name: "활성 고객 알림톡 혜택 안내", description: "카카오 동의 + 휴면 제외, 알림톡 채널의 기초 필터링" },
    { stageNum: 3, seed: 3, name: "우수 등급 친구톡 프로모션", description: "멤버십 등급 IN 조건 + 카카오 동의, 친구톡 기본 타겟팅" },
    { stageNum: 4, seed: 4, name: "첫 구매 유도 종합 세그먼트", description: "세션 JOIN + 구매 제외 조건까지, 입문 단계 종합 훈련" },
  ],
  practical: [
    { stageNum: 1, seed: 1, name: "VIP 특별 혜택 캠페인", description: "상위 등급 선별 + 클릭 이력 기반 타겟팅 실무 적용" },
    { stageNum: 2, seed: 2, name: "재구매 주기 리마인드", description: "구매 이력 JOIN + 날짜 범위 필터 + 발송 제외 조건" },
    { stageNum: 3, seed: 3, name: "클릭 경험 기반 프로모션", description: "메시지 클릭 이력과 복합 제외 조건 처리" },
    { stageNum: 4, seed: 4, name: "구매 이력 × 수신 동의 교차", description: "카테고리 구매 이력과 발송 피로도 관리 종합" },
  ],
  advanced: [
    { stageNum: 1, seed: 1, name: "앱 재방문 촉진 세그먼트", description: "세션 빈도 기반 비활성 고객 + 채널별 발송 제외" },
    { stageNum: 2, seed: 2, name: "장바구니 이탈 회수", description: "carts JOIN + 미구매 상품 NOT IN 제외 조건" },
    { stageNum: 3, seed: 3, name: "세션 저조 재활성화", description: "다중 세션 조건과 채널 발송 이력 교차 필터링" },
    { stageNum: 4, seed: 4, name: "장바구니 + 관심도 정밀 타겟", description: "이탈 조건 + 관심도 점수 결합한 고도화 세그먼트" },
  ],
  expert: [
    { stageNum: 1, seed: 1, name: "휴면 직전 복귀 캠페인", description: "접속 빈도 + 구매 주기 결합, 복합 제외 조건 설계" },
    { stageNum: 2, seed: 2, name: "구매 주기 이탈 방어", description: "60~180일 구매 이력 + 발송·전환 이력 다중 제외" },
    { stageNum: 3, seed: 3, name: "전환 이력 × 수신 동의 최적화", description: "전환 성공 이력 제외 + 카카오/마케팅 동의 교차" },
    { stageNum: 4, seed: 4, name: "쿠폰 × 관심도 고급 타겟", description: "쿠폰 미사용 + 관심도 상위 결합, 보너스 조건 종합" },
  ],
};

export function getStarterSql(scenario: CampaignScenario) {
  const channelCondition =
    scenario.channel === "app_push"
      ? "AND c.push_opt_in = 1"
      : scenario.channel === "alimtalk"
        ? "AND c.kakao_opt_in = 1"
        : "AND c.kakao_opt_in = 1";

  return `SELECT
  c.customer_id,
  c.customer_name,
  c.membership_grade,
  s.last_session_at
FROM customers c
LEFT JOIN sessions s ON c.customer_id = s.customer_id
WHERE c.marketing_opt_in = 1
  ${channelCondition}
ORDER BY s.last_session_at DESC
LIMIT 50;`;
}
