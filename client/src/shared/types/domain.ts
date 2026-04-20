export type ChapterKey = "foundation" | "practical" | "advanced" | "expert";
export type CampaignChannel = "app_push" | "alimtalk" | "friend_message";
export type CampaignType =
  | "welcome"
  | "first_purchase"
  | "repurchase"
  | "cart_recovery"
  | "winback"
  | "vip_offer"
  | "seasonal"
  | "interest_retargeting"
  | "app_reengagement"
  | "reactivation";

export interface Customer {
  customer_id: number;
  customer_name: string;
  gender: "F" | "M" | "U";
  age: number;
  age_group: string;
  signup_date: string;
  city: string;
  membership_grade: "BRONZE" | "SILVER" | "GOLD" | "VIP";
  app_installed: 0 | 1;
  push_opt_in: 0 | 1;
  kakao_opt_in: 0 | 1;
  marketing_opt_in: 0 | 1;
  dormant_status: 0 | 1;
  last_order_date: string | null;
  days_since_last_order: number | null;
  total_order_count: number;
  total_spent: number;
}

export interface SessionRow {
  customer_id: number;
  session_token: string;
  last_session_at: string;
  session_count_7d: number;
  session_count_30d: number;
  avg_session_duration_sec: number;
  os_type: "iOS" | "Android" | "Web";
  app_version: string;
}

export interface OrderRow {
  order_id: number;
  customer_id: number;
  product_id: number;
  category_id: number;
  category_name: string;
  ordered_at: string;
  order_amount: number;
  quantity: number;
  order_status: "paid" | "completed" | "cancelled";
}

export interface CartRow {
  cart_id: number;
  customer_id: number;
  product_id: number;
  added_at: string;
  quantity: number;
  cart_status: "abandoned" | "converted" | "active";
}

export interface MessageLogRow {
  log_id: number;
  customer_id: number;
  channel: CampaignChannel;
  campaign_type: CampaignType;
  sent_at: string;
  clicked: 0 | 1;
  converted: 0 | 1;
}

export interface ProductRow {
  product_id: number;
  product_name: string;
  brand_name: string;
  category_id: number;
  category_name: string;
  price: number;
  target_gender: "F" | "M" | "U";
  target_age_min: number;
  target_age_max: number;
  tags: string;
  repurchase_cycle_days: number;
}

export interface CustomerCategoryInterestRow {
  customer_id: number;
  category_id: number;
  category_name: string;
  interest_score: number;
  last_viewed_at: string;
  last_clicked_at: string;
}

export interface CampaignHistoryRow {
  campaign_id: number;
  customer_id: number;
  campaign_type: CampaignType;
  channel: CampaignChannel;
  sent_at: string;
  clicked: 0 | 1;
  converted: 0 | 1;
  revenue_generated: number;
}

export interface CouponEligibilityRow {
  customer_id: number;
  coupon_code: string;
  discount_type: "amount" | "percent";
  discount_value: number;
  valid_until: string;
  used: 0 | 1;
}

export interface WishlistEventRow {
  wishlist_id: number;
  customer_id: number;
  product_id: number;
  added_at: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  brandTone: string;
  toneGuide: string[];
  priceBand: string;
  kpiHint: string;
}

export interface MissionRule {
  label: string;
  sqlHint: string;
  keywords: string[];
}

export interface CampaignScenario {
  id: string;
  chapter: ChapterKey;
  title: string;
  campaignType: CampaignType;
  companyId: string;
  productId: number;
  channel: CampaignChannel;
  objective: string;
  requiredRules: MissionRule[];
  excludedRules: MissionRule[];
  bonusRules: MissionRule[];
  briefing: string;
  kpiHint: string;
  difficulty: number;
  rewardMultiplier: number;
}

export interface Warehouse {
  companies: CompanyProfile[];
  customers: Customer[];
  sessions: SessionRow[];
  orders: OrderRow[];
  carts: CartRow[];
  message_logs: MessageLogRow[];
  product_catalog: ProductRow[];
  customer_category_interest: CustomerCategoryInterestRow[];
  campaign_history: CampaignHistoryRow[];
  coupon_eligibility: CouponEligibilityRow[];
  wishlist_events: WishlistEventRow[];
}

export interface SqlRunResult {
  ok: boolean;
  rows: Record<string, unknown>[];
  rowCount: number;
  columns: string[];
  error?: string;
}

export interface EvaluationBreakdown {
  sqlAccuracy: number;
  segmentFit: number;
  sendingStrategy: number;
  messageQuality: number;
  channelFit: number;
}

export interface EvaluationFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface EvaluationResult {
  totalScore: number;
  grade: "매우 적절" | "적절" | "부분적으로 적절" | "실무 위험 존재" | "비효율적";
  breakdown: EvaluationBreakdown;
  sql: EvaluationFeedback & {
    matchedRequired: string[];
    missedRequired: string[];
    excludedRisk: string[];
    audienceFit: string;
    audienceEstimate: number;
    overSendRisk: "낮음" | "보통" | "높음";
  };
  message: EvaluationFeedback & {
    channelAdvice: string;
    suggestedRewrite: string;
  };
  aiReady: {
    prompt: string;
    schema: Record<string, unknown>;
  };
}

export interface PlayerRunRecord {
  missionId: string;
  scenarioTitle: string;
  chapter: ChapterKey;
  channel: CampaignChannel;
  score: number;
  playedAt: string;
  weaknessTags: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface PlayerProgress {
  totalScore: number;
  tier: string;
  xp: number;
  streak: number;
  highestScore: number;
  chapterProgress: Record<ChapterKey, number>;
  records: PlayerRunRecord[];
  achievements: Achievement[];
  lastMissionId?: string;
}

export interface MissionWorkspace {
  scenario: CampaignScenario;
  sql: string;
  sqlResult?: SqlRunResult;
  message: {
    title: string;
    body: string;
    cta: string;
    benefit: string;
  };
  evaluation?: EvaluationResult;
}
