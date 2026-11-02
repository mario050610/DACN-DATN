import {apiErrorMessage} from "./apiErrors";
﻿export type Account = { id: string; name: string; email: string; role: "customer" | "seller" | "admin" | "partner"; two_factor_enabled: boolean };
export type AuthResult = { user?: Account; requires_two_factor?: boolean; challenge?: string; recovery_codes?: string[]; secret?: string; uri?: string };
export async function authApi(path: string, body?: unknown): Promise<AuthResult> {
  let response: Response;
  try { response = await fetch(`/api/auth/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error("Chưa kết nối backend. Hãy mở START_PREORA_WITH_AI.bat rồi thử lại."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(data.detail,"Không thể xử lý yêu cầu tài khoản. Kiểm tra thông tin và thử lại."));
  return data;
}
