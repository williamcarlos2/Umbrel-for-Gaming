export const DEFAULT_EBAY_FEE = 0.1325;
export const DEFAULT_SHIPPING = 4.5;

export type FlipMetrics = {
  grossRevenue: number;
  fees: number;
  shipping: number;
  netRevenue: number;
  profit: number;
  margin: number;
  roi: number;
};

export function calcFlipMetrics(buyPrice: number, sellPrice: number, venueFee = DEFAULT_EBAY_FEE, shippingCost = DEFAULT_SHIPPING): FlipMetrics {
  const fees = sellPrice * venueFee;
  const shipping = shippingCost;
  const netRevenue = sellPrice - fees - shipping;
  const profit = netRevenue - buyPrice;
  const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
  const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;

  return {
    grossRevenue: sellPrice,
    fees,
    shipping,
    netRevenue,
    profit,
    margin,
    roi,
  };
}

export function getFlipVerdict(roi: number) {
  if (roi >= 50) return { verdict: '🔥 STRONG FLIP', color: 'text-emerald-400' };
  if (roi >= 25) return { verdict: '✅ GOOD FLIP', color: 'text-green-400' };
  if (roi >= 10) return { verdict: '🟡 THIN MARGIN', color: 'text-yellow-400' };
  if (roi >= 0) return { verdict: '⚠️ BREAK EVEN', color: 'text-orange-400' };
  return { verdict: '❌ LOSS', color: 'text-red-400' };
}
