import type {
  CampaignChannel,
  CampaignHistoryRow,
  CartRow,
  CompanyProfile,
  CouponEligibilityRow,
  Customer,
  CustomerCategoryInterestRow,
  MessageLogRow,
  OrderRow,
  ProductRow,
  SessionRow,
  Warehouse,
  WishlistEventRow,
} from "@/shared/types/domain";

const BASE_DATE = new Date("2026-04-20T09:00:00");

const industries = [
  {
    id: "lunette",
    name: "LUNETTE",
    industry: "여성 패션",
    brandTone: "세련되고 담백한 시즌 제안형",
    toneGuide: ["간결한 제안", "가격보다 스타일 가치 강조", "과한 특수문자 금지"],
    priceBand: "중가",
    kpiHint: "최근 접속 고객의 재방문율과 재구매율을 함께 보세요.",
    categories: ["트렌치코트", "원피스", "니트", "블라우스", "슈즈", "백"],
    gender: "F" as const,
  },
  {
    id: "attic-man",
    name: "ATTIC MAN",
    industry: "남성 패션",
    brandTone: "단정하고 실용적인 추천형",
    toneGuide: ["불필요한 수식 자제", "핏과 활용도 강조", "짧은 CTA"],
    priceBand: "중고가",
    kpiHint: "최근 30일 접속 빈도와 카테고리 관심도를 함께 보세요.",
    categories: ["셔츠", "슬랙스", "재킷", "스니커즈", "벨트", "니트"],
    gender: "M" as const,
  },
  {
    id: "dewy-lab",
    name: "DEWY LAB",
    industry: "뷰티",
    brandTone: "깨끗하고 신뢰감 있는 효능 안내형",
    toneGuide: ["과장 표현 금지", "사용 장면 제안", "혜택은 한 줄로"],
    priceBand: "중가",
    kpiHint: "최근 구매 주기와 장바구니 이탈 신호를 함께 보세요.",
    categories: ["세럼", "크림", "토너", "선케어", "클렌저", "마스크팩"],
    gender: "F" as const,
  },
  {
    id: "vital-origin",
    name: "VITAL ORIGIN",
    industry: "건강식품",
    brandTone: "신뢰 중심의 루틴 관리형",
    toneGuide: ["건강 효능 과장 금지", "복용 루틴 제안", "안내성 문장 유지"],
    priceBand: "중고가",
    kpiHint: "재구매 주기와 휴면 기간을 같이 보세요.",
    categories: ["프로바이오틱스", "비타민", "오메가3", "단백질", "콜라겐", "루테인"],
    gender: "U" as const,
  },
  {
    id: "haus-note",
    name: "HAUS NOTE",
    industry: "리빙/잡화",
    brandTone: "차분하고 라이프스타일 제안형",
    toneGuide: ["제품 장면 중심", "톤 다운된 CTA", "할인보다 큐레이션"],
    priceBand: "중가",
    kpiHint: "카테고리 관심도와 위시리스트 데이터를 함께 보세요.",
    categories: ["수납", "패브릭", "주방", "조명", "디퓨저", "욕실"],
    gender: "U" as const,
  },
  {
    id: "signal-deck",
    name: "SIGNAL DECK",
    industry: "디지털 액세서리",
    brandTone: "빠르고 선명한 성능 강조형",
    toneGuide: ["명확한 혜택", "짧은 리듬", "즉시 행동 유도"],
    priceBand: "중가",
    kpiHint: "앱 활성 유저와 장바구니 이탈자를 우선 확인하세요.",
    categories: ["케이블", "충전기", "보조배터리", "키보드", "마우스", "스탠드"],
    gender: "U" as const,
  },
];

const cities = ["서울", "성수", "분당", "수원", "대전", "광주", "부산", "대구"];
const firstNames = ["민서", "서윤", "도윤", "하준", "유진", "수아", "지후", "지민", "예린", "현우", "지아", "윤호"];
const lastNames = ["김", "이", "박", "최", "정", "한", "조", "윤", "임", "장"];
const grades: Customer["membership_grade"][] = ["BRONZE", "SILVER", "GOLD", "VIP"];
const channels: CampaignChannel[] = ["app_push", "alimtalk", "friend_message"];

function rng(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pick<T>(rand: () => number, list: T[]) {
  return list[Math.floor(rand() * list.length)];
}

function offsetDate(daysBack: number, minuteOffset = 0) {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() - daysBack);
  date.setMinutes(date.getMinutes() - minuteOffset);
  return date.toISOString();
}

function ageGroup(age: number) {
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  return "45+";
}

function createCompanies(): CompanyProfile[] {
  return industries.map(({ categories, gender, ...company }) => company);
}

