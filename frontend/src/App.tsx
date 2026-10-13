import { useState, useEffect } from "react";
import BrandIdentity from "./BrandIdentity";
import Platform from "./Platform";

// ── PREORA Icon — shopping bag wraps around the P ─────────────────────────
// Geometry (512×512 viewBox):
//   Bag body:   x=148–368, y=268–412  (wide teal rect, wraps left+right of stem)
//   Bag rim:    x=148–368, y=260–276  (lighter teal opening edge)
//   Bag handle: arch M 196 268 A 62 88 0 0 1 324 268  (stroke, teal)
//   Stem:       x=204–260, y=108–392  (white, embedded through bag centre-left)
//   Bowl:       D r=96, center(260,204), y=108–300     (teal)
//   Counter:    D r=56, center(260,204), y=148–260     (navy)
//   Clock:      cx=316, cy=338, r=26  (right compartment of bag)
//   Badge:      coral cx=402,cy=82    (top-right, cart+check)

function PreoraIcon({ size = 36 }: { size?: number }) {
  const id = `pi-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#141f36" />
          <stop offset="100%" stopColor="#0a1018" />
        </linearGradient>
        <radialGradient id={`${id}-rim`} cx="20%" cy="16%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background tile */}
      <rect width="512" height="512" rx="112" fill={`url(#${id}-bg)`} />
      <rect width="512" height="512" rx="112" fill={`url(#${id}-rim)`} />

      {/* ── Shopping bag — the outer container that wraps the P ──────────── */}

      {/* Bag body: wide teal rect extending well beyond the stem on both sides */}
      <rect x="148" y="268" width="220" height="144" rx="22" fill="#0d9488" />

      {/* Bag rim / opening: lighter teal strip at the top of the bag */}
      <rect x="148" y="260" width="220" height="18" rx="9" fill="#2dd4bf" />

      {/* Bag handle arch: a thick arched strap rising above the bag opening,
          connecting left shoulder (196) to right shoulder (324).
          This arch sits above the P's bowl, framing the whole mark. */}
      <path
        d="M 196 268 A 62 88 0 0 1 324 268"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* Inner arch cutout to make it look like a hollow strap */}
      <path
        d="M 218 268 A 40 62 0 0 1 302 268"
        fill="none"
        stroke="#0a1018"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* ── P letterform — centred inside the bag ────────────────────────── */}

      {/* Stem — white, runs through the bag body (left-of-centre divider) */}
      <rect x="204" y="108" width="56" height="284" rx="28" fill="#f0f6ff" />

      {/* Bowl — teal D-shape (right semicircle r=96, center 260,204) */}
      <path d="M 260 108 A 96 96 0 0 1 260 300 Z" fill="#14b8a6" />

      {/* Counter — navy cutout (r=56, same centre) */}
      <path d="M 260 148 A 56 56 0 0 1 260 260 Z" fill="#0a1018" />

      {/* Accent dot — AI demand data point inside counter */}
      <circle cx="288" cy="204" r="11" fill="#5eead4" opacity="0.9" />

      {/* ── Pre-order clock in the right compartment of the bag ─────────── */}
      <circle cx="316" cy="338" r="26" stroke="#5eead4" strokeWidth="4" fill="none" opacity="0.75" />
      <line x1="316" y1="338" x2="309" y2="318" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
      <line x1="316" y1="338" x2="334" y2="338" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" opacity="0.95" />
      <circle cx="316" cy="338" r="4" fill="#5eead4" />

    </svg>
  );
}

// ── i18n ───────────────────────────────────────────────────────────────────

