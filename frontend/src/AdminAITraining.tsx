import DemoSalesControls from './DemoSalesControls';
import TrainingProvenance from './TrainingProvenance';
import TrainingTimeline, { type TrainingEvent } from "./TrainingTimeline";
import CampaignModelInputs, { initialConfig, type DatasetInfo, type ModelConfig } from "./CampaignModelInputs";
import FullCampaignResults, { type FullResult } from "./FullCampaignResults";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getEffectiveNow, getRemainingDays, useDemoStore, type StoreCampaign } from './DemoStore';

type Snapshot = { campaignId: string; campaignName: string; productId: number; productName: string; status: 'Đang hoạt động'; startDate: string; endDate: string; currentDate: string; currentOrders: number; moq: number; target: number; price: number; dailyOrderQuantities: { date: string; quantity: number }[]; historyConfirmed: true; rebuildData: boolean; mode?: ModelConfig["mode"]; datasetId?: string; category?: string; productType?: string; cancelledQuantity?: number; behavior?: ModelConfig["behavior"]; productionPolicy?: ModelConfig["productionPolicy"] };
type Scores = { mae: number; rmse: number; wape: number };
type RetailResult = { modelType?: "retail"; modelVersion: string; campaign: Snapshot; trainingCounts: Record<string, number>; metrics: Scores; baseline: Scores; next7: number; next7Lower: number; next7Upper: number; projectedFinal: number; projectedLower: number; projectedUpper: number; remainingDays: number; estimatedValue: number; requiredDaily: number; moqGap: number; moqAssessment: string; retailIntervalCoverage: number; warnings: string[]; series: { date: string; value: number }[] };
type Result = RetailResult | FullResult;
type Job = { id: string; status: 'queued' | 'running' | 'succeeded' | 'failed'; stage: string; progress: number; created: number; updated: number; request: Snapshot; result: Result | null; error: string | null; log?: string; events?: TrainingEvent[] };
type Inventory = { jobs: Job[]; datasetAvailable: boolean; dataset: string; datasets?: DatasetInfo[] };
const number = (value: number, digits = 0) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value);
const money = (value: number) => `${number(value)} ₫`;
const panel = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
const field = 'mt-2 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm disabled:bg-slate-50';
const statusLabels: Record<Job['status'], string> = { queued: 'Đang chờ', running: 'Đang huấn luyện', succeeded: 'Hoàn tất', failed: 'Thất bại' };

async function trainingApi<T>(path = '', payload?: unknown, scope: 'admin' | 'seller' = 'admin'): Promise<T> {
  const response = await fetch(`/api/${scope}/ai-training${path}`, { method: payload === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(12000), credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail) ? data.detail.map((item: { msg?: string }) => item.msg || '').join('; ') : 'Không kết nối được dịch vụ huấn luyện.');
  return data as T;
}

function historyTemplate(campaign: StoreCampaign, currentDate: string) {
  const asof = new Date(`${currentDate}T00:00:00Z`);
  const start = new Date(`${campaign.startDate}T00:00:00Z`);
  const first = Math.max(start.getTime(), asof.getTime() - 27 * 86400000);
  const known = new Map((campaign.dailyObservations || []).map(row => [row.date, row.quantity]));
  const rows = ['date,quantity'];
  for (let time = first; time <= asof.getTime(); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    rows.push(`${date},${known.get(date) || 0}`);
  }
  return rows.join('\n');
}

export function parseHistory(text: string) {
  const rows = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(row => row.trim());
  if (/^date[,;\t]/i.test(rows[0] || '')) rows.shift();
  return rows.map((row, index) => {
    const parts = row.split(/[,;\t]/).map(value => value.trim());
    const [date, quantity] = parts;
    if (parts.length !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d+$/.test(quantity) || !Number.isSafeInteger(Number(quantity))) throw new Error(`Dòng ${index + 2}: cần ngày YYYY-MM-DD và số lượng nguyên không âm.`);
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`Ngày không hợp lệ: ${date}`);
    return { date, quantity: Number(quantity) };
  });
}

