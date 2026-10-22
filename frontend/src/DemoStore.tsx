import { encodeStoredDemoState, decodeStoredDemoState } from './demoStateStorage';
import { seedDailyHistory, advanceDemoSales, addOrdersToHistory, type SalesSimulation } from './demoSalesSimulation';
import catalogue from "./data/catalogue.json";
import { authApi, type Account } from "./services/authApi";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { demoForecastApi } from "./services/forecastApi";
import { campaignIsOrderable, effectiveNow, evaluateCampaignOutcome, remainingDays } from "./services/businessRules";

export type DemoRole = "customer" | "seller" | "admin" | "partner";
export type CampaignStatus = "Bản nháp" | "Chờ duyệt" | "Bị từ chối" | "Đã lên lịch" | "Đang hoạt động" | "Thành công" | "Không đạt MOQ" | "Đã hủy";

export type StoreProduct = {
  franchise?: string;
  id: number;
  sellerId: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  manufacturingDays: number;
  status: "Bản nháp" | "Đang bán";
};

export type StoreCampaign = {
  id: string;
  sellerId: string;
  productId: number;
  name: string;
  description: string;
  status: CampaignStatus;
  rejectionReason?: string;
  startDate: string;
  endDate: string;
  moq: number;
  target: number;
  currentOrders: number;
  price: number;
  dailyObservations?: { date: string; quantity: number }[];
  salesSimulation?: SalesSimulation;
};

export type CartItem = {
  productId: number;
  campaignId: string;
  variant: string;
  quantity: number;
  unitPrice: number;
};

export type StoreOrder = {
  id: string;
  customerId: string;
  sellerId: string;
  campaignId: string;
  productId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  variant: string;
  createdAt: string;
  orderStatus: "Chờ kết quả chiến dịch" | "Đang sản xuất" | "Đang vận chuyển" | "Đã giao" | "Đã hủy" | "Đang hoàn tiền" | "Đã hoàn tiền";
  paymentStatus: "Chờ thanh toán" | "Đã thanh toán" | "Đang hoàn tiền" | "Đã hoàn tiền";
};

export type StoreForecast = {
  id: string;
  campaignId: string;
  createdAt: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  successProbability: number;
  modelVersion: string;
  warnings: string[];
  observedOrders: number;
  provider: "DEMO" | "ML_API";
  observedSeries: { date: string; cumulative: number }[];
  predictedSeries: { date: string; cumulative: number; lower: number; upper: number }[];
};

export type ProductionRequest = {
  history?: { status: string; progress: number; at: string }[];
  id: string;
  campaignId: string;
  sellerId: string;
  partnerId: string;
  quantity: number;
  status: "Chờ tiếp nhận" | "Đã tiếp nhận" | "Đang sản xuất" | "Đang vận chuyển" | "Hoàn thành";
  progress: number;
  estimatedCompletion: string;
  updatedAt: string;
};

export type DemoState = {
  version: 2;
  sampleRevision?: number;
  salesSimulationEnabled?: boolean;
  demoNow: string | null;
  session: { role: DemoRole; userId: string; demo: true } | null;
  users: { id: string; role: DemoRole; name: string; email: string; notificationEmail: boolean }[];
  sellers: { id: string; name: string; verified: boolean }[];
  products: StoreProduct[];
  campaigns: StoreCampaign[];
  orders: StoreOrder[];
  payments: { id: string; orderId: string; amount: number; status: StoreOrder["paymentStatus"] }[];
  forecasts: StoreForecast[];
  productionRequests: ProductionRequest[];
  cart: CartItem[];
  checkoutGroups: { id: string; orderIds: string[]; total: number; createdAt: string }[];
};

