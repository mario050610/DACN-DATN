import { useEffect, useRef, useState } from "react";
import { useDemoStore, isCampaignOrderable, type DemoRole } from "./DemoStore";

type Message = { role: "user" | "assistant"; content: string; provider?: string };
type Ticket = { id: string; title: string; status: "Đang xử lý" | "Đã giải quyết"; messages: Message[] };
const initialTickets = (): Ticket[] => [
  { id: "SP-AI", title: "Hỏi trợ lý PREORA", status: "Đang xử lý", messages: [{ role: "assistant", content: "Chào bạn! Bạn có thể hỏi về đặt trước, MOQ, thanh toán mô phỏng, đơn hàng và cách sử dụng PREORA." }] },
  { id: "SP-260392", title: "Cập nhật thông tin tài khoản", status: "Đã giải quyết", messages: [{ role: "user", content: "Mình thay đổi tên và email liên hệ ở đâu?" }, { role: "assistant", content: "Mở Hồ sơ hoặc Cài đặt trong menu, sửa thông tin rồi bấm lưu. Email liên hệ trong bản demo không thay đổi email đăng nhập." }] },
  { id: "SP-260351", title: "Giải thích trạng thái hệ thống", status: "Đã giải quyết", messages: [{ role: "user", content: "Chiến dịch không đạt MOQ thì sao?" }, { role: "assistant", content: "Đơn hàng chuyển sang trạng thái đang hoàn tiền. Trong bản demo, quản trị viên mở Giao dịch rồi xác nhận đã hoàn. Không phát sinh chuyển tiền thật." }] },
];

