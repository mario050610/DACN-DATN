import { useMemo, useState } from "react";
import { getEffectiveNow, getRemainingDays, isCampaignOrderable, useDemoStore, type DemoRole, type DemoState, type StoreCampaign, type StoreOrder, type StoreProduct } from "./DemoStore";

type Role = "customer" | "seller" | "admin" | "partner";
type CampaignStatus = "Đang hoạt động" | "Chờ duyệt" | "Bản nháp" | "Bị từ chối" | "Thành công" | "Không đạt MOQ" | "Đã lên lịch" | "Đã hủy";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  orders: number;
  moq: number;
  target: number;
  days: number;
  seller: string;
  image: string;
  status: CampaignStatus;
};

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
const go = (path: string) => {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const products: Product[] = [
  { id: 1, name: "Bàn phím cơ Aurora K75", category: "Công nghệ", price: 1290000, orders: 184, moq: 300, target: 500, days: 12, seller: "Aurora Lab", image: "https://images.unsplash.com/photo-1637634789063-7f89a7ec9de7?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 2, name: "Tai nghe không dây Auralis One", category: "Công nghệ", price: 1890000, orders: 426, moq: 400, target: 650, days: 5, seller: "Auralis Studio", image: "https://images.unsplash.com/photo-1572985025058-f27aeca1b8bf?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 3, name: "Balo mô-đun Nomad 24L", category: "Đời sống", price: 990000, orders: 238, moq: 250, target: 450, days: 8, seller: "Northbound", image: "https://images.unsplash.com/photo-1528921581519-52b9d779df2b?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 4, name: "Đồng hồ tối giản Sora", category: "Phụ kiện", price: 1450000, orders: 342, moq: 300, target: 500, days: 3, seller: "Sora Objects", image: "https://images.unsplash.com/photo-1531522897097-9085662b9e68?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 5, name: "Artbook Sài Gòn Ban Mai", category: "Sách & Nghệ thuật", price: 459000, orders: 526, moq: 500, target: 700, days: 7, seller: "Mây Studio", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 6, name: "Áo khoác LUMI phiên bản 2026", category: "Thời trang", price: 649000, orders: 438, moq: 400, target: 600, days: 8, seller: "LUMI Wear", image: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 7, name: "Máy ảnh bỏ túi Pico", category: "Công nghệ", price: 2390000, orders: 91, moq: 200, target: 350, days: 18, seller: "Pico Lab", image: "https://images.unsplash.com/photo-1630583206477-f232a811f672?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 8, name: "Bộ phụ kiện bàn làm việc Mono", category: "Đời sống", price: 790000, orders: 155, moq: 220, target: 400, days: 14, seller: "Mono Works", image: "https://images.unsplash.com/photo-1563048976-a4b782e2b083?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 9, name: "Mô hình Neko Moon", category: "Sưu tầm", price: 799000, orders: 782, moq: 700, target: 850, days: 2, seller: "Tiny Planet", image: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 10, name: "Bộ keycap Đà Lạt Mù Sương", category: "Công nghệ", price: 690000, orders: 103, moq: 180, target: 300, days: 20, seller: "Aurora Lab", image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 11, name: "Sổ tay tái chế Terra", category: "Văn phòng phẩm", price: 219000, orders: 286, moq: 250, target: 500, days: 6, seller: "Terra Paper", image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
  { id: 12, name: "Đèn bàn thông minh Halo", category: "Nhà cửa", price: 1190000, orders: 78, moq: 180, target: 320, days: 22, seller: "Halo Living", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&h=680&fit=crop&auto=format", status: "Đang hoạt động" },
];

const sellerNames: Record<string, string> = {
  "seller-aurora": "Aurora Lab", "seller-auralis": "Auralis Studio", "seller-north": "Northbound", "seller-sora": "Sora Objects",
  "seller-may": "Mây Studio", "seller-lumi": "LUMI Wear", "seller-pico": "Pico Lab", "seller-mono": "Mono Works",
  "seller-tiny": "Tiny Planet", "seller-terra": "Terra Paper", "seller-halo": "Halo Living",
};

function toUiProduct(product: StoreProduct, campaign: StoreCampaign, state: DemoState): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: campaign.price,
    orders: campaign.currentOrders,
    moq: campaign.moq,
    target: campaign.target,
    days: getRemainingDays(campaign, state),
    seller: sellerNames[product.sellerId] || "PREORA Seller",
    image: product.image,
    status: campaign.status as CampaignStatus,
  };
}

const navByRole: Record<Role, { label: string; path: string }[]> = {
  customer: [
    { label: "Khám phá sản phẩm", path: "customer-home" }, { label: "Tổng quan", path: "account" }, { label: "Đơn hàng", path: "orders" }, { label: "Yêu thích", path: "wishlist" },
    { label: "Thông báo", path: "notifications" }, { label: "Trung tâm trợ giúp", path: "customer-help" }, { label: "Hộp thư hỗ trợ", path: "customer-support" },
    { label: "Hướng dẫn sử dụng", path: "customer-guide" }, { label: "Hồ sơ", path: "profile" },
  ],
  seller: [
    { label: "Khám phá sản phẩm", path: "seller-home" }, { label: "Tổng quan", path: "seller" }, { label: "Sản phẩm", path: "seller-products" }, { label: "Chiến dịch", path: "seller-campaigns" },
    { label: "Đơn đặt trước", path: "seller-orders" }, { label: "Dự báo AI", path: "seller-ai" }, { label: "Khả năng thành công", path: "seller-success" },
    { label: "Phân tích", path: "seller-analytics" }, { label: "Sản xuất", path: "seller-production" }, { label: "Tài chính", path: "seller-finance" },
    { label: "Trung tâm trợ giúp", path: "seller-help" }, { label: "Hộp thư hỗ trợ", path: "seller-support" },
    { label: "Hướng dẫn sử dụng", path: "seller-guide" }, { label: "Cài đặt", path: "seller-settings" },
  ],
  admin: [
    { label: "Khám phá sản phẩm", path: "admin-home" }, { label: "Tổng quan", path: "admin" }, { label: "Người dùng", path: "admin-users" }, { label: "Xác minh người bán", path: "admin-sellers" },
    { label: "Duyệt chiến dịch", path: "admin-campaigns" }, { label: "Giao dịch", path: "admin-transactions" },
    { label: "Khiếu nại", path: "admin-disputes" }, { label: "Phân tích", path: "admin-analytics" }, { label: "Trung tâm trợ giúp", path: "admin-help" },
    { label: "Hộp thư hỗ trợ", path: "admin-support" }, { label: "Hướng dẫn sử dụng", path: "admin-guide" }, { label: "Danh mục & Cài đặt", path: "admin-settings" },
  ],
  partner: [
    { label: "Khám phá sản phẩm", path: "partner-home" }, { label: "Tổng quan", path: "partner" }, { label: "Yêu cầu sản xuất", path: "partner-requests" },
    { label: "Tiến độ", path: "partner-production" }, { label: "Trung tâm trợ giúp", path: "partner-help" }, { label: "Hộp thư hỗ trợ", path: "partner-support" },
    { label: "Hướng dẫn sử dụng", path: "partner-guide" }, { label: "Hồ sơ", path: "partner-profile" },
  ],
};

function Logo({ light = false, homePath = "" }: { light?: boolean; homePath?: string }) {
  return (
    <button onClick={() => go(homePath)} className="flex items-center gap-2.5" aria-label="Về trang chủ">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-lg font-black text-white shadow-sm">P</span>
      <span className={`font-mono text-lg font-bold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>PRE<span className="text-teal-500">ORA</span></span>
    </button>
  );
}

function DemoClock() {
  const { state, setDemoNow } = useDemoStore();
  const [value, setValue] = useState((state.demoNow || new Date().toISOString()).slice(0, 10));
  return <div className="hidden items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 xl:flex"><span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Đồng hồ mô phỏng</span><input type="date" value={value} onChange={(event) => setValue(event.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 outline-none" /><button onClick={() => setDemoNow(`${value}T12:00:00`)} className="text-xs font-bold text-teal-700">Áp dụng</button>{state.demoNow && <button onClick={() => { setDemoNow(null); setValue(new Date().toISOString().slice(0, 10)); }} className="text-xs font-bold text-rose-600">Về thời gian thật</button>}</div>;
}

function Status({ children }: { children: string }) {
  const tone = children.includes("Thành công") || children.includes("Đã giao") || children.includes("Đã thanh toán") || children.includes("hoạt động")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : children.includes("Không") || children.includes("Từ chối") || children.includes("Hủy")
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : children.includes("Chờ") || children.includes("Sản xuất")
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{children}</span>;
}

function Progress({ value, accent = false }: { value: number; accent?: boolean }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${accent ? "bg-orange-500" : "bg-teal-600"}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function PublicHeader({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <button onClick={() => go("explore")} className="hover:text-teal-700">Khám phá</button>
          <button onClick={() => go("how")} className="hover:text-teal-700">Cách hoạt động</button>
          <button onClick={() => go("seller")} className="hover:text-teal-700">Bắt đầu bán hàng</button>
          <button onClick={() => go("help")} className="hover:text-teal-700">Trợ giúp</button>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => go("cart")} className="relative rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            Giỏ hàng {cartCount > 0 && <span className="ml-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] text-white">{cartCount}</span>}
          </button>
          <button onClick={() => go("login")} className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 sm:block">Đăng nhập</button>
          <button onClick={() => go("register")} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Đăng ký</button>
        </div>
      </div>
    </header>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>}
        <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-950 lg:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ProductCard({ product, onSave, pathPrefix = "product" }: { product: Product; onSave: (id: number) => void; pathPrefix?: string }) {
  const pct = (product.orders / product.moq) * 100;
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-950/5">
      <button onClick={() => go(`${pathPrefix}/${product.id}`)} className="block w-full text-left">
        <div className="relative h-52 overflow-hidden bg-slate-100">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">{product.days} ngày còn lại</span>
        </div>
        <div className="p-5">
          <p className="mb-1 font-mono text-xs font-medium text-teal-700">{product.category} · {product.seller}</p>
          <h2 className="min-h-12 font-semibold leading-6 text-slate-900">{product.name}</h2>
          <p className="mt-2 font-serif text-xl font-bold text-slate-950">{money(product.price)}</p>
          <div className="mb-2 mt-4 flex justify-between text-xs text-slate-500">
            <span>{product.orders} đơn · MOQ {product.moq}</span><span className="font-semibold text-teal-700">{pct.toFixed(1)}%</span>
          </div>
          <Progress value={pct} accent={pct < 60} />
        </div>
      </button>
      <div className="border-t border-slate-100 p-3">
        <button onClick={() => onSave(product.id)} className="w-full rounded-lg py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-teal-700">Lưu sản phẩm</button>
      </div>
    </article>
  );
}

function Explore({ onSave }: { onSave: (id: number) => void }) {
  const { state } = useDemoStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [sort, setSort] = useState("Mới nhất");
  const activeProducts = state.campaigns.filter((campaign) => isCampaignOrderable(campaign, state)).map((campaign) => {
    const product = state.products.find((item) => item.id === campaign.productId);
    return product ? toUiProduct(product, campaign, state) : null;
  }).filter((item): item is Product => Boolean(item));
  const filtered = useMemo(() => activeProducts
    .filter((p) => (category === "Tất cả" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "Sắp kết thúc" ? a.days - b.days : sort === "Tiến độ cao" ? b.orders / b.moq - a.orders / a.moq : b.id - a.id), [query, category, sort, state.campaigns, state.products]);
  return (
    <>
      <PublicHeader cartCount={0} />
      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12">
            <PageTitle eyebrow="C01 · Marketplace" title="Khám phá sản phẩm" description="Khám phá những ý tưởng đang được cộng đồng xác nhận trước khi bước vào sản xuất." />
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_210px_190px]">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên sản phẩm, cửa hàng..." className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500">
                {["Tất cả", ...Array.from(new Set(activeProducts.map((p) => p.category)))].map((x) => <option key={x}>{x}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500">
                {["Mới nhất", "Tiến độ cao", "Sắp kết thúc"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-10">
          <div className="mb-5 flex items-center justify-between"><p className="text-sm text-slate-500"><strong className="text-slate-900">{filtered.length}</strong> chiến dịch đang hiển thị</p><button onClick={() => { setQuery(""); setCategory("Tất cả"); }} className="text-sm font-semibold text-teal-700">Xóa bộ lọc</button></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((p) => <ProductCard key={p.id} product={p} onSave={onSave} />)}</div>
        </section>
      </main>
    </>
  );
}

function ProductDetail({ product, onAdd, onSave, saved }: { product: Product; onAdd: (id: number, variant: string) => void; onSave: (id: number) => void; saved: boolean }) {
  const { state } = useDemoStore();
  const [variant, setVariant] = useState("Xanh Midnight");
  const pct = (product.orders / product.moq) * 100;
  const endDate = new Date(getEffectiveNow(state).getTime() + product.days * 86_400_000);
  const productionDate = new Date(endDate.getTime() + 5 * 86_400_000);
  const deliveryDate = new Date(productionDate.getTime() + 45 * 86_400_000);
  const dateLabel = (date: Date) => date.toLocaleDateString("vi-VN");
  return (
    <>
      <PublicHeader cartCount={0} />
      <main className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 text-sm text-slate-500"><button onClick={() => go("explore")}>Khám phá</button> <span className="mx-2">/</span> {product.name}</div>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 lg:grid-cols-[1.12fr_.88fr]">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100"><img src={product.image} alt={product.name} className="h-full w-full object-cover" /></div>
            <div className="mt-3 grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((x) => <button key={x} className={`aspect-square overflow-hidden rounded-xl border-2 ${x === 1 ? "border-teal-500" : "border-transparent"}`}><img src={product.image} alt="" className="h-full w-full object-cover" /></button>)}</div>
          </div>
          <div className="lg:pt-3">
            <div className="mb-4 flex items-center gap-2"><Status>Đang hoạt động</Status><span className="text-sm text-slate-500">{product.category}</span></div>
            <h1 className="font-serif text-4xl font-bold leading-tight text-slate-950">{product.name}</h1>
            <button onClick={() => go("seller-profile")} className="mt-3 text-sm font-semibold text-teal-700">Bởi {product.seller} · Xem cửa hàng</button>
            <p className="mt-7 font-serif text-3xl font-bold text-slate-950">{money(product.price)}</p>
            <p className="mt-2 text-sm text-slate-500">Giá ưu đãi dành riêng cho giai đoạn đặt trước</p>
            <div className="my-7 rounded-2xl border border-teal-200 bg-teal-50 p-5">
              <div className="flex justify-between"><div><p className="text-sm text-slate-600">Đã có <strong className="text-slate-950">{product.orders} lượt đặt trước</strong></p><p className="mt-1 text-xs text-slate-500">MOQ: {product.moq} sản phẩm · Mục tiêu: {product.target}</p></div><strong className="text-teal-700">{pct.toFixed(1)}%</strong></div>
              <div className="mt-4"><Progress value={pct} /></div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-teal-200 pt-4 text-sm"><div><span className="block text-xs text-slate-500">Còn lại</span><strong>{product.days} ngày</strong></div><div><span className="block text-xs text-slate-500">Giao dự kiến</span><strong>Tháng 07/2026</strong></div></div>
            </div>
            <label className="text-sm font-semibold text-slate-800">Phiên bản</label>
            <div className="mt-2 flex flex-wrap gap-2">{["Xanh Midnight", "Trắng Cloud", "Đen Graphite"].map((x) => <button key={x} onClick={() => setVariant(x)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${variant === x ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 text-slate-600"}`}>{x}</button>)}</div>
            <div className="mt-7 grid grid-cols-[1fr_auto] gap-3">
              <button onClick={() => { onAdd(product.id, variant); go("cart"); }} className="rounded-xl bg-teal-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-teal-700/15 hover:bg-teal-700">Đặt trước ngay</button>
              <button onClick={() => onSave(product.id)} className="rounded-xl border border-slate-200 px-5 py-3.5 font-semibold text-slate-700">{saved ? "Đã lưu" : "Lưu sản phẩm"}</button>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Sản phẩm này được bán trước khi sản xuất. Chỉ khi chiến dịch đạt MOQ, sản xuất mới được xác nhận. Nếu không đạt MOQ, khoản thanh toán sẽ được hoàn theo chính sách.</p>
          </div>
        </section>
        <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-3"><div className="lg:col-span-2"><PageTitle title="Thiết kế cho trải nghiệm tốt hơn" /><p className="leading-7 text-slate-600">Được phát triển cùng cộng đồng người dùng Việt Nam, sản phẩm cân bằng giữa thẩm mỹ tối giản, chất liệu bền vững và khả năng sử dụng lâu dài. Mỗi đơn đặt trước là một tín hiệu nhu cầu thực giúp đội ngũ sản xuất chính xác hơn và giảm tồn kho.</p><h2 className="mt-8 font-serif text-2xl font-bold">Thông số kỹ thuật</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{["Vật liệu cao cấp, bền vững", "Bảo hành chính hãng 12 tháng", "Thiết kế và hoàn thiện tại Việt Nam", "Đóng gói không nhựa dùng một lần"].map((x) => <div key={x} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{x}</div>)}</div></div><aside className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-serif text-xl font-bold">Lộ trình dự kiến</h3>{[["Kết thúc đặt trước", dateLabel(endDate)], ["Xác nhận sản xuất sớm nhất", dateLabel(productionDate)], ["Giao hàng dự kiến", dateLabel(deliveryDate)]].map(([a, b]) => <div key={a} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{a}</span><strong>{b}</strong></div>)}</aside></div></section>
      </main>
    </>
  );
}

