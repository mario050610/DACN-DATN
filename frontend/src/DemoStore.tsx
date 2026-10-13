import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoForecastApi } from "./services/forecastApi";
import { campaignIsOrderable, effectiveNow, evaluateCampaignOutcome, remainingDays, validateCheckout } from "./services/businessRules";

export type DemoRole = "customer" | "seller" | "admin" | "partner";
export type CampaignStatus = "Bản nháp" | "Chờ duyệt" | "Bị từ chối" | "Đã lên lịch" | "Đang hoạt động" | "Thành công" | "Không đạt MOQ" | "Đã hủy";

export type StoreProduct = {
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
  { id: 1, sellerId: "seller-aurora", name: "Bàn phím cơ Aurora K75", category: "Công nghệ", price: 1290000, image: "https://images.unsplash.com/photo-1637634789063-7f89a7ec9de7?w=900&h=680&fit=crop&auto=format", description: "Bàn phím cơ thiết kế tại Việt Nam.", manufacturingDays: 45, status: "Đang bán" },
  { id: 2, sellerId: "seller-auralis", name: "Tai nghe không dây Auralis One", category: "Công nghệ", price: 1890000, image: "https://images.unsplash.com/photo-1572985025058-f27aeca1b8bf?w=900&h=680&fit=crop&auto=format", description: "Tai nghe không dây cao cấp.", manufacturingDays: 40, status: "Đang bán" },
  { id: 3, sellerId: "seller-north", name: "Balo mô-đun Nomad 24L", category: "Đời sống", price: 990000, image: "https://images.unsplash.com/photo-1528921581519-52b9d779df2b?w=900&h=680&fit=crop&auto=format", description: "Balo mô-đun cho đô thị.", manufacturingDays: 35, status: "Đang bán" },
  { id: 4, sellerId: "seller-sora", name: "Đồng hồ tối giản Sora", category: "Phụ kiện", price: 1450000, image: "https://images.unsplash.com/photo-1531522897097-9085662b9e68?w=900&h=680&fit=crop&auto=format", description: "Đồng hồ tối giản.", manufacturingDays: 50, status: "Đang bán" },
  { id: 5, sellerId: "seller-may", name: "Artbook Sài Gòn Ban Mai", category: "Sách & Nghệ thuật", price: 459000, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=680&fit=crop&auto=format", description: "Artbook phiên bản giới hạn.", manufacturingDays: 30, status: "Đang bán" },
  { id: 6, sellerId: "seller-lumi", name: "Áo khoác LUMI phiên bản 2026", category: "Thời trang", price: 649000, image: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=900&h=680&fit=crop&auto=format", description: "Áo khoác giới hạn.", manufacturingDays: 28, status: "Đang bán" },
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

const initialState: DemoState = {
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
    description: "Chiến dịch Pre-order được vận hành bằng dữ liệu nhu cầu thực.",
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

type StoreValue = {
  state: DemoState;
  setSession: (role: DemoRole | null, userId?: string) => void;
  login: (email: string, password: string) => { ok: boolean; role?: DemoRole; message?: string };
  setDemoNow: (value: string | null) => void;
  syncCampaignLifecycle: () => void;
  addCartItem: (item: CartItem) => void;
  updateCartItem: (campaignId: string, variant: string, quantity: number) => void;
  removeCartItem: (campaignId: string, variant: string) => void;
  checkoutCart: () => { groupId: string; orders: StoreOrder[]; total: number };
  createProduct: (input: Pick<StoreProduct, "name" | "category" | "price" | "description" | "manufacturingDays">) => StoreProduct;
  createCampaign: (input: Omit<StoreCampaign, "id" | "sellerId" | "currentOrders" | "status">, submit: boolean) => StoreCampaign;
  approveCampaign: (id: string) => void;
  rejectCampaign: (id: string, reason: string) => void;
  activateCampaign: (id: string) => void;
  cancelCampaign: (id: string) => void;
  placeOrder: (campaignId: string, quantity: number, variant: string) => StoreOrder;
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
const credentials: Record<string, { password: string; userId: string; role: DemoRole }> = {
  "customer@preora.demo": { password: "Demo123!", userId: "customer-demo", role: "customer" },
  "seller@preora.demo": { password: "Demo123!", userId: "seller-aurora", role: "seller" },
  "seller.b@preora.demo": { password: "Demo123!", userId: "seller-auralis", role: "seller" },
  "admin@preora.demo": { password: "Demo123!", userId: "admin-demo", role: "admin" },
  "partner@preora.demo": { password: "Demo123!", userId: "partner-demo", role: "partner" },
};

function migrateState(raw: unknown): DemoState {
  if (!raw || typeof raw !== "object") return initialState;
  const old = raw as Partial<DemoState> & { version?: number };
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
  let changed = false;
  let orders = state.orders;
  let payments = state.payments;
  const campaigns = state.campaigns.map((campaign) => {
    if (campaign.status === "Đã lên lịch" && campaign.startDate && campaign.startDate <= today && campaign.endDate >= today) {
      changed = true;
      return { ...campaign, status: "Đang hoạt động" as CampaignStatus };
    }
    if (campaign.status === "Đang hoạt động" && campaign.endDate && campaign.endDate < today) {
      changed = true;
      const success = evaluateCampaignOutcome(campaign) === "Thành công";
      if (!success) {
        orders = orders.map((order) => order.campaignId === campaign.id && order.paymentStatus === "Đã thanh toán" ? { ...order, orderStatus: "Đang hoàn tiền" as const, paymentStatus: "Đang hoàn tiền" as const } : order);
        payments = payments.map((payment) => orders.some((order) => order.id === payment.orderId && order.campaignId === campaign.id) ? { ...payment, status: "Đang hoàn tiền" as const } : payment);
      }
      return { ...campaign, status: success ? "Thành công" as const : "Không đạt MOQ" as const };
    }
    return campaign;
  });
  return changed ? { ...state, campaigns, orders, payments } : state;
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      return reconcileLifecycle(saved ? migrateState(JSON.parse(saved)) : initialState);
    } catch {
      return initialState;
    }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  useEffect(() => {
    if (state.demoNow) return;
    const timer = window.setInterval(() => setState((current) => reconcileLifecycle(current)), 60_000);
    return () => window.clearInterval(timer);
  }, [state.demoNow]);

  const value = useMemo<StoreValue>(() => ({
    state,
    setSession(role, userId) {
      const ids: Record<DemoRole, string> = { customer: "customer-demo", seller: "seller-aurora", admin: "admin-demo", partner: "partner-demo" };
      setState((current) => ({ ...current, session: role ? { role, userId: userId || ids[role], demo: true } : null }));
    },
    login(email, password) {
      const account = credentials[email.trim().toLowerCase()];
      if (!account || account.password !== password) return { ok: false, message: "Email hoặc mật khẩu demo không đúng." };
      setState((current) => ({ ...current, session: { role: account.role, userId: account.userId, demo: true } }));
      return { ok: true, role: account.role };
    },
    setDemoNow(value) {
      setState((current) => reconcileLifecycle({ ...current, demoNow: value ? new Date(value).toISOString() : null }));
    },
    syncCampaignLifecycle() {
      setState((current) => reconcileLifecycle(current));
    },
    addCartItem(item) {
      setState((current) => {
        if (current.session?.role !== "customer") return current;
        const campaign = current.campaigns.find((entry) => entry.id === item.campaignId);
        if (!campaign || !isCampaignOrderable(campaign, current) || item.quantity <= 0 || item.unitPrice !== campaign.price) return current;
        const existing = current.cart.find((entry) => entry.campaignId === item.campaignId && entry.variant === item.variant);
        const cart = existing
          ? current.cart.map((entry) => entry === existing ? { ...entry, quantity: entry.quantity + item.quantity, unitPrice: campaign.price } : entry)
          : [...current.cart, { ...item, unitPrice: campaign.price }];
        return { ...current, cart };
      });
    },
    updateCartItem(campaignId, variant, quantity) {
      setState((current) => ({ ...current, cart: quantity <= 0 ? current.cart.filter((item) => !(item.campaignId === campaignId && item.variant === variant)) : current.cart.map((item) => item.campaignId === campaignId && item.variant === variant ? { ...item, quantity } : item) }));
    },
    removeCartItem(campaignId, variant) {
      setState((current) => ({ ...current, cart: current.cart.filter((item) => !(item.campaignId === campaignId && item.variant === variant)) }));
    },
    checkoutCart() {
      if (state.session?.role !== "customer") throw new Error("Vui lòng đăng nhập bằng tài khoản khách hàng.");
      if (state.cart.length === 0) throw new Error("Giỏ hàng đang trống.");
      const validation = validateCheckout(state.cart, state.campaigns, state.demoNow);
      if (!validation.ok) throw new Error(validation.message);
      const groupId = makeId("CHK");
      const createdAt = getEffectiveNow(state).toISOString();
      const orders = state.cart.map((item) => {
        const campaign = state.campaigns.find((entry) => entry.id === item.campaignId)!;
        return {
          id: makeId("PR"),
          customerId: state.session!.userId,
          sellerId: campaign.sellerId,
          campaignId: campaign.id,
          productId: campaign.productId,
          quantity: item.quantity,
          unitPrice: campaign.price,
          total: campaign.price * item.quantity,
          variant: item.variant,
          createdAt,
          orderStatus: "Chờ kết quả chiến dịch" as const,
          paymentStatus: "Đã thanh toán" as const,
        };
      });
      const total = orders.reduce((sum, order) => sum + order.total, 0);
      setState((current) => ({
        ...current,
        orders: [...orders, ...current.orders],
        payments: [...orders.map((order) => ({ id: makeId("PAY"), orderId: order.id, amount: order.total, status: "Đã thanh toán" as const })), ...current.payments],
        campaigns: current.campaigns.map((campaign) => ({ ...campaign, currentOrders: campaign.currentOrders + orders.filter((order) => order.campaignId === campaign.id).reduce((sum, order) => sum + order.quantity, 0) })),
        checkoutGroups: [{ id: groupId, orderIds: orders.map((order) => order.id), total, createdAt }, ...current.checkoutGroups],
        cart: [],
      }));
      return { groupId, orders, total };
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
    placeOrder(campaignId, quantity, variant) {
      const campaign = state.campaigns.find((item) => item.id === campaignId);
      if (state.session?.role !== "customer") throw new Error("Chỉ khách hàng được đặt trước.");
      if (!campaign || !isCampaignOrderable(campaign, state)) throw new Error("Chiến dịch chưa được duyệt, đã hết hạn hoặc không còn nhận đặt trước.");
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Số lượng không hợp lệ.");
      const order: StoreOrder = {
        id: makeId("PR"),
        customerId: state.session.userId,
        sellerId: campaign.sellerId,
        campaignId,
        productId: campaign.productId,
        quantity,
        unitPrice: campaign.price,
        total: campaign.price * quantity,
        variant,
        createdAt: getEffectiveNow(state).toISOString(),
        orderStatus: "Chờ kết quả chiến dịch",
        paymentStatus: "Đã thanh toán",
      };
      setState((current) => ({
        ...current,
        orders: [order, ...current.orders],
        payments: [{ id: makeId("PAY"), orderId: order.id, amount: order.total, status: "Đã thanh toán" }, ...current.payments],
        campaigns: current.campaigns.map((item) => item.id === campaignId ? { ...item, currentOrders: item.currentOrders + quantity } : item),
      }));
      return order;
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
        if (!campaign || campaign.sellerId !== current.session?.userId || campaign.status !== "Thành công" || current.productionRequests.some((item) => item.campaignId === campaignId)) return current;
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
        if (!allowed[request.status].includes(status)) return current;
        if (status === "Đang vận chuyển" && progress < 100) return current;
        const orderStatus = status === "Đang vận chuyển" || status === "Hoàn thành" ? "Đang vận chuyển" : "Đang sản xuất";
        return {
          ...current,
          productionRequests: current.productionRequests.map((item) => item.id === id ? { ...item, progress: Math.max(item.progress, Math.min(progress, 100)), status, updatedAt: getEffectiveNow(current).toISOString() } : item),
          orders: current.orders.map((order) => order.campaignId === request.campaignId ? { ...order, orderStatus } : order),
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
  }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoStore() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemoStore phải được dùng bên trong DemoStoreProvider.");
  return value;
}
