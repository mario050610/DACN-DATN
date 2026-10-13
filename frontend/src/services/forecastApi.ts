export type ForecastRequest = {
  campaignId: string;
  productCategory: string;
  currentOrders: number;
  moq: number;
  target: number;
  startDate: string;
  endDate: string;
  currentDate: string;
  elapsedDays: number;
  daysRemaining: number;
  dailyOrderQuantities: { date: string; quantity: number }[];
};

export type ForecastResult = {
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  successProbability: number;
  modelVersion: string;
  warnings: string[];
  series: { date: string; value: number; lower: number; upper: number }[];
};

export interface ForecastApi {
  createForecast(request: ForecastRequest): Promise<ForecastResult>;
}

export function createExternalForecastApi(endpoint = "/api/ai/forecast", timeoutMs = 10_000): ForecastApi {
  return {
    async createForecast(request) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`ML API phản hồi lỗi ${response.status}.`);
        return await response.json() as ForecastResult;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw new Error("ML API đã hết thời gian chờ.");
        throw error;
      } finally {
        window.clearTimeout(timeout);
      }
    },
  };
}

export async function requestExternalSuccessPrediction(request: ForecastRequest, endpoint = "/api/ai/predict-success", timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ML API phản hồi lỗi ${response.status}.`);
    return await response.json() as { successProbability: number; modelVersion: string; warnings?: string[] };
  } finally {
    window.clearTimeout(timeout);
  }
}

export const demoForecastApi: ForecastApi = {
  async createForecast(request) {
    const remainingLift = Math.max(12, Math.round(request.currentOrders * Math.min(0.85, request.daysRemaining / 24)));
    const predictedDemand = Math.min(request.target, request.currentOrders + remainingLift);
    const uncertainty = Math.max(15, Math.round(predictedDemand * 0.1));
    const successProbability = Math.max(8, Math.min(96, Math.round((predictedDemand / request.moq) * 72)));
    const points = Math.max(2, Math.min(8, request.daysRemaining || 2));
    const series = Array.from({ length: points }, (_, index) => {
      const ratio = (index + 1) / points;
      const value = Math.round(request.currentOrders + (predictedDemand - request.currentOrders) * ratio);
      const spread = Math.round(uncertainty * ratio);
      const date = new Date(new Date(`${request.currentDate}T12:00:00`).getTime() + (index + 1) * 86_400_000).toISOString().slice(0, 10);
      return { date, value, lower: Math.max(request.currentOrders, value - spread), upper: value + spread };
    });
    return {
      predictedDemand,
      lowerBound: Math.max(request.currentOrders, predictedDemand - uncertainty),
      upperBound: predictedDemand + uncertainty,
      successProbability,
      modelVersion: "DemandCast v0.9-demo",
      warnings: request.currentOrders < 30
        ? ["Dữ liệu quan sát còn ít; khoảng bất định có thể lớn."]
        : ["Kết quả mô phỏng, không phải độ chính xác mô hình đã được xác minh."],
      series,
    };
  },
};