export default function AdminAITraining({ scope = 'admin' }: { scope?: 'admin' | 'seller' }) {
  const api = useCallback(<T,>(path = '', payload?: unknown) => trainingApi<T>(path,payload,scope),[scope]);
  const { state } = useDemoStore();
  const currentDate = getEffectiveNow(state).toISOString().slice(0, 10);
  const campaigns = useMemo(() => state.campaigns.filter(campaign => (scope === 'admin' || campaign.sellerId === state.session?.userId) && campaign.status === 'Đang hoạt động' && campaign.startDate <= currentDate && campaign.endDate > currentDate && getRemainingDays(campaign, state) > 0), [state, currentDate, scope]);
  const [campaignId, setCampaignId] = useState('');
  const campaign = campaigns.find(item => item.id === campaignId) || campaigns[0];
  const product = state.products.find(item => item.id === campaign?.productId);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [config,setConfig] = useState<ModelConfig>(initialConfig);
  const [rebuild, setRebuild] = useState(false);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [jobId, setJobId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const running = job?.status === 'queued' || job?.status === 'running' || inventory?.jobs.some(item => item.status === 'queued' || item.status === 'running') || loading;
  useEffect(() => { setHistory(null); setConfirmed(false); }, [campaign?.id, campaign?.currentOrders, currentDate]);
  const csv = history ?? (campaign ? historyTemplate(campaign, currentDate) : 'date,quantity');
  let historyError = '', historyTotal = 0, dayCount = 0;
  try {
    const rows = parseHistory(csv);
    dayCount = rows.length; historyTotal = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (rows.length < 1) historyError = 'Nhập ít nhất ngày hiện tại để dự báo.';
    if (campaign && historyTotal > campaign.currentOrders) historyError = 'Tổng lịch sử vượt số lượng hiện tại của chiến dịch.';
    if (campaign && (new Date(`${currentDate}T00:00:00Z`).getTime()-new Date(`${campaign.startDate}T00:00:00Z`).getTime())/86400000 < 28 && historyTotal !== campaign.currentOrders) historyError = `Tổng lịch sử đang là ${number(historyTotal)}, cần khớp ${number(campaign.currentOrders)} sản phẩm hiện tại. Chỉ nhập các ngày đã chạy, không cần đủ 28 ngày.`;
  } catch (cause) { historyError = cause instanceof Error ? cause.message : 'Lịch sử không hợp lệ.'; }

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        // Fetch the active job first so a slow inventory request cannot hold its progress back.
        if (jobId) {
          const detail = await api<Job>(`/${jobId}`);
          if (disposed) return;
          setJob(detail);
        }
        const data = await api<Inventory>();
        if (disposed) return;
        setInventory(data);
        const selected = jobId || data.jobs.find(item => item.status === 'queued' || item.status === 'running')?.id || data.jobs[0]?.id;
        if (selected && !jobId) {
          const detail = await api<Job>(`/${selected}`);
          if (!disposed) setJob(detail);
        }
      } catch (cause) { if (!disposed) setError(cause instanceof Error ? cause.message : 'Không tải được trạng thái.'); }
      if (!disposed) timer = setTimeout(refresh, 2500);
    }
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, [jobId, retry, api]);

  async function start() {
    if (!campaign || !product) return;
    setLoading(true); setError('');
    try {
      const payload: Snapshot = { campaignId: campaign.id, campaignName: campaign.name, productId: product.id, productName: product.name, status: 'Đang hoạt động', startDate: campaign.startDate, endDate: campaign.endDate, currentDate, currentOrders: campaign.currentOrders, moq: campaign.moq, target: campaign.target, price: campaign.price, dailyOrderQuantities: parseHistory(csv), historyConfirmed: true, rebuildData: rebuild, ...config, category: product.category };
      if (scope === 'seller') await api('/campaigns', {campaignId:campaign.id,productId:product.id});
      const created = await api<Job>('', payload);
      setJob(created); setJobId(created.id); setRetry(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không bắt đầu được huấn luyện.'); }
    finally { setLoading(false); }
  }

  async function importCsv(file?: File) {
    if (!file) return;
    if (file.size > 100000) { setError('CSV lịch sử chỉ cần tối đa 28 ngày; file phải nhỏ hơn 100 KB.'); return; }
    try { const text = await file.text(); parseHistory(text); setHistory(text); setConfirmed(false); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đọc được CSV.'); }
  }

  const result = job?.result;
  const normalizeSearch = (value: string) => value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const searchTerms = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  const visibleCampaigns = campaigns.filter(item => {
    const text = normalizeSearch(`${item.name} ${item.id} ${state.products.find(p => p.id === item.productId)?.name || ''}`);
    return searchTerms.every(term => text.includes(term));
  });
  const selectCampaign = (id: string) => { setCampaignId(id); setHistory(null); setConfirmed(false); };

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">{scope === 'admin' ? 'Quản trị viên' : 'Người bán'} · AI WORKSPACE</p><h1 className="mt-2 font-serif text-3xl font-bold">Huấn luyện AI</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Chọn sản phẩm trong chiến dịch đang chạy. Huấn luyện nhu cầu cuối kỳ, xác suất đạt MOQ và khoảng sản xuất từ thông tin chiến dịch, sản phẩm, hành vi và lịch sử đặt trước.</p></div>
    {scope === 'admin' && <DemoSalesControls busy={!!running} />}
    <TrainingProvenance />
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button onClick={() => { setError(''); setRetry(value => value + 1); }} className="ml-3 font-semibold underline">Thử tải lại</button></div>}
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className={panel}><h2 className="text-lg font-semibold">1. Chọn chiến dịch và dữ liệu</h2>
        <label className="mt-5 block text-sm font-medium">Tìm sản phẩm hoặc mã chiến dịch<input type="search" value={query} disabled={!!running} aria-controls={searchTerms.length ? "campaign-search-results" : undefined} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if(event.key === 'Enter' && searchTerms.length && visibleCampaigns.length === 1 && !running) { event.preventDefault(); selectCampaign(visibleCampaigns[0].id); } }} placeholder="Nhập tên sản phẩm, tên chiến dịch hoặc mã CD…" className={field} /></label>
        {!!searchTerms.length && <div id="campaign-search-results" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3"><p role="status" className="text-xs font-semibold text-slate-600">Tìm thấy {visibleCampaigns.length} chiến dịch đang chạy</p><button type="button" disabled={!!running} onClick={() => setQuery('')} className="shrink-0 text-xs font-semibold text-teal-700">Xóa tìm kiếm</button></div>
          {visibleCampaigns.length ? <ul aria-label="Kết quả tìm kiếm chiến dịch" className="mt-3 max-h-72 space-y-2 overflow-y-auto">{visibleCampaigns.map(item => {
            const foundProduct = state.products.find(p => p.id === item.productId);
            return <li key={item.id}><button type="button" disabled={!!running} aria-pressed={campaign?.id === item.id} onClick={() => selectCampaign(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-50 ${campaign?.id === item.id ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-400'}`}>
              {foundProduct?.image && <img loading="lazy" src={foundProduct.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />}
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-teal-700">{item.id}{campaign?.id === item.id ? ' · Đang chọn' : ''}</span><strong className="mt-1 block break-words text-sm">{foundProduct?.name || item.name}</strong>{foundProduct?.name !== item.name && <span className="mt-1 block break-words text-xs text-slate-500">{item.name}</span>}<span className="mt-1 block text-xs text-slate-500">{number(item.currentOrders)} sản phẩm · MOQ {number(item.moq)}</span></span><span className="shrink-0 text-sm font-semibold text-teal-700" aria-hidden="true">→</span>
            </button></li>;
          })}</ul> : <p className="mt-3 text-sm leading-6 text-slate-500">Không có kết quả phù hợp. Thử mã hoặc tên khác; {scope === 'seller' ? 'chỉ tìm trong chiến dịch đang chạy của cửa hàng bạn.' : 'chỉ các chiến dịch đang chạy mới được chọn để dự báo.'}</p>}
        </div>}
        <label className="mt-4 block text-sm font-medium">Chiến dịch đang chạy<select aria-label="Chiến dịch đang chạy" value={campaign?.id || ''} disabled={!!running} onChange={event => selectCampaign(event.target.value)} className={field}>{campaigns.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>
        {!campaign && <p className="mt-3 text-sm text-amber-700">Chưa có chiến dịch đang chạy để lựa chọn.</p>}
        {campaign && <div className="mt-4 flex gap-4 rounded-xl bg-slate-50 p-4">{product?.image && <img src={product.image} alt="" className="h-16 w-16 rounded-lg object-cover" />}<div className="min-w-0"><strong className="block text-sm">{product?.name || campaign.name}</strong><p className="mt-1 text-xs text-slate-500">Hiện tại {number(campaign.currentOrders)} sản phẩm · MOQ {number(campaign.moq)}</p><p className="mt-1 text-xs text-slate-500">Còn {Math.max(0, Math.round((new Date(`${campaign.endDate}T00:00:00Z`).getTime()-new Date(`${currentDate}T00:00:00Z`).getTime())/86400000))} ngày dự báo · Giá {money(campaign.price)}</p><p className="mt-1 text-xs leading-5 text-slate-500">Duration {Math.round((new Date(`${campaign.endDate}T00:00:00Z`).getTime()-new Date(`${campaign.startDate}T00:00:00Z`).getTime())/86400000)} ngày · Target {number(campaign.target)} sản phẩm</p><p className="mt-1 text-xs text-slate-500">{campaign.startDate} → {campaign.endDate}</p></div></div>}
        <CampaignModelInputs apiBase={`/api/${scope}/ai-training`} config={config} setConfig={setConfig} campaignId={campaign?.id || ''} startDate={campaign?.startDate || currentDate} currentDate={currentDate} endDate={campaign?.endDate || currentDate} currentOrders={campaign?.currentOrders || 0} category={product?.category || 'Chưa phân loại'} datasets={inventory?.datasets || []} busy={!!running} onError={setError} onUploaded={()=>setRetry(value=>value+1)} />
        {config.mode === 'retail' && <><div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm"><strong>Nguồn train: UCI Online Retail II</strong><p className="mt-1 text-xs leading-5 text-teal-800">{inventory ? inventory.datasetAvailable ? 'Đã tìm thấy file Excel nguồn trên máy chủ.' : 'Chưa tìm thấy file Excel nguồn.' : 'Đang kiểm tra dữ liệu…'} Model được train lại khi bấm bắt đầu; cache chỉ dùng để tiết kiệm thời gian làm sạch Excel.</p></div>
        <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={rebuild} disabled={!!running} onChange={event => setRebuild(event.target.checked)} className="mt-1" /><span>Đọc lại Excel nguồn và tạo lại dữ liệu train <span className="block text-xs text-slate-500">Lần đầu hoặc khi file nguồn đổi sẽ tự đọc lại; bước này có thể mất vài phút.</span></span></label></>}
        <label className="mt-5 block text-sm font-medium">Lịch sử số lượng theo ngày (tối đa 28 ngày)<textarea aria-label="Lịch sử số lượng theo ngày" value={csv} disabled={!!running} onChange={event => { setHistory(event.target.value); setConfirmed(false); }} className={`${field} min-h-48 font-mono text-xs`} /></label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{dayCount} ngày · Tổng {number(historyTotal)} sản phẩm</span><label className="cursor-pointer font-semibold text-teal-700">Nhập CSV<input aria-label="Nhập CSV lịch sử" type="file" accept=".csv,text/csv" disabled={!!running} onChange={event => void importCsv(event.target.files?.[0])} className="hidden" /></label></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">Chiến dịch mẫu có lịch sử sinh theo từng ngày và được ghi rõ là mô phỏng. Với nguồn khác, ngày chưa có quan sát có thể đang là 0 trong mẫu: phải kiểm tra trước khi xác nhận, không coi thiếu dữ liệu là không có nhu cầu. Số lượng tính theo sản phẩm, không phải số đơn.</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">Có thể dự báo ngay từ ngày đầu. Nhập các ngày đã chạy (tối đa 28 ngày gần nhất), không thêm ngày trước khi chiến dịch bắt đầu.</p>
        {dayCount > 0 && dayCount < 7 && <p role="status" className="mt-3 text-sm text-amber-700">Mới có {dayCount} ngày lịch sử: đây là dự báo sớm, cần cập nhật khi có thêm dữ liệu.</p>}
        {historyError && <p className="mt-3 text-sm text-amber-700">{historyError}</p>}
        <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={!!running} onChange={event => setConfirmed(event.target.checked)} className="mt-1" /><span>Tôi đã kiểm tra lịch sử theo ngày và các đầu vào hành vi/sản phẩm; xác nhận các số lượng, gồm những ngày bằng 0.</span></label>
        <button onClick={() => void start()} disabled={!!running || !confirmed || !!historyError || !campaign || !product || !inventory || (config.mode === 'retail' && !inventory.datasetAvailable) || (config.mode === 'campaign_history' && !config.datasetId) || !config.productType.trim()} className="mt-5 w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{running ? 'Đang có phiên huấn luyện…' : 'Bắt đầu huấn luyện & dự báo'}</button>
      </section>
      <div className="min-w-0 space-y-6"><section className={panel}><h2 className="text-lg font-semibold">2. Tiến độ huấn luyện</h2>{job ? <><div className="mt-5 flex justify-between gap-3 text-sm"><strong>{statusLabels[job.status]}</strong><span>{job.progress}%</span></div><div role="progressbar" aria-label="Tiến độ huấn luyện" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-500 transition-all" style={{ width: `${job.progress}%` }} /></div><p className="mt-3 text-sm text-slate-600">{job.stage}</p><p className="mt-2 text-xs text-slate-500">{job.request.campaignId} · {job.request.productName}<br />Bắt đầu {new Date(job.created * 1000).toLocaleString('vi-VN')}</p>{job.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{job.error}</p>}<TrainingTimeline events={job.events} status={job.status} /><details className="mt-5"><summary className="cursor-pointer text-sm font-semibold text-teal-700">Xem nhật ký</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-200">{job.log || 'Đang chuẩn bị worker…'}</pre></details></> : <p className="mt-4 text-sm leading-6 text-slate-500">Chưa có phiên huấn luyện. Chọn chiến dịch và xác nhận lịch sử để bắt đầu. Bạn có thể rời trang rồi quay lại; phiên chạy nền vẫn tiếp tục.</p>}</section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Cách đọc kết quả</h2><p className="mt-2 text-sm leading-6 text-amber-900">Model học từ nhiều chiến dịch đã có kết quả; chiến dịch đang chạy được dùng để dự đoán. Chế độ đầy đủ train trực tiếp nhu cầu cuối kỳ, bộ phân loại đạt MOQ có calibration, rồi đề xuất khoảng sản xuất theo ràng buộc.</p><p className="mt-3 text-sm leading-6 text-amber-900">Demo dùng dữ liệu mô phỏng và có nhãn rõ ràng. Muốn kiểm chứng thực tế, nhập CSV lịch sử PREORA đủ các feature và số lượng cuối kỳ; các bộ UCI/Kickstarter đã tải không tự bổ sung được hành vi còn thiếu.</p></section>
      {!!inventory?.jobs.length && <section className={panel}><h2 className="text-lg font-semibold">Lịch sử phiên huấn luyện</h2><div className="mt-4 max-h-80 space-y-2 overflow-auto">{inventory.jobs.map(item => <button key={item.id} onClick={() => { setJobId(item.id); setJob(item); }} className={`w-full rounded-xl border p-3 text-left text-sm ${job?.id === item.id ? 'border-teal-300 bg-teal-50' : 'border-slate-100 hover:bg-slate-50'}`}><strong className="block">{item.request.productName}</strong><span className="mt-1 block text-xs text-slate-500">{statusLabels[item.status]} · {new Date(item.created * 1000).toLocaleString('vi-VN')}</span></button>)}</div></section>}</div>
    </div>
    {result && (result.modelType === "campaign_full" ? <FullCampaignResults result={result} /> : <section className="space-y-5"><div><h2 className="font-serif text-2xl font-bold">3. Kết quả · {result.campaign.productName}</h2><p className="mt-1 text-sm text-slate-500">{result.campaign.campaignId} · Snapshot ngày {result.campaign.currentDate} · Model {result.modelVersion}</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Dự báo 7 ngày tiếp theo',`${number(result.next7)} sản phẩm`],['Ước lượng cuối kỳ (ngoại suy)',`${number(result.projectedFinal)} sản phẩm`],['Cần thêm để đạt MOQ',`${number(result.moqGap)} sản phẩm`],['Tốc độ cần đạt MOQ',`${number(result.requiredDaily,2)} sản phẩm/ngày`]].map(([label,value]) => <div key={label} className={panel}><p className="text-xs text-slate-500">{label}</p><strong className="mt-3 block text-xl text-teal-800">{value}</strong></div>)}</div>
      <div className="grid gap-5 lg:grid-cols-2"><section className={panel}><h3 className="font-semibold">Ước lượng tiến độ đến ngày kết thúc</h3><p className="mt-2 text-sm text-slate-500">Ngoại suy tuyến tính từ tốc độ dự báo 7 ngày; không phải kết quả quan sát.</p><svg role="img" aria-label="Đường ngoại suy số lượng cuối kỳ" viewBox="0 0 600 180" className="mt-5 w-full"><line x1="10" y1="160" x2="590" y2="160" stroke="#e2e8f0" /><polyline fill="none" stroke="#0d9488" strokeWidth="3" points={result.series.map((point,index) => `${10+index/Math.max(1,result.series.length-1)*580},${160-point.value/Math.max(1,result.projectedFinal,result.campaign.currentOrders)*140}`).join(' ')} /></svg><div className="flex justify-between text-xs text-slate-500"><span>Hiện tại: {number(result.campaign.currentOrders)}</span><span>Cuối kỳ: {number(result.projectedFinal)}</span></div><p className="mt-4 text-sm font-semibold text-teal-800">{result.moqAssessment}</p><p className="mt-2 text-sm text-slate-500">Khoảng tham khảo 7 ngày: {number(result.next7Lower)}–{number(result.next7Upper)} sản phẩm.</p><p className="mt-2 text-sm text-slate-500">Giá trị ngoại suy theo giá hiện tại: {money(result.estimatedValue)}.</p></section>
      <section className={panel}><h3 className="font-semibold">Chất lượng model trên dữ liệu UCI</h3><table className="mt-4 w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-2">Chỉ số</th><th>Model</th><th>Baseline</th></tr></thead><tbody>{(['mae','rmse','wape'] as const).map(metric => <tr key={metric} className="border-t border-slate-100"><th className="py-3 uppercase">{metric}</th><td>{number(result.metrics[metric]*(metric==='wape'?100:1),2)}{metric==='wape'?'%':''}</td><td>{number(result.baseline[metric]*(metric==='wape'?100:1),2)}{metric==='wape'?'%':''}</td></tr>)}</tbody></table><p className="mt-3 text-xs leading-5 text-slate-500">Baseline dùng lượng bán 7 ngày vừa qua. MAE/RMSE tính theo sản phẩm; thấp hơn tốt hơn. Đây không phải sai số đã đo trên PREORA.</p><p className="mt-3 text-xs text-slate-500">Số mẫu: {Object.entries(result.trainingCounts).map(([key,value]) => `${key}: ${number(value)}`).join(' · ')}</p><p className="mt-3 text-xs text-slate-500">Độ bao phủ khoảng tham khảo trên test bán lẻ: {number(result.retailIntervalCoverage*100,1)}% (mức danh nghĩa 80%).</p></section></div>
      <details className={panel}><summary className="cursor-pointer font-semibold">Giới hạn và giả định</summary><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details>
      <button onClick={() => { const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})); const link=document.createElement('a');link.href=url;link.download=`preora-ai-${job?.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }} className="rounded-xl border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-700">Tải kết quả JSON</button>
    </section>)}
  </div>;
}
