import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useDemoStore} from './DemoStore';
import {ThemeToggle} from './Theme';
export const MODEL_OPTIONS=[
  {id:'hist_gradient_boosting',label:'HistGradientBoosting',description:'Boosting trên dữ liệu bảng, mô hình mặc định hiện tại.'},
  {id:'random_forest',label:'Random Forest',description:'Kết hợp nhiều cây quyết định để học quan hệ phi tuyến.'},
  {id:'extra_trees',label:'Extra Trees',description:'Rừng cây với ngưỡng chia ngẫu nhiên để thử nghiệm trên cùng dữ liệu.'},
] as const;
export type ModelAlgorithm=typeof MODEL_OPTIONS[number]['id'];
type Preferences={defaultModel:ModelAlgorithm;textSize:'normal'|'large';reduceMotion:boolean};
const defaults:Preferences={defaultModel:'hist_gradient_boosting',textSize:'normal',reduceMotion:false};
function read(key:string):Preferences {try{const value=JSON.parse(localStorage.getItem(key)||'{}');return {defaultModel:MODEL_OPTIONS.some(m=>m.id===value.defaultModel)?value.defaultModel:defaults.defaultModel,textSize:value.textSize==='large'?'large':'normal',reduceMotion:value.reduceMotion===true};}catch{return {...defaults};}}
const Context=createContext<{preferences:Preferences;update:(patch:Partial<Preferences>)=>void;reset:()=>void;error:string}|null>(null);
export function PersonalizationProvider({children}:{children:ReactNode}) {
  const {state}=useDemoStore();const key=`preora-preferences-${state.session?.userId||'guest'}`;
  const initial=useMemo(()=>read(key),[key]);
  const [owned,setOwned]=useState(()=>({key,value:initial}));const preferences=owned.key===key?owned.value:initial;
  const [error,setError]=useState('');
  useEffect(()=>{document.documentElement.dataset.textSize=preferences.textSize;document.documentElement.dataset.reduceMotion=String(preferences.reduceMotion);},[preferences]);
  useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===key||event.key===null)setOwned({key,value:read(key)});};window.addEventListener('storage',receive);return()=>window.removeEventListener('storage',receive);},[key]);
  const save=(value:Preferences)=>{setOwned({key,value});try{localStorage.setItem(key,JSON.stringify(value));setError('');}catch{setError('Chưa lưu được tùy chọn trên trình duyệt; thay đổi chỉ áp dụng trong phiên này.');}};
  return <Context.Provider value={{preferences,update:patch=>save({...preferences,...patch}),reset:()=>save({...defaults}),error}}>{children}</Context.Provider>;
}
export function usePersonalization(){const value=useContext(Context);if(!value)throw new Error('PersonalizationProvider is required');return value;}
export default function PersonalizationPage(){
  const {preferences,update,reset,error}=usePersonalization();
  const {state}=useDemoStore();
  const canTrain=state.session?.role==='seller'||state.session?.role==='admin';
  const field='mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm';
  return <section className="max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Giao diện sáng / tối</h2><p className="mt-1 text-sm text-slate-500">Áp dụng trên thiết bị này.</p></div><ThemeToggle/></div><label className="block text-sm font-semibold">Cỡ chữ<select aria-label="Cỡ chữ" value={preferences.textSize} onChange={e=>update({textSize:e.target.value as Preferences['textSize']})} className={field}><option value="normal">Tiêu chuẩn</option><option value="large">Lớn</option></select></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={preferences.reduceMotion} onChange={e=>update({reduceMotion:e.target.checked})} className="accent-teal-600"/>Giảm chuyển động và hiệu ứng</label>{canTrain&&<label className="block text-sm font-semibold">Model mặc định khi huấn luyện<select aria-label="Model mặc định" value={preferences.defaultModel} onChange={e=>update({defaultModel:e.target.value as ModelAlgorithm})} className={field}>{MODEL_OPTIONS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>}<p className="text-xs leading-5 text-slate-500">Tùy chọn được lưu riêng cho tài khoản trên trình duyệt này. Đổi model mặc định không tự khởi chạy huấn luyện và không thay đổi phiên đã lưu.</p><p role="status" className={`text-sm ${error?'text-rose-700':'text-teal-700'}`}>{error||'Tùy chọn được áp dụng ngay.'}</p><button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Khôi phục tùy chọn mặc định</button></section>;
}