const DAY = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const shiftDay = (days: number) => isoDay(new Date(Date.now() + days * DAY));
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`.toUpperCase();
export const getEffectiveNow = (state: Pick<DemoState, "demoNow">) => effectiveNow(state.demoNow);
export const getRemainingDays = (campaign: StoreCampaign, state: Pick<DemoState, "demoNow">) => {
  return remainingDays(campaign.endDate, state.demoNow);
};
export const isCampaignOrderable = (campaign: StoreCampaign, state: Pick<DemoState, "demoNow">) => {
  return campaignIsOrderable(campaign, state.demoNow);
};

const initialProducts: StoreProduct[] = [
  { id: 1, sellerId: "seller-aurora", name: "Bàn phím cơ Aurora K75", category: "Công nghệ", price: 1290000, image: "/products/preora-1.jpg", description: "Bàn phím cơ thiết kế tại Việt Nam.", manufacturingDays: 45, status: "Đang bán" },
  { id: 2, sellerId: "seller-auralis", name: "Tai nghe không dây Auralis One", category: "Công nghệ", price: 1890000, image: "https://images.unsplash.com/photo-1572985025058-f27aeca1b8bf?w=900&h=680&fit=crop&auto=format", description: "Tai nghe không dây cao cấp.", manufacturingDays: 40, status: "Đang bán" },
  { id: 3, sellerId: "seller-north", name: "Balo mô-đun Nomad 24L", category: "Đời sống", price: 990000, image: "https://images.unsplash.com/photo-1528921581519-52b9d779df2b?w=900&h=680&fit=crop&auto=format", description: "Balo mô-đun cho đô thị.", manufacturingDays: 35, status: "Đang bán" },
  { id: 4, sellerId: "seller-sora", name: "Đồng hồ tối giản Sora", category: "Phụ kiện", price: 1450000, image: "https://images.unsplash.com/photo-1531522897097-9085662b9e68?w=900&h=680&fit=crop&auto=format", description: "Đồng hồ tối giản.", manufacturingDays: 50, status: "Đang bán" },
  { id: 5, sellerId: "seller-may", name: "Artbook Sài Gòn Ban Mai", category: "Sách & Nghệ thuật", price: 459000, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=680&fit=crop&auto=format", description: "Artbook phiên bản giới hạn.", manufacturingDays: 30, status: "Đang bán" },
  { id: 6, sellerId: "seller-lumi", name: "Áo khoác LUMI phiên bản 2026", category: "Thời trang", price: 649000, image: "/products/preora-6.jpg", description: "Áo khoác giới hạn.", manufacturingDays: 28, status: "Đang bán" },
  { id: 7, sellerId: "seller-pico", name: "Máy ảnh bỏ túi Pico", category: "Công nghệ", price: 2390000, image: "https://images.unsplash.com/photo-1630583206477-f232a811f672?w=900&h=680&fit=crop&auto=format", description: "Máy ảnh nhỏ gọn.", manufacturingDays: 60, status: "Đang bán" },
  { id: 8, sellerId: "seller-mono", name: "Bộ phụ kiện bàn làm việc Mono", category: "Đời sống", price: 790000, image: "https://images.unsplash.com/photo-1563048976-a4b782e2b083?w=900&h=680&fit=crop&auto=format", description: "Bộ phụ kiện bàn làm việc.", manufacturingDays: 25, status: "Đang bán" },
  { id: 9, sellerId: "seller-tiny", name: "Mô hình Neko Moon", category: "Sưu tầm", price: 799000, image: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=900&h=680&fit=crop&auto=format", description: "Mô hình sưu tầm.", manufacturingDays: 45, status: "Đang bán" },
  { id: 10, sellerId: "seller-aurora", name: "Bộ keycap Đà Lạt Mù Sương", category: "Công nghệ", price: 690000, image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=900&h=680&fit=crop&auto=format", description: "Keycap cảm hứng Đà Lạt.", manufacturingDays: 35, status: "Đang bán" },
  { id: 11, sellerId: "seller-terra", name: "Sổ tay tái chế Terra", category: "Văn phòng phẩm", price: 219000, image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&h=680&fit=crop&auto=format", description: "Sổ tay giấy tái chế.", manufacturingDays: 20, status: "Đang bán" },
  { id: 12, sellerId: "seller-halo", name: "Đèn bàn thông minh Halo", category: "Nhà cửa", price: 1190000, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&h=680&fit=crop&auto=format", description: "Đèn bàn thông minh.", manufacturingDays: 40, status: "Đang bán" },
];

const campaignSeed: Omit<StoreCampaign, "description" | "sellerId" | "productId" | "price">[] = [
  { id: "CD-2408", name: "Aurora K75 — Founders Edition", status: "Đang hoạt động", startDate: shiftDay(-8), endDate: shiftDay(18), moq: 300, target: 500, currentOrders: 184, dailyObservations: [{ date: shiftDay(-8), quantity: 24 }, { date: shiftDay(-5), quantity: 38 }, { date: shiftDay(-2), quantity: 67 }, { date: shiftDay(0), quantity: 55 }] },
  { id: "CD-2412", name: "Auralis One", status: "Thành công", startDate: shiftDay(-60), endDate: shiftDay(-25), moq: 400, target: 650, currentOrders: 426 },
  { id: "CD-2415", name: "Nomad 24L", status: "Chờ duyệt", startDate: shiftDay(2), endDate: shiftDay(32), moq: 250, target: 450, currentOrders: 0 },
  { id: "CD-2418", name: "Sora Minimal", status: "Đã lên lịch", startDate: shiftDay(10), endDate: shiftDay(40), moq: 300, target: 500, currentOrders: 0 },
  { id: "CD-2420", name: "Sài Gòn Ban Mai", status: "Thành công", startDate: shiftDay(-70), endDate: shiftDay(-35), moq: 500, target: 700, currentOrders: 526 },
  { id: "CD-2423", name: "LUMI 2026", status: "Đang hoạt động", startDate: shiftDay(-5), endDate: shiftDay(12), moq: 400, target: 600, currentOrders: 238, dailyObservations: [{ date: shiftDay(-5), quantity: 41 }, { date: shiftDay(-3), quantity: 72 }, { date: shiftDay(-1), quantity: 83 }, { date: shiftDay(0), quantity: 42 }] },
  { id: "CD-2426", name: "Pico Pocket Camera", status: "Không đạt MOQ", startDate: shiftDay(-55), endDate: shiftDay(-20), moq: 200, target: 350, currentOrders: 91 },
  { id: "CD-2430", name: "Terra Notes", status: "Bản nháp", startDate: "", endDate: "", moq: 250, target: 500, currentOrders: 0 },
  { id: "CD-2432", name: "Mono Desk Essentials", status: "Bị từ chối", startDate: shiftDay(5), endDate: shiftDay(35), moq: 220, target: 400, currentOrders: 0, rejectionReason: "Cần bổ sung kế hoạch kiểm định chất lượng." },
];

const baseState: DemoState = {
  version: 2,
  demoNow: null,
  session: null,
  users: [
    { id: "customer-demo", role: "customer", name: "Nguyễn Minh Anh", email: "minhanh@example.com", notificationEmail: true },
    { id: "seller-aurora", role: "seller", name: "Aurora Lab", email: "hello@auroralab.vn", notificationEmail: true },
    { id: "seller-auralis", role: "seller", name: "Auralis Studio", email: "seller.b@preora.demo", notificationEmail: true },
    { id: "admin-demo", role: "admin", name: "Lê Khánh", email: "admin@preora.vn", notificationEmail: true },
    { id: "partner-demo", role: "partner", name: "VietCraft Manufacturing", email: "ops@vietcraft.vn", notificationEmail: true },
  ],
  sellers: [{ id: "seller-aurora", name: "Aurora Lab", verified: true }, { id: "seller-auralis", name: "Auralis Studio", verified: true }, { id: "seller-north", name: "Northbound", verified: true }, { id: "seller-sora", name: "Sora Objects", verified: true }],
  products: initialProducts,
  campaigns: campaignSeed.map((campaign, index) => ({
    ...campaign,
    productId: index === 7 ? 11 : index + 1,
    sellerId: initialProducts[index === 7 ? 10 : index].sellerId,
    price: initialProducts[index === 7 ? 10 : index].price,
    description: "Chiến dịch Pre-order dùng dữ liệu nhu cầu mô phỏng để trải nghiệm PREORA.",
  })),
  orders: [
    { id: "PR-DEMO-04128", customerId: "customer-demo", sellerId: "seller-aurora", campaignId: "CD-2408", productId: 1, quantity: 1, unitPrice: 1290000, total: 1290000, variant: "Xanh Midnight", createdAt: new Date(Date.now() - 2 * DAY).toISOString(), orderStatus: "Chờ kết quả chiến dịch", paymentStatus: "Đã thanh toán" },
    { id: "PR-DEMO-03864", customerId: "customer-demo", sellerId: "seller-may", campaignId: "CD-2420", productId: 5, quantity: 1, unitPrice: 459000, total: 459000, variant: "Bìa cứng", createdAt: new Date(Date.now() - 30 * DAY).toISOString(), orderStatus: "Đang sản xuất", paymentStatus: "Đã thanh toán" },
  ],
  payments: [
    { id: "PAY-DEMO-04128", orderId: "PR-DEMO-04128", amount: 1290000, status: "Đã thanh toán" },
    { id: "PAY-DEMO-03864", orderId: "PR-DEMO-03864", amount: 459000, status: "Đã thanh toán" },
  ],
  forecasts: [],
  productionRequests: [{ id: "MFG-2420", campaignId: "CD-2420", sellerId: "seller-may", partnerId: "partner-demo", quantity: 526, status: "Đang sản xuất", progress: 62, estimatedCompletion: shiftDay(16), updatedAt: new Date().toISOString() }],
  cart: [],
  checkoutGroups: [],
};

// Sample orders are generated from campaign totals so all sample relationships agree.
// Existing browser data is preserved; use Reset demo to load this fixture.
const initialState: DemoState = (() => {
  const sample = structuredClone(baseState);
  const names: Record<string, string> = {
    "seller-aurora": "Aurora Lab", "seller-auralis": "Auralis Studio", "seller-north": "Northbound",
    "seller-sora": "Sora Objects", "seller-may": "Mây Studio", "seller-lumi": "LUMI Wear",
    "seller-pico": "Pico Lab", "seller-mono": "Mono Works", "seller-tiny": "Tiny Planet",
    "seller-terra": "Terra Paper", "seller-halo": "Halo Living",
  };
  sample.users = sample.users.map((user) => ({ ...user, email: user.id === "customer-demo" ? "customer@preora.demo" : user.id === "seller-aurora" ? "seller@preora.demo" : user.id === "admin-demo" ? "admin@preora.demo" : user.id === "partner-demo" ? "partner@preora.demo" : user.email }));
  for (const [id, name] of Object.entries(names)) {
    if (!sample.users.some((user) => user.id === id)) sample.users.push({ id, role: "seller", name, email: `${id}@preora.demo`, notificationEmail: true });
  }
  sample.sellers = Object.entries(names).map(([id, name]) => ({ id, name, verified: id !== "seller-mono" }));
  // Correct the rejected Mono campaign's product ownership.
  const mono = sample.campaigns.find((campaign) => campaign.id === "CD-2432")!;
  mono.productId = 8; mono.sellerId = "seller-mono"; mono.price = sample.products.find((product) => product.id === 8)!.price;
  sample.campaigns.push(
    { id: "CD-SAMPLE-SUCCESS", productId: 10, sellerId: "seller-aurora", name: "Keycap - SUCCESS", description: "Synthetic sample scenario: SUCCESS", status: "Thành công", startDate: shiftDay(-40), endDate: shiftDay(-5), moq: 20, target: 40, currentOrders: 24, price: 690000 },
    { id: "CD-SAMPLE-REFUND", productId: 10, sellerId: "seller-aurora", name: "Keycap - REFUND", description: "Synthetic sample scenario: REFUND", status: "Không đạt MOQ", startDate: shiftDay(-40), endDate: shiftDay(-5), moq: 20, target: 40, currentOrders: 6, price: 690000 },
    { id: "CD-SAMPLE-CANCELLED", productId: 10, sellerId: "seller-aurora", name: "Keycap - CANCELLED", description: "Synthetic sample scenario: CANCELLED", status: "Đã hủy", startDate: shiftDay(-40), endDate: shiftDay(-5), moq: 20, target: 40, currentOrders: 3, price: 690000 },
  );
  const categories: Record<string, string> = { "Công nghệ": "Công nghệ / Phụ kiện điện tử", "Đời sống": "Merchandise", "Phụ kiện": "Merchandise", "Sách & Nghệ thuật": "Merchandise", "Sưu tầm": "Collectible", "Văn phòng phẩm": "Merchandise", "Nhà cửa": "Trang trí nhà cửa" };
  sample.products = sample.products.map((product) => ({ ...product, category: categories[product.category] || product.category }));
  for (const [index, productId] of [1, 6].entries()) {
    const product = sample.products.find((item) => item.id === productId)!;
    Object.assign(product, catalogue[index]);
    const campaign = sample.campaigns.find((item) => item.productId === productId)!;
    campaign.name = product.name; campaign.price = product.price; campaign.description = product.description;
  }
  // Append catalogue entries while keeping the first 200 product/campaign IDs stable.
  const activeStatus = sample.campaigns[0].status;
  for (const [index, entry] of catalogue.slice(2).entries()) {
    const base = sample.products[index % 12];
    const id = 1000 + index;
    const product: StoreProduct = { ...base, ...entry, id, description: `${entry.name}. Sản phẩm và chiến dịch mẫu để trải nghiệm PREORA.`, status: "Đang bán" };
    sample.products.push(product);
    const elapsed = 3 + index % 18;
    const quantity = Math.max((elapsed + 1) * 2, Math.round((40 + (index * 37) % 210) * (.55 + elapsed / 16)));
    sample.campaigns.push({ id: `CD-LIVE-${String(index + 1).padStart(3, "0")}`, productId: id, sellerId: product.sellerId, name: product.name, description: product.description, status: activeStatus, startDate: shiftDay(-elapsed), endDate: shiftDay(7 + index % 35), moq: 100 + index % 5 * 50, target: 500, currentOrders: quantity, price: product.price, dailyObservations: [{ date: shiftDay(-elapsed), quantity: Math.floor(quantity / 3) }, { date: shiftDay(-1), quantity: quantity - Math.floor(quantity / 3) }] });
  }
  for (let index = 1; index <= 100; index++) sample.users.push({ id: `customer-sample-${index}`, role: "customer", name: `Khách trải nghiệm ${index}`, email: `customer.sample.${index}@preora.demo`, notificationEmail: false });
  const personalCampaigns = new Set(["CD-2408", "CD-2420", "CD-2412", "CD-2426", "CD-SAMPLE-SUCCESS"]);
  let customerIndex = 0;
  sample.sampleRevision = 9;
  sample.salesSimulationEnabled = true;
  const anchorDate = isoDay(new Date());
  for (const campaign of sample.campaigns) {
    const through = campaign.endDate && campaign.endDate < anchorDate ? campaign.endDate : anchorDate;
    if (campaign.currentOrders > 0 && campaign.startDate && campaign.startDate <= through) campaign.dailyObservations = seedDailyHistory(campaign.id, campaign.startDate, through, campaign.currentOrders);
    if (campaign.status === 'Đang hoạt động' || campaign.status === 'Đã lên lịch') {
      const elapsed = Math.max(1, Math.floor((Date.parse(anchorDate)-Date.parse(campaign.startDate))/DAY)+1);
      campaign.salesSimulation = {anchorDate,lastDate:anchorDate,dailyRate:campaign.currentOrders ? Math.max(1,campaign.currentOrders/elapsed) : Math.max(2,Math.round(campaign.moq/30))};
    }
  }
  sample.orders = [];
  sample.payments = [];
  for (const campaign of sample.campaigns) {
    const observations = campaign.dailyObservations?.length ? campaign.dailyObservations : campaign.currentOrders ? [{ date: campaign.startDate, quantity: campaign.currentOrders }] : [];
    for (const [index, observation] of observations.entries()) {
      let remaining = observation.quantity;
      let batch = 0;
      while (remaining > 0) {
        const quantity = Math.min(remaining, 99);
        const id = `PR-SAMPLE-${campaign.id}-${index}-${batch++}`;
        const refunded = campaign.status === "Đã hủy";
        const refunding = campaign.status === "Không đạt MOQ";
        const production = sample.productionRequests.find((request) => request.campaignId === campaign.id);
        const orderStatus: StoreOrder["orderStatus"] = refunded ? "Đã hoàn tiền" : refunding ? "Đang hoàn tiền" : production ? "Đang sản xuất" : "Chờ kết quả chiến dịch";
        const paymentStatus: StoreOrder["paymentStatus"] = refunded ? "Đã hoàn tiền" : refunding ? "Đang hoàn tiền" : "Đã thanh toán";
        sample.orders.push({ id, customerId: personalCampaigns.has(campaign.id) && index === 0 && batch === 1 ? "customer-demo" : `customer-sample-${customerIndex++ % 100 + 1}`, sellerId: campaign.sellerId, campaignId: campaign.id, productId: campaign.productId, quantity, unitPrice: campaign.price, total: quantity * campaign.price, variant: "Phiên bản mẫu", createdAt: `${observation.date}T00:00:00.000Z`, orderStatus, paymentStatus });
        sample.payments.push({ id: `PAY-${id}`, orderId: id, amount: quantity * campaign.price, status: paymentStatus });
        remaining -= quantity;
      }
    }
  }
  return sample;
})();

type StoreValue = {
  state: DemoState;
  importShoppingOrders: (orders: StoreOrder[]) => void;
  setSession: (role: DemoRole | null, userId?: string) => Promise<void>;
  acceptAccount: (account: Account) => void;
  authLoading: boolean;
  persistenceError: string;
  setDemoNow: (value: string | null) => void;
  setSalesSimulationEnabled: (enabled: boolean) => void;
  syncCampaignLifecycle: () => void;
  createProduct: (input: Pick<StoreProduct, "name" | "category" | "price" | "description" | "manufacturingDays">) => StoreProduct;
  createCampaign: (input: Omit<StoreCampaign, "id" | "sellerId" | "currentOrders" | "status">, submit: boolean) => StoreCampaign;
  approveCampaign: (id: string) => void;
  rejectCampaign: (id: string, reason: string) => void;
  activateCampaign: (id: string) => void;
  cancelCampaign: (id: string) => void;
  requestForecast: (campaignId: string) => Promise<StoreForecast>;
  finishCampaign: (id: string) => void;
  createProductionRequest: (campaignId: string) => void;
  updateProduction: (id: string, progress: number, status: ProductionRequest["status"]) => void;
  completeRefund: (orderId: string) => void;
  updateProfile: (name: string, email: string, notificationEmail: boolean) => void;
  resetDemo: () => void;
};

const DemoContext = createContext<StoreValue | null>(null);
const STORAGE_KEY = "preora-demo-state-v2";
const LEGACY_KEY = "preora-demo-state-v1";
function migrateState(raw: unknown): DemoState {
  if (!raw || typeof raw !== "object") return initialState;
  const old = raw as Partial<DemoState> & { version?: number };
  if (old.sampleRevision !== initialState.sampleRevision) {
    const fixtureIds = new Set(initialState.campaigns.map((item) => item.id));
    const protectedCampaignIds = new Set((old.productionRequests || []).filter(r=>r.id!=="MFG-2420").map(r=>r.campaignId));
    const userOrders = (old.orders || []).filter((item) => protectedCampaignIds.has(item.campaignId) || (!item.id.startsWith("PR-SAMPLE-") && !item.id.startsWith("PR-SIM-") && !["PR-DEMO-04128", "PR-DEMO-03864"].includes(item.id)));
    const sampleProducts = new Set(initialState.products.map((item) => item.id));
    const sampleUsers = new Set(initialState.users.map((item) => item.id));
    const orderIds = new Set(userOrders.map((item) => item.id));
    const seedOrders = initialState.orders.filter(o=>!protectedCampaignIds.has(o.campaignId));
    const seedOrderIds = new Set(seedOrders.map(o=>o.id));
    const campaigns = [...initialState.campaigns, ...(old.campaigns || []).filter(item => !fixtureIds.has(item.id))].map(campaign => {
      if(protectedCampaignIds.has(campaign.id))return (old.campaigns || []).find(c=>c.id===campaign.id) || campaign;
      if(!fixtureIds.has(campaign.id))return campaign;
      const purchases=userOrders.filter(order=>order.campaignId===campaign.id);
      const firstPurchase=purchases.reduce((first,o)=>o.createdAt.slice(0,10)<first?o.createdAt.slice(0,10):first,campaign.startDate);
      if(firstPurchase<campaign.startDate){
        const through=campaign.dailyObservations?.at(-1)?.date || campaign.salesSimulation?.anchorDate || campaign.endDate;
        campaign={...campaign,startDate:firstPurchase,dailyObservations:seedDailyHistory(campaign.id,firstPurchase,through,campaign.currentOrders)};
      }
      return addOrdersToHistory(campaign,purchases);
    });
    return { ...initialState, ...old, sampleRevision: initialState.sampleRevision, users: [...initialState.users.map((user) => (old.users || []).find((item) => item.id === user.id) || user), ...(old.users || []).filter((item) => !sampleUsers.has(item.id))], sellers: initialState.sellers, products: [...initialState.products, ...(old.products || []).filter((item) => !sampleProducts.has(item.id))], campaigns, orders: [...userOrders, ...seedOrders], payments: [...(old.payments || []).filter((item) => orderIds.has(item.orderId)), ...initialState.payments.filter(p=>seedOrderIds.has(p.orderId))], productionRequests: [...(old.productionRequests || []).filter((item) => item.id !== "MFG-2420"), ...initialState.productionRequests] };
  }

  const seedById = new Map(initialState.campaigns.map((campaign) => [campaign.id, campaign]));
  const campaigns = old.version === 2 && Array.isArray(old.campaigns) ? old.campaigns : Array.isArray(old.campaigns) ? old.campaigns.map((campaign) => {
    const seed = seedById.get(campaign.id);
    return seed ? { ...campaign, startDate: seed.startDate, endDate: seed.endDate, status: seed.status, dailyObservations: seed.dailyObservations } : campaign;
  }) : initialState.campaigns;
  return {
    ...initialState,
    ...old,
    version: 2,
    demoNow: old.demoNow || null,
    users: Array.isArray(old.users) ? old.users : initialState.users,
    products: Array.isArray(old.products) ? old.products : initialState.products,
    campaigns,
    orders: Array.isArray(old.orders) ? old.orders : initialState.orders,
    payments: Array.isArray(old.payments) ? old.payments : initialState.payments,
    forecasts: Array.isArray(old.forecasts) ? old.forecasts.map((forecast) => ({ ...forecast, provider: forecast.provider || "DEMO", observedSeries: forecast.observedSeries || [], predictedSeries: forecast.predictedSeries || [] })) : [],
    productionRequests: Array.isArray(old.productionRequests) ? old.productionRequests : initialState.productionRequests,
    cart: Array.isArray(old.cart) ? old.cart : [],
    checkoutGroups: Array.isArray(old.checkoutGroups) ? old.checkoutGroups : [],
  };
}

function reconcileLifecycle(state: DemoState): DemoState {
  const today = isoDay(getEffectiveNow(state));
  state = advanceDemoSales(state, today);
  let changed = false;
  let orders = state.orders;
  let payments = state.payments;
  const campaigns = state.campaigns.map((campaign) => {
    if (campaign.salesSimulation?.closedByClock && campaign.endDate >= today && (campaign.status === 'Thành công' || campaign.status === 'Không đạt MOQ') && !state.productionRequests.some(r=>r.campaignId===campaign.id)) {
      changed=true;
      const restore=new Map((campaign.salesSimulation.clockRefunds||[]).map(row=>[row.id,row]));
      orders=orders.map(order=>{const saved=restore.get(order.id);return saved&&order.paymentStatus==='Đang hoàn tiền' ? {...order,orderStatus:saved.orderStatus,paymentStatus:saved.paymentStatus}:order;});
      payments=payments.map(payment=>{const saved=restore.get(payment.orderId);return saved&&payment.status==='Đang hoàn tiền'?{...payment,status:saved.paymentStatus}:payment;});
      const {closedByClock:_closed,clockRefunds:_refunds,...profile}=campaign.salesSimulation;
      return {...campaign,status:campaign.startDate>today?'Đã lên lịch' as const:'Đang hoạt động' as const,salesSimulation:profile};
    }
    if (campaign.status === "Đã lên lịch" && campaign.startDate && campaign.startDate <= today && campaign.endDate >= today) {
      changed = true;
      return { ...campaign, status: "Đang hoạt động" as CampaignStatus };
    }
    if ((campaign.status === "Đang hoạt động" || (campaign.status === "Đã lên lịch" && campaign.startDate <= today)) && campaign.endDate && campaign.endDate < today) {
      changed = true;
      const success = evaluateCampaignOutcome(campaign) === "Thành công";
      const clockRefunds = !success ? orders.filter(order=>order.campaignId===campaign.id&&order.paymentStatus==='Đã thanh toán').map(order=>({id:order.id,orderStatus:order.orderStatus,paymentStatus:order.paymentStatus})) : [];
      if (!success) {
        orders = orders.map((order) => order.campaignId === campaign.id && order.paymentStatus === "Đã thanh toán" ? { ...order, orderStatus: "Đang hoàn tiền" as const, paymentStatus: "Đang hoàn tiền" as const } : order);
        const refundIds = new Set(clockRefunds.map(order=>order.id));
        payments = payments.map(payment=>refundIds.has(payment.orderId)?{...payment,status:"Đang hoàn tiền" as const}:payment);
      }
      return { ...campaign, status: success ? "Thành công" as const : "Không đạt MOQ" as const, ...(campaign.salesSimulation ? {salesSimulation:{...campaign.salesSimulation,closedByClock:true,clockRefunds}} : {}) };
    }
    return campaign;
  });
  return changed ? { ...state, campaigns, orders, payments } : state;
}

function mergeAccount(current: DemoState, account: Account): DemoState {
  const user = { id: account.id, role: account.role, name: account.name, email: account.email, notificationEmail: current.users.find((item) => item.id === account.id)?.notificationEmail ?? true };
  return { ...current, session: { role: account.role, userId: account.id, demo: true }, users: [...current.users.filter((item) => item.id !== account.id), user], sellers: account.role === "seller" && !current.sellers.some((item) => item.id === account.id) ? [...current.sellers, { id: account.id, name: account.name, verified: false }] : current.sellers };
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      return reconcileLifecycle(saved ? migrateState(decodeStoredDemoState(JSON.parse(saved))) : initialState);
    } catch {
      return initialState;
    }
  });
  const receivedStorage = useRef('');
  const [authLoading, setAuthLoading] = useState(true);
  const [persistenceError,setPersistenceError]=useState("");
  useEffect(() => {
    let active = true;
    authApi("me").then((result) => { if (active) setState((current) => result.user ? mergeAccount(current, result.user) : { ...current, session: null }); }).catch(() => { if (active) setState((current) => ({ ...current, session: null })); }).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    try { const encoded=encodeStoredDemoState({...state,session:null}); if(encoded!==receivedStorage.current && encoded!==localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY,encoded); receivedStorage.current=''; setPersistenceError(''); }
    catch { setPersistenceError('Không lưu được dữ liệu mô phỏng trong trình duyệt. Hãy xuất dữ liệu hoặc giải phóng bộ nhớ trước khi đóng trang.'); }
  }, [state]);
  useEffect(() => {
    if (state.demoNow) return;
    const timer = window.setInterval(() => setState((current) => reconcileLifecycle(current)), 60_000);
    return () => window.clearInterval(timer);
  }, [state.demoNow]);

  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue || event.newValue !== localStorage.getItem(STORAGE_KEY)) return;
      try {
        const incoming = migrateState(decodeStoredDemoState(JSON.parse(event.newValue)));
        setState(current => {
          if (encodeStoredDemoState({...current,session:null}) === event.newValue) return current;
          receivedStorage.current=event.newValue!;
          return {...incoming,session:current.session};
        });
      } catch { /* Ignore invalid storage events; retain the current state. */ }
    };
    window.addEventListener('storage',receive);
    return () => window.removeEventListener('storage',receive);
  },[]);

  const value = useMemo<StoreValue>(() => ({
    state,
    async setSession(_role, _userId) {
      await authApi("logout", {});
      setState((current) => ({ ...current, session: null }));
    },
    importShoppingOrders(orders) {
      setState(current => {
        const known = new Set(current.orders.map(o => o.id));
        const fresh = orders.filter(o => !known.has(o.id));
        if (!fresh.length) return current;
        return { ...current, orders: [...fresh, ...current.orders], payments: [...fresh.map(o => ({id: `PAY-${o.id}`, orderId:o.id,amount:o.total,status:o.paymentStatus})), ...current.payments], campaigns:current.campaigns.map(c => addOrdersToHistory(c,fresh.filter(o=>o.campaignId===c.id))) };
      });
    },
    acceptAccount(account) {
      setState((current) => mergeAccount(current, account));
    },
    authLoading,
    persistenceError,
    setSalesSimulationEnabled(enabled) {
      if (state.session?.role !== 'admin') return;
      setState(current => {
        const paused = advanceDemoSales({...current,salesSimulationEnabled:false}, isoDay(getEffectiveNow(current)));
        return {...paused,salesSimulationEnabled:enabled};
      });
    },
    setDemoNow(value) {
      const requested = value ? new Date(value) : new Date();
      if (!Number.isFinite(requested.getTime())) throw new Error('Ngày mô phỏng không hợp lệ.');
      const minimum = state.campaigns.reduce((latest,c)=>c.salesSimulation && c.salesSimulation.anchorDate>latest ? c.salesSimulation.anchorDate : latest,'');
      if (state.productionRequests.some(r=>{const c=state.campaigns.find(c=>c.id===r.campaignId);return c?.salesSimulation?.closedByClock&&isoDay(requested)<=c.endDate;})) throw new Error('Đã tạo lệnh sản xuất cho chiến dịch đóng theo đồng hồ. Không lùi về trước lúc đóng để tránh sai số liệu lệnh.');
      if (minimum && isoDay(requested)<minimum) throw new Error(`Số liệu mẫu có mốc gốc ${minimum}; chọn ngày từ mốc này trở đi.`);
      setState((current) => reconcileLifecycle({ ...current, demoNow: value ? new Date(value).toISOString() : null }));
    },
    syncCampaignLifecycle() {
      setState((current) => reconcileLifecycle(current));
    },
    createProduct(input) {
      if (state.session?.role !== "seller") throw new Error("Chỉ người bán được tạo sản phẩm.");
      const product: StoreProduct = { ...input, id: Math.max(0, ...state.products.map((item) => item.id)) + 1, sellerId: state.session.userId, image: initialProducts[0].image, status: "Bản nháp" };
      setState((current) => ({ ...current, products: [...current.products, product] }));
      return product;
    },
    createCampaign(input, submit) {
      if (state.session?.role !== "seller") throw new Error("Chỉ người bán được tạo chiến dịch.");
      const product = state.products.find((item) => item.id === input.productId);
      if (!product || product.sellerId !== state.session.userId) throw new Error("Bạn không sở hữu sản phẩm đã chọn.");
      const campaign: StoreCampaign = { ...input, id: makeId("CD"), sellerId: state.session.userId, currentOrders: 0, status: submit ? "Chờ duyệt" : "Bản nháp" };
      setState((current) => ({ ...current, campaigns: [...current.campaigns, campaign] }));
      return campaign;
    },
    approveCampaign(id) {
      if (state.session?.role !== "admin") return;
      const today = isoDay(getEffectiveNow(state));
      setState((current) => ({ ...current, campaigns: current.campaigns.map((campaign) => campaign.id === id ? { ...campaign, status: campaign.startDate <= today ? "Đang hoạt động" : "Đã lên lịch", rejectionReason: undefined } : campaign) }));
    },
    rejectCampaign(id, reason) {
      if (state.session?.role !== "admin") return;
      setState((current) => ({ ...current, campaigns: current.campaigns.map((campaign) => campaign.id === id ? { ...campaign, status: "Bị từ chối", rejectionReason: reason } : campaign) }));
    },
    activateCampaign(id) {
      if (state.session?.role !== "seller") return;
      setState((current) => ({ ...current, campaigns: current.campaigns.map((campaign) => campaign.id === id && campaign.sellerId === current.session?.userId && campaign.status === "Đã lên lịch" && campaign.startDate <= isoDay(getEffectiveNow(current)) ? { ...campaign, status: "Đang hoạt động" } : campaign) }));
    },
    cancelCampaign(id) {
      if (state.session?.role !== "seller") return;
      setState((current) => ({
        ...current,
        campaigns: current.campaigns.map((campaign) => campaign.id === id && campaign.sellerId === current.session?.userId ? { ...campaign, status: "Đã hủy" } : campaign),
        orders: current.orders.map((order) => order.campaignId === id && order.sellerId === current.session?.userId ? { ...order, orderStatus: "Đang hoàn tiền", paymentStatus: "Đang hoàn tiền" } : order),
        payments: current.payments.map((payment) => {
          const order = current.orders.find((item) => item.id === payment.orderId);
          return order?.campaignId === id ? { ...payment, status: "Đang hoàn tiền" } : payment;
        }),
      }));
    },
    async requestForecast(campaignId) {
      const campaign = state.campaigns.find((item) => item.id === campaignId);
      if (!campaign || state.session?.role !== "seller" || campaign.sellerId !== state.session.userId) throw new Error("Bạn không có quyền dự báo chiến dịch này.");
      const product = state.products.find((item) => item.id === campaign.productId);
      const elapsedDays = Math.max(0, Math.floor((getEffectiveNow(state).getTime() - new Date(`${campaign.startDate}T00:00:00`).getTime()) / DAY));
      const result = await demoForecastApi.createForecast({ campaignId, productCategory: product?.category || "Chưa xác định", currentOrders: campaign.currentOrders, moq: campaign.moq, target: campaign.target, startDate: campaign.startDate, endDate: campaign.endDate, currentDate: isoDay(getEffectiveNow(state)), elapsedDays, daysRemaining: getRemainingDays(campaign, state), dailyOrderQuantities: campaign.dailyObservations || [] });
      const observedSeries = (campaign.dailyObservations || []).reduce<{ date: string; cumulative: number }[]>((series, item) => [...series, { date: item.date, cumulative: (series.at(-1)?.cumulative || 0) + item.quantity }], []);
      const forecast: StoreForecast = {
        ...result,
        id: makeId("FC"),
        campaignId,
        createdAt: getEffectiveNow(state).toISOString(),
        observedOrders: campaign.currentOrders,
        provider: "DEMO",
        observedSeries,
        predictedSeries: result.series.map((item) => ({ date: item.date, cumulative: item.value, lower: item.lower, upper: item.upper })),
      };
      setState((current) => ({ ...current, forecasts: [forecast, ...current.forecasts] }));
      return forecast;
    },
    finishCampaign(id) {
      if (state.session?.role !== "seller") return;
      setState((current) => {
        const campaign = current.campaigns.find((item) => item.id === id);
        if (!campaign || campaign.sellerId !== current.session?.userId || getRemainingDays(campaign, current) > 0) return current;
        const success = evaluateCampaignOutcome(campaign) === "Thành công";
        return {
          ...current,
          campaigns: current.campaigns.map((item) => item.id === id ? { ...item, status: success ? "Thành công" : "Không đạt MOQ" } : item),
          orders: current.orders.map((order) => order.campaignId !== id ? order : { ...order, orderStatus: success ? "Chờ kết quả chiến dịch" : "Đang hoàn tiền", paymentStatus: success ? order.paymentStatus : "Đang hoàn tiền" }),
          payments: current.payments.map((payment) => {
            const order = current.orders.find((item) => item.id === payment.orderId);
            return order?.campaignId === id && !success ? { ...payment, status: "Đang hoàn tiền" } : payment;
          }),
        };
      });
    },
    createProductionRequest(campaignId) {
      if (state.session?.role !== "seller") return;
      setState((current) => {
        const campaign = current.campaigns.find((item) => item.id === campaignId);
        if (!campaign || campaign.sellerId !== current.session?.userId || campaign.status !== "Thành công" || campaign.currentOrders < campaign.moq || current.productionRequests.some((item) => item.campaignId === campaignId)) return current;
        const product = current.products.find((item) => item.id === campaign.productId);
        const completion = new Date(getEffectiveNow(current).getTime() + (product?.manufacturingDays || 30) * DAY);
        const request: ProductionRequest = { id: makeId("MFG"), campaignId, sellerId: campaign.sellerId, partnerId: "partner-demo", quantity: campaign.currentOrders, status: "Chờ tiếp nhận", progress: 0, estimatedCompletion: isoDay(completion), updatedAt: getEffectiveNow(current).toISOString() };
        return { ...current, productionRequests: [request, ...current.productionRequests] };
      });
    },
    updateProduction(id, progress, status) {
      if (state.session?.role !== "partner") return;
      setState((current) => {
        const request = current.productionRequests.find((item) => item.id === id);
        if (!request || request.partnerId !== current.session?.userId) return current;
        const allowed: Record<ProductionRequest["status"], ProductionRequest["status"][]> = {
          "Chờ tiếp nhận": ["Đã tiếp nhận"],
          "Đã tiếp nhận": ["Đang sản xuất"],
          "Đang sản xuất": ["Đang sản xuất", "Đang vận chuyển"],
          "Đang vận chuyển": ["Đang vận chuyển", "Hoàn thành"],
          "Hoàn thành": ["Hoàn thành"],
        };
        if (!allowed[request.status].includes(status) || !Number.isInteger(progress) || progress < request.progress || progress > 100) return current;
        if (status === "Đang vận chuyển" && progress < 100) return current;
        const orderStatus = status === "Hoàn thành" ? "Đã giao" : status === "Đang vận chuyển" ? "Đang vận chuyển" : "Đang sản xuất";
        return {
          ...current,
          productionRequests: current.productionRequests.map((item) => item.id === id ? { ...item, progress: Math.max(item.progress, Math.min(progress, 100)), status, updatedAt: getEffectiveNow(current).toISOString(), history: [...(item.history || [{status:item.status,progress:item.progress,at:item.updatedAt}]),{status,progress,at:getEffectiveNow(current).toISOString()}] } : item),
          orders: current.orders.map((order) => order.campaignId === request.campaignId && !["Đã hoàn tiền", "Đã hủy"].includes(order.orderStatus) ? { ...order, orderStatus } : order),
        };
      });
    },
    completeRefund(orderId) {
      if (state.session?.role !== "admin") return;
      setState((current) => ({
        ...current,
        orders: current.orders.map((order) => order.id === orderId ? { ...order, orderStatus: "Đã hoàn tiền", paymentStatus: "Đã hoàn tiền" } : order),
        payments: current.payments.map((payment) => payment.orderId === orderId ? { ...payment, status: "Đã hoàn tiền" } : payment),
      }));
    },
    updateProfile(name, email, notificationEmail) {
      setState((current) => {
        if (!current.session) return current;
        return { ...current, users: current.users.map((user) => user.id === current.session?.userId ? { ...user, name, email, notificationEmail } : user) };
      });
    },
    resetDemo() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      setState(initialState);
    },
  }), [state, authLoading, persistenceError]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoStore() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemoStore phải được dùng bên trong DemoStoreProvider.");
  return value;
}
