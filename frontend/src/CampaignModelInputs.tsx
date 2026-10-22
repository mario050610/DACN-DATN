import { simulateCampaignBehavior } from './demoCampaignBehavior';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
export type DatasetInfo = { id: string; name: string; rows: number; campaigns: number; synthetic: boolean };
export type ModelConfig = {
  mode: 'campaign_demo' | 'campaign_history' | 'retail'; datasetId: string; productType: string; cancelledQuantity: number;
  behavior: { views: number; clicks: number; favorites: number; addToCart: number; source: 'observed' | 'manual' | 'demo' };
  productionPolicy: { batchSize: number; capacity: number; safetyBuffer: number; minimumProbability: number };
};
export const initialConfig: ModelConfig = { mode: 'campaign_demo', datasetId: '', productType: 'Khác', cancelledQuantity: 0, behavior: { views: 0, clicks: 0, favorites: 0, addToCart: 0, source: 'observed' }, productionPolicy: { batchSize: 10, capacity: 100000, safetyBuffer: .05, minimumProbability: .7 } };
const field='mt-2 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm disabled:bg-slate-50';
export default function CampaignModelInputs({ apiBase, config, setConfig, campaignId, startDate, currentDate, endDate, currentOrders, category, datasets, busy, onError, onUploaded }: { apiBase: string; config: ModelConfig; setConfig: Dispatch<SetStateAction<ModelConfig>>; campaignId: string; startDate: string; currentDate: string; endDate: string; currentOrders: number; category: string; datasets: DatasetInfo[]; busy: boolean; onError: (message: string) => void; onUploaded: () => void }) {
  const [inputSource,setInputSource]=useState<'demo'|'observed'|'manual'>('demo');
  const [observedNote,setObservedNote]=useState('');
  const [provenance,setProvenance]=useState('');
  const [historicalConfirmed,setHistoricalConfirmed]=useState(false);
  const [uploading,setUploading]=useState(false);
  useEffect(()=>{setInputSource('demo');},[campaignId]);
  useEffect(()=>{
    let disposed=false;
    setConfig(previous=>({...previous,productType:(category.includes('Sưu')||category.toLowerCase()==='collectible')?'Figure':category.includes('Nước')?'Nước hoa':category.includes('Trang trí')?'Trang trí':category.includes('Thời trang')?'Thời trang':category.includes('Công nghệ')?'Phụ kiện':'Khác'}));
    if(inputSource==='manual') return;
    if(inputSource==='demo') {
      const values=simulateCampaignBehavior(campaignId,startDate,currentDate,endDate,currentOrders);
      setConfig(previous=>({...previous,...values}));
      setObservedNote('Số liệu mô phỏng theo từng chiến dịch, số lượng đã bán và ngày snapshot; không phải dữ liệu tracker thực. Số đã hủy cũng là mô phỏng.');
      return;
    }
    setObservedNote('Đang đọc tracker… Số đã hủy cần nhập theo dữ liệu thực.');
    setConfig(previous=>({...previous,cancelledQuantity:0,behavior:{views:0,clicks:0,favorites:0,addToCart:0,source:'observed'}}));
    if(campaignId) void fetch(`/api/analytics/campaigns/${encodeURIComponent(campaignId)}?startDate=${startDate}&endDate=${currentDate}`,{credentials:'same-origin'}).then(async response=>{
      if(!response.ok) throw new Error('Chưa đọc được hành vi đã ghi nhận. Bạn có thể nhập tay.');
      const data=await response.json();
      if(!disposed){setConfig(previous=>({...previous,behavior:{views:data.views,clicks:data.clicks,favorites:data.favorites,addToCart:data.addToCart,source:'observed'}}));setObservedNote(data.recordedSince?`Tracker có dữ liệu từ ${new Date(data.recordedSince).toLocaleString('vi-VN')}; chưa có đầy đủ lịch sử trước đó.`:'Chưa ghi nhận lượt tương tác. Các số 0 chỉ phản ánh dữ liệu tracker hiện có.');}
    }).catch(cause=>{if(!disposed)setObservedNote(cause.message);});
    return()=>{disposed=true;};
  },[campaignId,startDate,currentDate,endDate,currentOrders,category,inputSource,setConfig]);
  async function upload(file?:File){
    if(!file)return;
    if(file.size>8_000_000){onError('CSV dataset tối đa 8 MB.');return;}
    setUploading(true);
    try{
      const response=await fetch(`${apiBase}/datasets`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name.slice(0,100),content:await file.text(),provenance,confirmedHistorical:true})});
      const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'CSV chưa đúng schema.');
      setConfig(previous=>({...previous,datasetId:data.id}));onUploaded();onError('');
    }catch(cause){onError(cause instanceof Error?cause.message:'Không nhập được dataset.');}
    finally{setUploading(false);}
  }
  return <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
    <label className="block text-sm font-semibold">Chế độ huấn luyện<select aria-label="Chế độ huấn luyện" value={config.mode} disabled={busy} onChange={event=>setConfig(previous=>({...previous,mode:event.target.value as ModelConfig['mode']}))} className={field}><option value="campaign_demo">Đầy đủ theo sơ đồ · demo mô phỏng</option><option value="campaign_history">Đầy đủ theo sơ đồ · CSV lịch sử PREORA</option><option value="retail">Thực nghiệm UCI · dự báo bán lẻ 7 ngày</option></select></label>
    {config.mode==='campaign_demo'&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Demo tạo lịch sử nhiều chiến dịch bằng mô phỏng, rồi train thật hai model. Hành vi/nhãn mô phỏng không được mô tả là dữ liệu thực; kết quả xác suất chỉ có ý nghĩa trong thực nghiệm demo.</p>}
    {config.mode==='campaign_history'&&<div className="space-y-3 rounded-xl bg-slate-50 p-4"><label className="block text-sm font-medium">Dataset chiến dịch đã kết thúc<select aria-label="Dataset lịch sử" value={config.datasetId} disabled={busy} onChange={event=>setConfig(previous=>({...previous,datasetId:event.target.value}))} className={field}><option value="">Chọn dataset đã nhập…</option>{datasets.map(item=><option key={item.id} value={item.id}>{item.name} · {item.campaigns} chiến dịch</option>)}</select></label><p className="text-xs leading-5 text-slate-500">CSV này chứa nhiều chiến dịch cùng nhãn số lượng cuối kỳ, khác CSV lịch sử theo ngày của sản phẩm bên dưới. Cần ít nhất 100 chiến dịch, đủ khoảng thời gian và cả hai kết quả đạt/không đạt MOQ.</p><a href={`${apiBase}/dataset-template`} download className="inline-block text-xs font-semibold text-teal-700 underline">Tải mẫu cột CSV huấn luyện</a><label className="block text-xs font-semibold">Nguồn gốc dữ liệu<textarea aria-label="Nguồn gốc dataset" value={provenance} onChange={event=>setProvenance(event.target.value)} className={field} placeholder="Mô tả nguồn, thời gian và cách xác định số lượng hợp lệ…" /></label><label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={historicalConfirmed} onChange={event=>setHistoricalConfirmed(event.target.checked)} className="mt-1" />Tôi xác nhận đây là lịch sử chiến dịch đã kết thúc, có nhãn cuối kỳ; nguồn do tôi cung cấp.</label><label className={`inline-block rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white ${!historicalConfirmed||provenance.trim().length<10||busy||uploading?'opacity-40':''}`}>{uploading?'Đang kiểm tra CSV…':'Nhập dataset CSV'}<input aria-label="Nhập dataset huấn luyện CSV" type="file" accept=".csv,text/csv" disabled={!historicalConfirmed||provenance.trim().length<10||busy||uploading} className="hidden" onChange={event=>void upload(event.target.files?.[0])} /></label></div>}
    {config.mode!=='retail'&&<><div className="grid min-w-0 gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Category · danh mục<input readOnly value={category} className={`${field} bg-slate-50`} /></label><label className="text-sm font-medium">Product Type · loại sản phẩm<input aria-label="Product Type" value={config.productType} maxLength={100} disabled={busy} onChange={event=>setConfig(previous=>({...previous,productType:event.target.value}))} className={field} /></label></div>
      <div><h3 className="text-sm font-semibold">Hành vi người dùng tính đến ngày snapshot</h3><label className="mt-3 block text-xs font-medium">Nguồn số liệu đầu vào<select aria-label="Nguồn số liệu hành vi" className={field} value={inputSource} disabled={busy} onChange={event=>{const source=event.target.value as typeof inputSource;setInputSource(source);if(source==='manual'){setObservedNote('Số liệu nhập tay, bao gồm số đã hủy.');setConfig(previous=>({...previous,behavior:{...previous.behavior,source:'manual'}}));}}}><option value="demo">Mô phỏng theo sản phẩm và ngày</option><option value="observed">Tracker thực tế · nhập số đã hủy riêng</option><option value="manual">Nhập tay</option></select></label><p className="mt-1 text-xs leading-5 text-slate-500">{observedNote} Sửa giá trị sẽ chuyển nguồn sang nhập tay; số đếm là lượt sự kiện, không phải số người duy nhất.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{([['views','Views · lượt xem'],['clicks','Clicks · lượt click'],['favorites','Favorites · yêu thích'],['addToCart','Add to Cart · thêm giỏ']] as const).map(([key,label])=><label key={key} className="text-xs font-medium">{label}<input type="number" min="0" step="1" aria-label={label} value={config.behavior[key]} disabled={busy} onChange={event=>{setInputSource('manual');setObservedNote('Số liệu nhập tay hoặc đã chỉnh từ bộ mô phỏng; số đã hủy cần được kiểm tra cùng snapshot.');setConfig(previous=>({...previous,behavior:{...previous.behavior,[key]:Math.max(0,Number(event.target.value)),source:'manual'}}));}} className={field} /></label>)}</div></div>
      <label className="block text-sm font-medium">Số lượng đã hủy (sản phẩm)<input type="number" aria-label="Số lượng đã hủy" min="0" step="1" value={config.cancelledQuantity} disabled={busy} onChange={event=>{setInputSource('manual');setObservedNote('Số liệu nhập tay hoặc đã chỉnh từ bộ mô phỏng; số đã hủy cần được kiểm tra cùng snapshot.');setConfig(previous=>({...previous,cancelledQuantity:Math.max(0,Number(event.target.value)),behavior:{...previous.behavior,source:'manual'}}));}} className={field} /><span className="mt-1 block text-xs leading-5 text-slate-500">Cancellation Rate = đã hủy / (hiện tại hợp lệ + đã hủy). Current Orders và CSV ngày dùng số lượng hợp lệ sau hủy.</span></label>
      <div><h3 className="text-sm font-semibold">Ràng buộc đề xuất sản xuất</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{([['batchSize','Quy mô lô (sản phẩm)',1,100000,1],['capacity','Năng lực tối đa (sản phẩm)',1,100000000,1],['safetyBuffer','Buffer (%)',0,30,1],['minimumProbability','Ngưỡng xác suất lập kế hoạch (%)',50,99,1]] as const).map(([key,label,min,max,step])=><label key={key} className="text-xs font-medium">{label}<input type="number" aria-label={label} min={min} max={max} step={step} value={key==='safetyBuffer'||key==='minimumProbability'?Math.round(config.productionPolicy[key]*100):config.productionPolicy[key]} disabled={busy} onChange={event=>setConfig(previous=>({...previous,productionPolicy:{...previous.productionPolicy,[key]:Number(event.target.value)/(key==='safetyBuffer'||key==='minimumProbability'?100:1)}}))} className={field} /></label>)}</div></div>
    </>}
  </div>;
}


