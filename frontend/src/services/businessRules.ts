export type CampaignRuleInput = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  currentOrders: number;
  moq: number;
};

export type CartRuleInput = {
  campaignId: string;
  quantity: number;
  unitPrice: number;
};

const DAY = 86_400_000;

export function effectiveNow(demoNow: string | null) {
  return new Date(demoNow || Date.now());
}

export function remainingDays(endDate: string, demoNow: string | null) {
  if (!endDate) return 0;
  return Math.max(0, Math.ceil((new Date(`${endDate}T23:59:59`).getTime() - effectiveNow(demoNow).getTime()) / DAY));
}

export function campaignIsOrderable(campaign: CampaignRuleInput, demoNow: string | null) {
  const today = effectiveNow(demoNow).toISOString().slice(0, 10);
  return campaign.status === "Đang hoạt động" && campaign.startDate <= today && campaign.endDate >= today;
}

export function evaluateCampaignOutcome(campaign: CampaignRuleInput) {
  return campaign.currentOrders >= campaign.moq ? "Thành công" : "Không đạt MOQ";
}

export function validateCheckout(cart: CartRuleInput[], campaigns: (CampaignRuleInput & { price: number })[], demoNow: string | null) {
  if (cart.length === 0) return { ok: false, message: "Giỏ hàng đang trống." };
  for (const item of cart) {
    const campaign = campaigns.find((entry) => entry.id === item.campaignId);
    if (!campaign || !campaignIsOrderable(campaign, demoNow)) return { ok: false, message: "Chiến dịch không còn đủ điều kiện đặt trước." };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return { ok: false, message: "Số lượng không hợp lệ." };
    if (item.unitPrice !== campaign.price) return { ok: false, message: "Giá sản phẩm đã thay đổi." };
  }
  return { ok: true, message: "" };
}