function createProducts(): ProductRow[] {
  let productId = 1;
  return industries.flatMap((industry, industryIndex) =>
    industry.categories.flatMap((category, categoryIndex) => {
      return [0, 1].map((variant) => ({
        product_id: productId++,
        product_name: `${category} ${variant === 0 ? "에센셜" : "시그니처"}`,
        brand_name: industry.name,
        category_id: industryIndex * 10 + categoryIndex + 1,
        category_name: category,
        price: 19000 + industryIndex * 7000 + categoryIndex * 5000 + variant * 8000,
        target_gender: industry.gender,
        target_age_min: industry.id === "vital-origin" ? 30 : industry.id === "signal-deck" ? 20 : 24,
        target_age_max: industry.id === "vital-origin" ? 59 : 44,
        tags: [industry.industry, category, variant === 0 ? "베이직" : "프로모션"].join(", "),
        repurchase_cycle_days:
          industry.id === "dewy-lab" ? 45 : industry.id === "vital-origin" ? 60 : industry.id === "signal-deck" ? 120 : 90,
      }));
    }),
  );
}

function createCustomers(total = 132): Customer[] {
  const rand = rng(27);
  return Array.from({ length: total }, (_, index) => {
    const age = 21 + Math.floor(rand() * 31) + (index % 9 === 0 ? 10 : 0);
    const grade = grades[Math.min(grades.length - 1, Math.floor(rand() * grades.length + index / 44))];
    const dormant = rand() > 0.83 ? 1 : 0;
    const appInstalled = rand() > 0.15 ? 1 : 0;
    const pushOptIn = appInstalled && rand() > 0.18 ? 1 : 0;
    const kakaoOptIn = rand() > 0.22 ? 1 : 0;
    return {
      customer_id: index + 1,
      customer_name: `${pick(rand, lastNames)}${pick(rand, firstNames)}`,
      gender: rand() > 0.49 ? "F" : rand() > 0.1 ? "M" : "U",
      age,
      age_group: ageGroup(age),
      signup_date: offsetDate(40 + Math.floor(rand() * 680)),
      city: pick(rand, cities),
      membership_grade: grade,
      app_installed: appInstalled as 0 | 1,
      push_opt_in: pushOptIn as 0 | 1,
      kakao_opt_in: kakaoOptIn as 0 | 1,
      marketing_opt_in: (pushOptIn || kakaoOptIn || rand() > 0.35 ? 1 : 0) as 0 | 1,
      dormant_status: dormant as 0 | 1,
    };
  });
}

function createSessions(customers: Customer[]): SessionRow[] {
  const rand = rng(33);
  return customers.map((customer) => {
    const dormantPenalty = customer.dormant_status ? 18 : 0;
    const lastDays = Math.max(1, Math.floor(rand() * 35) + dormantPenalty);
    const activeBias = customer.app_installed ? 1.35 : 0.75;
    return {
      customer_id: customer.customer_id,
      session_token: `sess_${customer.customer_id}_${Math.floor(rand() * 99999)}`,
      last_session_at: offsetDate(lastDays, Math.floor(rand() * 720)),
      session_count_7d: Math.max(0, Math.floor(rand() * 9 * activeBias) - dormantPenalty / 10),
      session_count_30d: Math.max(1, Math.floor(rand() * 24 * activeBias) + (customer.membership_grade === "VIP" ? 4 : 0)),
      avg_session_duration_sec: 95 + Math.floor(rand() * 480),
      os_type: customer.app_installed ? (rand() > 0.54 ? "iOS" : "Android") : "Web",
      app_version: customer.app_installed ? `5.${1 + Math.floor(rand() * 4)}.${Math.floor(rand() * 9)}` : "web",
    };
  });
}

function createOrders(customers: Customer[], products: ProductRow[]): OrderRow[] {
  const rand = rng(51);
  const rows: OrderRow[] = [];
  let orderId = 1;
  customers.forEach((customer) => {
    const orderCount = Math.floor(rand() * 6) + (customer.membership_grade === "VIP" ? 4 : 0);
    for (let i = 0; i < orderCount; i += 1) {
      const product = pick(rand, products);
      const daysBack = Math.floor(rand() * 240) + i * 8;
      rows.push({
        order_id: orderId++,
        customer_id: customer.customer_id,
        product_id: product.product_id,
        category_id: product.category_id,
        category_name: product.category_name,
        ordered_at: offsetDate(daysBack, Math.floor(rand() * 1200)),
        order_amount: product.price + Math.floor(rand() * 20000),
        quantity: 1 + Math.floor(rand() * 3),
        order_status: rand() > 0.08 ? (rand() > 0.15 ? "completed" : "paid") : "cancelled",
      });
    }
  });
  return rows.sort((a, b) => (a.ordered_at > b.ordered_at ? -1 : 1));
}