export default function SupportDesk({ role }: { role: DemoRole }) {
  const { state } = useDemoStore();
  const storageKey = `preora-support-v1-${state.session?.userId || role}`;
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (Array.isArray(saved) && saved.length && saved.every((t) => typeof t.id === "string" && typeof t.title === "string" && ["Đang xử lý", "Đã giải quyết"].includes(t.status) && Array.isArray(t.messages) && t.messages.every((m: Message) => ["user", "assistant"].includes(m.role) && typeof m.content === "string"))) return saved; } catch { /* Start with sample conversations. */ }
    return initialTickets();
  });
  const [selectedId, setSelectedId] = useState("SP-AI");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ ticketId: string; text: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const ticket = tickets.find((item) => item.id === selectedId) || tickets[0];
  useEffect(() => localStorage.setItem(storageKey, JSON.stringify(tickets)), [tickets, storageKey]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [ticket.id, ticket.messages.length, pending]);
  const createTicket = () => {
    if (!title.trim()) return;
    const id = `SP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    setTickets((items) => [{ id, title: title.trim(), status: "Đang xử lý", messages: [{ role: "assistant", content: "Bạn mô tả vấn đề hoặc đặt câu hỏi bên dưới. Trợ lý AI sẽ hỗ trợ giải thích; trợ lý không tự thay đổi đơn hàng hoặc chuyển tiền." }] }, ...items]);
    setSelectedId(id); setShowForm(false); setTitle(""); setError(null);
  };
  const send = async (question = message, retry = false) => {
    if (!question.trim() || pending || controller.current) return;
    const currentId = ticket.id;
    const history = (retry ? ticket.messages.slice(0, -1) : ticket.messages).slice(-10);
    if (!retry) setTickets((items) => items.map((item) => item.id === currentId ? { ...item, status: "Đang xử lý", messages: [...item.messages, { role: "user", content: question.trim() }] } : item));
    setMessage(""); setError(null); setPending(true);
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 120_000);
    const terms = question.toLocaleLowerCase("vi").split(/\s+/).filter((term) => term.length > 2);
    const relevantCampaigns = state.campaigns.filter((campaign) => terms.some((term) => `${campaign.name} ${campaign.id}`.toLocaleLowerCase("vi").includes(term))).slice(0, 6);
    const ownOrders = state.orders.filter((order) => order.customerId === state.session?.userId).slice(0, 8);
    // Send only this account's orders and public campaign summaries, never other users' data.
    const context = JSON.stringify({ source: "browser_demo", role, activeCampaigns: state.campaigns.filter((campaign) => isCampaignOrderable(campaign, state)).length, orders: ownOrders.map((order) => ({ id: order.id, product: state.products.find((p) => p.id === order.productId)?.name, quantity: order.quantity, status: order.orderStatus, payment: order.paymentStatus })), campaigns: relevantCampaigns.map((campaign) => ({ name: campaign.name, moq: campaign.moq, ordered: campaign.currentOrders, status: campaign.status, endDate: campaign.endDate })) });
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal, body: JSON.stringify({ question: question.trim(), history, context }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.reply !== "string") throw new Error(typeof data.detail === "string" ? data.detail : "Chưa kết nối được trợ lý. Hãy bật Backend và Ollama rồi thử lại.");
      setTickets((items) => items.map((item) => item.id === currentId ? { ...item, messages: [...item.messages, { role: "assistant", content: data.reply, provider: data.model }] } : item));
    } catch (cause) {
      if (!abort.signal.aborted || controller.current === abort) setError({ ticketId: currentId, text: abort.signal.aborted ? "AI phản hồi quá lâu. Hãy thử lại sau khi model được nạp xong." : cause instanceof Error ? cause.message : "Không kết nối được AI." });
    } finally { window.clearTimeout(timer); if (controller.current === abort) { setPending(false); controller.current = null; } }
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Hỏi đáp với trợ lý AI và quản lý hội thoại của bạn.</p><button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white">Tạo yêu cầu hỗ trợ</button></div>
    {showForm && <form onSubmit={(event) => { event.preventDefault(); createTicket(); }} className="flex flex-wrap gap-3 rounded-2xl border border-teal-200 bg-white p-5"><input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tiêu đề yêu cầu" className="min-w-0 flex-1 rounded-xl border px-4 py-3" /><button className="rounded-xl bg-teal-600 px-5 font-semibold text-white">Tạo hội thoại</button></form>}
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]"><aside className="max-h-[650px] space-y-3 overflow-y-auto" aria-label="Danh sách yêu cầu">{tickets.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setMessage(""); }} aria-pressed={ticket.id === item.id} className={`w-full rounded-2xl border p-5 text-left transition hover:border-teal-400 ${ticket.id === item.id ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-teal-700">#{item.id}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.status}</span></div><strong className="mt-3 block">{item.title}</strong><p className="mt-2 truncate text-xs text-slate-500">{item.messages.at(-1)?.content}</p></button>)}</aside>
    <section className="flex h-[650px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"><header className="flex items-center justify-between gap-3 border-b p-5"><div><p className="font-mono text-xs text-teal-700">#{ticket.id}</p><h2 className="mt-1 font-semibold">{ticket.title}</h2></div><button onClick={() => setTickets((items) => items.map((item) => item.id === ticket.id ? { ...item, status: item.status === "Đã giải quyết" ? "Đang xử lý" : "Đã giải quyết" } : item))} className="rounded-lg border px-3 py-2 text-xs font-semibold">{ticket.status === "Đã giải quyết" ? "Mở lại" : "Đánh dấu đã giải quyết"}</button></header>
    <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5" aria-live="polite">{ticket.messages.map((item, index) => <article key={index} className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-6 ${item.role === "user" ? "ml-auto bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}><strong className="mb-1 block text-xs">{item.role === "user" ? "Bạn" : item.provider ? `Trợ lý AI · ${item.provider}` : "PREORA Support"}</strong>{item.content}</article>)}{pending && <p role="status" className="text-sm text-teal-700">Trợ lý đang trả lời… Bạn có thể tiếp tục xem các hội thoại khác.</p>}{error?.ticketId === ticket.id && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error.text}<button onClick={() => { const last = [...ticket.messages].reverse().find((item) => item.role === "user"); if (last) void send(last.content, true); }} disabled={pending} className="ml-3 font-bold underline">Thử lại</button></div>}<div ref={end} /></div>
    {ticket.id === "SP-AI" && ticket.messages.length === 1 && <div className="flex flex-wrap gap-2 border-t px-4 py-3">{["MOQ là gì?", "Đơn hàng của tôi đang ở đâu?", "Cách đặt trước sản phẩm?"].map((question) => <button key={question} disabled={pending} onClick={() => void send(question)} className="rounded-full border border-teal-200 px-3 py-1.5 text-xs text-teal-800">{question}</button>)}</div>}
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t p-4"><input value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="Hỏi về đơn hàng, MOQ, cách sử dụng PREORA…" aria-label="Câu hỏi cho trợ lý" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500" /><button disabled={pending || !message.trim()} className="rounded-xl bg-teal-600 px-5 font-semibold text-white disabled:opacity-50">Gửi</button></form><p className="px-4 pb-3 text-xs text-slate-400">Trợ lý hỗ trợ thông tin, không tự thực hiện giao dịch. Hội thoại được lưu trên trình duyệt này.</p></section></div>
  </div>;
}
