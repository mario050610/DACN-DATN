import {useEffect,useRef,useState} from 'react';
import {useDemoStore,type DemoRole} from './DemoStore';
export default function AccountMenu({role,displayName}:{role:DemoRole;displayName:string}) {
  const {state,setSession}=useDemoStore();const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const label={customer:'Khách hàng',seller:'Người bán',admin:'Quản trị viên',partner:'Đối tác sản xuất'}[role];
  const close=()=>{setOpen(false);trigger.current?.focus();};
  useEffect(()=>{
    if(!open)return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();close();}
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&root.current?.contains(document.activeElement)){
        event.preventDefault();const items=Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')||[]);const i=items.indexOf(document.activeElement as HTMLElement);
        items[event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
      }
    };
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[open]);
  useEffect(()=>{const change=()=>setOpen(false);window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  const navigate=(path:string)=>{setOpen(false);window.location.hash=path;};
  const item='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-500';
  return <div ref={root} className="relative" onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
    <button ref={trigger} type="button" aria-label="Menu tài khoản" aria-haspopup="menu" aria-expanded={open} aria-controls={open?'account-dropdown':undefined} onClick={()=>setOpen(value=>!value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();setOpen(true);}}} className="flex max-w-[240px] items-center gap-3 rounded-xl p-1.5 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-500"><span className="hidden min-w-0 text-right sm:block"><strong className="block truncate text-sm text-slate-900">{displayName}</strong><span className="block text-xs text-slate-500">{label}</span></span><span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{displayName.slice(0,2).toUpperCase()}<svg aria-hidden="true" viewBox="0 0 16 16" className="absolute -bottom-0.5 -right-1 h-4 w-4 rounded-full bg-slate-100 p-0.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 6 4 4 4-4"/></svg></span></button>
    {open&&<div id="account-dropdown" ref={menu} role="menu" aria-label="Tùy chọn tài khoản" className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-3 py-3"><p className="truncate font-semibold text-slate-900">{displayName}</p><p className="mt-1 text-xs text-slate-500">{label}</p></div><button role="menuitem" className={item} onClick={()=>navigate(`profile/${encodeURIComponent(state.session!.userId)}`)}><span aria-hidden="true">◯</span>Trang cá nhân</button><button role="menuitem" className={item} onClick={()=>navigate(`${role}-account`)}>Thông tin tài khoản</button><button role="menuitem" className={item} onClick={()=>navigate(role==='customer'?'customer-settings':`${role}-settings`)}><span aria-hidden="true">⚙</span>Cài đặt và bảo mật</button><button role="menuitem" className={item} onClick={()=>navigate(`${role}-preferences`)}><span aria-hidden="true">☷</span>Cá nhân hóa</button><div className="my-1 border-t border-slate-100"/><button role="menuitem" disabled={busy} className={`${item} text-rose-700 disabled:opacity-50`} onClick={async()=>{setBusy(true);setError('');try{await setSession(null);navigate('login');}catch{setError('Không thể đăng xuất. Vui lòng thử lại.');}finally{setBusy(false);}}}><span aria-hidden="true">↪</span>{busy?'Đang đăng xuất…':'Đăng xuất'}</button>{error&&<p role="alert" className="p-3 text-xs text-rose-700">{error}</p>}</div>}
  </div>;
}