function createCarts(customers: Customer[], products: ProductRow[]): CartRow[] {
  const rand = rng(71);
  let cartId = 1;
  return customers.flatMap((customer) => {
    const count = Math.floor(rand() * 3) + 1;
    return Array.from({ length: count }, () => {
      const product = pick(rand, products);
      const roll = rand();
      return {
        cart_id: cartId++,
        customer_id: customer.customer_id,
        product_id: product.product_id,
        added_at: offsetDate(Math.floor(rand() * 40), Math.floor(rand() * 900)),
        quantity: 1 + Math.floor(rand() * 2),
        cart_status: roll > 0.58 ? "abandoned" : roll > 0.24 ? "converted" : "active",
      };
    });
  });
}

function createMessageLogs(customers: Customer[]): MessageLogRow[] {
  const rand = rng(89);
  const campaignTypes = ["welcome", "first_purchase", "repurchase", "cart_recovery", "winback", "vip_offer", "seasonal", "interest_retargeting", "app_reengagement", "reactivation"] as const;
  let logId = 1;
  return customers.flatMap((customer) => {
    const base = Math.floor(rand() * 5) + (customer.membership_grade === "VIP" ? 3 : 1);
    return Array.from({ length: base }, (_, index) => ({
      log_id: logId++,
      customer_id: customer.customer_id,
      channel: pick(rand, channels),
      campaign_type: pick(rand, [...campaignTypes]),
      sent_at: offsetDate(Math.floor(rand() * 65) + index * 2, Math.floor(rand() * 1000)),
      clicked: (rand() > 0.58 ? 1 : 0) as 0 | 1,
      converted: (rand() > 0.81 ? 1 : 0) as 0 | 1,
    }));
  });
}

function createInterests(customers: Customer[], products: ProductRow[]): CustomerCategoryInterestRow[] {
  const rand = rng(103);
  const categories = Array.from(
    new Map(products.map((product) => [product.category_id, { category_id: product.category_id, category_name: product.category_name }])).values(),
  );
  return customers.flatMap((customer) => {
    const top = categories.sort(() => rand() - 0.5).slice(0, 4);
    return top.map((category, index) => ({
      customer_id: customer.customer_id,
      category_id: category.category_id,
      category_name: category.category_name,
      interest_score: 45 + Math.floor(rand() * 55) - index * 7,
      last_viewed_at: offsetDate(Math.floor(rand() * 25), Math.floor(rand() * 800)),
      last_clicked_at: offsetDate(Math.floor(rand() * 18), Math.floor(rand() * 500)),
    }));
  });
}

function createCampaignHistory(logs: MessageLogRow[]): CampaignHistoryRow[] {
  return logs.slice(0, 240).map((log, index) => ({
    campaign_id: index + 1,
    customer_id: log.customer_id,
    campaign_type: log.campaign_type,
    channel: log.channel,
    sent_at: log.sent_at,
    clicked: log.clicked,
    converted: log.converted,
    revenue_generated: log.converted ? 15000 + (index % 7) * 7000 : 0,
  }));
}

function createCoupons(customers: Customer[]): CouponEligibilityRow[] {
  const rand = rng(141);
  return customers
    .filter((customer) => rand() > 0.44)
    .map((customer, index) => ({
      customer_id: customer.customer_id,
      coupon_code: `RL-${customer.customer_id}-${index + 3}`,
      discount_type: rand() > 0.5 ? "amount" : "percent",
      discount_value: rand() > 0.5 ? 3000 + Math.floor(rand() * 9000) : 10 + Math.floor(rand() * 15),
      valid_until: offsetDate(-7 - Math.floor(rand() * 20)),
      used: (rand() > 0.72 ? 1 : 0) as 0 | 1,
    }));
}

function createWishlist(customers: Customer[], products: ProductRow[]): WishlistEventRow[] {
  const rand = rng(161);
  let wishlistId = 1;
  return customers.flatMap((customer) => {
    const count = Math.floor(rand() * 3);
    return Array.from({ length: count }, () => ({
      wishlist_id: wishlistId++,
      customer_id: customer.customer_id,
      product_id: pick(rand, products).product_id,
      added_at: offsetDate(Math.floor(rand() * 35), Math.floor(rand() * 1000)),
    }));
  });
}

export function createWarehouse(): Warehouse {
  const companies = createCompanies();
  const product_catalog = createProducts();
  const customers = createCustomers();
  const sessions = createSessions(customers);
  const orders = createOrders(customers, product_catalog);
  const carts = createCarts(customers, product_catalog);
  const message_logs = createMessageLogs(customers);
  const customer_category_interest = createInterests(customers, product_catalog);
  const campaign_history = createCampaignHistory(message_logs);
  const coupon_eligibility = createCoupons(customers);
  const wishlist_events = createWishlist(customers, product_catalog);

  return {
    companies,
    customers,
    sessions,
    orders,
    carts,
    message_logs,
    product_catalog,
    customer_category_interest,
    campaign_history,
    coupon_eligibility,
    wishlist_events,
  };
}
