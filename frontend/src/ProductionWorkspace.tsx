import { useState } from "react"
import {
  useDemoStore,
  getEffectiveNow,
  type DemoRole,
  type ProductionRequest,
} from "./DemoStore"
import { useRecordParam, recordHref } from "./dashboardRoutes"
const panel = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
const button =
  "inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
const stages = [
  "Chờ tiếp nhận",
  "Đã tiếp nhận",
  "Đang sản xuất",
  "Đang vận chuyển",
  "Hoàn thành",
]
export default function ProductionWorkspace({
  role,
  mode = "tracking",
}: {
  role: DemoRole
  mode?: "overview" | "requests" | "progress" | "tracking"
}) {
  const { state, updateProduction, createProductionRequest, persistenceError } =
    useDemoStore()
  const uid = state.session?.userId,
    id = useRecordParam("request")
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Tất cả")
  const customerCampaigns = new Set(
    state.orders
      .filter(
        (o) =>
          o.customerId === uid &&
          !["Đã hoàn tiền", "Đã hủy"].includes(o.orderStatus),
      )
      .map((o) => o.campaignId),
  )
  const requests = state.productionRequests.filter(
    (r) =>
      role === "admin" ||
      (role === "partner"
        ? r.partnerId === uid
        : role === "seller"
          ? r.sellerId === uid
          : customerCampaigns.has(r.campaignId)),
  )
  const path =
    role === "partner"
      ? mode === "requests"
        ? "partner-requests"
        : "partner-production"
      : `${role}-production`
  const campaignName = (r: ProductionRequest) =>
    state.campaigns.find((c) => c.id === r.campaignId)?.name || r.campaignId
  const visible = requests.filter(
    (r) =>
      `${r.id} ${campaignName(r)}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "Tất cả" || r.status === filter),
  )
  const selected = requests.find((r) => r.id === id)
  const today = getEffectiveNow(state).toISOString().slice(0, 10)
  const active = requests.filter((r) => r.status !== "Hoàn thành")
  const late = active.filter((r) => r.estimatedCompletion < today)
  const metrics = (items: [string, number | string][]) => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div className={panel} key={label}>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="mt-3 block text-3xl">{value}</strong>
        </div>
      ))}
    </div>
  )
  if (mode === "overview")
    return (
      <div className="space-y-6">
        {metrics([
          [
            "Đang chờ tiếp nhận",
            requests.filter((r) => r.status === "Chờ tiếp nhận").length,
          ],
          [
            "Lệnh đang thực hiện",
            active.filter((r) => r.status !== "Chờ tiếp nhận").length,
          ],
          ["Quá ngày dự kiến", late.length],
          [
            "Đã hoàn thành",
            requests.filter((r) => r.status === "Hoàn thành").length,
          ],
        ])}
        <section className={panel}>
          <h2 className="text-xl font-bold">Công việc cần ưu tiên</h2>
          <div className="mt-4 space-y-3">
            {[
              ...late,
              ...active.filter(
                (r) => r.status === "Chờ tiếp nhận" && !late.includes(r),
              ),
            ]
              .slice(0, 5)
              .map((r) => (
                <a
                  key={r.id}
                  href={recordHref(
                    "request",
                    r.id,
                    r.status === "Chờ tiếp nhận"
                      ? "partner-requests"
                      : "partner-production",
                  )}
                  className="flex flex-wrap justify-between gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <span>
                    {campaignName(r)}
                    <small className="mt-1 block text-slate-500">
                      {r.id} · {r.quantity} sản phẩm
                    </small>
                  </span>
                  <strong
                    className={
                      r.estimatedCompletion < today
                        ? "text-rose-600"
                        : "text-teal-700"
                    }
                  >
                    {r.estimatedCompletion < today
                      ? "Quá ngày dự kiến"
                      : r.status}{" "}
                    →
                  </strong>
                </a>
              ))}
            {!late.length &&
              !active.some((r) => r.status === "Chờ tiếp nhận") && (
                <p className="text-sm text-slate-500">
                  Không có yêu cầu cần xử lý gấp.
                </p>
              )}
          </div>
        </section>
        <section className={panel}>
          <h2 className="text-xl font-bold">Đi đến công việc</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className={button} href="#partner-requests">
              Tiếp nhận yêu cầu
            </a>
            <a className={button} href="#partner-production">
              Theo dõi và cập nhật tiến độ
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Trang tổng quan chỉ tổng hợp tình hình. Tiếp nhận ở trang yêu cầu,
            cập nhật công đoạn ở trang tiến độ.
          </p>
        </section>
      </div>
    )
  const detail = selected && (
    <section className={panel}>
      <a className="text-sm font-semibold text-teal-700" href={`#${path}`}>
        ← Về danh sách
      </a>
      <h2 className="mt-4 break-all text-xl font-bold">
        Chi tiết lệnh {selected.id}
      </h2>
      <p className="mt-2 text-lg font-semibold">{campaignName(selected)}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          ["Trạng thái", selected.status],
          ["Số lượng sản xuất", `${selected.quantity} sản phẩm`],
          [
            "Người bán",
            state.users.find((u) => u.id === selected.sellerId)?.name ||
              selected.sellerId,
          ],
          [
            "Đối tác",
            state.users.find((u) => u.id === selected.partnerId)?.name ||
              selected.partnerId,
          ],
          ["Ngày hoàn thành dự kiến", selected.estimatedCompletion],
          [
            "Cập nhật gần nhất",
            new Date(selected.updatedAt).toLocaleString("vi-VN"),
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="mt-1 break-words text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex justify-between text-sm">
        <span>Sản lượng đã hoàn thành theo tiến độ</span>
        <strong>{selected.progress}%</strong>
      </div>
      <progress
        aria-label="Tiến độ sản xuất"
        max={100}
        value={selected.progress}
        className="my-3 h-3 w-full accent-teal-600"
      />
      <ol className="grid gap-2 sm:grid-cols-5">
        {stages.map((stage, index) => (
          <li
            key={stage}
            className={`rounded-xl p-3 text-xs ${
              index <= stages.indexOf(selected.status)
                ? "bg-teal-50 text-teal-800"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {index + 1}. {stage}
          </li>
        ))}
      </ol>
      {role === "partner" && (
        <div className="mt-5 flex flex-wrap gap-3">
          {mode === "requests" && selected.status === "Chờ tiếp nhận" && (
            <button
              className={button}
              onClick={() => updateProduction(selected.id, 0, "Đã tiếp nhận")}
            >
              Tiếp nhận lệnh
            </button>
          )}
          {mode === "requests" && selected.status !== "Chờ tiếp nhận" && (
            <a
              className={button}
              href={recordHref("request", selected.id, "partner-production")}
            >
              Chuyển đến cập nhật tiến độ →
            </a>
          )}
          {mode === "progress" && selected.status === "Chờ tiếp nhận" && (
            <a
              className={button}
              href={recordHref("request", selected.id, "partner-requests")}
            >
              Mở yêu cầu để tiếp nhận
            </a>
          )}
          {mode === "progress" && selected.status === "Đã tiếp nhận" && (
            <button
              className={button}
              onClick={() => updateProduction(selected.id, 0, "Đang sản xuất")}
            >
              Bắt đầu sản xuất
            </button>
          )}
          {mode === "progress" && selected.status === "Đang sản xuất" && (
            <>
              <button
                disabled={selected.progress >= 100}
                className={button}
                onClick={() =>
                  updateProduction(
                    selected.id,
                    Math.min(100, selected.progress + 10),
                    "Đang sản xuất",
                  )
                }
              >
                Cập nhật +10%
              </button>
              <button
                disabled={selected.progress < 100}
                className={button}
                onClick={() =>
                  updateProduction(selected.id, 100, "Đang vận chuyển")
                }
              >
                Chuyển sang vận chuyển
              </button>
            </>
          )}
          {mode === "progress" && selected.status === "Đang vận chuyển" && (
            <button
              className={button}
              onClick={() => updateProduction(selected.id, 100, "Hoàn thành")}
            >
              Xác nhận hoàn thành
            </button>
          )}
        </div>
      )}
      <h3 className="mt-6 font-semibold">Lịch sử cập nhật</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {(selected.history?.length
          ? selected.history
          : [
              {
                status: selected.status,
                progress: selected.progress,
                at: selected.updatedAt,
              },
            ]
        ).map((event, index) => (
          <li key={index}>
            {new Date(event.at).toLocaleString("vi-VN")} · {event.status} ·{" "}
            {event.progress}%
          </li>
        ))}
      </ul>
      <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        Cùng một lệnh được hiển thị cho đối tác được giao, người bán, quản trị
        viên và khách hàng có đơn liên quan. Dữ liệu prototype đồng bộ giữa các
        trang và tab của cùng trình duyệt; chưa đồng bộ tiến độ qua thiết bị
        khác.
      </p>
    </section>
  )
  return (
    <div className="space-y-6">
      {persistenceError && (
        <p role="alert" className="text-rose-600">
          {persistenceError}
        </p>
      )}
      {id ? (
        detail || (
          <section className={panel}>
            <h2 className="font-bold">Không tìm thấy lệnh sản xuất</h2>
            <p className="mt-2 text-sm">
              Lệnh không tồn tại hoặc không thuộc phạm vi tài khoản.
            </p>
            <a className="mt-4 inline-block text-teal-700" href={`#${path}`}>
              Về danh sách
            </a>
          </section>
        )
      ) : (
        <>
          {role === "seller" &&
            state.campaigns
              .filter(
                (c) =>
                  c.sellerId === uid &&
                  c.status === "Thành công" &&
                  !requests.some((r) => r.campaignId === c.id),
              )
              .map((c) => (
                <section
                  key={c.id}
                  className="rounded-2xl border border-teal-200 bg-teal-50 p-5"
                >
                  <h2 className="font-bold">{c.name}</h2>
                  <p className="my-3 text-sm">
                    Đạt MOQ: {c.currentOrders} / {c.moq} sản phẩm
                  </p>
                  <button
                    className={button}
                    onClick={() => createProductionRequest(c.id)}
                  >
                    Tạo lệnh sản xuất
                  </button>
                </section>
              ))}
          {mode === "progress" &&
            metrics([
              [
                "Đã tiếp nhận",
                requests.filter((r) => r.status === "Đã tiếp nhận").length,
              ],
              [
                "Đang sản xuất",
                requests.filter((r) => r.status === "Đang sản xuất").length,
              ],
              [
                "Đang vận chuyển",
                requests.filter((r) => r.status === "Đang vận chuyển").length,
              ],
              ["Quá ngày dự kiến", late.length],
            ])}
          <section className={panel}>
            <h2 className="text-xl font-bold">
              {mode === "requests"
                ? "Danh sách yêu cầu được phân công"
                : mode === "progress"
                  ? "Theo dõi các lệnh sản xuất"
                  : "Tiến độ sản xuất liên quan"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
              <input
                aria-label="Tìm lệnh sản xuất"
                placeholder="Tìm mã lệnh hoặc tên chiến dịch…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm"
              />
              <select
                aria-label="Lọc trạng thái sản xuất"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
              >
                {["Tất cả", ...stages].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 space-y-3">
              {visible.map((r) => (
                <a
                  href={recordHref("request", r.id, path)}
                  key={r.id}
                  className="block rounded-xl border border-slate-200 p-4 hover:border-teal-400"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{campaignName(r)}</h3>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {r.id} · {r.quantity} sản phẩm · Dự kiến{" "}
                        {r.estimatedCompletion}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-teal-700">
                      {r.status} · {r.progress}% →
                    </span>
                  </div>
                  {mode !== "requests" && (
                    <progress
                      max={100}
                      value={r.progress}
                      className="mt-3 h-2 w-full accent-teal-600"
                    />
                  )}
                </a>
              ))}
              {!visible.length && (
                <p className="py-6 text-sm text-slate-500">
                  Chưa có lệnh sản xuất phù hợp. Lệnh xuất hiện sau khi chiến
                  dịch đạt MOQ và seller tạo yêu cầu.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
