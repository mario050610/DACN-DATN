import { useEffect, useState } from 'react';
import FullCampaignResults, { type FullResult } from './FullCampaignResults';
import type { StoreCampaign } from './DemoStore';
export default function CampaignForecastView({ campaign, currentDate }: { campaign: StoreCampaign; currentDate: string }) {
  const [result,setResult]=useState<FullResult|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(true);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let disposed=false;setBusy(true);setResult(null);setMessage('');
    void fetch(`/api/ai/campaigns/${encodeURIComponent(campaign.id)}/latest`,{credentials:'same-origin'}).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.detail||'Không tải được kết quả dự báo.');
      if(!disposed)setResult(data.result);
    }).catch(cause=>{if(!disposed)setMessage(cause.message);}).finally(()=>{if(!disposed)setBusy(false);});
    return()=>{disposed=true;};
  },[campaign.id,retry]);
  const stale=result&&(result.campaign.currentDate!==currentDate||result.campaign.currentOrders!==campaign.currentOrders||result.campaign.moq!==campaign.moq||result.campaign.target!==campaign.target||result.campaign.price!==campaign.price||result.campaign.startDate!==campaign.startDate||result.campaign.endDate!==campaign.endDate);
  return <div className="mt-6 space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Kết quả được lưu từ phiên huấn luyện của quản trị viên.</p><button disabled={busy} onClick={()=>setRetry(value=>value+1)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-40">{busy?'Đang tải…':'Cập nhật kết quả'}</button></div>{message&&<p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">{message}</p>}{stale&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Snapshot đã thay đổi so với dữ liệu hiện tại. Kết quả dưới đây là bản lưu; cần quản trị viên train/dự báo lại trước khi dùng để quyết định.</p>}{result&&<FullCampaignResults result={result} />}</div>;
}
