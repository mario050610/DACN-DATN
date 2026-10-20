/** Synthetic cumulative events, never written to the real analytics tracker. */
export function simulateCampaignBehavior(id: string, startDate: string, snapshotDate: string, endDate: string, currentOrders: number) {
  let seed=2166136261;
  for(const char of id) seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const through=snapshotDate<endDate?snapshotDate:endDate;
  const days=Math.max(0,Math.floor((Date.parse(through+'T00:00:00Z')-Date.parse(startDate+'T00:00:00Z'))/86400000)+1)||0;
  const orders=days?Math.max(0,Math.floor(currentOrders)):0;
  const cancelledQuantity=orders?Math.max(1,Math.round(orders*(.015+(seed%55)/1000))):0;
  const gross=orders+cancelledQuantity;
  const addToCart=Math.ceil(gross*(1.35+(seed%90)/100)+days*(2+seed%7));
  const clicks=Math.ceil(addToCart*(2.2+(seed%130)/100)+days*(5+seed%13));
  const favorites=Math.ceil(clicks*(.09+(seed%12)/100));
  const views=Math.ceil(clicks*(3.5+(seed%250)/100)+days*(25+seed%70));
  return {cancelledQuantity,behavior:{views,clicks,favorites,addToCart,source:'demo' as const}};
}
