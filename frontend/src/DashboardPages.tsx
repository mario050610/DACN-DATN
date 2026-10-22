import { useRecordParam, recordHref, listHref } from './dashboardRoutes';
import { useEffect, useState, type ReactNode } from "react";
import { useDemoStore, type DemoRole, type DemoState } from "./DemoStore";
import { useShopping } from "./ShoppingStore";
import SecuritySettings from "./SecuritySettings";
import { PRODUCT_GROUPS } from "./CatalogueFilters";
const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const go = (path: string) => { window.location.hash = path; };
const button = 'rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40';
const field = 'mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm';
const roles: Record<string, string> = { customer: 'Khách hàng', seller: 'Người bán', admin: 'Quản trị viên', partner: 'Đối tác sản xuất' };
function Panel({ title, children }: {
    title: string;
    children: ReactNode;
}) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-serif text-xl font-bold">{title}</h2>{children}</section>; }
export function Metrics({ items }: {
    items: [
        string,
        string | number
    ][];
}) { return <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label, value]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-3 block break-words text-2xl">{value}</strong></section>)}</div>; }
function useSaved<T>(key: string, initial: T) { const [value, setValue] = useState<T>(() => { try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? initial;
}
catch {
    return initial;
} }); useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]); return [value, setValue] as const; }
type Row = {
    id: string;
    search: string;
    status: string;
    cells: ReactNode[];
    detail?: ReactNode;
};
function Table({ columns, rows, placeholder = 'Tìm theo mã hoặc tên…' }: {
    columns: string[];
    rows: Row[];
    placeholder?: string;
}) {
    const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
    const detail = useRecordParam('detail');
    const filtered = rows.filter(r => (!status || r.status === status) && r.search.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
    const pages = Math.max(1, Math.ceil(filtered.length / 12));
    const current = Math.min(page, pages);
    const selected = rows.find(r => r.id === detail);
    if (detail) return <section aria-label="Chi tiết bản ghi" className="space-y-5">
      <a href={listHref()} className="inline-flex rounded-lg px-2 py-2 font-semibold text-teal-700 focus-visible:outline-2">← Quay lại danh sách</a>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">{selected?.detail ? <><p className="mb-4 break-words font-mono text-xs text-slate-500">Mã bản ghi: {selected.id}</p>{selected.detail}</> : <><h2 className="text-xl font-bold">Không tìm thấy bản ghi</h2><p className="mt-3 text-sm text-slate-500">Bản ghi không tồn tại hoặc không thuộc phạm vi tài khoản hiện tại.</p></>}</div>
    </section>;
    return <div className="space-y-5"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><input aria-label="Tìm kiếm danh sách" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder={placeholder} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm"/><select aria-label="Lọc danh sách" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Tất cả</option>{[...new Set(rows.map(r => r.status))].sort().map(v => <option key={v}>{v}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map(c => <th key={c} className="px-5 py-3">{c}</th>)}{rows.some(r => r.detail) && <th className="px-5 py-3">Chi tiết</th>}</tr></thead><tbody>{filtered.slice((current - 1) * 12, current * 12).map(r => <tr key={r.id} className="border-t border-slate-100">{r.cells.map((v, i) => <td key={i} className="px-5 py-4">{v}</td>)}{rows.some(r => r.detail) && <td className="px-5 py-4">{r.detail && <a href={recordHref("detail", r.id)} className="inline-block whitespace-nowrap rounded-lg py-2 font-semibold text-teal-700 hover:underline">Xem chi tiết</a>}</td>}</tr>)}</tbody></table></div>{!filtered.length && <p className="p-7 text-center text-sm text-slate-500">Không có dữ liệu phù hợp.</p>}<div className="flex justify-between gap-3 border-t border-slate-100 p-4 text-sm"><span>{filtered.length} bản ghi · Trang {current}/{pages}</span><div className="flex gap-3"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Trước</button><button disabled={current === pages} onClick={() => setPage(current + 1)}>Sau</button></div></div></section></div>;
}
function Facts({ items }: {
    items: [
        string,
        ReactNode
    ][];
}) { return <dl className="grid gap-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value}</dd></div>)}</dl>; }
export function AdminUsers() {
    const { state } = useDemoStore();
    const [live, setLive] = useState<{
        id: string;
        name: string;
        email: string;
        role: string;
        two_factor_enabled: boolean;
    }[]>([]), [error, setError] = useState('');
    useEffect(() => { let active = true; fetch('/api/auth/admin/users', { credentials: 'same-origin' }).then(async (r) => { if (!r.ok)
        throw Error('Không tải được danh sách tài khoản backend. Các hồ sơ mẫu vẫn hiển thị riêng bên dưới.'); return r.json(); }).then(d => { if (active)
        setLive(d.users); }).catch(e => { if (active)
        setError(e.message); }); return () => { active = false; }; }, []);
    const ids = new Set(live.map(u => u.id));
    const users = [...live.map(u => ({ ...u, source: 'Tài khoản backend' })), ...state.users.filter(u => !ids.has(u.id)).map(u => ({ ...u, two_factor_enabled: null, source: 'Hồ sơ mẫu' }))];
    return <>{error && <p role="alert" className="mb-4 text-sm text-rose-700">{error}</p>}<Metrics items={[["Tổng hồ sơ", users.length], ["Tài khoản backend", live.length], ["Khách hàng", users.filter(u => u.role === 'customer').length], ["Người bán", users.filter(u => u.role === 'seller').length]]}/><Table columns={['Người dùng', 'Email', 'Vai trò', 'Nguồn dữ liệu', 'Xác thực 2 lớp']} placeholder="Tìm tên, email, mã hoặc vai trò…" rows={users.map(u => ({ id: u.id, search: `${u.name} ${u.email} ${u.id} ${roles[u.role]}`, status: roles[u.role], cells: [<strong>{u.name}</strong>, u.email, roles[u.role], u.source, u.two_factor_enabled === null ? 'Không áp dụng' : u.two_factor_enabled ? 'Đã bật' : 'Chưa bật'], detail: <><h2 className="mb-5 text-xl font-bold">Hồ sơ {u.name}</h2><Facts items={[["Mã tài khoản", u.id], ["Email", u.email], ["Vai trò", roles[u.role]], ["Nguồn", u.source], ["Đơn ghi nhận trong demo", state.orders.filter(o => o.customerId === u.id || o.sellerId === u.id).length], ["Chiến dịch sở hữu", state.campaigns.filter(c => c.sellerId === u.id).length]]}/></> }))}/></>;
}
type Review = {
    status: string;
    note: string;
    updatedAt: string;
};
export function SellerVerification() {
    const { state } = useDemoStore();
    const [reviews, setReviews] = useSaved<Record<string, Review>>('preora-seller-reviews-v1', {});
    const target = useRecordParam('review');
    const [note, setNote] = useState(''), [message, setMessage] = useState('');
    const sellers = state.sellers.map(s => ({ ...s, review: reviews[s.id] || { status: s.verified ? 'Đã xác minh' : 'Chờ bổ sung hồ sơ', note: '', updatedAt: '' } }));
    const selected = sellers.find(s => s.id === target);
    useEffect(() => { setNote(reviews[target]?.note || ''); setMessage(''); }, [target]);
    const update = (status: string) => {
      if (!selected) return;
      if (!note.trim()) return setMessage('Vui lòng ghi rõ nhận xét trước khi lưu quyết định.');
      setReviews({ ...reviews, [target]: { status, note: note.trim(), updatedAt: new Date().toISOString() } });
      setMessage('Đã lưu kết quả xử lý hồ sơ mẫu.');
    };
    if (target) return <div className="space-y-5"><a href="#admin-sellers" className="inline-flex py-2 font-semibold text-teal-700">← Quay lại danh sách người bán</a>
      <Panel title={selected ? `Đánh giá hồ sơ ${selected.name}` : 'Không tìm thấy hồ sơ người bán'}>{selected ? <>
        <p className="mb-5 text-sm text-slate-500">Quyết định hồ sơ mẫu lưu trong trình duyệt, không thay đổi quyền đăng nhập tài khoản thật.</p>
        <Facts items={[["Mã hồ sơ", target], ["Cửa hàng", selected.name], ["Email liên hệ", state.users.find(u => u.id === target)?.email || 'Chưa cung cấp'], ["Tài liệu pháp lý", 'Chưa có tài liệu thật được tải lên'], ["Trạng thái mẫu hiện tại", selected.review.status], ["Cập nhật gần nhất", selected.review.updatedAt ? new Date(selected.review.updatedAt).toLocaleString('vi-VN') : 'Chưa xử lý']]}/>
        <label className="mt-5 block text-sm font-semibold">Nhận xét xử lý<textarea value={note} onChange={e => setNote(e.target.value)} className={field}/></label>
        <div className="mt-4 flex flex-wrap gap-3">{['Chờ bổ sung hồ sơ', 'Đã xác minh', 'Từ chối'].map(v => <button key={v} onClick={() => update(v)} className={button}>{v === 'Đã xác minh' ? 'Xác minh hồ sơ mẫu' : v}</button>)}</div>
        {message && <p role="status" className="mt-4 text-sm text-teal-700">{message}</p>}
      </> : <p className="text-sm text-slate-500">Hãy quay lại danh sách và chọn hồ sơ còn tồn tại.</p>}</Panel></div>;
    return <><p className="mb-5 text-sm text-slate-500">Hồ sơ doanh nghiệp trong bộ dữ liệu demo. Mở từng hồ sơ để xem thông tin và lưu quyết định đánh giá.</p>
      <Metrics items={[["Hồ sơ người bán", sellers.length], ["Đã xác minh", sellers.filter(s => s.review.status === 'Đã xác minh').length], ["Cần bổ sung", sellers.filter(s => s.review.status === 'Chờ bổ sung hồ sơ').length], ["Từ chối", sellers.filter(s => s.review.status === 'Từ chối').length]]}/>
      <Table columns={['Cửa hàng', 'Mã người bán', 'Chiến dịch', 'Trạng thái hồ sơ', 'Thao tác']} rows={sellers.map(s => ({ id: s.id, search: `${s.name} ${s.id}`, status: s.review.status, cells: [<strong>{s.name}</strong>, s.id, state.campaigns.filter(c => c.sellerId === s.id).length, s.review.status, <a href={recordHref('review', s.id)} className="inline-block whitespace-nowrap py-2 font-semibold text-teal-700 hover:underline">Đánh giá hồ sơ</a>] }))}/>
    </>;
}

type Dispute = {
    id: string;
    orderId: string;
    title: string;
    status: string;
    priority: string;
    history: {
        text: string;
        time: string;
    }[];
};
export function Disputes() {
    const { state } = useDemoStore();
    const samples = state.orders.slice(0, 3).map((o, i) => ({ id: `KN-DEMO-${i + 1}`, orderId: o.id, title: ['Làm rõ thời gian giao hàng dự kiến', 'Đối soát thông tin thanh toán', 'Thông tin chiến dịch cần cập nhật'][i], status: ['Mới tiếp nhận', 'Đang xử lý', 'Đã giải quyết'][i], priority: i === 1 ? 'Cao' : 'Thông thường', history: [{ text: 'Yêu cầu mẫu để thực hành xử lý khiếu nại.', time: o.createdAt }] }));
    const [items, setItems] = useSaved<Dispute[]>('preora-disputes-v1', samples);
    const target = useRecordParam('case');
    const [note, setNote] = useState(''), [status, setStatus] = useState('Đang xử lý'), [message, setMessage] = useState('');
    const selected = items.find(i => i.id === target);
    useEffect(() => { setStatus(items.find(i => i.id === target)?.status || 'Đang xử lý'); setNote(''); setMessage(''); }, [target]);
    return <>{!target && <><p className="mb-5 text-sm text-slate-500">Các khiếu nại mẫu liên kết với đơn trong dữ liệu demo; lịch sử xử lý được lưu trên trình duyệt.</p><Metrics items={[["Tổng khiếu nại", items.length], ["Mới tiếp nhận", items.filter(i => i.status === 'Mới tiếp nhận').length], ["Đang xử lý", items.filter(i => i.status === 'Đang xử lý').length], ["Đã giải quyết", items.filter(i => i.status === 'Đã giải quyết').length]]}/><Table columns={['Mã khiếu nại', 'Nội dung phản ánh', 'Đơn liên quan', 'Ưu tiên', 'Trạng thái', 'Thao tác']} rows={items.map(i => ({ id: i.id, search: `${i.id} ${i.title} ${i.orderId}`, status: i.status, cells: [i.id, <strong>{i.title}</strong>, i.orderId, i.priority, i.status, <a href={recordHref("case", i.id)} className="inline-block py-2 font-semibold text-teal-700 hover:underline">Xử lý</a>] }))}/></>}{target && <a href="#admin-disputes" className="mb-4 inline-flex py-2 font-semibold text-teal-700">← Quay lại danh sách khiếu nại</a>}{target && !selected && <Panel title="Không tìm thấy khiếu nại"><p>Hồ sơ không tồn tại trong dữ liệu hiện tại.</p></Panel>}{selected && <div className="mt-5"><Panel title={selected.title}><p className="mb-3 text-sm">Đơn: {selected.orderId} · Người gửi: {state.users.find(u => u.id === state.orders.find(o => o.id === selected.orderId)?.customerId)?.name || 'Khách hàng mẫu'}</p><ol className="space-y-3">{selected.history.map((h, i) => <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm"><span className="block text-xs text-slate-500">{new Date(h.time).toLocaleString('vi-VN')}</span>{h.text}</li>)}</ol><label className="mt-4 block text-sm font-semibold">Trạng thái xử lý<select value={status} onChange={e => setStatus(e.target.value)} className={field}>{['Mới tiếp nhận', 'Đang xử lý', 'Đã giải quyết'].map(s => <option key={s}>{s}</option>)}</select></label><label className="mt-4 block text-sm font-semibold">Ghi chú phản hồi<textarea value={note} onChange={e => setNote(e.target.value)} className={field}/></label><button className={button + ' mt-4'} onClick={() => { if (!note.trim())
        return setMessage('Vui lòng nhập ghi chú xử lý.'); setItems(items.map(i => i.id === target ? { ...i, status, history: [...i.history, { text: `${status}: ${note.trim()}`, time: new Date().toISOString() }] } : i)); setNote(''); setMessage('Đã lưu lịch sử xử lý.'); }}>Lưu xử lý</button>{message && <p role="status" className="mt-4 text-sm text-teal-700">{message}</p>}</Panel></div>}</>;
}
export function ActivityTrend({ scope = 'seller' }: {
    scope?: 'seller' | 'admin';
}) { const { state } = useDemoStore(); const orders = state.orders.filter(o => scope === 'admin' || o.sellerId === state.session?.userId); const days = [...new Set(orders.map(o => o.createdAt.slice(0, 10)))].sort().slice(-14); const series = days.map(day => ({ day, quantity: orders.filter(o => o.createdAt.startsWith(day)).reduce((n, o) => n + o.quantity, 0) })); const max = Math.max(1, ...series.map(s => s.quantity)); return <div className="space-y-3">{series.length ? series.map(s => <div key={s.day} className="grid grid-cols-[85px_1fr_45px] items-center gap-3 text-xs"><span>{s.day.split('-').reverse().join('/')}</span><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-teal-500" style={{ width: `${s.quantity / max * 100}%` }}/></div><strong>{s.quantity}</strong></div>) : <p className="text-sm text-slate-500">Chưa có đơn để tổng hợp xu hướng.</p>}<p className="pt-3 text-xs text-slate-500">Số lượng sản phẩm đặt theo ngày ghi nhận; tối đa 14 ngày có dữ liệu gần nhất.</p></div>; }
export function Analytics({ scope }: {
    scope: 'seller' | 'admin';
}) {
    const { state } = useDemoStore();
    const orders = state.orders.filter(o => scope === 'admin' || o.sellerId === state.session?.userId);
    const campaigns = state.campaigns.filter(c => scope === 'admin' || c.sellerId === state.session?.userId);
    const paid = orders.filter(o => o.paymentStatus === 'Đã thanh toán');
    const categories = PRODUCT_GROUPS.map(g => { const ids = new Set(state.products.filter(p => p.category === g.name).map(p => p.id)); const subset = orders.filter(o => ids.has(o.productId)); return { name: g.name, quantity: subset.reduce((n, o) => n + o.quantity, 0), value: subset.filter(o => o.paymentStatus === 'Đã thanh toán').reduce((n, o) => n + o.total, 0) }; });
    return <><Metrics items={[["Đơn ghi nhận", orders.length], ["Sản phẩm được đặt", orders.reduce((n, o) => n + o.quantity, 0)], ["Giá trị đã thanh toán", money(paid.reduce((n, o) => n + o.total, 0))], ["Chiến dịch", campaigns.length]]}/><div className="mb-6 grid gap-6 xl:grid-cols-2"><Panel title="Xu hướng đặt trước"><ActivityTrend scope={scope}/></Panel><Panel title="Trạng thái chiến dịch"><Facts items={[...new Set(campaigns.map(c => c.status))].map(s => [s, campaigns.filter(c => c.status === s).length])}/></Panel></div><Table columns={['Nhóm sản phẩm', 'Số lượng đã đặt', 'Giá trị đã thanh toán']} rows={categories.map(c => ({ id: c.name, search: c.name, status: c.quantity ? 'Có đơn' : 'Chưa có đơn', cells: [c.name, c.quantity, money(c.value)] }))}/></>;
}
export function Finance({ admin = false }: {
    admin?: boolean;
}) { const { state, completeRefund } = useDemoStore(); const own = new Map(state.orders.filter(o => admin || o.sellerId === state.session?.userId).map(o => [o.id, o])); const payments = state.payments.filter(p => own.has(p.orderId)); const sum = (status: string) => payments.filter(p => p.status === status).reduce((n, p) => n + p.amount, 0); return <><p className="mb-5 text-sm text-slate-500">Sổ giao dịch mô phỏng từ các đơn đã ghi nhận. Chưa kết nối cổng thanh toán hay đối soát ngân hàng.</p><Metrics items={[["Đã thanh toán", money(sum('Đã thanh toán'))], ["Chờ thanh toán", money(sum('Chờ thanh toán'))], ["Đang hoàn tiền", money(sum('Đang hoàn tiền'))], ["Đã hoàn tiền", money(sum('Đã hoàn tiền'))]]}/><Table columns={['Mã giao dịch', 'Mã đơn', 'Sản phẩm', 'Giá trị', 'Trạng thái', 'Thao tác']} rows={payments.map(p => ({ id: p.id, search: `${p.id} ${p.orderId} ${state.products.find(x => x.id === own.get(p.orderId)?.productId)?.name}`, status: p.status, cells: [p.id, p.orderId, state.products.find(x => x.id === own.get(p.orderId)?.productId)?.name, money(p.amount), p.status, admin && p.status === 'Đang hoàn tiền' ? <button onClick={() => completeRefund(p.orderId)} className="text-teal-700">Xác nhận hoàn tiền mẫu</button> : '—'], detail: <Facts items={[["Mã giao dịch", p.id], ["Mã đơn", p.orderId], ["Số tiền mô phỏng", money(p.amount)], ["Trạng thái", p.status], ["Số lượng", own.get(p.orderId)?.quantity], ["Ngày đặt", new Date(own.get(p.orderId)!.createdAt).toLocaleString('vi-VN')]]}/> }))}/></>; }
export function CustomerOverview() { const { state } = useDemoStore(); const { data } = useShopping(); const orders = state.orders.filter(o => o.customerId === state.session?.userId); return <><Metrics items={[["Đơn đặt trước", orders.length], ["Giá trị đã thanh toán", money(orders.filter(o => o.paymentStatus === 'Đã thanh toán').reduce((n, o) => n + o.total, 0))], ["Sản phẩm yêu thích", data.saved.length], ["Sản phẩm trong giỏ", data.cart.reduce((n, i) => n + i.quantity, 0)]]}/><Panel title="Hoạt động tài khoản"><div className="flex flex-wrap gap-3">{[['Đơn hàng của tôi', 'orders'], ['Sản phẩm yêu thích', 'wishlist'], ['Giỏ hàng', 'cart'], ['Mã ưu đãi đã lưu', 'vouchers'], ['Hồ sơ & bảo mật', 'profile']].map(([label, path]) => <button key={path} onClick={() => go(path)} className={button}>{label}</button>)}</div><p className="mt-4 text-sm text-slate-500">Bạn có {data.claimed.filter(c => !data.used.includes(c)).length} mã ưu đãi chưa sử dụng.</p></Panel><div className="mt-6"><Table columns={['Đơn gần đây', 'Sản phẩm', 'Số lượng', 'Tổng tiền', 'Tiến độ', 'Theo dõi']} rows={[...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(o => ({ id: o.id, search: `${o.id} ${o.orderStatus}`, status: o.orderStatus, cells: [o.id, state.products.find(p => p.id === o.productId)?.name, o.quantity, money(o.total), o.orderStatus, <button onClick={() => go(`customer-order/${o.id}`)} className="text-teal-700">Theo dõi đơn</button>] }))}/></div></>; }
export function SellerOrders() { const { state } = useDemoStore(); const orders = state.orders.filter(o => o.sellerId === state.session?.userId); return <Table columns={['Mã đơn', 'Sản phẩm', 'Khách hàng', 'Số lượng', 'Thanh toán', 'Tiến độ', 'Tổng tiền']} placeholder="Tìm mã đơn, sản phẩm hoặc khách hàng…" rows={orders.map(o => ({ id: o.id, search: `${o.id} ${state.products.find(p => p.id === o.productId)?.name} ${state.users.find(u => u.id === o.customerId)?.name}`, status: o.orderStatus, cells: [o.id, state.products.find(p => p.id === o.productId)?.name, state.users.find(u => u.id === o.customerId)?.name || 'Khách hàng', o.quantity, o.paymentStatus, o.orderStatus, money(o.total)], detail: <Facts items={[["Mã đơn", o.id], ["Chiến dịch", o.campaignId], ["Phiên bản", o.variant], ["Số lượng", o.quantity], ["Đơn giá", money(o.unitPrice)], ["Tổng đơn", money(o.total)], ["Thanh toán", o.paymentStatus], ["Ngày đặt", new Date(o.createdAt).toLocaleString('vi-VN')]]}/> }))}/>; }
export function BusinessProfile({ role }: {
    role: 'seller' | 'partner';
}) { const { state } = useDemoStore(); const uid = state.session!.userId; const user = state.users.find(u => u.id === uid); const [profile, setProfile] = useSaved(`preora-business-profile-${uid}`, { company: state.sellers.find(s => s.id === uid)?.name || user?.name || '', contact: user?.email || '', phone: '', address: '', specialty: '', capacity: 0 }); const [draft, setDraft] = useState(profile); const [saved, setSaved] = useState(false); return <div className="grid gap-6 xl:grid-cols-[1fr_400px]"><Panel title={role === 'partner' ? 'Thông tin và năng lực đối tác' : 'Thông tin cửa hàng'}><form onSubmit={e => { e.preventDefault(); setProfile(draft); setSaved(true); }} className="space-y-4">{([['company', role === 'partner' ? 'Tên doanh nghiệp' : 'Tên cửa hàng'], ['contact', 'Email liên hệ'], ['phone', 'Số điện thoại'], ['address', 'Địa chỉ'], ['specialty', role === 'partner' ? 'Lĩnh vực sản xuất' : 'Giới thiệu cửa hàng']] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<input value={draft[key]} onChange={e => { setSaved(false); setDraft({ ...draft, [key]: e.target.value }); }} className={field}/></label>)}{role === 'partner' && <label className="block text-sm font-semibold">Năng lực (sản phẩm/tháng)<input type="number" min={0} value={draft.capacity} onChange={e => setDraft({ ...draft, capacity: Math.max(0, Number(e.target.value)) })} className={field}/></label>}<button className={button}>Lưu hồ sơ mẫu</button>{saved && <p role="status" className="text-sm text-teal-700">Đã lưu hồ sơ doanh nghiệp trong trình duyệt.</p>}<p className="text-xs text-slate-500">Hồ sơ kinh doanh demo, tách biệt với email và mật khẩu đăng nhập backend.</p></form></Panel><SecuritySettings /></div>; }
export function PlatformSettings() { const { state } = useDemoStore(); const [config, setConfig] = useSaved('preora-admin-config-v1', { review: true, refund: true }); return <div className="space-y-6"><Panel title="Danh mục sản phẩm"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{PRODUCT_GROUPS.map(g => <article key={g.name} className="rounded-xl border border-slate-200 p-4"><strong>{g.name}</strong><p className="mt-2 text-sm text-slate-500">{state.products.filter(p => p.category === g.name).length} sản phẩm trong dữ liệu hiện tại</p></article>)}</div></Panel><Panel title="Tùy chọn giao diện quản trị mẫu"><p className="mb-4 text-sm text-slate-500">Tùy chọn lưu cục bộ để thực hành, chưa thay đổi chính sách xử lý của backend.</p>{([['review', 'Hiện nhắc nhở duyệt chiến dịch'], ['refund', 'Hiện nhắc nhở đối soát hoàn tiền']] as const).map(([key, label]) => <label key={key} className="mt-3 flex gap-3 text-sm"><input type="checkbox" checked={config[key]} onChange={e => setConfig({ ...config, [key]: e.target.checked })}/>{label}</label>)}{config.review && <p className="mt-4 text-sm text-teal-700">Cần duyệt {state.campaigns.filter(c => c.status === 'Chờ duyệt').length} chiến dịch.</p>}{config.refund && <p className="mt-2 text-sm text-teal-700">Có {state.payments.filter(p => p.status === 'Đang hoàn tiền').length} giao dịch đang hoàn tiền.</p>}</Panel><SecuritySettings /></div>; }
export function notificationItems(state: DemoState) { const uid = state.session?.userId, role = state.session?.role; return [...state.orders.filter(o => role === 'customer' ? o.customerId === uid : role === 'seller' ? o.sellerId === uid : false).slice(0, 10).map(o => ({ id: o.id, title: `Đơn ${o.id}: ${o.orderStatus}`, date: o.createdAt, path: role === 'customer' ? `customer-order/${o.id}` : recordHref('detail', o.id, 'seller-orders').slice(1) })), ...state.productionRequests.filter(r => role === 'admin' || r.sellerId === uid || r.partnerId === uid).map(r => ({ id: r.id, title: `Sản xuất ${r.id}: ${r.status} (${r.progress}%)`, date: r.updatedAt, path: role === 'partner' ? recordHref('request', r.id, 'partner-production').slice(1) : role === 'seller' ? recordHref('request', r.id, 'seller-production').slice(1) : recordHref('request', r.id, 'admin-production').slice(1) })), ...state.campaigns.filter(c => role === 'admin' ? c.status === 'Chờ duyệt' : role === 'seller' ? c.sellerId === uid && c.status === 'Bị từ chối' : false).map(c => ({ id: c.id, title: `Chiến dịch ${c.name}: ${c.status}`, date: c.startDate, path: role === 'admin' ? recordHref('campaign', c.id, 'admin-campaign-detail').slice(1) : `seller-campaign-detail/${encodeURIComponent(c.id)}` }))].sort((a, b) => b.date.localeCompare(a.date)); }
export function RelevantNotifications() { const { state } = useDemoStore(); const items = notificationItems(state); return <div className="space-y-3">{items.length ? items.map(i => <button key={i.id} onClick={() => go(i.path)} className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-teal-400"><strong>{i.title}</strong><p className="mt-2 text-xs text-slate-500">{new Date(i.date).toLocaleString('vi-VN')} · Xem nội dung liên quan →</p></button>) : <Panel title="Chưa có thông báo"><p className="text-sm text-slate-500">Thông báo của vai trò hiện tại sẽ xuất hiện khi có hoạt động liên quan.</p></Panel>}</div>; }
export function SellerProducts() { const { state } = useDemoStore(); return <Table columns={['Sản phẩm', 'Nhóm', 'Giá dự kiến', 'Thời gian sản xuất', 'Trạng thái']} rows={state.products.filter(p => p.sellerId === state.session?.userId).map(p => ({ id: String(p.id), search: `${p.id} ${p.name} ${p.category}`, status: p.status, cells: [<div className="flex items-center gap-3"><img src={p.image} alt="" loading="lazy" className="h-12 w-12 object-contain"/><strong>{p.name}</strong></div>, p.category, money(p.price), `${p.manufacturingDays} ngày`, p.status], detail: <><h2 className="mb-4 text-xl font-bold">{p.name}</h2><p className="mb-4 text-sm leading-7">{p.description}</p><Facts items={[["Mã sản phẩm", p.id], ["Danh mục", p.category], ["Giá", money(p.price)], ["Thời gian sản xuất", `${p.manufacturingDays} ngày`]]}/></> }))}/>; }
export function CampaignInspection() {
    const { state } = useDemoStore();
    const id = useRecordParam('campaign');
    const campaign = state.campaigns.find(c => c.id === id) || (!id ? state.campaigns.find(c => c.status === 'Chờ duyệt') || state.campaigns[0] : undefined);
    return <Panel title="Hồ sơ chiến dịch">{campaign ? <><label className="mb-6 block text-sm font-semibold">Chọn chiến dịch<select value={campaign.id} onChange={e => go(recordHref('campaign', e.target.value, 'admin-campaign-detail').slice(1))} className={field}>{state.campaigns.map(c => <option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select></label><h2 className="mb-5 text-xl font-bold">{campaign.name}</h2><Facts items={[["Mã chiến dịch", campaign.id], ["Người bán", state.sellers.find(s => s.id === campaign.sellerId)?.name || campaign.sellerId], ["Sản phẩm", state.products.find(p => p.id === campaign.productId)?.name], ["Trạng thái", campaign.status], ["Giá đặt trước", money(campaign.price)], ["MOQ", campaign.moq], ["Số lượng ghi nhận", campaign.currentOrders], ["Thời gian nhận đơn", `${campaign.startDate} → ${campaign.endDate}`]]}/><p className="mt-5 text-sm leading-7">{campaign.description}</p><button onClick={() => go('admin-campaigns')} className={button + ' mt-5'}>Về hàng đợi duyệt chiến dịch</button></> : <p>Chưa có chiến dịch để tra cứu.</p>}</Panel>;
}
