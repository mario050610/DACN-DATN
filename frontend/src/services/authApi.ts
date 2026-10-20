export type Account = { id: string; name: string; email: string; role: "customer" | "seller" | "admin" | "partner"; two_factor_enabled: boolean };
export type AuthResult = { user?: Account; requires_two_factor?: boolean; challenge?: string; recovery_codes?: string[]; secret?: string; uri?: string };
export async function authApi(path: string, body?: unknown): Promise<AuthResult> {
  let response: Response;
  try { response = await fetch(`/api/auth/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error("Chưa kết nối backend. Hãy mở START_PREORA_WITH_AI.bat rồi thử lại."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : response.status === 422 ? "Vui lòng kiểm tra dữ liệu. Mật khẩu mới cần ít nhất 10 ký tự." : "Không kết nối được backend tài khoản. Hãy kiểm tra backend đang chạy.");
  return data;
}
