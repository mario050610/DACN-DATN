import { useState } from "react";
import catalogue from "./data/catalogue.json";
export default function ProductGallery({ image, name }: {
    image: string;
    name: string;
}) {
    const entry = catalogue.find(p => p.image === image);
    const photos = [...new Set([image, ...((entry as {
                images?: string[];
            } | undefined)?.images || [])])];
    const [index, setIndex] = useState(0);
    const active = Math.min(index, photos.length - 1);
    return <div aria-label={`Ảnh ${name}`} onKeyDown={e => { if (e.key === "ArrowRight")
        setIndex((active + 1) % photos.length); if (e.key === "ArrowLeft")
        setIndex((active - 1 + photos.length) % photos.length); }}><div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-100 bg-white"><img data-gallery-main src={photos[active]} alt={`${name} · ảnh ${active + 1}`} className="h-full w-full object-contain p-4"/>{photos.length > 1 && <><button aria-label="Ảnh trước" onClick={() => setIndex((active - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 rounded-full bg-white px-4 py-2 shadow">‹</button><button aria-label="Ảnh tiếp theo" onClick={() => setIndex((active + 1) % photos.length)} className="absolute right-3 top-1/2 rounded-full bg-white px-4 py-2 shadow">›</button></>}<span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-white">{active + 1} / {photos.length}</span></div>{photos.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{photos.map((src, i) => <button key={src} aria-label={`Xem ảnh ${i + 1}`} aria-pressed={i === active} onClick={() => setIndex(i)} className={`h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${i === active ? "border-teal-500" : "border-slate-100"}`}><img src={src} alt={`${name} · góc nhìn ${i + 1}`} loading="lazy" className="h-full w-full object-contain p-1"/></button>)}</div>}</div>;
}
