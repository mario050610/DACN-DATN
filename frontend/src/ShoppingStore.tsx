import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDemoStore, type StoreOrder } from "./DemoStore";
export type ShoppingItem = {
    productId: number;
    campaignId: string;
    variant: string;
    quantity: number;
    unitPrice: number;
    selected: boolean;
};
export type Voucher = {
    code: string;
    title: string;
    minimum: number;
    amount: number;
    percent: number;
    cap: number;
    category: string;
    expires: string;
};
export type Receipt = {
    id: string;
    orders: StoreOrder[];
    subtotal: number;
    discount: number;
    total: number;
    code: string;
};
type Data = {
    cart: ShoppingItem[];
    saved: number[];
    claimed: string[];
    used: string[];
    orders: StoreOrder[];
    receipts: Receipt[];
};
const empty: Data = { cart: [], saved: [], claimed: [], used: [], orders: [], receipts: [] };
export async function shoppingApi<T>(path: string, body?: unknown): Promise<T> {
    const r = await fetch(`/api/shopping/${path}`, { credentials: "same-origin", ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    const result = await r.json();
    if (!r.ok)
        throw new Error(typeof result.detail === "string" ? result.detail : "Dữ liệu không hợp lệ. Vui lòng kiểm tra và thử lại.");
    return result;
}
type Value = {
    data: Data;
    vouchers: Voucher[];
    busy: boolean;
    loading: boolean;
    error: string;
    code: string;
    setCode: (v: string) => void;
    change: (path: string, body: unknown) => Promise<boolean>;
    checkout: (body: unknown) => Promise<Receipt | undefined>;
};
const Context = createContext<Value | null>(null);
export function ShoppingProvider({ children }: {
    children: React.ReactNode;
}) {
    const { state, authLoading, importShoppingOrders } = useDemoStore();
    const uid = state.session?.role === "customer" ? state.session.userId : "";
    const [owned, setOwned] = useState({ uid: "", data: empty });
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [code, setCode] = useState("");
    const lock = useRef(false);
    const generation = useRef(0);
    const user = useRef(uid);
    user.current = uid;
    useEffect(() => { shoppingApi<{
        vouchers: Voucher[];
    }>("vouchers").then(x => setVouchers(x.vouchers)).catch(e => setError(e.message)); }, []);
    useEffect(() => { const g = ++generation.current; setOwned({ uid: "", data: empty }); setCode(""); setError(""); if (!uid || authLoading) {
        setLoading(false);
        return;
    } setLoading(true); shoppingApi<Data>("me").then(data => { if (g === generation.current) {
        setOwned({ uid, data });
        importShoppingOrders(data.orders);
    } }).catch(e => { if (g === generation.current)
        setError(e.message); }).finally(() => { if (g === generation.current)
        setLoading(false); }); }, [uid, authLoading]);
    const data = owned.uid === uid ? owned.data : empty;
    async function change(path: string, body: unknown) { if (!uid) {
        sessionStorage.setItem("preora-return-route", window.location.hash.replace(/^#\/?/, ""));
        window.location.hash = "login";
        return false;
    } if (lock.current || loading)
        return false; lock.current = true; setBusy(true); setError(""); const owner = uid; try {
        const data = await shoppingApi<Data>(path, body);
        if (user.current === owner)
            setOwned({ uid: owner, data });
        return true;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không thể lưu thay đổi.");
        return false;
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    async function checkout(body: unknown) { if (lock.current || !uid)
        return; lock.current = true; setBusy(true); setError(""); const owner = uid; try {
        const r = await shoppingApi<{
            shopping: Data;
            receipt: Receipt;
        }>("checkout", body);
        if (user.current !== owner)
            return;
        setOwned({ uid: owner, data: r.shopping });
        importShoppingOrders(r.shopping.orders);
        setCode("");
        return r.receipt;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không thể tạo đơn.");
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    return <Context.Provider value={{ data, vouchers, busy, loading, error, code, setCode, change, checkout }}>{children}{error && <div role="alert" className="fixed bottom-5 left-5 right-5 z-50 mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-xl">{error}<button onClick={() => setError("")} className="float-right px-2" aria-label="Đóng thông báo">×</button></div>}</Context.Provider>;
}
export function useShopping() { const value = useContext(Context); if (!value)
    throw new Error("ShoppingProvider missing"); return value; }