function Cart() {
  const { state, updateCartItem, removeCartItem } = useDemoStore();
  const total = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return <><PublicHeader cartCount={state.cart.reduce((sum, item) => sum + item.quantity, 0)} /><main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-5 py-12"><PageTitle eyebrow="C04" title="Giỏ hàng đặt trước" description="Số lượng, phiên bản và chiến dịch được lưu qua refresh trong dữ liệu demo." />{state.cart.length === 0 ? <Empty title="Giỏ hàng đang trống" text="Không có sản phẩm mặc định nào được tự động thêm. Hãy chọn một chiến dịch đang hoạt động." action="Khám phá sản phẩm" path="customer-home" /> : <div className="grid gap-8 lg:grid-cols-[1fr_360px]"><div className="space-y-4">{state.cart.map((item) => { const product = state.products.find((entry) => entry.id === item.productId); const campaign = state.campaigns.find((entry) => entry.id === item.campaignId); const eligible = campaign ? isCampaignOrderable(campaign, state) : false; return <div key={`${item.campaignId}-${item.variant}`} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-4"><img src={product?.image} alt={product?.name} className="h-28 w-28 rounded-xl object-cover" /><div className="flex-1"><Status>{eligible ? "Đang hoạt động" : "Không còn nhận đơn"}</Status><h2 className="mt-2 font-semibold text-slate-900">{product?.name}</h2><p className="mt-1 text-sm text-slate-500">{item.variant} · {money(item.unitPrice)}</p><div className="mt-3 flex items-center gap-2"><button onClick={() => updateCartItem(item.campaignId, item.variant, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200">−</button><strong className="w-8 text-center">{item.quantity}</strong><button onClick={() => updateCartItem(item.campaignId, item.variant, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200">+</button></div><p className="mt-3 font-serif text-lg font-bold">{money(item.unitPrice * item.quantity)}</p></div><button onClick={() => removeCartItem(item.campaignId, item.variant)} className="self-start text-sm font-semibold text-rose-600">Xóa</button></div>; })}</div><aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Tóm tắt đơn hàng</h2><div className="mt-5 flex justify-between border-b border-slate-100 pb-4 text-sm"><span>{state.cart.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span><strong>{money(total)}</strong></div><button onClick={() => go("checkout")} disabled={state.cart.some((item) => { const campaign = state.campaigns.find((entry) => entry.id === item.campaignId); return !campaign || !isCampaignOrderable(campaign, state); })} className="mt-6 w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Tiến hành xác nhận</button><p className="mt-4 text-xs leading-5 text-slate-500">Checkout mô phỏng sẽ tạo từng đơn theo đúng chiến dịch và người bán.</p></aside></div>}</div></main></>;
}

