import { useState } from 'react';
import { getEffectiveNow, useDemoStore } from './DemoStore';
export default function DemoSalesControls({ busy = false }: { busy?: boolean }) {
  const { state, setDemoNow, setSalesSimulationEnabled, persistenceError } = useDemoStore();
  const [error,setError]=useState('');
  const now=getEffectiveNow(state);
  const active=state.campaigns.filter(c=>c.salesSimulation&&c.status==='Đang hoạt động');
  function move(value: string | null) { try { setDemoNow(value);setError(''); } catch(cause) {setError(cause instanceof Error?cause.message:'Không đổi được ngày mô phỏng.');} }
  return <section aria-label="Mô phỏng đơn hàng theo ngày" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Dữ liệu mô phỏng</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Đơn hàng thay đổi theo ngày</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{active.length} chiến dịch mẫu đang chạy có nhịp đặt hàng riêng. Khi sang ngày mới, hệ thống thêm số lượng, lịch sử ngày, đơn và thanh toán mẫu tương ứng. Không tạo giao dịch hoặc thanh toán thật.</p></div><label className="flex items-center gap-2 text-sm font-semibold text-amber-900"><input type="checkbox" aria-label="Tự tăng số lượng mẫu theo ngày" checked={state.salesSimulationEnabled!==false} disabled={busy} onChange={e=>setSalesSimulationEnabled(e.target.checked)} />Tự tăng theo ngày</label></div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-sm font-medium">Ngày đang xem: {now.toLocaleDateString('vi-VN',{timeZone:'UTC'})}</span><button type="button" disabled={busy} onClick={()=>move(new Date(now.getTime()+86400000).toISOString())} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">+1 ngày mô phỏng</button>{state.demoNow&&<button type="button" disabled={busy} onClick={()=>move(null)} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 disabled:opacity-40">Về ngày thực tế</button>}</div>
    <p className="mt-3 text-xs leading-5 text-slate-600">Chỉ áp dụng cho chiến dịch mẫu có cấu hình mô phỏng; chiến dịch tự tạo không bị thêm đơn. Tải lại không cộng trùng. Tạm tắt sẽ bỏ qua các ngày tạm dừng. Đơn có tiền tố PR-SIM là dữ liệu sinh tự động, không phải nhu cầu thị trường.</p>
    {persistenceError&&<p role="alert" className="mt-3 text-sm text-rose-700">{persistenceError}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </section>;
}
