export const COLLECTION_TOPICS = ["Sonic", "Super Mario", "Liên Quân Mobile", "Doraemon", "Thám tử Conan", "Anime điện ảnh"] as const;
export const PRODUCT_GROUPS = [
  { name: "Thời trang", icon: "👕", description: "Áo, hoodie, túi tote" },
  { name: "Merchandise", icon: "☕", description: "Creator, sự kiện, limited edition" },
  { name: "Collectible", icon: "🧸", description: "Figure, móc khóa, plushie" },
  { name: "Công nghệ / Phụ kiện điện tử", icon: "⌨️", description: "Keycap, bàn phím, gadget" },
  { name: "Nước hoa", icon: "✦", description: "Những hương thơm bạn yêu thích" },
  { name: "Trang trí nhà cửa", icon: "🏠", description: "Đèn, khung ảnh, phụ kiện trang trí" },
] as const;
export default function CatalogueFilters({ category, franchise, onCategory, onFranchise }: { category: string; franchise: string; onCategory: (value: string) => void; onFranchise: (value: string) => void }) {
  return <section className="mt-6 space-y-4" aria-label="Nhóm sản phẩm và bộ sưu tập">
    <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bộ sưu tập</span>{["Tất cả chủ đề", ...COLLECTION_TOPICS].map((name) => <button key={name} aria-pressed={franchise === name} onClick={() => onFranchise(name)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${franchise === name ? name === "Sonic" ? "border-blue-600 bg-blue-600 text-white" : name === "Super Mario" ? "border-red-600 bg-red-600 text-white" : "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-teal-400"}`}>{name}</button>)}</div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{PRODUCT_GROUPS.map((group) => <button key={group.name} aria-pressed={category === group.name} onClick={() => onCategory(category === group.name ? "Tất cả" : group.name)} className={`rounded-2xl border p-4 text-left transition hover:border-teal-400 ${category === group.name ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 bg-white"}`}><span aria-hidden="true" className="text-xl">{group.icon}</span><strong className="mt-2 block text-sm leading-5 text-slate-900">{group.name}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{group.description}</span></button>)}</div>
  </section>;
}
