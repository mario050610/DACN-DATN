import { useId } from 'react';
type Point = { date: string; value: number };
const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
const dateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
export default function CampaignProgressChart({ series }: { series: Point[] }) {
  const titleId = useId();
  const descriptionId = useId();
  const points = series.filter(point => Number.isFinite(point.value) && Number.isFinite(Date.parse(`${point.date}T00:00:00Z`)));
  if (!points.length) return <p className="mt-4 text-sm text-slate-500">Chưa có dữ liệu để vẽ tiến độ.</p>;
  const peak = Math.max(1, ...points.map(point => point.value));
  const magnitude = 10 ** Math.floor(Math.log10(peak / 4));
  const step = Math.max(1, ([1, 2, 5, 10].find(value => value * magnitude >= peak / 4) || 10) * magnitude);
  const maximum = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(maximum / step) + 1 }, (_, index) => index * step);
  const left = 90, right = 615, top = 25, bottom = 235;
  const start = Date.parse(`${points[0].date}T00:00:00Z`);
  const end = Date.parse(`${points.at(-1)!.date}T00:00:00Z`);
  const x = (point: Point) => left + (end === start ? 0 : (Date.parse(`${point.date}T00:00:00Z`) - start) / (end - start)) * (right - left);
  const y = (value: number) => bottom - value / maximum * (bottom - top);
  const indices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return <figure className="mt-4 min-w-0">
    <div className="overflow-x-auto rounded-lg" tabIndex={0} aria-label="Biểu đồ số lượng theo thời gian, có thể cuộn ngang trên màn hình nhỏ">
      <svg role="img" aria-labelledby={`${titleId} ${descriptionId}`} viewBox="0 0 640 315" className="w-full min-w-[460px]">
        <title id={titleId}>Tiến độ số lượng sản phẩm theo ngày</title>
        <desc id={descriptionId}>Trục tung: số lượng tích lũy, đơn vị sản phẩm. Trục hoành: thời gian theo ngày. Đường nối chỉ minh họa nội suy từ hiện tại đến dự báo cuối kỳ.</desc>
        {ticks.map(value => <g key={value}><line x1={left} y1={y(value)} x2={right} y2={y(value)} stroke="#e2e8f0" strokeDasharray={value === 0 ? undefined : '4 4'} /><text x={left - 10} y={y(value) + 4} textAnchor="end" fill="#64748b" fontSize="13">{number(value)}</text></g>)}
        <line x1={left} y1={top} x2={left} y2={bottom} stroke="#94a3b8" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#94a3b8" />
        <text transform={`translate(20 ${(top + bottom) / 2}) rotate(-90)`} textAnchor="middle" fill="#475569" fontSize="13" fontWeight="600">Số lượng tích lũy (sản phẩm)</text>
        {indices.map(index => <g key={index}><line x1={x(points[index])} y1={bottom} x2={x(points[index])} y2={bottom + 5} stroke="#94a3b8" /><text x={x(points[index])} y={bottom + 24} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill="#64748b" fontSize="13">{dateLabel(points[index].date)}</text></g>)}
        <text x={(left + right) / 2} y="292" textAnchor="middle" fill="#475569" fontSize="14" fontWeight="600">Thời gian (ngày)</text>
        <polyline fill="none" stroke="#0d9488" strokeWidth="3" points={points.map(point => `${x(point)},${y(point.value)}`).join(' ')} />
        {[...new Set([0, points.length - 1])].map(index => <g key={index}><circle cx={x(points[index])} cy={y(points[index].value)} r="4" fill="#0d9488" /><title>{points[index].date}: {number(points[index].value)} sản phẩm</title></g>)}
      </svg>
    </div>
    <figcaption className="mt-2 space-y-1 text-xs leading-5 text-slate-500"><p><strong>Trục tung:</strong> số lượng tích lũy (sản phẩm). <strong>Trục hoành:</strong> thời gian (ngày).</p><p>{points[0].date} → {points.at(-1)!.date}. Màn hình nhỏ có thể cuộn ngang để đọc rõ các mốc.</p></figcaption>
  </figure>;
}
