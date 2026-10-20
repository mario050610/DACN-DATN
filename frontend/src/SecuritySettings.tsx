import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { authApi } from "./services/authApi";
import { useDemoStore } from "./DemoStore";
export default function SecuritySettings() {
  const { state, acceptAccount } = useDemoStore();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => { let alive = true; authApi("me").then((result) => { if (alive && result.user && result.user.id === state.session?.userId) { setEnabled(result.user.two_factor_enabled); setReady(true); } }).catch((cause) => { if (alive) setError(cause.message); }); return () => { alive = false; }; }, [state.session?.userId]);
  const act = async (kind: "password" | "setup" | "enable" | "disable") => {
    if (pending) return; setError(""); setSuccess("");
    if (kind === "password" && (next.length < 10 || next !== confirmation)) return setError("Mật khẩu mới ít nhất 10 ký tự và xác nhận phải trùng nhau.");
    if (kind !== "enable" && !password) return setError("Vui lòng nhập mật khẩu hiện tại.");
    setPending(true);
    try {
      const result = await authApi(kind === "password" ? "password" : `2fa/${kind}`, kind === "enable" ? { code } : { password, code, ...(kind === "password" ? { new_password: next } : {}) });
      if (kind === "setup" && result.secret && result.uri) { setSetup({ secret: result.secret, qr: await QRCode.toDataURL(result.uri, { width: 220, margin: 2 }) }); setCode(""); }
      if (result.user) { acceptAccount(result.user); setEnabled(result.user.two_factor_enabled); }
      if (kind === "enable") { setRecovery(result.recovery_codes || []); setSetup(null); setCode(""); setPassword(""); setSuccess("Đã bật xác thực hai lớp. Lưu mã khôi phục trước khi rời trang."); }
      if (kind === "disable") { setRecovery([]); setSetup(null); setCode(""); setPassword(""); setSuccess("Đã tắt xác thực hai lớp."); }
      if (kind === "password") { setPassword(""); setNext(""); setConfirmation(""); setCode(""); setSuccess("Đã đổi mật khẩu và đăng xuất các phiên khác."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật bảo mật."); }
    finally { setPending(false); }
  };
  const input = "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal";
  return <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-serif text-xl font-bold">Bảo mật tài khoản</h2><p className="mt-3 text-sm text-slate-500">Xác thực hai lớp: <strong className={enabled ? "text-teal-700" : "text-slate-700"}>{ready ? enabled ? "Đang bật" : "Chưa bật" : "Đang kiểm tra phiên…"}</strong></p>
    <label className="mt-5 block text-sm font-semibold">Mật khẩu hiện tại<input type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={input} /></label>
    {enabled && <label className="mt-4 block text-sm font-semibold">Mã Authenticator hoặc mã khôi phục<input autoComplete="one-time-code" maxLength={32} value={code} onChange={(event) => setCode(event.target.value)} className={input} /></label>}
    <div className="mt-6 border-t pt-5"><h3 className="font-semibold">Đổi mật khẩu</h3><label className="mt-4 block text-sm font-semibold">Mật khẩu mới<input type="password" autoComplete="new-password" minLength={10} maxLength={128} value={next} onChange={(event) => setNext(event.target.value)} className={input} /></label><label className="mt-4 block text-sm font-semibold">Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" minLength={10} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={input} /></label><button disabled={!ready || pending} onClick={() => void act("password")} className="mt-4 w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white disabled:opacity-50">Đổi mật khẩu</button></div>
    <div className="mt-6 border-t pt-5"><h3 className="font-semibold">Xác thực hai lớp</h3><p className="mt-2 text-sm leading-6 text-slate-500">Dùng ứng dụng Authenticator để tạo mã đăng nhập 6 số, thay đổi mỗi 30 giây.</p>{!setup && <button disabled={!ready || pending} onClick={() => void act(enabled ? "disable" : "setup")} className="mt-4 w-full rounded-xl border border-teal-200 py-3 text-sm font-semibold text-teal-800 disabled:opacity-50">{enabled ? "Tắt xác thực hai lớp" : "Bật xác thực hai lớp"}</button>}
    {setup && <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4"><p className="text-sm">Quét QR bằng Authenticator hoặc nhập khóa thủ công, rồi nhập mã để xác nhận bật.</p><img src={setup.qr} alt="QR thiết lập xác thực hai lớp PREORA" className="mx-auto max-w-full" /><code className="block break-all rounded-lg border bg-white p-3 text-xs">{setup.secret}</code><label className="block text-sm font-semibold">Mã xác nhận 6 số<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} className={input} /></label><button disabled={pending || !/^\d{6}$/.test(code)} onClick={() => void act("enable")} className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white disabled:opacity-50">Xác nhận bật 2FA</button><button disabled={pending} onClick={() => { setSetup(null); setCode(""); }} className="w-full text-sm text-slate-500">Hủy thiết lập</button></div>}</div>
    {pending && <p role="status" className="mt-4 text-sm text-slate-500">Đang xử lý…</p>}{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}{success && <p role="status" className="mt-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-800">{success}</p>}
    {!!recovery.length && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Mã khôi phục — chỉ hiển thị lần này</h3><p className="mt-2 text-xs leading-5">Lưu ở nơi riêng tư. Mỗi mã chỉ dùng một lần nếu mất Authenticator. Không gửi cho người khác.</p><div className="mt-3 grid gap-2">{recovery.map((value) => <code key={value} className="select-all text-sm">{value}</code>)}</div><button onClick={() => setRecovery([])} className="mt-4 text-sm font-bold text-teal-800">Tôi đã lưu các mã</button></div>}
  </section>;
}