function Checkout({ onComplete }: { onComplete: (result: { groupId: string; orders: StoreOrder[]; total: number }) => void }) {
  const { state, checkoutCart } = useDemoStore();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const total = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const submit = () => {
    if (!confirmed) setError("Vui lòng xác nhận điều kiện đặt trước.");
    else {
      setSubmitting(true);
      try { onComplete(checkoutCart()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể hoàn tất checkout."); setSubmitting(false); }
    }
  };
  if (state.cart.length === 0) return <><PublicHeader cartCount={0} /><main className="min-h-screen bg-slate-50 p-8"><Empty title="Không thể checkout giỏ hàng trống" text="Không có đơn hoặc payment nào được tạo." action="Về giỏ hàng" path="cart" /></main></>;
  return (
    <><PublicHeader cartCount={state.cart.reduce((sum, item) => sum + item.quantity, 0)} /><main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-6xl px-5 py-12"><PageTitle eyebrow="C05 · Thanh toán mô phỏng" title="Xác nhận đơn đặt trước" description="Không nhập thông tin thẻ hoặc tài khoản ngân hàng thật." />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]"><div className="space-y-5"><FormSection title="Thông tin liên hệ"><div className="grid gap-4 sm:grid-cols-2"><Field label="Họ và tên" value="Nguyễn Minh Anh" /><Field label="Số điện thoại" value="090 123 4567" /><div className="sm:col-span-2"><Field label="Email" value="minhanh@example.com" /></div></div></FormSection><FormSection title="Địa chỉ giao hàng"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Địa chỉ" value="21 Nguyễn Thị Minh Khai" /></div><Field label="Quận/Huyện" value="Quận 1" /><Field label="Tỉnh/Thành phố" value="TP. Hồ Chí Minh" /></div></FormSection><FormSection title="Phương thức thanh toán"><label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-teal-500 bg-teal-50 p-4"><input type="radio" checked readOnly className="mt-1 accent-teal-600" /><span><strong className="block text-sm">Ví điện tử mô phỏng</strong><span className="mt-1 block text-xs text-slate-500">Giao dịch demo, không phát sinh thanh toán thực tế.</span></span></label></FormSection></div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Đơn đặt trước</h2>{state.cart.map((item) => { const product = state.products.find((entry) => entry.id === item.productId); return <div key={`${item.campaignId}-${item.variant}`} className="flex gap-3 border-b border-slate-100 py-4"><img src={product?.image} alt="" className="h-14 w-14 rounded-lg object-cover" /><div className="flex-1 text-sm"><strong>{product?.name}</strong><p className="mt-1 text-slate-500">{item.variant} · SL: {item.quantity}</p></div><span className="text-sm font-semibold">{money(item.unitPrice * item.quantity)}</span></div>; })}<div className="flex justify-between py-5 font-bold"><span>Tổng cộng</span><span>{money(total)}</span></div><label className="flex items-start gap-3 text-sm leading-5 text-slate-600"><input type="checkbox" checked={confirmed} onChange={(e) => { setConfirmed(e.target.checked); setError(""); }} className="mt-1 accent-teal-600" />Tôi hiểu đây là sản phẩm đặt trước, thời gian giao có thể thay đổi và sản xuất chỉ bắt đầu sau khi đạt MOQ.</label>{error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}<button disabled={submitting} onClick={submit} className="mt-5 w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white disabled:opacity-50">{submitting ? "Đang tạo đơn..." : `Xác nhận ${state.cart.length} đơn đặt trước`}</button></aside></div>
    </div></main></>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="mb-5 font-serif text-xl font-bold">{title}</h2>{children}</section>;
}

function Field({ label, value = "" }: { label: string; value?: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input defaultValue={value} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>;
}

function Confirmation({ orders }: { orders: StoreOrder[] }) {
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  return <><PublicHeader cartCount={0} /><main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-50 px-5 py-12"><div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal-50 text-3xl font-bold text-teal-600">✓</div><p className="mt-7 font-mono text-xs font-semibold uppercase tracking-widest text-teal-700">{orders.length} đơn đặt trước đã được tạo</p><h1 className="mt-3 font-serif text-4xl font-bold text-slate-950">Đặt trước thành công</h1><p className="mx-auto mt-4 max-w-lg leading-7 text-slate-500">Mỗi sản phẩm đã tạo một pre-order đúng chiến dịch và người bán. Tiến độ MOQ được cộng theo số lượng sản phẩm.</p><div className="mt-6 space-y-2 rounded-2xl bg-slate-50 p-5 text-left">{orders.map((order) => <div key={order.id} className="flex justify-between gap-4 text-sm"><span className="font-mono text-teal-700">{order.id}</span><strong>{money(order.total)}</strong></div>)}</div><div className="mt-5 flex justify-between rounded-xl border border-slate-200 p-4 font-bold"><span>Tổng giao dịch mô phỏng</span><span>{money(total)}</span></div><div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={() => go("orders")} className="rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white">Xem đơn hàng của tôi</button><button onClick={() => go("customer-home")} className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700">Tiếp tục khám phá</button></div></div></main></>;
}

function Auth({ mode }: { mode: "login" | "register" | "forgot" }) {
  const { login } = useDemoStore();
  const [email, setEmail] = useState("customer@preora.demo");
  const [password, setPassword] = useState("Demo123!");
  const [confirmation, setConfirmation] = useState("Demo123!");
  const [error, setError] = useState("");
  const titles = { login: "Chào mừng trở lại", register: "Tạo tài khoản PREORA", forgot: "Khôi phục mật khẩu" };
  const authenticate = () => {
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Vui lòng nhập email hợp lệ.");
    if (mode === "forgot") return go("login");
    if (!password) return setError("Vui lòng nhập mật khẩu.");
    if (mode === "register") {
      if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");
      if (password !== confirmation) return setError("Xác nhận mật khẩu không khớp.");
      return setError("Đăng ký production chưa được kết nối. Hãy dùng tài khoản demo bên dưới.");
    }
    const result = login(email, password);
    if (!result.ok || !result.role) return setError(result.message || "Không thể đăng nhập.");
    const destinations: Record<DemoRole, string> = { customer: "account", seller: "seller", admin: "admin", partner: "partner" };
    const requested = sessionStorage.getItem("preora-return-route");
    sessionStorage.removeItem("preora-return-route");
    go(requested || destinations[result.role]);
  };
  return <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2"><section className="hidden flex-col justify-between overflow-hidden p-12 lg:flex"><Logo light /><div><p className="font-mono text-xs font-semibold uppercase tracking-[.2em] text-teal-400">Thương mại từ nhu cầu thật</p><h1 className="mt-5 max-w-xl font-serif text-5xl font-bold leading-tight text-white">Ra mắt sản phẩm thông minh hơn, trước khi sản xuất.</h1><p className="mt-5 max-w-lg leading-7 text-slate-400">Đây là authentication demo phía client, không phải bảo mật production.</p></div></section><section className="grid place-items-center bg-white px-5 py-12"><div className="w-full max-w-md"><p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700">Tài khoản demo</p><h2 className="mt-3 font-serif text-3xl font-bold">{titles[mode]}</h2><div className="mt-8 space-y-4">{mode === "register" && <Field label="Họ và tên" />}<label className="block text-sm font-semibold">Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" /></label>{mode !== "forgot" && <label className="block text-sm font-semibold">Mật khẩu<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" /></label>}{mode === "register" && <label className="block text-sm font-semibold">Xác nhận mật khẩu<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" /></label>}</div>{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}<button onClick={authenticate} className="mt-6 w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white">{mode === "login" ? "Đăng nhập" : mode === "register" ? "Đăng ký" : "Gửi liên kết khôi phục"}</button>{mode === "login" && <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Thông tin demo:</strong><br />customer@preora.demo / Demo123!<br />seller@preora.demo / Demo123!<br />admin@preora.demo / Demo123!<br />partner@preora.demo / Demo123!</div>}<DemoSwitcher /></div></section></main>;
}

function DemoSwitcher() {
  const { setSession } = useDemoStore();
  const accounts: [string, DemoRole, string, string?][] = [["Khách hàng", "customer", "account"], ["Người bán A", "seller", "seller", "seller-aurora"], ["Người bán B", "seller", "seller", "seller-auralis"], ["Quản trị viên", "admin", "admin"], ["Đối tác SX", "partner", "partner"]];
  return <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chuyển tài khoản demo</p><p className="mt-1 text-[11px] text-slate-400">Chỉ dùng để trình diễn, tách biệt với đăng nhập production.</p><div className="mt-3 grid grid-cols-2 gap-2">{accounts.map(([label, role, path, userId]) => <button key={`${role}-${userId || "default"}`} onClick={() => { setSession(role, userId); go(path); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700">{label}</button>)}</div></div>;
}

function DashboardShell({ role, page, children }: { role: Role; page: string; children: React.ReactNode }) {
  const { state, setSession, resetDemo } = useDemoStore();
  const sessionUser = state.users.find((user) => user.id === state.session?.userId);
  const names = { customer: "Nguyễn Minh Anh", seller: "Aurora Lab", admin: "Lê Khánh · Admin", partner: "VietCraft Manufacturing" };
  const displayName = sessionUser?.name || names[role];
  const homePath = `${role}-home`;
  const notificationPath = role === "customer" ? "notifications" : `${role}-notifications`;
  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[260px] flex-col overflow-hidden bg-slate-950 p-5 lg:flex"><div className="shrink-0"><Logo light homePath={homePath} /><p className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">{role === "seller" ? "Cổng người bán" : role === "admin" ? "Quản trị hệ thống" : role === "partner" ? "Đối tác sản xuất" : "Tài khoản khách hàng"}</p></div><nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">{navByRole[role].map((item) => <button key={item.path} onClick={() => go(item.path)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${page === item.path ? "bg-teal-600 text-white shadow-lg shadow-teal-950/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{item.label}</button>)}</nav><div className="mt-3 shrink-0 border-t border-white/10 bg-slate-950 pt-3"><button onClick={() => { setSession(null); go("login"); }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">Đăng xuất tài khoản demo</button><button onClick={() => confirm("Khôi phục toàn bộ dữ liệu demo ban đầu?") && resetDemo()} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-600 hover:text-rose-400">Đặt lại dữ liệu demo</button></div></aside><div className="min-w-0 lg:ml-[260px]"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8"><div className="lg:hidden"><Logo homePath={homePath} /></div><div className="hidden text-sm text-slate-500 lg:block">PREORA / <strong className="text-slate-900">{navByRole[role].find((x) => x.path === page)?.label || "Chi tiết"}</strong></div><div className="flex items-center gap-3"><DemoClock /><button onClick={() => go(notificationPath)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">3</button><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-900">{displayName}</p><p className="text-xs text-slate-500">Tài khoản demo</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{displayName.slice(0, 2).toUpperCase()}</span></div></header><nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-5 py-3 lg:hidden">{navByRole[role].map((item) => <button key={item.path} onClick={() => go(item.path)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${page === item.path ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>)}</nav><main className="p-5 lg:p-8">{children}</main></div></div>;
}

function Kpis({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((x) => <div key={x.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{x.label}</p><p className="mt-2 font-serif text-3xl font-bold text-slate-950">{x.value}</p>{x.note && <p className="mt-2 text-xs font-medium text-teal-700">{x.note}</p>}</div>)}</div>;
}

function Chart({ forecast = false }: { forecast?: boolean }) {
  const actual = "0,145 45,133 90,128 135,110 180,104 225,87 270,77 315,63 360,54";
  const predicted = "360,54 405,42 450,32 495,21 540,13";
  return <div className="relative h-64 w-full overflow-hidden"><svg viewBox="0 0 540 170" className="h-full w-full" preserveAspectRatio="none">{[20, 55, 90, 125, 160].map((y) => <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />)}{forecast && <path d="M360 70 L405 58 L450 47 L495 34 L540 25 L540 5 L495 12 L450 25 L405 37 L360 48 Z" fill="#ccfbf1" opacity=".8" />}<polyline points={actual} fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{forecast && <polyline points={predicted} fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="8 7" strokeLinecap="round" />}{forecast && <line x1="0" x2="540" y1="38" y2="38" stroke="#f97316" strokeWidth="2" strokeDasharray="6 6" />}</svg><div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-400"><span>02/04</span><span>10/04</span><span>18/04</span><span>26/04</span><span>02/05</span></div></div>;
}

function ForecastChart({ campaign, forecast }: { campaign: StoreCampaign; forecast?: import("./DemoStore").StoreForecast }) {
  const observed = forecast?.observedSeries.length ? forecast.observedSeries : [{ date: campaign.startDate, cumulative: campaign.currentOrders }];
  const predicted = forecast?.predictedSeries || [];
  const maxValue = Math.max(campaign.target, campaign.moq, ...observed.map((item) => item.cumulative), ...predicted.map((item) => item.upper), 1);
  const points = [...observed.map((item) => ({ date: item.date, value: item.cumulative, kind: "observed" as const })), ...predicted.map((item) => ({ date: item.date, value: item.cumulative, kind: "predicted" as const }))];
  const width = 720;
  const height = 240;
  const x = (index: number) => points.length <= 1 ? 20 : 20 + index / (points.length - 1) * (width - 40);
  const y = (value: number) => height - 28 - value / maxValue * (height - 52);
  const observedPath = observed.map((item, index) => `${index ? "L" : "M"}${x(index)},${y(item.cumulative)}`).join(" ");
  const predictedPath = predicted.map((item, index) => `${index ? "L" : "M"}${x(observed.length - 1 + index)},${y(item.cumulative)}`).join(" ");
  const interval = predicted.length ? `M ${predicted.map((item, index) => `${x(observed.length - 1 + index)},${y(item.upper)}`).join(" L ")} L ${[...predicted].reverse().map((item, reverseIndex) => `${x(points.length - 1 - reverseIndex)},${y(item.lower)}`).join(" L ")} Z` : "";
  return <div className="mt-5"><svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full"><line x1="20" x2={width - 20} y1={y(campaign.moq)} y2={y(campaign.moq)} stroke="#f97316" strokeDasharray="7 6" /><line x1="20" x2={width - 20} y1={y(campaign.target)} y2={y(campaign.target)} stroke="#94a3b8" strokeDasharray="3 5" />{interval && <path d={interval} fill="#bfdbfe" opacity=".5" />}<path d={observedPath} fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" />{predictedPath && <path d={predictedPath} fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray="8 6" strokeLinecap="round" />}{points.map((point, index) => <circle key={`${point.date}-${index}`} cx={x(index)} cy={y(point.value)} r="4" fill={point.kind === "observed" ? "#0d9488" : "#2563eb"} />)}</svg><div className="flex justify-between text-xs text-slate-400"><span>{campaign.startDate}</span><span>{forecast ? `Dự báo lúc ${new Date(forecast.createdAt).toLocaleString("vi-VN")}` : "Chưa có dự báo"}</span><span>{campaign.endDate}</span></div>{!campaign.dailyObservations?.length && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Thiếu lịch sử đơn theo ngày. Biểu đồ chỉ hiển thị quan sát tổng hiện có; không nội suy thành dữ liệu lịch sử thật.</p>}</div>;
}

function SellerOverview() {
  const { state } = useDemoStore();
  const sellerOrders = state.orders.filter((order) => order.sellerId === state.session?.userId);
  const sellerCampaigns = state.campaigns.filter((campaign) => campaign.sellerId === state.session?.userId);
  const revenue = sellerOrders.filter((order) => order.paymentStatus === "Đã thanh toán").reduce((sum, order) => sum + order.total, 0);
  const completed = sellerCampaigns.filter((campaign) => ["Thành công", "Không đạt MOQ"].includes(campaign.status));
  const successRate = completed.length ? Math.round(completed.filter((campaign) => campaign.status === "Thành công").length / completed.length * 100) : 0;
  const latestForecast = state.forecasts.find((forecast) => sellerCampaigns.some((campaign) => campaign.id === forecast.campaignId));
  return <DashboardShell role="seller" page="seller"><PageTitle eyebrow="S01" title="Tổng quan cửa hàng" description="Theo dõi hiệu suất chiến dịch và những quyết định cần ưu tiên hôm nay." action={<div className="flex gap-2"><button onClick={() => go("seller-product-new")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">Tạo sản phẩm</button><button onClick={() => go("seller-campaign-new")} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Tạo chiến dịch</button></div>} /><Kpis items={[{ label: "Đơn đặt trước", value: String(sellerOrders.reduce((sum, order) => sum + order.quantity, 0)), note: "Cập nhật từ checkout" }, { label: "Doanh thu đặt trước", value: money(revenue), note: "Thanh toán mô phỏng" }, { label: "Chiến dịch hoạt động", value: String(sellerCampaigns.filter((campaign) => campaign.status === "Đang hoạt động").length), note: `${sellerCampaigns.filter((campaign) => campaign.status === "Chờ duyệt").length} chờ duyệt` }, { label: "Tỷ lệ đạt MOQ", value: `${successRate}%`, note: "Từ chiến dịch đã kết thúc" }]} /><div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex justify-between"><div><h2 className="font-serif text-xl font-bold">Xu hướng đặt trước</h2><p className="mt-1 text-sm text-slate-500">Dữ liệu demo dùng chung</p></div><Status>Đang hoạt động</Status></div><Chart /></section><section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white"><p className="font-mono text-xs uppercase tracking-widest text-teal-400">Đề xuất AI</p><h2 className="mt-3 font-serif text-2xl font-bold">{latestForecast ? `Dự báo gần nhất: ${latestForecast.predictedDemand} đơn.` : "Chưa có dự báo mới."}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{latestForecast ? `Xác suất đạt MOQ mô phỏng ${latestForecast.successProbability}%. Kết quả không bảo đảm thành công.` : "Chọn một chiến dịch để tạo dự báo nhu cầu mô phỏng."}</p><button onClick={() => go("seller-ai")} className="mt-6 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950">Xem dự báo chi tiết</button></section></div><CampaignTable /></DashboardShell>;
}

function CampaignTable() {
  const { state, activateCampaign, finishCampaign, createProductionRequest, cancelCampaign } = useDemoStore();
  const campaigns = state.campaigns.filter((campaign) => campaign.sellerId === state.session?.userId);
  return <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 p-5"><h2 className="font-serif text-xl font-bold">Chiến dịch gần đây</h2><button onClick={() => go("seller-campaigns")} className="text-sm font-semibold text-teal-700">Xem tất cả</button></div><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Chiến dịch</th><th className="px-5 py-3">Tiến độ MOQ</th><th className="px-5 py-3">Mục tiêu</th><th className="px-5 py-3">Kết thúc</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3"></th></tr></thead><tbody>{campaigns.slice(0, 8).map((campaign) => <tr key={campaign.id} className="border-t border-slate-100"><td className="px-5 py-4"><strong className="block">{campaign.name}</strong><span className="text-xs text-slate-500">{campaign.id}</span>{campaign.rejectionReason && <span className="mt-1 block text-xs text-rose-600">{campaign.rejectionReason}</span>}</td><td className="px-5 py-4"><div className="w-36"><div className="mb-1 flex justify-between text-xs"><span>{campaign.currentOrders}/{campaign.moq}</span><span>{Math.round(campaign.currentOrders / campaign.moq * 100)}%</span></div><Progress value={campaign.currentOrders / campaign.moq * 100} /></div></td><td className="px-5 py-4 text-slate-500">{campaign.target}</td><td className="px-5 py-4 text-slate-500">{campaign.endDate || "—"}</td><td className="px-5 py-4"><Status>{campaign.status}</Status></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{campaign.status === "Đã lên lịch" && <button onClick={() => activateCampaign(campaign.id)} className="font-semibold text-teal-700">Kích hoạt</button>}{campaign.status === "Đang hoạt động" && <><button disabled={getRemainingDays(campaign, state) > 0} onClick={() => finishCampaign(campaign.id)} className="font-semibold text-orange-600 disabled:opacity-40">{getRemainingDays(campaign, state) > 0 ? `Còn ${getRemainingDays(campaign, state)} ngày` : "Kết thúc"}</button><button onClick={() => confirm("Hủy chiến dịch và chuyển các đơn sang hoàn tiền?") && cancelCampaign(campaign.id)} className="font-semibold text-rose-600">Hủy</button></>}{campaign.status === "Thành công" && <button onClick={() => createProductionRequest(campaign.id)} className="font-semibold text-teal-700">Tạo lệnh SX</button>}<button onClick={() => go("seller-campaign-detail")} className="font-semibold text-slate-600">Chi tiết</button></div></td></tr>)}</tbody></table></div></section>;
}

function SellerAI({ success = false }: { success?: boolean }) {
  const { state, requestForecast } = useDemoStore();
  const selectable = state.campaigns.filter((campaign) => campaign.sellerId === state.session?.userId && ["Đang hoạt động", "Thành công", "Không đạt MOQ"].includes(campaign.status));
  const [campaignId, setCampaignId] = useState(selectable[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const campaign = selectable.find((item) => item.id === campaignId) || selectable[0];
  const remaining = campaign ? getRemainingDays(campaign, state) : 0;
  const latest = state.forecasts.find((forecast) => forecast.campaignId === campaign?.id);
  const generate = async () => {
    if (!campaign) return;
    setForecastError("");
    setLoading(true);
    try {
      await requestForecast(campaign.id);
    } catch (error) {
      setForecastError(error instanceof Error ? error.message : "Không thể tạo dự báo.");
    } finally {
      setLoading(false);
    }
  };
  if (!campaign) return <DashboardShell role="seller" page="seller-ai"><Empty title="Chưa có chiến dịch phù hợp" text="Cần một chiến dịch đang hoạt động hoặc đã kết thúc để tạo dự báo." action="Quản lý chiến dịch" path="seller-campaigns" /></DashboardShell>;
  return <DashboardShell role="seller" page={success ? "seller-success" : "seller-ai"}><PageTitle eyebrow={success ? "S11 · AI Analytics" : "S10 · AI Forecast"} title={success ? "Dự đoán khả năng thành công" : "Dự báo nhu cầu bằng AI"} description="Kết quả là dữ liệu mô phỏng phục vụ trình diễn, không phải độ chính xác mô hình đã được xác minh." action={<button disabled={loading || remaining === 0} onClick={generate} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{remaining === 0 ? "Chiến dịch đã kết thúc" : loading ? "Đang xử lý..." : latest ? "Cập nhật dự báo" : "Tạo dự báo"}</button>} />{forecastError && <p className="mb-5 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{forecastError}</p>}<section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="grid gap-4 md:grid-cols-4"><label className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">Chiến dịch<select value={campaign.id} onChange={(event) => setCampaignId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900">{selectable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{[["MOQ", String(campaign.moq)], ["Hiện tại", `${campaign.currentOrders} đơn`]].map(([a, b]) => <div key={a}><p className="text-xs font-semibold uppercase text-slate-500">{a}</p><p className="mt-3 font-serif text-2xl font-bold">{b}</p></div>)}</div></section>{success ? <SuccessPrediction probability={latest?.successProbability || Math.min(95, Math.round(campaign.currentOrders / campaign.moq * 75))} campaign={campaign} remaining={remaining} /> : <ForecastDashboard campaign={campaign} forecast={latest} history={state.forecasts.filter((item) => item.campaignId === campaign.id)} remaining={remaining} />}</DashboardShell>;
}

function ForecastDashboard({ campaign, forecast, history, remaining }: { campaign: import("./DemoStore").StoreCampaign; forecast?: import("./DemoStore").StoreForecast; history: import("./DemoStore").StoreForecast[]; remaining: number }) {
  const predicted = forecast?.predictedDemand || campaign.currentOrders;
  return <><div className="mt-6"><Kpis items={[{ label: "Nhu cầu cuối kỳ dự báo", value: String(predicted), note: forecast ? `Khoảng ${forecast.lowerBound}–${forecast.upperBound}` : "Chưa tạo dự báo" }, { label: "Đơn dự kiến tăng thêm", value: `+${Math.max(0, predicted - campaign.currentOrders)}`, note: `Trong ${remaining} ngày` }, { label: "Xác suất đạt MOQ", value: `${forecast?.successProbability || 0}%`, note: "Dữ liệu mô phỏng" }, { label: "Nhu cầu quan sát", value: String(campaign.currentOrders), note: `MOQ ${campaign.moq} · Mục tiêu ${campaign.target}` }]} /></div><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="font-serif text-xl font-bold">Nhu cầu tích lũy theo thời gian</h2><p className="mt-1 text-sm text-slate-500">Đơn quan sát, dự báo, khoảng bất định và ngưỡng MOQ</p></div><div className="flex gap-4 text-xs"><span className="text-teal-700">— Quan sát</span><span className="text-blue-700">-- Dự báo</span><span className="text-orange-600">-- MOQ</span></div></div><ForecastChart campaign={campaign} forecast={forecast} /></section><div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-2xl border border-teal-200 bg-teal-50 p-6"><p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700">Diễn giải dành cho người bán</p><h2 className="mt-3 font-serif text-2xl font-bold">{forecast ? (forecast.predictedDemand >= campaign.moq ? "Chiến dịch có khả năng đạt MOQ trước hạn." : "Chiến dịch đang có rủi ro không đạt MOQ.") : "Hãy tạo dự báo để nhận diễn giải."}</h2><p className="mt-3 text-sm leading-6 text-slate-600">Kết quả chỉ hỗ trợ quyết định và không bảo đảm kết quả. Quan sát hiện tại là {campaign.currentOrders} đơn; MOQ là {campaign.moq} và mục tiêu mở rộng là {campaign.target}.</p></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Thông tin mô hình</h2><dl className="mt-4 space-y-3 text-sm">{[["Mô hình", forecast?.modelVersion || "Chưa chạy"], ["Dữ liệu đầu vào", `${campaign.currentOrders} đơn quan sát`], ["Chất lượng dữ liệu", forecast?.warnings.join(" ") || "Chưa đánh giá"], ["MAE / RMSE / MAPE", "Không công bố — chưa xác minh"]].map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-b border-slate-100 pb-3"><dt className="text-slate-500">{a}</dt><dd className="text-right font-semibold">{b}</dd></div>)}</dl></section></div><section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-serif text-xl font-bold">Lịch sử dự báo</h2></div>{history.length === 0 ? <p className="p-6 text-sm text-slate-500">Chưa có lần dự báo nào cho chiến dịch này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Thời điểm</th><th className="px-5 py-3">Mô hình / Provider</th><th className="px-5 py-3">Quan sát</th><th className="px-5 py-3">Dự báo</th><th className="px-5 py-3">Khoảng dự báo</th><th className="px-5 py-3">Xác suất MOQ</th></tr></thead><tbody>{history.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-5 py-4">{item.modelVersion}<span className="block text-xs text-teal-700">{item.provider}</span></td><td className="px-5 py-4">{item.observedOrders}</td><td className="px-5 py-4 font-semibold">{item.predictedDemand}</td><td className="px-5 py-4">{item.lowerBound}–{item.upperBound}</td><td className="px-5 py-4">{item.successProbability}%</td></tr>)}</tbody></table></div>}</section></>;
}

function SuccessPrediction({ probability, campaign, remaining }: { probability: number; campaign: import("./DemoStore").StoreCampaign; remaining: number }) {
  return <div className="mt-6 grid gap-6 lg:grid-cols-[.85fr_1.15fr]"><section className="rounded-2xl border border-slate-200 bg-slate-950 p-7 text-white"><p className="font-mono text-xs uppercase tracking-widest text-teal-400">Xác suất mô phỏng</p><div className="my-7 grid place-items-center"><div className="grid h-48 w-48 place-items-center rounded-full border-[18px] border-teal-500 border-r-slate-700"><div className="text-center"><span className="font-serif text-5xl font-bold">{probability}%</span><span className="mt-1 block text-xs text-slate-400">đạt MOQ đúng hạn</span></div></div></div><p className="text-center text-sm text-slate-400">Thành công nghĩa là đạt ít nhất {campaign.moq} đơn trước {campaign.endDate}.</p></section><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Yếu tố tác động chính</h2><div className="mt-5 space-y-5">{[["Tiến độ MOQ hiện tại", Math.min(100, campaign.currentOrders / campaign.moq * 100), `${campaign.currentOrders}/${campaign.moq}`], ["Thời gian còn lại", Math.min(100, remaining * 5), `${remaining} ngày`], ["Khoảng cách tới mục tiêu", Math.min(100, campaign.currentOrders / campaign.target * 100), `${campaign.target - campaign.currentOrders} đơn`]].map(([a, b, c]) => <div key={String(a)}><div className="mb-2 flex justify-between text-sm"><span>{a}</span><strong>{c}</strong></div><Progress value={Number(b)} /></div>)}</div><div className="mt-7 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Khuyến nghị:</strong> Theo dõi lại sau 48 giờ. Không đưa ra cam kết sản lượng chỉ dựa trên xác suất mô phỏng.</div></section></div>;
}

function Admin() {
  const { state } = useDemoStore();
  const pending = state.campaigns.filter((campaign) => campaign.status === "Chờ duyệt").length;
  const volume = state.orders.reduce((sum, order) => sum + order.total, 0);
  return <DashboardShell role="admin" page="admin"><PageTitle eyebrow="B01" title="Tổng quan hệ thống" description="Giám sát sức khỏe nền tảng và các tác vụ cần xử lý." /><Kpis items={[{ label: "Người dùng demo", value: String(state.users.length), note: "Dữ liệu dùng chung" }, { label: "Người bán", value: String(state.sellers.length), note: "Hồ sơ đã lưu" }, { label: "Chiến dịch hoạt động", value: String(state.campaigns.filter((item) => item.status === "Đang hoạt động").length), note: `${pending} chờ duyệt` }, { label: "GMV đặt trước", value: money(volume), note: "Thanh toán mô phỏng" }]} /><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Tăng trưởng nền tảng</h2><Chart /></section><section className="rounded-2xl border border-orange-200 bg-orange-50 p-6"><p className="font-mono text-xs font-semibold uppercase tracking-widest text-orange-700">Cần xử lý</p><h2 className="mt-3 font-serif text-2xl font-bold">{pending} chiến dịch chờ duyệt</h2><p className="mt-2 text-sm leading-6 text-slate-600">Các quyết định tại đây được phản ánh ngay sang cổng người bán.</p><button onClick={() => go("admin-campaigns")} className="mt-6 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">Mở hàng đợi duyệt</button></section></div><AdminCampaigns embedded /></DashboardShell>;
}

function AdminCampaigns({ embedded = false }: { embedded?: boolean }) {
  const { state, approveCampaign, rejectCampaign } = useDemoStore();
  const pending = state.campaigns.filter((campaign) => campaign.status === "Chờ duyệt");
  const content = <><PageTitle eyebrow={embedded ? undefined : "B04"} title={embedded ? "Yêu cầu gần đây" : "Duyệt chiến dịch"} description={embedded ? undefined : "Đánh giá thông tin sản phẩm, MOQ và năng lực người bán trước khi phê duyệt."} />{pending.length === 0 ? <Empty title="Đã xử lý toàn bộ yêu cầu" text="Không còn chiến dịch nào trong hàng đợi duyệt." action="Về tổng quan" path="admin" /> : <div className="space-y-4">{pending.map((campaign) => { const product = state.products.find((item) => item.id === campaign.productId); return <article key={campaign.id} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[80px_1fr_auto] md:items-center"><img src={product?.image} alt="" className="h-20 w-20 rounded-xl object-cover" /><div><div className="flex items-center gap-2"><Status>Chờ duyệt</Status><span className="text-xs text-slate-500">{campaign.id}</span></div><h2 className="mt-2 font-semibold">{campaign.name}</h2><p className="mt-1 text-sm text-slate-500">{product?.name} · MOQ {campaign.moq} · Mục tiêu {campaign.target} · {money(campaign.price)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { const reason = prompt("Nhập lý do từ chối chiến dịch:"); if (reason?.trim()) rejectCampaign(campaign.id, reason.trim()); }} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">Từ chối</button><button onClick={() => approveCampaign(campaign.id)} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Phê duyệt</button></div></article>; })}</div>}</>;
  if (embedded) return <section className="mt-6">{content}</section>;
  return <DashboardShell role="admin" page="admin-campaigns">{content}</DashboardShell>;
}

function Partner({ detail = false }: { detail?: boolean }) {
  const { state, updateProduction } = useDemoStore();
  const request = state.productionRequests.find((item) => item.partnerId === state.session?.userId);
  if (!request) return <DashboardShell role="partner" page="partner"><PageTitle title="Tổng quan sản xuất" /><Empty title="Chưa có yêu cầu sản xuất" text="Yêu cầu chỉ xuất hiện sau khi chiến dịch đạt MOQ và người bán tạo lệnh sản xuất." action="Khám phá sản phẩm" path="partner-home" /></DashboardShell>;
  const campaign = state.campaigns.find((item) => item.id === request.campaignId);
  const nextProgress = Math.min(request.progress + 10, 100);
  return <DashboardShell role="partner" page={detail ? "partner-production" : "partner"}><PageTitle eyebrow={detail ? "M03" : "M01"} title={detail ? `Tiến độ sản xuất ${campaign?.name || ""}` : "Tổng quan sản xuất"} description="Cập nhật ở đây sẽ phản ánh sang Seller Dashboard và theo dõi đơn hàng khách hàng." /><Kpis items={[{ label: "Yêu cầu được giao", value: String(state.productionRequests.length) }, { label: "Đang sản xuất", value: String(state.productionRequests.filter((item) => item.status === "Đang sản xuất").length) }, { label: "Tiến độ hiện tại", value: `${request.progress}%` }, { label: "Số lượng", value: String(request.quantity) }]} /><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><Status>{request.status}</Status><h2 className="mt-3 font-serif text-2xl font-bold">{campaign?.name} — Lô {request.quantity} sản phẩm</h2><p className="mt-1 text-sm text-slate-500">{request.id} · Hoàn tất dự kiến {request.estimatedCompletion}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => updateProduction(request.id, nextProgress, request.status === "Chờ tiếp nhận" ? "Đã tiếp nhận" : "Đang sản xuất")} className="h-fit rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Cập nhật +10%</button><button onClick={() => updateProduction(request.id, 100, "Đang vận chuyển")} className="h-fit rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Chuyển sang vận chuyển</button></div></div><div className="mt-8"><div className="mb-2 flex justify-between text-sm"><span>Tiến độ tổng thể</span><strong>{request.progress}%</strong></div><Progress value={request.progress} /></div></section></DashboardShell>;
}

function AuthMarketplace({ role, saved, onSave }: { role: Role; saved: number[]; onSave: (id: number) => void }) {
  const { state } = useDemoStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const marketplaceProducts = state.campaigns.filter((campaign) => isCampaignOrderable(campaign, state)).map((campaign) => {
    const product = state.products.find((item) => item.id === campaign.productId);
    return product ? toUiProduct(product, campaign, state) : null;
  }).filter((item): item is Product => Boolean(item));
  const visible = marketplaceProducts.filter((product) =>
    (category === "Tất cả" || product.category === category)
    && product.name.toLowerCase().includes(query.toLowerCase())
  );
  return <DashboardShell role={role} page={`${role}-home`}><PageTitle title="Sản phẩm đang mở đặt trước" description="Chỉ chiến dịch đã duyệt và đang hoạt động mới xuất hiện, đồng thời mới được nhận đơn đặt trước." /><div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_220px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm sản phẩm đang bán..." className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500">{["Tất cả", ...Array.from(new Set(marketplaceProducts.map((product) => product.category)))].map((item) => <option key={item}>{item}</option>)}</select></div><div className="mb-5 flex items-center justify-between text-sm text-slate-500"><span><strong className="text-slate-900">{visible.length}</strong> chiến dịch công khai</span><span>Vai trò hiện tại: <strong className="text-teal-700">{role === "customer" ? "Khách hàng" : role === "seller" ? "Người bán" : role === "admin" ? "Quản trị viên" : "Đối tác sản xuất"}</strong></span></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visible.map((product) => <ProductCard key={product.id} product={product} onSave={onSave} pathPrefix={`${role}-product`} />)}</div>{saved.length > 0 && role === "customer" && <p className="mt-6 text-sm text-slate-500">Bạn đang lưu {saved.length} sản phẩm trong danh sách yêu thích.</p>}</DashboardShell>;
}

function AuthProductDetail({ role, product, saved, onSave }: { role: Role; product: Product; saved: boolean; onSave: (id: number) => void }) {
  const pct = product.orders / product.moq * 100;
  return <DashboardShell role={role} page={`${role}-home`}><button onClick={() => go(`${role}-home`)} className="mb-6 text-sm font-semibold text-teal-700">← Quay lại danh sách sản phẩm</button><div className="grid gap-8 xl:grid-cols-[1.05fr_.95fr]"><div className="overflow-hidden rounded-3xl bg-slate-100"><img src={product.image} alt={product.name} className="aspect-[4/3] h-full w-full object-cover" /></div><section className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"><div className="flex items-center gap-2"><Status>Đang hoạt động</Status><span className="text-sm text-slate-500">{product.category}</span></div><h1 className="mt-5 font-serif text-4xl font-bold leading-tight text-slate-950">{product.name}</h1><p className="mt-3 text-sm font-semibold text-teal-700">Bởi {product.seller}</p><p className="mt-6 font-serif text-3xl font-bold">{money(product.price)}</p><div className="mt-7 rounded-2xl border border-teal-200 bg-teal-50 p-5"><div className="flex justify-between text-sm"><span><strong>{product.orders}</strong> đơn đặt trước · MOQ {product.moq}</span><strong className="text-teal-700">{pct.toFixed(1)}%</strong></div><div className="mt-3"><Progress value={pct} /></div><p className="mt-3 text-xs text-slate-500">Còn {product.days} ngày · Sản xuất chỉ bắt đầu sau khi chiến dịch đạt MOQ.</p></div><p className="mt-6 text-sm leading-7 text-slate-600">Sản phẩm được mở bán trước khi sản xuất nhằm xác nhận nhu cầu thực tế, giảm tồn kho và giúp người bán lập kế hoạch sản lượng phù hợp.</p><div className="mt-7 flex flex-wrap gap-3">{role === "customer" && <button onClick={() => go(`product/${product.id}`)} className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Đặt trước sản phẩm</button>}<button onClick={() => onSave(product.id)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">{saved ? "Đã lưu sản phẩm" : "Lưu sản phẩm"}</button></div>{role !== "customer" && <p className="mt-4 text-xs leading-5 text-slate-500">Tài khoản {role === "seller" ? "người bán" : role === "admin" ? "quản trị viên" : "đối tác sản xuất"} có thể xem chiến dịch công khai nhưng không hiển thị thao tác đặt hàng.</p>}</section></div></DashboardShell>;
}

const supportContent: Record<Role, {
  roleName: string;
  topics: string[];
  guides: { title: string; description: string; steps: string[] }[];
}> = {
  customer: {
    roleName: "Khách hàng",
    topics: ["Đặt trước và thanh toán", "Theo dõi đơn hàng", "Hoàn tiền khi không đạt MOQ", "Cập nhật sản xuất và giao hàng"],
    guides: [
      { title: "Đặt trước sản phẩm đầu tiên", description: "Từ khám phá chiến dịch đến xác nhận đơn.", steps: ["Chọn sản phẩm và phiên bản", "Kiểm tra MOQ và thời gian dự kiến", "Xác nhận điều kiện Pre-order", "Theo dõi đơn trong tài khoản"] },
      { title: "Theo dõi và quản lý đơn", description: "Hiểu từng trạng thái trong vòng đời đơn hàng.", steps: ["Mở Đơn hàng của tôi", "Chọn mã đơn cần xem", "Kiểm tra timeline chiến dịch", "Theo dõi thông báo sản xuất"] },
    ],
  },
  seller: {
    roleName: "Người bán",
    topics: ["Tạo sản phẩm và chiến dịch", "Quy trình duyệt chiến dịch", "Dự báo nhu cầu AI", "MOQ, sản xuất và tài chính"],
    guides: [
      { title: "Ra mắt chiến dịch Pre-order", description: "Thiết lập sản phẩm, MOQ và gửi quản trị viên duyệt.", steps: ["Tạo hồ sơ sản phẩm", "Thiết lập giá, MOQ và thời hạn", "Kiểm tra bản xem trước", "Gửi duyệt và theo dõi phản hồi"] },
      { title: "Sử dụng dự báo AI", description: "Đọc đúng dữ liệu quan sát, dự báo và khoảng bất định.", steps: ["Chọn chiến dịch đang hoạt động", "Tạo hoặc cập nhật dự báo", "So sánh dự báo với đường MOQ", "Đánh giá giới hạn trước khi quyết định"] },
    ],
  },
  admin: {
    roleName: "Quản trị viên",
    topics: ["Xác minh người bán", "Duyệt chiến dịch", "Xử lý khiếu nại", "Giám sát giao dịch và hoàn tiền"],
    guides: [
      { title: "Duyệt chiến dịch an toàn", description: "Kiểm tra thông tin trước khi cho phép chiến dịch công khai.", steps: ["Xác minh trạng thái người bán", "Kiểm tra sản phẩm và MOQ", "Đánh giá thời gian sản xuất", "Phê duyệt hoặc ghi rõ lý do từ chối"] },
      { title: "Xử lý báo cáo và tranh chấp", description: "Duy trì lịch sử xử lý minh bạch.", steps: ["Phân loại mức độ ưu tiên", "Thu thập dữ liệu liên quan", "Ghi chú quyết định xử lý", "Thông báo kết quả cho các bên"] },
    ],
  },
  partner: {
    roleName: "Đối tác sản xuất",
    topics: ["Tiếp nhận yêu cầu sản xuất", "Cập nhật tiến độ", "Báo cáo chậm trễ", "Xác nhận ngày hoàn thành"],
    guides: [
      { title: "Tiếp nhận lệnh sản xuất", description: "Kiểm tra yêu cầu đã đủ điều kiện trước khi xác nhận.", steps: ["Mở yêu cầu được phân công", "Kiểm tra số lượng và tiêu chuẩn", "Xác nhận năng lực và thời gian", "Bắt đầu cập nhật tiến độ"] },
      { title: "Cập nhật tiến độ chính xác", description: "Giúp người bán và khách hàng nhận thông tin kịp thời.", steps: ["Chọn công đoạn hiện tại", "Nhập phần trăm hoàn thành", "Ghi nhận vấn đề nếu có", "Cập nhật ngày hoàn tất dự kiến"] },
    ],
  },
};

function SupportPage({ role, mode }: { role: Role; mode: "help" | "support" | "guide" }) {
  const content = supportContent[role];
  const page = `${role}-${mode}`;
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { from: "PREORA Support", text: "Chào bạn, yêu cầu của bạn đã được tiếp nhận. Chúng tôi đang kiểm tra thông tin liên quan.", time: "09:20" },
    { from: "Bạn", text: "Cảm ơn đội ngũ. Mình cần biết bước tiếp theo cần thực hiện là gì.", time: "09:26" },
  ]);
  if (mode === "help") {
    const faqs = [
      ["Thời gian phản hồi hỗ trợ là bao lâu?", "Yêu cầu thông thường được phản hồi trong vòng 24 giờ làm việc. Các vấn đề liên quan thanh toán hoặc chiến dịch đang kết thúc sẽ được ưu tiên."],
      ["Tôi cần cung cấp thông tin gì khi gửi yêu cầu?", "Vui lòng cung cấp mã đơn, mã chiến dịch hoặc mã yêu cầu sản xuất nếu có, cùng ảnh chụp và mô tả các bước dẫn đến vấn đề."],
      ["Làm sao để kiểm tra trạng thái yêu cầu hỗ trợ?", "Mở Hộp thư hỗ trợ trong sidebar. Mỗi yêu cầu có mã ticket, mức ưu tiên, trạng thái và lịch sử trao đổi."],
      ["PREORA có hỗ trợ khẩn cấp không?", "Các sự cố bảo mật, thanh toán bất thường hoặc gián đoạn sản xuất nghiêm trọng có thể được đánh dấu mức ưu tiên cao khi tạo ticket."],
    ].filter(([title, answer]) => `${title} ${answer}`.toLowerCase().includes(query.toLowerCase()));
    return <DashboardShell role={role} page={page}><PageTitle title="Trung tâm trợ giúp" description={`Tài liệu và câu trả lời thường gặp dành cho ${content.roleName.toLowerCase()}.`} action={<button onClick={() => go(`${role}-support`)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Liên hệ hỗ trợ</button>} /><section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><p className="font-mono text-xs uppercase tracking-widest text-teal-400">PREORA Support</p><h2 className="mt-3 font-serif text-3xl font-bold">Bạn cần hỗ trợ vấn đề gì?</h2><div className="mt-6 flex rounded-xl bg-white p-1"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm câu hỏi, quy trình hoặc lỗi..." className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none" /><button className="rounded-lg bg-teal-600 px-5 text-sm font-semibold">Tìm kiếm</button></div></section><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{content.topics.map((topic, index) => <button key={topic} onClick={() => setQuery(topic.split(" ")[0])} className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-teal-300 hover:shadow-lg hover:shadow-teal-950/5"><span className="font-mono text-xs font-bold text-teal-700">0{index + 1}</span><strong className="mt-3 block text-sm">{topic}</strong><span className="mt-2 block text-xs leading-5 text-slate-500">Xem tài liệu và cách xử lý chi tiết</span></button>)}</div><section className="mt-8"><h2 className="font-serif text-2xl font-bold">Câu hỏi thường gặp</h2><div className="mt-4 space-y-3">{faqs.length ? faqs.map(([title, answer]) => <details key={title} className="rounded-2xl border border-slate-200 bg-white p-5 open:border-teal-300"><summary className="cursor-pointer font-semibold">{title}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p></details>) : <Empty title="Không tìm thấy nội dung" text="Thử từ khóa khác hoặc gửi yêu cầu trực tiếp cho đội ngũ hỗ trợ." action="Mở hộp thư hỗ trợ" path={`${role}-support`} />}</div></section></DashboardShell>;
  }
  if (mode === "support") {
    const sendMessage = () => {
      if (!message.trim()) return;
      setMessages([...messages, { from: "Bạn", text: message.trim(), time: "Vừa xong" }]);
      setMessage("");
    };
    return <DashboardShell role={role} page={page}><PageTitle title="Hộp thư hỗ trợ" description="Tạo yêu cầu mới và theo dõi toàn bộ lịch sử trao đổi với PREORA Support." action={<button onClick={() => { setShowForm(!showForm); setSent(false); }} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Tạo yêu cầu hỗ trợ</button>} />{showForm && <section className="mb-6 rounded-2xl border border-teal-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Yêu cầu hỗ trợ mới</h2><button onClick={() => setShowForm(false)} className="text-sm font-semibold text-slate-500">Đóng</button></div>{sent ? <div className="mt-5 rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800"><strong>Đã gửi ticket #SP-260428.</strong> Đội ngũ hỗ trợ sẽ phản hồi trong hộp thư này.</div> : <><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Chủ đề<select className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"><option>Hướng dẫn sử dụng</option><option>Đơn hàng hoặc thanh toán</option><option>Chiến dịch và MOQ</option><option>Sự cố kỹ thuật</option></select></label><label className="text-sm font-semibold">Mức ưu tiên<select className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"><option>Bình thường</option><option>Cao</option><option>Khẩn cấp</option></select></label><label className="text-sm font-semibold sm:col-span-2">Mô tả<textarea className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" placeholder="Mô tả vấn đề, mã liên quan và kết quả mong muốn..." /></label></div><button onClick={() => setSent(true)} className="mt-4 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Gửi yêu cầu</button></>}</section>}<div className="grid gap-6 xl:grid-cols-[320px_1fr]"><aside className="space-y-3">{[["#SP-260417", "Cần hỗ trợ quy trình hiện tại", "Đang xử lý"], ["#SP-260392", "Cập nhật thông tin tài khoản", "Đã giải quyết"], ["#SP-260351", "Giải thích trạng thái hệ thống", "Đã giải quyết"]].map(([id, title, status], index) => <button key={id} className={`w-full rounded-2xl border p-4 text-left ${index === 0 ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}><div className="flex justify-between gap-3"><span className="font-mono text-xs font-semibold text-teal-700">{id}</span><Status>{status}</Status></div><strong className="mt-3 block text-sm">{title}</strong><span className="mt-2 block text-xs text-slate-500">{index === 0 ? "Cập nhật 10 phút trước" : "Cập nhật tuần trước"}</span></button>)}</aside><section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"><header className="border-b border-slate-200 p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-xs font-semibold text-teal-700">#SP-260417</p><h2 className="mt-1 font-semibold">Cần hỗ trợ quy trình hiện tại</h2></div><Status>Đang xử lý</Status></div></header><div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">{messages.map((item, index) => <div key={`${item.time}-${index}`} className={`max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${item.from === "Bạn" ? "ml-auto bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}><strong className="mb-1 block text-xs">{item.from}</strong>{item.text}<span className={`mt-2 block text-[10px] ${item.from === "Bạn" ? "text-teal-100" : "text-slate-400"}`}>{item.time}</span></div>)}</div><div className="flex gap-2 border-t border-slate-200 p-4"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} placeholder="Nhập nội dung phản hồi..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500" /><button onClick={sendMessage} className="rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white">Gửi</button></div></section></div></DashboardShell>;
  }
  return <DashboardShell role={role} page={page}><PageTitle title="Hướng dẫn sử dụng" description={`Các quy trình quan trọng dành cho vai trò ${content.roleName.toLowerCase()}.`} action={<button onClick={() => go(`${role}-help`)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold">Tra cứu trợ giúp</button>} /><section className="grid gap-5 lg:grid-cols-2">{content.guides.map((guide, guideIndex) => <article key={guide.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="bg-slate-950 p-6 text-white"><div className="flex items-center justify-between"><span className="font-mono text-xs uppercase tracking-widest text-teal-400">Hướng dẫn 0{guideIndex + 1}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">Khoảng 5 phút</span></div><h2 className="mt-4 font-serif text-2xl font-bold">{guide.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{guide.description}</p></div><div className="p-6">{guide.steps.map((step, index) => <div key={step} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{index + 1}</span>{index < guide.steps.length - 1 && <span className="absolute left-4 top-8 h-full w-px bg-slate-200" />}<div className="pt-1"><strong className="text-sm">{step}</strong><p className="mt-1 text-xs leading-5 text-slate-500">Thực hiện và kiểm tra thông tin trước khi chuyển sang bước tiếp theo.</p></div></div>)}</div></article>)}</section><section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-serif text-xl font-bold">Bạn vẫn cần trợ giúp?</h2><p className="mt-1 text-sm text-slate-600">Tạo ticket và trao đổi trực tiếp với đội ngũ PREORA Support.</p></div><button onClick={() => go(`${role}-support`)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Mở hộp thư hỗ trợ</button></div></section></DashboardShell>;
}

function GenericDashboardPage({ role, page }: { role: Role; page: string }) {
  const labels: Record<string, [string, string]> = {
    "seller-products": ["Quản lý sản phẩm", "Tạo, chỉnh sửa và xem trước danh mục sản phẩm của cửa hàng."],
    "seller-campaigns": ["Quản lý chiến dịch", "Theo dõi vòng đời chiến dịch từ bản nháp đến sản xuất."],
    "seller-orders": ["Quản lý đơn đặt trước", "Theo dõi khách hàng, thanh toán và trạng thái đơn."],
    "seller-analytics": ["Báo cáo và phân tích", "So sánh doanh thu, nhu cầu và hiệu suất chiến dịch."],
    "seller-production": ["Theo dõi sản xuất", "Chỉ các chiến dịch đã thành công mới đủ điều kiện sản xuất."],
    "seller-finance": ["Thanh toán và tài chính", "Tổng hợp giao dịch, khoản chờ và hoàn tiền mô phỏng."],
    "seller-settings": ["Hồ sơ và cài đặt", "Quản lý cửa hàng, bảo mật và tùy chọn thông báo."],
    "admin-users": ["Quản lý người dùng", "Tra cứu vai trò và trạng thái tài khoản."],
    "admin-sellers": ["Xác minh người bán", "Đánh giá hồ sơ đăng ký và tài liệu doanh nghiệp."],
    "admin-transactions": ["Giám sát giao dịch", "Theo dõi thanh toán và hoàn tiền trên toàn hệ thống."],
    "admin-disputes": ["Báo cáo và khiếu nại", "Phân loại, xử lý và lưu lịch sử giải quyết."],
    "admin-analytics": ["Phân tích nền tảng", "Theo dõi tăng trưởng và hiệu suất theo danh mục."],
    "admin-settings": ["Danh mục và cài đặt", "Quản lý cấu hình nền tảng và bảo mật quản trị."],
    "partner-requests": ["Yêu cầu sản xuất", "Các lệnh sản xuất đã được xác nhận và phân công."],
    "partner-profile": ["Hồ sơ đối tác", "Thông tin doanh nghiệp và năng lực sản xuất."],
    account: ["Tài khoản của tôi", "Theo dõi hoạt động đặt trước và thông tin cá nhân."],
    orders: ["Đơn hàng của tôi", "Theo dõi tất cả đơn đặt trước và lịch giao dự kiến."],
    wishlist: ["Sản phẩm yêu thích", "Các chiến dịch bạn đã lưu để theo dõi."],
    notifications: ["Thông báo", "Cập nhật đơn hàng, chiến dịch, sản xuất và vận chuyển."],
    profile: ["Hồ sơ cá nhân", "Quản lý thông tin, địa chỉ, bảo mật và tùy chọn."],
  };
  const [title, desc] = labels[page] || ["PREORA", "Không gian làm việc của bạn."];
  return <DashboardShell role={role} page={page}><PageTitle title={title} description={desc} action={page === "seller-products" ? <button onClick={() => go("seller-product-new")} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white">Thêm sản phẩm</button> : undefined} />{page.includes("analytics") || page.includes("finance") ? <><Kpis items={[{ label: "Tổng giá trị", value: "1,42 tỷ" }, { label: "Đơn hợp lệ", value: "1.284" }, { label: "Tỷ lệ tăng trưởng", value: "+18,4%" }, { label: "Đang chờ", value: "86,2 triệu" }]} /><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><Chart /></section></> : page.includes("settings") || page.includes("profile") ? <SettingsForm /> : page === "wishlist" ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{products.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} onSave={() => undefined} />)}</div> : page.endsWith("notifications") ? <Notifications /> : page === "seller-campaigns" ? <CampaignTable /> : page === "seller-products" ? <SellerProductsTable /> : page === "seller-production" ? <SellerProduction /> : page === "admin-transactions" ? <AdminTransactions /> : <DataTable role={role} page={page} />}</DashboardShell>;
}

function SellerProductsTable() {
  const { state } = useDemoStore();
  const sellerProducts = state.products.filter((product) => product.sellerId === state.session?.userId);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3">Danh mục</th><th className="px-5 py-3">Giá dự kiến</th><th className="px-5 py-3">Sản xuất</th><th className="px-5 py-3">Trạng thái</th></tr></thead><tbody>{sellerProducts.map((product) => <tr key={product.id} className="border-t border-slate-100"><td className="px-5 py-4"><div className="flex items-center gap-3"><img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover" /><strong>{product.name}</strong></div></td><td className="px-5 py-4">{product.category}</td><td className="px-5 py-4">{money(product.price)}</td><td className="px-5 py-4">{product.manufacturingDays} ngày</td><td className="px-5 py-4"><Status>{product.status}</Status></td></tr>)}</tbody></table></div></section>;
}

function SellerProduction() {
  const { state, createProductionRequest } = useDemoStore();
  const eligible = state.campaigns.filter((campaign) => campaign.sellerId === state.session?.userId && campaign.status === "Thành công");
  const requests = state.productionRequests.filter((request) => request.sellerId === state.session?.userId);
  return <div className="space-y-5">{eligible.map((campaign) => <section key={campaign.id} className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><Status>Thành công</Status><h2 className="mt-2 font-serif text-xl font-bold">{campaign.name}</h2><p className="mt-1 text-sm text-slate-600">{campaign.currentOrders} đơn đủ điều kiện · MOQ {campaign.moq}</p></div><button onClick={() => createProductionRequest(campaign.id)} disabled={requests.some((request) => request.campaignId === campaign.id)} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{requests.some((request) => request.campaignId === campaign.id) ? "Đã tạo lệnh sản xuất" : "Tạo lệnh sản xuất"}</button></div></section>)}{requests.map((request) => <section key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex justify-between gap-4"><div><Status>{request.status}</Status><h2 className="mt-2 font-semibold">{state.campaigns.find((item) => item.id === request.campaignId)?.name}</h2><p className="mt-1 text-sm text-slate-500">{request.id} · {request.quantity} sản phẩm · Cập nhật {new Date(request.updatedAt).toLocaleString("vi-VN")}</p></div><strong>{request.progress}%</strong></div><div className="mt-4"><Progress value={request.progress} /></div></section>)}</div>;
}

function AdminTransactions() {
  const { state, completeRefund } = useDemoStore();
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Giao dịch</th><th className="px-5 py-3">Đơn hàng</th><th className="px-5 py-3">Giá trị</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Hành động</th></tr></thead><tbody>{state.payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="px-5 py-4 font-mono text-xs">{payment.id}</td><td className="px-5 py-4">{payment.orderId}</td><td className="px-5 py-4">{money(payment.amount)}</td><td className="px-5 py-4"><Status>{payment.status}</Status></td><td className="px-5 py-4">{payment.status === "Đang hoàn tiền" ? <button onClick={() => completeRefund(payment.orderId)} className="font-semibold text-teal-700">Xác nhận đã hoàn</button> : <span className="text-slate-400">Không có</span>}</td></tr>)}</tbody></table></div></section>;
}

function DataTable({ role, page }: { role: Role; page: string }) {
  const { state } = useDemoStore();
  if (role === "customer") {
    const customerOrders = state.orders.filter((order) => order.customerId === "customer-demo");
    return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row"><input placeholder="Tìm theo mã đơn hoặc tên sản phẩm..." className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" /><select className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"><option>Tất cả đơn của tôi</option><option>Chờ chiến dịch</option><option>Đang sản xuất</option><option>Đã hoàn tiền</option></select></div>{customerOrders.length === 0 ? <div className="p-6 text-sm text-slate-500">Bạn chưa có đơn đặt trước nào.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Đơn hàng của tôi</th><th className="px-5 py-3">Ngày đặt</th><th className="px-5 py-3">Thanh toán</th><th className="px-5 py-3">Tổng tiền</th><th className="px-5 py-3">Trạng thái đơn</th><th className="px-5 py-3"></th></tr></thead><tbody>{customerOrders.map((order) => { const product = state.products.find((item) => item.id === order.productId); return <tr key={order.id} className="border-t border-slate-100"><td className="px-5 py-4"><div className="flex items-center gap-3"><img src={product?.image} alt="" className="h-12 w-12 rounded-lg object-cover" /><div><strong className="block">{product?.name}</strong><span className="font-mono text-xs text-slate-500">{order.id}</span></div></div></td><td className="px-5 py-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td><td className="px-5 py-4"><Status>{order.paymentStatus}</Status></td><td className="px-5 py-4">{money(order.total)}</td><td className="px-5 py-4"><Status>{order.orderStatus}</Status></td><td className="px-5 py-4"><button onClick={() => go(`customer-tracking/${order.productId}`)} className="font-semibold text-teal-700">Theo dõi</button></td></tr>; })}</tbody></table></div>}</section>;
  }
  if (role === "seller" && page === "seller-orders") {
    const sellerOrders = state.orders.filter((order) => order.sellerId === state.session?.userId);
    return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-serif text-xl font-bold">Đơn đặt trước của cửa hàng</h2><p className="mt-1 text-sm text-slate-500">Đơn mới từ checkout xuất hiện tự động tại đây.</p></div>{sellerOrders.length === 0 ? <p className="p-6 text-sm text-slate-500">Chưa có đơn đặt trước.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mã đơn</th><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3">Số lượng</th><th className="px-5 py-3">Thanh toán</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Giá trị</th></tr></thead><tbody>{sellerOrders.map((order) => <tr key={order.id} className="border-t border-slate-100"><td className="px-5 py-4 font-mono text-xs">{order.id}</td><td className="px-5 py-4 font-semibold">{state.products.find((item) => item.id === order.productId)?.name}</td><td className="px-5 py-4">{order.quantity}</td><td className="px-5 py-4"><Status>{order.paymentStatus}</Status></td><td className="px-5 py-4"><Status>{order.orderStatus}</Status></td><td className="px-5 py-4">{money(order.total)}</td></tr>)}</tbody></table></div>}</section>;
  }
  const rows = Array.from({ length: 8 }, (_, i) => ({ id: `${page.includes("orders") ? "PR" : "REC"}-2026-${4100 + i}`, name: products[i].name, owner: i % 2 ? "Trần Gia Hân" : "Nguyễn Minh Anh", value: money(products[i].price), status: i === 2 ? "Chờ xử lý" : i === 5 ? "Đang sản xuất" : "Đã thanh toán" }));
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row"><input placeholder="Tìm kiếm theo mã hoặc tên..." className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500" /><select className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"><option>Tất cả trạng thái</option><option>Chờ xử lý</option><option>Hoàn tất</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Mã</th><th className="px-5 py-3">Nội dung</th><th className="px-5 py-3">{role === "admin" ? "Tài khoản" : "Khách hàng"}</th><th className="px-5 py-3">Giá trị</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3"></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="px-5 py-4 font-mono text-xs">{r.id}</td><td className="px-5 py-4 font-semibold">{r.name}</td><td className="px-5 py-4 text-slate-500">{r.owner}</td><td className="px-5 py-4">{r.value}</td><td className="px-5 py-4"><Status>{r.status}</Status></td><td className="px-5 py-4"><button onClick={() => go(role === "seller" ? "seller-order-detail" : role === "admin" ? "admin-campaign-detail" : "partner-production")} className="font-semibold text-teal-700">Xem</button></td></tr>)}</tbody></table></div></section>;
}

function SettingsForm() {
  const { state, updateProfile } = useDemoStore();
  const user = state.users.find((item) => item.id === state.session?.userId);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [notificationEmail, setNotificationEmail] = useState(user?.notificationEmail ?? true);
  const [saved, setSaved] = useState(false);
  return <div className="grid gap-6 xl:grid-cols-[1fr_320px]"><FormSection title="Thông tin chung"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tên hiển thị<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Email liên hệ<input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label></div><label className="mt-5 flex items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={notificationEmail} onChange={(event) => setNotificationEmail(event.target.checked)} className="accent-teal-600" />Nhận thông báo quan trọng qua email</label>{saved && <p className="mt-4 text-sm font-semibold text-emerald-700">Đã lưu thay đổi vào dữ liệu demo.</p>}<button onClick={() => { updateProfile(name, email, notificationEmail); setSaved(true); }} className="mt-6 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Lưu thay đổi</button></FormSection><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Bảo mật</h2><p className="mt-3 text-sm leading-6 text-slate-500">Các thao tác bảo mật đang ở chế độ demo và cần backend xác thực để sử dụng thực tế.</p><button disabled className="mt-5 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold opacity-50">Đổi mật khẩu</button><button disabled className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold opacity-50">Bật xác thực hai lớp</button></section></div>;
}

function Notifications() {
  const { state } = useDemoStore();
  const items = [
    ...state.orders.filter((order) => order.customerId === state.session?.userId).slice(0, 2).map((order) => [`Đơn ${order.id}: ${order.orderStatus}`, new Date(order.createdAt).toLocaleString("vi-VN"), true] as const),
    ...state.forecasts.filter((forecast) => state.campaigns.some((campaign) => campaign.id === forecast.campaignId && campaign.sellerId === state.session?.userId)).slice(0, 2).map((forecast) => [`Dự báo ${forecast.id} đã sẵn sàng`, new Date(forecast.createdAt).toLocaleString("vi-VN"), false] as const),
    ...state.productionRequests.filter((request) => request.sellerId === state.session?.userId || request.partnerId === state.session?.userId).slice(0, 2).map((request) => [`Lệnh ${request.id}: ${request.status} (${request.progress}%)`, new Date(request.updatedAt).toLocaleString("vi-VN"), false] as const),
  ];
  return items.length ? <div className="space-y-3">{items.map(([title, time, unread]) => <article key={title} className={`rounded-2xl border p-5 ${unread ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-500">Dữ liệu được đồng bộ từ trạng thái demo dùng chung.</p></div><span className="shrink-0 text-xs text-slate-400">{time}</span></div></article>)}</div> : <Empty title="Chưa có thông báo" text="Các cập nhật đơn hàng, dự báo và sản xuất sẽ xuất hiện tại đây." action="Về tổng quan" path={state.session?.role === "seller" ? "seller" : state.session?.role === "admin" ? "admin" : state.session?.role === "partner" ? "partner" : "account"} />;
}

function CustomerOrderTracking({ product }: { product: Product }) {
  const { state } = useDemoStore();
  const order = state.orders.find((item) => item.customerId === "customer-demo" && item.productId === product.id);
  const campaign = state.campaigns.find((item) => item.id === order?.campaignId);
  const production = state.productionRequests.find((item) => item.campaignId === campaign?.id);
  const steps = ["Đã đặt trước", "Chờ kết quả chiến dịch", "Đạt MOQ", "Đang sản xuất", "Đang vận chuyển", "Hoàn thành"];
  if (!order || !campaign) return <DashboardShell role="customer" page="orders"><Empty title="Không tìm thấy đơn hàng" text="Đơn hàng không thuộc tài khoản hiện tại hoặc đã bị xóa." action="Về đơn hàng của tôi" path="orders" /></DashboardShell>;
  const pct = campaign.currentOrders / campaign.moq * 100;
  const activeStep = order.orderStatus === "Đã giao" ? 5 : order.orderStatus === "Đang vận chuyển" ? 4 : order.orderStatus === "Đang sản xuất" ? 3 : campaign.status === "Thành công" ? 2 : 1;
  return <DashboardShell role="customer" page="orders"><button onClick={() => go("orders")} className="mb-5 text-sm font-semibold text-teal-700">← Quay lại đơn hàng của tôi</button><PageTitle eyebrow={`#${order.id}`} title="Theo dõi đơn đặt trước" description="Thông tin sản phẩm, chiến dịch và tiến độ xử lý đơn hàng của bạn." /><section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-serif text-xl font-bold">Thông tin sản phẩm đã đặt</h2></div><div className="grid gap-5 p-5 sm:grid-cols-[140px_1fr_auto] sm:items-center"><img src={product.image} alt={product.name} className="h-36 w-full rounded-2xl object-cover sm:w-36" /><div><div className="flex flex-wrap items-center gap-2"><Status>{order.orderStatus}</Status><span className="text-xs text-slate-500">{product.category}</span></div><h3 className="mt-3 font-serif text-2xl font-bold text-slate-950">{product.name}</h3><p className="mt-1 text-sm font-semibold text-teal-700">Cửa hàng {product.seller}</p><div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Phiên bản:</span> <strong>{order.variant}</strong></p><p><span className="text-slate-500">Số lượng:</span> <strong>{order.quantity}</strong></p><p><span className="text-slate-500">Đơn giá:</span> <strong>{money(order.unitPrice)}</strong></p><p><span className="text-slate-500">Thanh toán:</span> <strong>{order.paymentStatus}</strong></p></div></div><div className="flex flex-col gap-2 sm:items-end"><p className="font-serif text-2xl font-bold">{money(order.total)}</p><button onClick={() => go(`customer-product/${product.id}`)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Xem thông tin sản phẩm</button></div></div></section>{campaign.status === "Không đạt MOQ" && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><strong>Chiến dịch không đạt MOQ.</strong> Trạng thái hoàn tiền hiện tại: {order.paymentStatus}.</div>}<div className="grid gap-6 xl:grid-cols-[1fr_320px]"><section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Tiến độ đơn hàng</h2><div className="mt-6 rounded-2xl bg-teal-50 p-5"><div className="flex justify-between text-sm"><span>Tiến độ chiến dịch</span><strong>{campaign.currentOrders} / {campaign.moq} đơn MOQ</strong></div><div className="mt-3"><Progress value={pct} /></div><p className="mt-3 text-xs text-slate-500">Mục tiêu mở rộng {campaign.target} đơn · Trạng thái chiến dịch: {campaign.status}{production ? ` · Sản xuất ${production.progress}%` : ""}</p></div><div className="mt-8">{steps.map((step, index) => <div key={step} className="relative flex gap-4 pb-8 last:pb-0"><div className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${index <= activeStep ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"}`}>{index <= activeStep ? "✓" : index + 1}</div>{index < steps.length - 1 && <div className={`absolute left-[17px] top-9 h-full w-px ${index < activeStep ? "bg-teal-600" : "bg-slate-200"}`} />}<div className="pt-1"><h3 className={`font-semibold ${index <= activeStep ? "text-slate-900" : "text-slate-400"}`}>{step}</h3><p className="mt-1 text-sm text-slate-500">{index <= activeStep ? "Đã cập nhật trong dữ liệu dùng chung" : "Chưa bắt đầu"}</p></div></div>)}</div></section><aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-serif text-lg font-bold">Thông tin đơn hàng</h2>{[["Mã đơn", order.id], ["Ngày đặt", new Date(order.createdAt).toLocaleDateString("vi-VN")], ["Thanh toán", order.paymentStatus], ["Sản xuất", production ? `${production.progress}%` : "Chưa bắt đầu"]].map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 py-3 text-sm last:border-0"><span className="text-slate-500">{label}</span><strong className="text-right">{value}</strong></div>)}</section><button onClick={() => go("customer-support")} className="w-full rounded-xl border border-teal-200 bg-teal-50 py-3 text-sm font-semibold text-teal-800">Cần hỗ trợ về đơn này</button></aside></div></DashboardShell>;
}

function InfoPage({ type }: { type: string }) {
  const title = type === "how" ? "PREORA hoạt động như thế nào?" : type === "help" ? "Trung tâm trợ giúp" : type === "contact" ? "Liên hệ PREORA" : type === "terms" ? "Điều khoản dịch vụ" : type === "privacy" ? "Chính sách quyền riêng tư" : "Cửa hàng Aurora Lab";
  const steps = ["Người bán tạo chiến dịch", "Khách hàng đặt trước", "PREORA thu thập tín hiệu nhu cầu", "AI phân tích dữ liệu", "Đối chiếu với MOQ", "Sản xuất khi chiến dịch thành công", "Giao sản phẩm tới khách hàng"];
  const faqs = ["Pre-order là gì?", "MOQ là gì?", "Khi nào sản xuất bắt đầu?", "Điều gì xảy ra nếu không đạt MOQ?", "Tôi theo dõi đơn hàng thế nào?", "Quy trình hoàn tiền hoạt động ra sao?", "AI được sử dụng như thế nào?"];
  return <><PublicHeader cartCount={0} /><main className="min-h-screen bg-white"><section className="border-b border-slate-200 bg-slate-950 px-5 py-20 text-center text-white"><p className="font-mono text-xs uppercase tracking-[.2em] text-teal-400">PREORA</p><h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">{title}</h1><p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-400">Mô hình đặt trước minh bạch, giúp xác nhận nhu cầu trước sản xuất và giảm rủi ro tồn kho.</p></section><section className="mx-auto max-w-5xl px-5 py-16">{type === "how" ? <div className="grid gap-4 md:grid-cols-2">{steps.map((s, i) => <article key={s} className="rounded-2xl border border-slate-200 p-6"><span className="font-mono text-xs font-bold text-teal-700">0{i + 1}</span><h2 className="mt-3 font-serif text-xl font-bold">{s}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Mỗi bước được cập nhật minh bạch cho đúng vai trò trong toàn bộ vòng đời chiến dịch.</p></article>)}</div> : type === "seller-profile" ? <><div className="flex items-center gap-5 rounded-2xl border border-slate-200 p-6"><span className="grid h-20 w-20 place-items-center rounded-2xl bg-teal-100 text-2xl font-bold text-teal-700">AL</span><div><h2 className="font-serif text-2xl font-bold">Aurora Lab</h2><p className="mt-1 text-slate-500">Phụ kiện công nghệ được thiết kế tại Việt Nam · Tham gia từ 2024</p></div></div><div className="mt-8 grid gap-5 md:grid-cols-3">{products.filter((p) => p.seller === "Aurora Lab").map((p) => <ProductCard key={p.id} product={p} onSave={() => undefined} />)}</div></> : <div className="mx-auto max-w-3xl space-y-3">{faqs.map((f) => <details key={f} className="rounded-2xl border border-slate-200 p-5 open:border-teal-300"><summary className="cursor-pointer font-semibold">{f}</summary><p className="mt-3 text-sm leading-6 text-slate-600">PREORA sử dụng quy trình rõ ràng, tách riêng trạng thái thanh toán và trạng thái đơn hàng. Mọi dự báo AI chỉ là hỗ trợ quyết định, không bảo đảm kết quả chiến dịch.</p></details>)}</div>}</section></main></>;
}

function Wizard({ campaign = false }: { campaign?: boolean }) {
  const { state, createProduct, createCampaign } = useDemoStore();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const sellerProducts = state.products.filter((product) => product.sellerId === state.session?.userId);
  const defaultStart = new Date().toISOString().slice(0, 10);
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 30);
  const [form, setForm] = useState({
    name: campaign ? "Chiến dịch Pre-order mới" : "",
    productId: String(sellerProducts[0]?.id || ""),
    category: "Công nghệ",
    description: "",
    price: "1290000",
    moq: "300",
    target: "500",
    startDate: defaultStart,
    endDate: defaultEndDate.toISOString().slice(0, 10),
    manufacturingDays: "45",
  });
  const total = campaign ? 4 : 2;
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    if (!form.name.trim() || !form.description.trim()) return "Vui lòng nhập tên và mô tả.";
    if (Number(form.price) <= 0) return "Giá phải lớn hơn 0.";
    if (campaign && (!form.productId || Number(form.moq) <= 0 || Number(form.target) < Number(form.moq))) return "MOQ phải lớn hơn 0 và mục tiêu không được nhỏ hơn MOQ.";
    if (campaign && (!form.startDate || !form.endDate || form.endDate <= form.startDate)) return "Ngày kết thúc phải sau ngày bắt đầu.";
    return "";
  };
  const save = (submit: boolean) => {
    const validation = validate();
    if (validation) { setError(validation); return; }
    if (campaign) {
      createCampaign({
        productId: Number(form.productId),
        name: form.name,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        moq: Number(form.moq),
        target: Number(form.target),
        price: Number(form.price),
      }, submit);
    } else {
      createProduct({ name: form.name, category: form.category, price: Number(form.price), description: form.description, manufacturingDays: Number(form.manufacturingDays) });
    }
    setSubmitted(true);
  };
  return <DashboardShell role="seller" page={campaign ? "seller-campaigns" : "seller-products"}><PageTitle eyebrow={campaign ? "S06" : "S03"} title={campaign ? "Tạo chiến dịch đặt trước" : "Thêm sản phẩm mới"} description="Dữ liệu được kiểm tra, lưu vào store dùng chung và duy trì sau khi tải lại trang." /><div className="mb-6 flex gap-2">{Array.from({ length: total }, (_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i + 1 <= step ? "bg-teal-600" : "bg-slate-200"}`} />)}</div><section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">{submitted ? <div className="py-16 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal-50 text-2xl font-bold text-teal-600">✓</div><h2 className="mt-5 font-serif text-3xl font-bold">{campaign ? "Đã lưu chiến dịch" : "Đã tạo sản phẩm"}</h2><p className="mt-3 text-slate-500">{campaign ? "Trạng thái đã được lưu và sẽ xuất hiện trong cổng Admin nếu gửi duyệt." : "Sản phẩm mới đã xuất hiện trong dữ liệu cửa hàng."}</p><button onClick={() => go(campaign ? "seller-campaigns" : "seller-products")} className="mt-6 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Về trang quản lý</button></div> : <><p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700">Bước {step} / {total}</p><h2 className="mt-2 font-serif text-2xl font-bold">{campaign ? ["Chọn sản phẩm", "Cấu hình chiến dịch", "Kiểm tra thông tin", "Gửi duyệt"][step - 1] : ["Thông tin sản phẩm", "Xem trước & lưu"][step - 1]}</h2><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Tên {campaign ? "chiến dịch" : "sản phẩm"}<input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" /></label>{campaign ? <label className="text-sm font-semibold">Sản phẩm<select value={form.productId} onChange={(event) => update("productId", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal">{sellerProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : <label className="text-sm font-semibold">Danh mục<input value={form.category} onChange={(event) => update("category", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>}<label className="text-sm font-semibold">Giá bán dự kiến<input type="number" value={form.price} onChange={(event) => update("price", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>{campaign ? <><label className="text-sm font-semibold">MOQ<input type="number" value={form.moq} onChange={(event) => update("moq", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Số lượng mục tiêu<input type="number" value={form.target} onChange={(event) => update("target", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Ngày bắt đầu<input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Ngày kết thúc<input type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label></> : <label className="text-sm font-semibold">Thời gian sản xuất (ngày)<input type="number" value={form.manufacturingDays} onChange={(event) => update("manufacturingDays", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label>}<label className="text-sm font-semibold sm:col-span-2">Mô tả<textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-teal-500" /></label></div>{error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}<div className="mt-8 flex justify-between"><button disabled={step === 1} onClick={() => setStep(step - 1)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold disabled:opacity-40">Quay lại</button>{step < total ? <button onClick={() => { const validation = step === 1 && !form.name.trim() ? "Vui lòng nhập tên trước khi tiếp tục." : ""; setError(validation); if (!validation) setStep(step + 1); }} className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Tiếp tục</button> : campaign ? <div className="flex gap-2"><button onClick={() => save(false)} className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">Lưu bản nháp</button><button onClick={() => save(true)} className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Gửi quản trị viên duyệt</button></div> : <button onClick={() => save(false)} className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Lưu sản phẩm</button>}</div></>}</section></DashboardShell>;
}

function Empty({ title, text, action, path }: { title: string; text: string; action: string; path: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 font-serif text-2xl font-bold text-slate-400">P</div><h2 className="mt-5 font-serif text-2xl font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p><button onClick={() => go(path)} className="mt-6 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">{action}</button></div>;
}

function Unauthorized({ requiredRole }: { requiredRole: DemoRole }) {
  const labels: Record<DemoRole, string> = { customer: "Khách hàng", seller: "Người bán", admin: "Quản trị viên", partner: "Đối tác sản xuất" };
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-2xl font-bold text-rose-600">!</div><h1 className="mt-5 font-serif text-3xl font-bold">Không có quyền truy cập</h1><p className="mt-3 text-sm leading-6 text-slate-500">Trang này yêu cầu vai trò <strong>{labels[requiredRole]}</strong>. Hãy đăng nhập đúng tài khoản hoặc dùng bộ chuyển vai trò demo.</p><button onClick={() => { sessionStorage.setItem("preora-return-route", window.location.hash.replace("#/", "").replace("#", "")); go("login"); }} className="mt-6 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">Về trang đăng nhập</button><DemoSwitcher /></div></main>;
}

function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5"><Empty title="Không tìm thấy trang" text="Đường dẫn không tồn tại hoặc đã được thay đổi." action="Về Landing Page" path="" /></main>;
}

export default function Platform({ route }: { route: string }) {
  const { state, addCartItem } = useDemoStore();
  const [saved, setSaved] = useState<number[]>([2, 5]);
  const [lastOrders, setLastOrders] = useState<StoreOrder[]>([]);
  const add = (id: number, variant: string) => {
    const campaign = state.campaigns.find((item) => item.productId === id && isCampaignOrderable(item, state));
    if (campaign) addCartItem({ productId: id, campaignId: campaign.id, variant, quantity: 1, unitPrice: campaign.price });
  };
  const save = (id: number) => setSaved((x) => x.includes(id) ? x.filter((v) => v !== id) : [...x, id]);
  const getUiProduct = (id: number) => {
    const storeProduct = state.products.find((item) => item.id === id);
    const campaign = state.campaigns.find((item) => item.productId === id && ["Đang hoạt động", "Thành công", "Không đạt MOQ"].includes(item.status));
    return storeProduct && campaign ? toUiProduct(storeProduct, campaign, state) : products.find((item) => item.id === id) || products[0];
  };
  const authRoutes = ["login", "register", "forgot"];
  if (authRoutes.includes(route)) return <Auth mode={route as "login" | "register" | "forgot"} />;
  const extraRoleRoutes: Record<DemoRole, string[]> = {
    customer: ["account", "orders", "wishlist", "notifications", "profile", "cart", "checkout", "confirmation", "tracking"],
    seller: ["seller-product-new", "seller-campaign-new", "seller-campaign-detail", "seller-order-detail", "seller-notifications"],
    admin: ["admin-campaign-detail", "admin-notifications"],
    partner: ["partner-notifications"],
  };
  const requiredRole = (["customer", "seller", "admin", "partner"] as DemoRole[]).find((role) =>
    navByRole[role].some((item) => item.path === route)
    || extraRoleRoutes[role].includes(route)
    || route.startsWith(`${role}-product/`)
    || (role === "customer" && route.startsWith("customer-tracking/"))
  ) || null;
  if (requiredRole && state.session?.role !== requiredRole) return <Unauthorized requiredRole={requiredRole} />;
  const supportRole = (["customer", "seller", "admin", "partner"] as Role[]).find((role) =>
    route === `${role}-help` || route === `${role}-support` || route === `${role}-guide`
  );
  if (supportRole) {
    const mode = route.endsWith("-help") ? "help" : route.endsWith("-support") ? "support" : "guide";
    return <SupportPage role={supportRole} mode={mode} />;
  }
  if (route.startsWith("customer-tracking/")) {
    const product = getUiProduct(Number(route.split("/")[1]));
    return <CustomerOrderTracking product={product} />;
  }
  const marketplaceRole = (["customer", "seller", "admin", "partner"] as Role[]).find((role) => route === `${role}-home`);
  if (marketplaceRole) return <AuthMarketplace role={marketplaceRole} saved={saved} onSave={save} />;
  const productRole = (["customer", "seller", "admin", "partner"] as Role[]).find((role) => route.startsWith(`${role}-product/`));
  if (productRole) {
    const product = getUiProduct(Number(route.split("/")[1]));
    return <AuthProductDetail role={productRole} product={product} saved={saved.includes(product.id)} onSave={save} />;
  }
  if (route === "explore") return <Explore onSave={save} />;
  if (route.startsWith("product/")) { const product = getUiProduct(Number(route.split("/")[1])); return <ProductDetail product={product} onAdd={add} onSave={save} saved={saved.includes(product.id)} />; }
  if (route === "cart") return <Cart />;
  if (route === "checkout") return <Checkout onComplete={(result) => { setLastOrders(result.orders); go("confirmation"); }} />;
  if (route === "confirmation") {
    const persistedIds = state.checkoutGroups[0]?.orderIds || [];
    const orders = lastOrders.length ? lastOrders : state.orders.filter((order) => persistedIds.includes(order.id));
    return orders.length ? <Confirmation orders={orders} /> : <Empty title="Không tìm thấy giao dịch vừa tạo" text="Không có đơn hàng mới để xác nhận." action="Về đơn hàng" path="orders" />;
  }
  if (route === "tracking") {
    const order = state.orders.find((item) => item.customerId === state.session?.userId);
    return order ? <CustomerOrderTracking product={getUiProduct(order.productId)} /> : <Empty title="Chưa có đơn để theo dõi" text="Hãy đặt trước một sản phẩm đang hoạt động." action="Khám phá sản phẩm" path="customer-home" />;
  }
  if (["how", "help", "contact", "terms", "privacy", "seller-profile"].includes(route)) return <InfoPage type={route} />;
  if (route === "seller") return <SellerOverview />;
  if (route === "seller-ai") return <SellerAI />;
  if (route === "seller-success") return <SellerAI success />;
  if (route === "seller-product-new") return <Wizard />;
  if (route === "seller-campaign-new") return <Wizard campaign />;
  if (route === "admin") return <Admin />;
  if (route === "admin-campaigns") return <AdminCampaigns />;
  if (route === "partner" || route === "partner-production") return <Partner detail={route === "partner-production"} />;
  if (requiredRole) return <GenericDashboardPage role={requiredRole} page={route} />;
  return <NotFound />;
}
