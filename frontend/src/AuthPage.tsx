import { useState } from "react";
import { authApi, type AuthResult } from "./services/authApi";
import { useDemoStore } from "./DemoStore";

export default function AuthPage({ mode }: { mode: "login" | "register" | "forgot" }) {
  const { acceptAccount, authLoading } = useDemoStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState("customer");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const finish = (result: AuthResult) => {
    if (result.requires_two_factor && result.challenge) { setChallenge(result.challenge); setCode(""); return; }
    if (!result.user) throw new Error("Backend chưa trả về thông tin tài khoản.");
    acceptAccount(result.user);
    const requested = sessionStorage.getItem("preora-return-route"); sessionStorage.removeItem("preora-return-route");
    const home = { customer: "customer-home", seller: "seller-home", admin: "admin-home", partner: "partner-home" };
    const shoppingRoute = result.user.role === "customer" && requested && (["cart", "checkout", "wishlist", "vouchers"].includes(requested) || /^product\/\d+$/.test(requested));
    window.location.hash = requested && (requested.startsWith(result.user.role) || shoppingRoute) ? requested : home[result.user.role];
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (pending) return; setError("");
    if (mode === "register" && password !== confirmation) return setError("Xác nhận mật khẩu không khớp.");
    setPending(true);
    try { finish(await authApi(challenge ? "verify" : mode === "register" ? "register" : "login", challenge ? { challenge, code } : mode === "register" ? { name, email, password, role } : { email, password })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đăng nhập."); }
    finally { setPending(false); }
  };
  const input = "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50";
  return <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2"><section className="hidden flex-col justify-between p-12 text-white lg:flex"><a href="#explore" className="text-xl font-black text-teal-400">PREORA</a><div><p className="text-xs font-bold uppercase tracking-widest text-teal-400">Đặt trước từ nhu cầu thật</p><h1 className="mt-5 max-w-lg font-serif text-5xl font-bold leading-tight">Khám phá sản phẩm.<br />Đồng hành cùng ý tưởng mới.</h1><p className="mt-6 max-w-md leading-7 text-slate-400">Một tài khoản để theo dõi chiến dịch, quản lý đơn đặt trước và nhận hỗ trợ từ trợ lý PREORA.</p></div><p className="text-sm text-slate-500">Tài khoản được lưu trên backend của PREORA.</p></section><section className="grid place-items-center bg-white px-6 py-12"><div className="w-full max-w-md"><a href="#explore" className="text-sm font-semibold text-teal-700">← Khám phá sản phẩm</a><h2 className="mt-8 font-serif text-3xl font-bold">{challenge ? "Xác thực hai lớp" : mode === "register" ? "Tạo tài khoản PREORA" : mode === "forgot" ? "Khôi phục tài khoản" : "Đăng nhập PREORA"}</h2>
    {mode === "forgot" ? <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600"><p>Chưa kết nối dịch vụ gửi email đặt lại mật khẩu. Nếu vẫn đăng nhập được, bạn đổi mật khẩu trong Hồ sơ → Bảo mật.</p><p>Nếu mất ứng dụng Authenticator, dùng một mã khôi phục đã lưu ở bước xác thực hai lớp.</p><a href="#login" className="inline-block font-semibold text-teal-700">Về đăng nhập</a></div> : <form onSubmit={submit} className="mt-7 space-y-5">{challenge ? <><p className="text-sm leading-6 text-slate-500">Nhập mã 6 số từ ứng dụng Authenticator hoặc một mã khôi phục. Mỗi mã chỉ dùng được một lần; nếu vừa bật 2FA, hãy đợi mã kế tiếp.</p><label className="block text-sm font-semibold">Mã xác thực<input autoFocus required autoComplete="one-time-code" value={code} maxLength={32} onChange={(event) => setCode(event.target.value)} className={input} /></label></> : <>
      {mode === "register" && <label className="block text-sm font-semibold">Họ và tên<input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={input} /></label>}
      <label className="block text-sm font-semibold">Email<input required type="email" autoComplete="username" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} className={input} /></label>
      <label className="block text-sm font-semibold">Mật khẩu<input required type="password" minLength={mode === "register" ? 10 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className={input} /></label>
      {mode === "register" && <><p className="text-xs text-slate-500">Mật khẩu ít nhất 10 ký tự.</p><label className="block text-sm font-semibold">Xác nhận mật khẩu<input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={input} /></label><label className="block text-sm font-semibold">Loại tài khoản<select value={role} onChange={(event) => setRole(event.target.value)} className={input}><option value="customer">Khách hàng</option><option value="seller">Người bán</option></select></label></>}
    </>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}<button disabled={pending || authLoading} className="w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white disabled:opacity-50">{pending ? "Đang xử lý…" : challenge ? "Xác minh" : mode === "register" ? "Đăng ký" : "Đăng nhập"}</button>{challenge && <button type="button" onClick={() => { setChallenge(""); setCode(""); setError(""); }} className="w-full text-sm text-slate-500">Quay lại đăng nhập</button>}</form>}
    {!challenge && mode !== "forgot" && <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm"><a href={mode === "register" ? "#login" : "#register"} className="font-semibold text-teal-700">{mode === "register" ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}</a>{mode === "login" && <a href="#forgot" className="text-slate-500">Quên mật khẩu?</a>}</div>}
    {mode === "login" && !challenge && <details className="mt-8 rounded-xl bg-slate-50 p-4 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Tài khoản thử nghiệm có sẵn</summary><div className="mt-3 space-y-2">{["customer@preora.demo", "seller@preora.demo", "seller.b@preora.demo", "admin@preora.demo", "partner@preora.demo"].map((value) => <button type="button" key={value} onClick={() => { setEmail(value); setPassword("Demo123!"); }} className="block hover:text-teal-700">{value}</button>)}<p>Mật khẩu ban đầu: Demo123! Nếu đã đổi mật khẩu hoặc bật 2FA, dùng thông tin mới của tài khoản.</p></div></details>}
    </div></section></main>;
}