const translations = {
  en: {
    nav: { home: "Home", explore: "Explore", howItWorks: "How It Works", forSellers: "For Sellers", about: "About", signIn: "Sign In", getStarted: "Get Started" },
    hero: {
      badge: "AI-Powered Pre-Order Commerce",
      heading: "Build what people actually want.",
      body: "Preora helps creators and businesses launch products before mass production, collect real customer demand, and use AI-powered insights to make smarter production decisions.",
      exploreBtn: "Explore Products",
      campaignBtn: "Start a Campaign",
      cardEdition: "Limited Edition 2026",
      cardOrders: "438 Pre-orders",
      cardTarget: "Target: 600",
      cardDays: "8 days remaining",
      cardBtn: "Pre-order Now",
    },
    stats: [
      { value: "12,500+", label: "Pre-orders placed" },
      { value: "320+", label: "Products launched" },
      { value: "87%", label: "Successful campaigns" },
      { value: "AI Powered", label: "Demand insights" },
    ],
    how: {
      badge: "How It Works",
      heading: "From idea to production",
      body: "Launching a new product should not require guessing how many units customers will buy. Preora helps sellers validate demand before production.",
      steps: [
        { icon: "💡", label: "Create Your Product", desc: "Upload your idea, prototype, design, pricing and campaign information." },
        { icon: "🛒", label: "Open Pre-orders", desc: "Customers can discover the product and place their orders before production begins." },
        { icon: "🤖", label: "AI Predicts Demand", desc: "AI analyzes customer interest, pre-order growth and campaign performance to estimate final demand." },
        { icon: "📦", label: "Produce & Deliver", desc: "Sellers use real orders and AI insights to determine an appropriate production quantity." },
      ],
    },
    featured: { badge: "Featured", heading: "Discover what's launching next", viewAll: "View All Products →" },
    ai: {
      badge: "Preora AI",
      heading: "Don't guess demand.",
      headingAccent: "Predict it.",
      body: "Instead of producing inventory based only on intuition, sellers can use AI-generated insights to understand how a campaign may perform before it ends.",
      note: "AI predictions are generated from campaign activity, customer engagement and historical data.",
      live: "Live",
      dashboard: { title: "LUMI Limited Hoodie", sub: "Campaign Performance" },
      metrics: [
        { label: "Current Pre-orders", value: "438" },
        { label: "Target", value: "600" },
        { label: "Campaign Progress", value: "73%" },
        { label: "Time Remaining", value: "8 days" },
      ],
      prediction: "🤖 AI Prediction",
      finalDemand: "Final Demand",
      thisWeek: "↑ 64 this week",
      reachTarget: "Reach Target",
      suggested: "Suggested",
      units: "units",
      demandTrend: "Demand Trend",
      actualOrders: "Actual Orders",
      aiPrediction: "AI Prediction",
    },
    sellers: {
      badge: "For Sellers",
      heading: "Launch smarter. Produce with confidence.",
      features: [
        { title: "Validate before you manufacture", desc: "Understand whether customers actually want your product before committing to large-scale production." },
        { title: "Reduce inventory risk", desc: "Avoid producing excessive inventory that may remain unsold." },
        { title: "Understand demand", desc: "Track product views, customer interest, conversion and pre-orders." },
        { title: "Make data-driven decisions", desc: "Use AI forecasts alongside real pre-order data when determining production quantity." },
      ],
      cta: "Launch Your Product",
    },
    customers: {
      badge: "For Customers",
      heading: "Discover products before everyone else.",
      features: [
        { icon: "✨", text: "Discover upcoming products" },
        { icon: "❤️", text: "Follow products they love" },
        { icon: "🛒", text: "Secure limited releases through pre-order" },
        { icon: "📊", text: "See campaign progress" },
        { icon: "🔔", text: "Receive production and delivery updates" },
        { icon: "🎁", text: "Access exclusive pre-order editions" },
      ],
      cta: "Explore Pre-orders",
    },
    usecases: {
      badge: "Use Cases",
      heading: "Products made for pre-order",
      sub: "Preora can support products such as:",
      items: [
        { icon: "👕", label: "Fashion", desc: "Limited clothing collections, hoodies, shirts and accessories." },
        { icon: "🎨", label: "Creator Merchandise", desc: "Creator merchandise, fan products and event collections." },
        { icon: "🧸", label: "Collectibles", desc: "Figures, plushies, acrylic stands and limited collectibles." },
        { icon: "⌨️", label: "Technology Accessories", desc: "Mechanical keyboards, keycaps, gadgets and accessories." },
        { icon: "📚", label: "Publishing", desc: "Books, artbooks, photobooks and special editions." },
        { icon: "🎁", label: "Made-to-Order", desc: "Customized and personalized products." },
      ],
    },
    campaign: {
      badge: "Campaign Example",
      heading: "One idea. Real demand. Smarter production.",
      note: "Instead of producing 1,000 units and hoping they sell, sellers can use pre-order data and AI forecasts to make more informed production decisions.",
      steps: [
        { label: "Day 1", sub: "Product launched", value: "0 pre-orders" },
        { label: "Day 5", sub: "Customer interest grows", value: "145 pre-orders" },
        { label: "Day 12", sub: "Campaign gains traction", value: "438 pre-orders" },
        { label: "AI Forecast", sub: "Expected final demand", value: "≈ 720 units", ai: true },
        { label: "Campaign ends", sub: "Confirmed demand", value: "705 pre-orders" },
        { label: "Production", sub: "Seller produces", value: "730 units", final: true },
      ],
    },
    cta: {
      heading: "Your next product shouldn't start with inventory.",
      subheading: "It should start with demand.",
      body: "Launch your idea, collect real customer interest and produce with greater confidence.",
      btn1: "Start a Campaign",
      btn2: "Explore Products",
    },
    footer: { tagline: "Turn demand into products.", cols: [{ title: "Products", links: ["Explore", "Upcoming", "Popular"] }, { title: "For Sellers", links: ["Start a Campaign", "Seller Dashboard", "How It Works"] }, { title: "Company", links: ["About", "Contact", "Terms", "Privacy"] }], copy: "© 2026 Preora. Student Project.", built: "Built with love for creators." },
    products: [
      { name: "LUMI Limited Hoodie", category: "Fashion", price: "649,000₫", orders: 438, target: 600, pct: 73, days: 8, badge: "🔥 Trending", img: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=400&h=300&fit=crop&auto=format" },
      { name: "Neko Mini Figure", category: "Collectible", price: "799,000₫", orders: 782, target: 850, pct: 92, days: 3, badge: "⚡ Almost Funded", img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&h=300&fit=crop&auto=format" },
      { name: "Nova Mechanical Keycap Set", category: "Technology", price: "1,290,000₫", orders: 315, target: 500, pct: 63, days: 14, badge: null, img: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=300&fit=crop&auto=format" },
      { name: "Dreamscape Artbook", category: "Books & Art", price: "459,000₫", orders: 526, target: 700, pct: 75, days: 11, badge: null, img: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop&auto=format" },
    ],
    daysLeft: "days left",
  },
  vi: {
    nav: { home: "Trang chủ", explore: "Khám phá", howItWorks: "Cách hoạt động", forSellers: "Dành cho người bán", about: "Giới thiệu", signIn: "Đăng nhập", getStarted: "Bắt đầu ngay" },
    hero: {
      badge: "Thương mại đặt hàng trước bằng AI",
      heading: "Xây dựng những gì mọi người thực sự muốn.",
      body: "Preora giúp các nhà sáng tạo và doanh nghiệp ra mắt sản phẩm trước khi sản xuất hàng loạt, thu thập nhu cầu thực tế từ khách hàng và sử dụng thông tin AI để đưa ra quyết định sản xuất thông minh hơn.",
      exploreBtn: "Khám phá sản phẩm",
      campaignBtn: "Tạo chiến dịch",
      cardEdition: "Phiên bản giới hạn 2026",
      cardOrders: "438 đơn đặt trước",
      cardTarget: "Mục tiêu: 600",
      cardDays: "Còn 8 ngày",
      cardBtn: "Đặt trước ngay",
    },
    stats: [{ value: "12.500+", label: "Đơn đặt trước" }, { value: "320+", label: "Sản phẩm đã ra mắt" }, { value: "87%", label: "Chiến dịch thành công" }, { value: "AI", label: "Dự báo nhu cầu" }],
    how: {
      badge: "Cách hoạt động",
      heading: "Từ ý tưởng đến sản xuất",
      body: "Ra mắt sản phẩm mới không nên phụ thuộc vào việc đoán mò số lượng khách hàng cần. Preora giúp người bán xác nhận nhu cầu trước khi sản xuất.",
      steps: [
        { icon: "💡", label: "Tạo sản phẩm của bạn", desc: "Tải lên ý tưởng, mẫu thiết kế, thông tin giá và chiến dịch của bạn." },
        { icon: "🛒", label: "Mở đặt hàng trước", desc: "Khách hàng có thể khám phá sản phẩm và đặt hàng trước khi sản xuất bắt đầu." },
        { icon: "🤖", label: "AI dự báo nhu cầu", desc: "AI phân tích sự quan tâm của khách hàng, tốc độ đặt hàng để ước tính nhu cầu cuối cùng." },
        { icon: "📦", label: "Sản xuất & Giao hàng", desc: "Người bán dùng đơn hàng thực tế và dữ liệu AI để quyết định số lượng sản xuất phù hợp." },
      ],
    },
    featured: { badge: "Nổi bật", heading: "Khám phá những gì sắp ra mắt", viewAll: "Xem tất cả sản phẩm →" },
    ai: {
      badge: "Preora AI",
      heading: "Đừng đoán nhu cầu.",
      headingAccent: "Hãy dự báo nó.",
      body: "Thay vì sản xuất hàng tồn kho chỉ dựa trên trực giác, người bán có thể dùng thông tin AI để hiểu chiến dịch có thể hoạt động như thế nào trước khi kết thúc.",
      note: "Dự báo AI được tạo ra từ hoạt động chiến dịch, mức độ tương tác của khách hàng và dữ liệu lịch sử.",
      live: "Trực tiếp",
      dashboard: { title: "LUMI Limited Hoodie", sub: "Hiệu suất chiến dịch" },
      metrics: [{ label: "Đơn đặt trước hiện tại", value: "438" }, { label: "Mục tiêu", value: "600" }, { label: "Tiến độ chiến dịch", value: "73%" }, { label: "Thời gian còn lại", value: "8 ngày" }],
      prediction: "🤖 Dự báo AI",
      finalDemand: "Nhu cầu dự báo",
      thisWeek: "↑ 64 đơn tuần này",
      reachTarget: "Xác suất đạt mục tiêu",
      suggested: "Đề xuất sản xuất",
      units: "đơn vị",
      demandTrend: "Xu hướng nhu cầu",
      actualOrders: "Đơn thực tế",
      aiPrediction: "Dự báo AI",
    },
    sellers: {
      badge: "Dành cho người bán",
      heading: "Ra mắt thông minh hơn. Sản xuất tự tin hơn.",
      features: [
        { title: "Xác nhận trước khi sản xuất", desc: "Hiểu xem khách hàng có thực sự muốn sản phẩm của bạn không trước khi cam kết sản xuất quy mô lớn." },
        { title: "Giảm rủi ro tồn kho", desc: "Tránh sản xuất hàng tồn kho quá mức có thể không bán được." },
        { title: "Hiểu nhu cầu thị trường", desc: "Theo dõi lượt xem sản phẩm, sự quan tâm của khách hàng, tỷ lệ chuyển đổi và đơn đặt trước." },
        { title: "Quyết định dựa trên dữ liệu", desc: "Sử dụng dự báo AI cùng dữ liệu đặt hàng thực tế khi xác định số lượng sản xuất." },
      ],
      cta: "Ra mắt sản phẩm của bạn",
    },
    customers: {
      badge: "Dành cho khách hàng",
      heading: "Khám phá sản phẩm trước mọi người.",
      features: [
        { icon: "✨", text: "Khám phá các sản phẩm sắp ra mắt" },
        { icon: "❤️", text: "Theo dõi những sản phẩm yêu thích" },
        { icon: "🛒", text: "Đảm bảo phiên bản giới hạn qua đặt hàng trước" },
        { icon: "📊", text: "Xem tiến độ chiến dịch" },
        { icon: "🔔", text: "Nhận thông báo sản xuất và giao hàng" },
        { icon: "🎁", text: "Tiếp cận phiên bản độc quyền khi đặt trước" },
      ],
      cta: "Khám phá đặt hàng trước",
    },
    usecases: {
      badge: "Trường hợp sử dụng",
      heading: "Sản phẩm được tạo ra cho đặt hàng trước",
      sub: "Preora có thể hỗ trợ các sản phẩm như:",
      items: [
        { icon: "👕", label: "Thời trang", desc: "Bộ sưu tập quần áo giới hạn, áo hoodie, áo thun và phụ kiện." },
        { icon: "🎨", label: "Hàng hoá nhà sáng tạo", desc: "Hàng hoá của creator, sản phẩm fan và bộ sưu tập sự kiện." },
        { icon: "🧸", label: "Đồ sưu tầm", desc: "Mô hình, thú bông, acrylic stand và đồ sưu tầm giới hạn." },
        { icon: "⌨️", label: "Phụ kiện công nghệ", desc: "Bàn phím cơ, keycap, thiết bị và phụ kiện công nghệ." },
        { icon: "📚", label: "Xuất bản", desc: "Sách, artbook, photobook và các ấn bản đặc biệt." },
        { icon: "🎁", label: "Sản xuất theo yêu cầu", desc: "Sản phẩm được tuỳ chỉnh và cá nhân hoá." },
      ],
    },
    campaign: {
      badge: "Ví dụ chiến dịch",
      heading: "Một ý tưởng. Nhu cầu thực. Sản xuất thông minh hơn.",
      note: "Thay vì sản xuất trước 1.000 sản phẩm và hy vọng bán hết, người bán có thể dùng dữ liệu đặt trước và dự báo AI để đưa ra quyết định sản xuất phù hợp hơn.",
      steps: [
        { label: "Ngày 1", sub: "Sản phẩm ra mắt", value: "0 đơn đặt trước" },
        { label: "Ngày 5", sub: "Khách hàng bắt đầu quan tâm", value: "145 đơn đặt trước" },
        { label: "Ngày 12", sub: "Chiến dịch bắt đầu bứt phá", value: "438 đơn đặt trước" },
        { label: "Dự báo AI", sub: "Nhu cầu cuối kỳ dự kiến", value: "≈ 720 đơn vị", ai: true },
        { label: "Chiến dịch kết thúc", sub: "Nhu cầu đã xác nhận", value: "705 đơn đặt trước" },
        { label: "Sản xuất", sub: "Người bán sản xuất", value: "730 đơn vị", final: true },
      ],
    },
    cta: { heading: "Sản phẩm tiếp theo của bạn không nên bắt đầu từ hàng tồn kho.", subheading: "Nó nên bắt đầu từ nhu cầu.", body: "Ra mắt ý tưởng của bạn, thu thập sự quan tâm thực sự từ khách hàng và sản xuất với sự tự tin hơn.", btn1: "Tạo chiến dịch", btn2: "Khám phá sản phẩm" },
    footer: { tagline: "Biến nhu cầu thành sản phẩm.", cols: [{ title: "Sản phẩm", links: ["Khám phá", "Sắp ra mắt", "Phổ biến"] }, { title: "Người bán", links: ["Tạo chiến dịch", "Bảng điều khiển", "Cách hoạt động"] }, { title: "Công ty", links: ["Giới thiệu", "Liên hệ", "Điều khoản", "Quyền riêng tư"] }], copy: "© 2026 Preora. Dự án sinh viên.", built: "Được tạo ra với tâm huyết dành cho nhà sáng tạo." },
    products: [
      { name: "LUMI Limited Hoodie", category: "Thời trang", price: "649.000₫", orders: 438, target: 600, pct: 73, days: 8, badge: "🔥 Đang hot", img: "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=400&h=300&fit=crop&auto=format" },
      { name: "Neko Mini Figure", category: "Đồ sưu tầm", price: "799.000₫", orders: 782, target: 850, pct: 92, days: 3, badge: "⚡ Gần đạt mục tiêu", img: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?w=400&h=300&fit=crop&auto=format" },
      { name: "Nova Mechanical Keycap Set", category: "Công nghệ", price: "1.290.000₫", orders: 315, target: 500, pct: 63, days: 14, badge: null, img: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=300&fit=crop&auto=format" },
      { name: "Dreamscape Artbook", category: "Sách & Nghệ thuật", price: "459.000₫", orders: 526, target: 700, pct: 75, days: 11, badge: null, img: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop&auto=format" },
    ],
    daysLeft: "ngày còn lại",
  },
};

type Lang = "en" | "vi";
const navigate = (path: string) => {
  window.location.hash = path ? `/${path}` : "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ── Helpers ────────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "#0d9488" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: "#e2e8f0" }}>
      <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-widest uppercase ${className}`} style={{ background: "#ccfbf1", color: "#0f766e", border: "1px solid #99f6e4" }}>
      {children}
    </span>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
      {(["en", "vi"] as Lang[]).map((l) => (
        <button key={l} onClick={() => setLang(l)} className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all duration-200 uppercase tracking-wider" style={{ background: lang === l ? "#0d9488" : "transparent", color: lang === l ? "#fff" : "#64748b" }}>
          {l === "en" ? "🇬🇧 EN" : "🇻🇳 VI"}
        </button>
      ))}
    </div>
  );
}

function DemandChart({ t }: { t: typeof translations.en.ai }) {
  const actual = [0, 45, 95, 145, 200, 265, 315, 380, 438];
  const predicted = [0, 50, 110, 175, 240, 310, 390, 480, 560, 640, 705, 720];
  const maxY = 750; const w = 320; const h = 120;
  const toX = (i: number, total: number) => (i / (total - 1)) * w;
  const toY = (v: number) => h - (v / maxY) * h;
  const actualPath = actual.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, actual.length).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const predPath = predicted.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i, predicted.length).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 120 }}>
        {[0, 250, 500, 750].map((v) => (<line key={v} x1="0" y1={toY(v)} x2={w} y2={toY(v)} stroke="rgba(14,165,233,0.15)" strokeWidth="1" />))}
        <path d={predPath} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
        <path d={actualPath} fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {actual.map((v, i) => (<circle key={i} cx={toX(i, actual.length)} cy={toY(v)} r="2.5" fill="#0d9488" />))}
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#0d9488" }}>
          <span className="inline-block w-5 h-0.5 rounded" style={{ background: "#0d9488" }} />{t.actualOrders}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#7c3aed" }}>
          <span className="inline-block w-5 h-px border-t border-dashed" style={{ borderColor: "#7c3aed" }} />{t.aiPrediction}
        </span>
      </div>
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function Navbar({ lang, setLang, menuOpen, setMenuOpen }: { lang: Lang; setLang: (l: Lang) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang].nav;
  useState(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  });
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid #e2e8f0" }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo: icon + wordmark */}
        <a href="#" className="flex items-center gap-2.5">
          <PreoraIcon size={34} />
          <span className="font-mono font-bold text-lg tracking-tight" style={{ color: "#0f172a" }}>
            PRE<span style={{ color: "#0d9488" }}>ORA</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {[
            { label: t.home, href: "#" },
            { label: t.explore, href: "#/explore" },
            { label: t.howItWorks, href: "#/how" },
            { label: t.forSellers, href: "#/seller" },
            { label: t.about, href: "#brand" },
          ].map((item) => (
            <a key={item.label} href={item.href} className="text-sm font-medium transition-colors duration-200" style={{ color: "#64748b" }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0f172a")} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#64748b")}>{item.label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <button onClick={() => navigate("login")} className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200" style={{ color: "#64748b" }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0f172a")} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#64748b")}>{t.signIn}</button>
          <button onClick={() => navigate("register")} className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200" style={{ background: "#0d9488", color: "#fff" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0f766e")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#0d9488")}>{t.getStarted}</button>
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} style={{ color: "#0f172a" }}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (<><line x1="4" y1="4" x2="18" y2="18" /><line x1="18" y1="4" x2="4" y2="18" /></>) : (<><line x1="3" y1="6" x2="19" y2="6" /><line x1="3" y1="12" x2="19" y2="12" /><line x1="3" y1="18" x2="19" y2="18" /></>)}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden px-6 pb-6 pt-3 flex flex-col gap-4" style={{ background: "#fff", borderTop: "1px solid #e2e8f0" }}>
          {[[t.home, "#"], [t.explore, "#/explore"], [t.howItWorks, "#/how"], [t.forSellers, "#/seller"], [t.about, "#brand"]].map(([item, href]) => (<a key={item} href={href} className="text-sm font-medium" style={{ color: "#64748b" }}>{item}</a>))}
          <LangToggle lang={lang} setLang={setLang} />
          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate("login")} className="px-4 py-2 text-sm rounded-lg" style={{ color: "#64748b", border: "1px solid #e2e8f0" }}>{t.signIn}</button>
            <button onClick={() => navigate("register")} className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: "#0d9488", color: "#fff" }}>{t.getStarted}</button>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero({ lang }: { lang: Lang }) {
  const t = translations[lang].hero;
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden" style={{ background: "#fff" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #ccfbf1 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-15" style={{ background: "radial-gradient(circle, #e0f2fe 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
        <div>
          <SectionBadge className="mb-6">{t.badge}</SectionBadge>
          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.03em" }}>{t.heading}</h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "#64748b", maxWidth: "480px" }}>{t.body}</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate("explore")} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200" style={{ background: "#0d9488", color: "#fff" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0f766e"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#0d9488"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>{t.exploreBtn}</button>
            <button onClick={() => navigate("seller")} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200" style={{ background: "#fff", color: "#0f172a", border: "1.5px solid #e2e8f0" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#94a3b8")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0")}>{t.campaignBtn}</button>
          </div>
        </div>

        {/* Hero product card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ background: "#fff", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}>
            <div className="absolute top-4 right-4">
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold" style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>🔥 Trending</span>
            </div>
            <div className="w-full h-44 rounded-xl mb-5 overflow-hidden" style={{ background: "#f1f5f9" }}>
              <img src="https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=400&h=200&fit=crop&auto=format" alt="LUMI Limited Hoodie" className="w-full h-full object-cover" />
            </div>
            <div className="mb-1"><span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#94a3b8" }}>{t.cardEdition}</span></div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "#0f172a" }}>LUMI Limited Hoodie</h3>
            <p className="text-2xl font-bold mb-4" style={{ fontFamily: "Fraunces, serif", color: "#0d9488" }}>649,000₫</p>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm font-mono" style={{ color: "#64748b" }}>{t.cardOrders}</span>
              <span className="text-sm font-mono font-semibold" style={{ color: "#0d9488" }}>73%</span>
            </div>
            <ProgressBar pct={73} />
            <p className="text-xs font-mono mt-2 mb-5" style={{ color: "#94a3b8" }}>{t.cardTarget} · {t.cardDays}</p>
            <button onClick={() => navigate("product/6")} className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200" style={{ background: "#0d9488", color: "#fff" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0f766e")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#0d9488")}>{t.cardBtn}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats({ lang }: { lang: Lang }) {
  const stats = translations[lang].stats;
  return (
    <section className="py-12" style={{ background: "#0f172a" }}>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (<div key={i} className="text-center"><div className="text-3xl md:text-4xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif", color: "#14b8a6" }}>{s.value}</div><div className="text-sm font-mono" style={{ color: "#94a3b8" }}>{s.label}</div></div>))}
      </div>
    </section>
  );
}

function HowItWorks({ lang }: { lang: Lang }) {
  const t = translations[lang].how;
  return (
    <section className="py-24" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-xl mb-16">
          <SectionBadge className="mb-4">{t.badge}</SectionBadge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading}</h2>
          <p style={{ color: "#64748b", lineHeight: 1.7 }}>{t.body}</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {t.steps.map((step, i) => (
            <div key={i} className="rounded-2xl p-6 relative transition-all duration-300" style={{ background: "#fff", border: "1.5px solid #e2e8f0" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#99f6e4"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,0.08)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <div className="flex items-center gap-3 mb-4"><span className="text-2xl">{step.icon}</span><span className="text-xs font-mono font-semibold" style={{ color: "#0d9488" }}>0{i + 1}</span></div>
              <h3 className="font-semibold mb-2" style={{ color: "#0f172a" }}>{step.label}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{step.desc}</p>
              {i < t.steps.length - 1 && <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px" style={{ background: "#cbd5e1" }} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({ lang }: { lang: Lang }) {
  const t = translations[lang].featured;
  const products = translations[lang].products;
  const daysLeft = translations[lang].daysLeft;
  const barColors = ["#0d9488", "#f97316", "#3b82f6", "#0d9488"];
  return (
    <section className="py-24" style={{ background: "#fff" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div><SectionBadge className="mb-4">{t.badge}</SectionBadge><h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading}</h2></div>
          <button onClick={() => navigate("explore")} className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200" style={{ background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e2e8f0" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#94a3b8")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0")}>{t.viewAll}</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p, i) => (
            <div key={i} onClick={() => navigate(`product/${i + 2}`)} className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300" style={{ background: "#fff", border: "1.5px solid #e2e8f0" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#99f6e4"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(13,148,136,0.1)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <div className="relative h-44 overflow-hidden" style={{ background: "#f1f5f9" }}>
                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {p.badge && <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-mono font-semibold" style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>{p.badge}</span>}
              </div>
              <div className="p-5">
                <div className="text-xs font-mono mb-1 font-medium" style={{ color: "#0d9488" }}>{p.category}</div>
                <h3 className="font-semibold mb-2 leading-snug" style={{ color: "#0f172a" }}>{p.name}</h3>
                <p className="text-xl font-bold mb-3" style={{ fontFamily: "Fraunces, serif", color: "#0f172a" }}>{p.price}</p>
                <div className="flex justify-between text-xs font-mono mb-2" style={{ color: "#94a3b8" }}>
                  <span>{p.orders} / {p.target}</span><span style={{ color: barColors[i] }}>{p.pct}%</span>
                </div>
                <ProgressBar pct={p.pct} color={barColors[i]} />
                <p className="text-xs font-mono mt-2" style={{ color: "#94a3b8" }}>{p.days} {daysLeft}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AISection({ lang }: { lang: Lang }) {
  const t = translations[lang].ai;
  return (
    <section className="py-24" style={{ background: "#f0fdfa" }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-widest uppercase mb-6" style={{ background: "#0d9488", color: "#fff" }}>{t.badge}</span>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading} <span style={{ color: "#0d9488" }}>{t.headingAccent}</span></h2>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "#64748b" }}>{t.body}</p>
          <p className="text-xs font-mono" style={{ color: "#64748b", background: "#fff", border: "1px solid #99f6e4", padding: "12px 16px", borderRadius: 10, lineHeight: 1.7 }}>{t.note}</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1.5px solid #99f6e4", boxShadow: "0 4px 24px rgba(13,148,136,0.08)" }}>
          <div className="flex items-center justify-between mb-5">
            <div><div className="text-xs font-mono mb-1 font-medium" style={{ color: "#0d9488" }}>{t.dashboard.title}</div><div className="font-semibold" style={{ color: "#0f172a" }}>{t.dashboard.sub}</div></div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>● {t.live}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {t.metrics.map((item, i) => (<div key={i} className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}><div className="text-xs font-mono mb-1" style={{ color: "#94a3b8" }}>{item.label}</div><div className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0f172a" }}>{item.value}</div></div>))}
          </div>
          <div className="rounded-xl p-4" style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}>
            <div className="flex items-center gap-2 mb-4"><span className="text-xs font-mono font-semibold uppercase tracking-widest" style={{ color: "#0f766e" }}>{t.prediction}</span></div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><div className="text-xs font-mono mb-1" style={{ color: "#64748b" }}>{t.finalDemand}</div><div className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0d9488" }}>720</div><div className="text-xs font-mono" style={{ color: "#0d9488" }}>{t.thisWeek}</div></div>
              <div><div className="text-xs font-mono mb-1" style={{ color: "#64748b" }}>{t.reachTarget}</div><div className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#7c3aed" }}>91%</div></div>
              <div><div className="text-xs font-mono mb-1" style={{ color: "#64748b" }}>{t.suggested}</div><div className="text-base font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0f172a" }}>700–760</div><div className="text-xs font-mono" style={{ color: "#94a3b8" }}>{t.units}</div></div>
            </div>
            <div><div className="text-xs font-mono mb-2" style={{ color: "#64748b" }}>{t.demandTrend}</div><DemandChart t={t} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForSellers({ lang }: { lang: Lang }) {
  const t = translations[lang].sellers;
  return (
    <section className="py-24" style={{ background: "#0f172a" }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium tracking-widest uppercase mb-6" style={{ background: "rgba(20,184,166,0.15)", color: "#14b8a6", border: "1px solid rgba(20,184,166,0.3)" }}>{t.badge}</span>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "Fraunces, serif", color: "#f8fafc", letterSpacing: "-0.02em" }}>{t.heading}</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {t.features.map((f, i) => (<div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}><h4 className="font-semibold mb-2 text-sm" style={{ color: "#f1f5f9" }}>{f.title}</h4><p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{f.desc}</p></div>))}
          </div>
          <button onClick={() => navigate("seller")} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200" style={{ background: "#0d9488", color: "#fff" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#14b8a6")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#0d9488")}>{t.cta}</button>
        </div>
        <div className="relative">
          <div className="w-full h-80 rounded-2xl overflow-hidden" style={{ background: "#1e293b" }}>
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&auto=format" alt="Seller analytics" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.25) 0%, transparent 60%)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ForCustomers({ lang }: { lang: Lang }) {
  const t = translations[lang].customers;
  return (
    <section className="py-24" style={{ background: "#fff" }}>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="relative order-2 lg:order-1">
          <div className="w-full h-80 rounded-2xl overflow-hidden" style={{ background: "#f1f5f9" }}>
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop&auto=format" alt="Customers" className="w-full h-full object-cover" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(225deg, rgba(13,148,136,0.15) 0%, transparent 50%)" }} />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <SectionBadge className="mb-6">{t.badge}</SectionBadge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading}</h2>
          <div className="flex flex-col gap-3 mb-8">
            {t.features.map((f, i) => (<div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: "#f1f5f9" }}><span className="text-lg w-8 shrink-0">{f.icon}</span><span style={{ color: "#1e293b" }}>{f.text}</span></div>))}
          </div>
          <button onClick={() => navigate("explore")} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200" style={{ background: "#fff", color: "#0d9488", border: "1.5px solid #0d9488" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f0fdfa")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#fff")}>{t.cta}</button>
        </div>
      </div>
    </section>
  );
}

function UseCases({ lang }: { lang: Lang }) {
  const t = translations[lang].usecases;
  return (
    <section className="py-24" style={{ background: "#f8fafc" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12"><SectionBadge className="mb-4">{t.badge}</SectionBadge><h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading}</h2><p className="mt-4" style={{ color: "#64748b" }}>{t.sub}</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.items.map((uc, i) => (<div key={i} className="p-5 rounded-2xl flex gap-4 items-start cursor-pointer transition-all duration-300" style={{ background: "#fff", border: "1.5px solid #e2e8f0" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#99f6e4"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(13,148,136,0.08)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}><span className="text-2xl">{uc.icon}</span><div><h4 className="font-semibold mb-1" style={{ color: "#0f172a" }}>{uc.label}</h4><p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{uc.desc}</p></div></div>))}
        </div>
      </div>
    </section>
  );
}

function CampaignExample({ lang }: { lang: Lang }) {
  const t = translations[lang].campaign;
  return (
    <section className="py-24" style={{ background: "#fff" }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16"><SectionBadge className="mb-4">{t.badge}</SectionBadge><h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "#0f172a", letterSpacing: "-0.02em" }}>{t.heading}</h2></div>
        <div className="relative">
          <div className="absolute left-6 top-8 bottom-8 w-px" style={{ background: "linear-gradient(180deg, #0d9488, #e2e8f0)" }} />
          <div className="flex flex-col gap-5">
            {t.steps.map((step, i) => (
              <div key={i} className="flex gap-6 items-start pl-2">
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-mono font-bold relative z-10" style={{ background: step.ai ? "#0d9488" : "#fff", border: step.ai ? "none" : "2px solid #e2e8f0", color: step.ai ? "#fff" : "#64748b", boxShadow: step.ai ? "0 2px 8px rgba(13,148,136,0.3)" : "none" }}>{step.ai ? "AI" : i + 1}</div>
                <div className="flex-1 p-4 rounded-xl" style={{ background: step.ai ? "#f0fdfa" : "#f8fafc", border: step.ai ? "1.5px solid #99f6e4" : "1px solid #e2e8f0" }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div><div className="font-semibold" style={{ color: "#0f172a" }}>{step.label}</div><div className="text-sm" style={{ color: "#64748b" }}>{step.sub}</div></div>
                    <div className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif", color: step.ai ? "#0d9488" : "#0f172a" }}>{step.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-sm leading-relaxed" style={{ color: "#64748b", maxWidth: 520, margin: "40px auto 0" }}>{t.note}</p>
      </div>
    </section>
  );
}

function FinalCTA({ lang }: { lang: Lang }) {
  const t = translations[lang].cta;
  return (
    <section className="py-32 relative overflow-hidden" style={{ background: "#0f172a" }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(13,148,136,0.15) 0%, transparent 70%)" }} />
      </div>
      <div className="max-w-3xl mx-auto px-6 text-center relative">
        <h2 className="text-5xl lg:text-6xl font-bold mb-4" style={{ fontFamily: "Fraunces, serif", color: "#f8fafc", letterSpacing: "-0.03em" }}>{t.heading}</h2>
        <p className="text-2xl lg:text-3xl font-semibold mb-6" style={{ fontFamily: "Fraunces, serif", color: "#14b8a6" }}>{t.subheading}</p>
        <p className="mb-10 text-lg" style={{ color: "#94a3b8" }}>{t.body}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <button onClick={() => navigate("seller-campaign-new")} className="px-8 py-4 rounded-xl font-semibold transition-all duration-200" style={{ background: "#f97316", color: "#fff" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#ea6c00"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(249,115,22,0.35)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#f97316"; (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>{t.btn1}</button>
          <button onClick={() => navigate("explore")} className="px-8 py-4 rounded-xl font-semibold transition-all duration-200" style={{ background: "transparent", color: "#e2e8f0", border: "1.5px solid rgba(255,255,255,0.2)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)")}>{t.btn2}</button>
        </div>
      </div>
    </section>
  );
}

function Footer({ lang }: { lang: Lang }) {
  const t = translations[lang].footer;
  return (
    <footer className="py-16" style={{ background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            {/* Footer logo with icon */}
            <div className="flex items-center gap-2.5 mb-3">
              <PreoraIcon size={32} />
              <span className="font-mono font-bold text-lg tracking-tight" style={{ color: "#f8fafc" }}>
                PRE<span style={{ color: "#14b8a6" }}>ORA</span>
              </span>
            </div>
            <p className="text-sm" style={{ color: "#64748b" }}>{t.tagline}</p>
          </div>
          {t.cols.map((col, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: "#f1f5f9" }}>{col.title}</h4>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => {
                  const lower = link.toLowerCase();
                  const href = lower.includes("contact") || lower.includes("liên hệ")
                    ? "#/contact"
                    : lower.includes("term") || lower.includes("điều khoản")
                      ? "#/terms"
                      : lower.includes("privacy") || lower.includes("quyền riêng")
                        ? "#/privacy"
                        : i === 0
                          ? "#/explore"
                          : i === 1
                            ? "#/seller"
                            : "#/help";
                  return <li key={link}><a href={href} className="text-sm transition-colors duration-200" style={{ color: "#64748b" }} onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#14b8a6")} onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#64748b")}>{link}</a></li>;
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs font-mono" style={{ color: "#475569" }}>{t.copy}</p>
          <p className="text-xs font-mono" style={{ color: "#475569" }}>{t.built}</p>
          <a href="#brand" className="text-xs font-mono transition-colors duration-150" style={{ color: "#475569" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#2dd4bf")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}>Brand Identity →</a>
        </div>
      </div>
    </footer>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang] = useState<Lang>("vi");
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(() => window.location.hash);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (page === "#brand") return <BrandIdentity />;
  const route = page.replace(/^#\/?/, "");
  if (route) return <Platform route={route} />;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <Navbar lang={lang} setLang={setLang} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero lang={lang} />
      <Stats lang={lang} />
      <HowItWorks lang={lang} />
      <FeaturedProducts lang={lang} />
      <AISection lang={lang} />
      <ForSellers lang={lang} />
      <ForCustomers lang={lang} />
      <UseCases lang={lang} />
      <CampaignExample lang={lang} />
      <FinalCTA lang={lang} />
      <Footer lang={lang} />
    </div>
  );
}
