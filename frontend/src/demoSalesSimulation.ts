import type { DemoState, StoreCampaign, StoreOrder } from './DemoStore';
const DAY = 86400000;
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);
const day = (value: number) => new Date(value).toISOString().slice(0, 10);
function hash(text: string) { let n = 2166136261; for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export type SalesSimulation = { anchorDate: string; lastDate: string; dailyRate: number; closedByClock?: boolean; clockRefunds?: { id: string; orderStatus: StoreOrder['orderStatus']; paymentStatus: StoreOrder['paymentStatus'] }[] };

/** Synthetic, complete daily history. Allocation preserves the exact supplied total. */
export function seedDailyHistory(id: string, start: string, through: string, total: number) {
  if (!start || !through || start > through || total <= 0) return [];
  const count = Math.floor((time(through) - time(start)) / DAY) + 1;
  const weights = Array.from({ length: count }, (_, i) => {
    const date = day(time(start) + i * DAY), weekday = new Date(time(date)).getUTCDay();
    return (0.65 + (hash(`${id}:${date}`) % 1000) / 1000) * (i < 2 ? 1.35 : 1) * ([0, 6].includes(weekday) ? 1.15 : 1) * (0.9 + i / Math.max(1, count) * 0.3);
  });
  const sum = weights.reduce((a,b) => a+b,0);
  const quotas = weights.map(value => value / sum * total), quantities = quotas.map(Math.floor);
  const remainder = total - quantities.reduce((a,b) => a+b,0);
  const ranking = quotas.map((value,index) => ({ index, fraction: value - quantities[index] })).sort((a,b) => b.fraction - a.fraction || a.index-b.index);
  for (const item of ranking.slice(0,remainder)) quantities[item.index]++;
  if (quantities[0]===0) {
    const donor=quantities.findIndex(value=>value>0);quantities[donor]--;quantities[0]++;
  }
  return quantities.map((quantity,index) => ({date:day(time(start)+index*DAY),quantity}));
}

/** Add only newly imported purchases; do not reconstruct known totals from scratch. */
export function addOrdersToHistory(campaign: StoreCampaign, orders: StoreOrder[]) {
  if (!orders.length) return campaign;
  const values = new Map((campaign.dailyObservations || []).map(row => [row.date,row.quantity]));
  for (const order of orders) { const date=order.createdAt.slice(0,10); values.set(date,(values.get(date)||0)+order.quantity); }
  return {...campaign,currentOrders:campaign.currentOrders+orders.reduce((n,o)=>n+o.quantity,0),dailyObservations:[...values].sort(([a],[b])=>a.localeCompare(b)).map(([date,quantity])=>({date,quantity}))};
}

/** Local synthetic orders only. Fixed IDs + saved cursor prevent refresh double counting. */
export function advanceDemoSales(state: DemoState, today: string): DemoState {
  const profiles = state.campaigns.filter(c=>c.salesSimulation);
  if (!profiles.length) return state;
  // Base fixtures are an as-of snapshot. Never pretend to reconstruct earlier history.
  if (profiles.some(c=>today<c.salesSimulation!.anchorDate)) return state;
  const removed = state.orders.filter(o=>o.id.startsWith('PR-SIM-') && o.createdAt.slice(0,10)>today);
  const removedIds = new Set(removed.map(o=>o.id));
  let orders = removed.length ? state.orders.filter(o=>!removedIds.has(o.id)) : state.orders;
  let payments = removed.length ? state.payments.filter(p=>!removedIds.has(p.orderId)) : state.payments;
  const known = new Set(orders.map(o=>o.id));
  const newOrders: StoreOrder[] = [], newPayments: DemoState['payments'] = [];
  let changed=removed.length>0;
  const campaigns=state.campaigns.map(original=>{
    if (!original.salesSimulation) return original;
    let campaign=original, profile=original.salesSimulation;
    const undo=removed.filter(o=>o.campaignId===campaign.id);
    if(undo.length){
      const values=new Map((campaign.dailyObservations||[]).map(row=>[row.date,row.quantity]));
      for(const order of undo){const date=order.createdAt.slice(0,10);values.set(date,Math.max(0,(values.get(date)||0)-order.quantity));}
      campaign={...campaign,currentOrders:campaign.currentOrders-undo.reduce((n,o)=>n+o.quantity,0),dailyObservations:[...values].filter(([date])=>date<=today).sort(([a],[b])=>a.localeCompare(b)).map(([date,quantity])=>({date,quantity}))};
    }
    const through=today<campaign.endDate?today:campaign.endDate;
    if(!through || through<profile.anchorDate) return campaign;
    if(profile.lastDate>today){changed=true;profile={...profile,lastDate:today};campaign={...campaign,salesSimulation:profile};}
    if(through<=profile.lastDate) return campaign;
    const eligible=campaign.status==='Đang hoạt động'||campaign.status==='Đã lên lịch';
    const additions: StoreOrder[]=[];
    if(state.salesSimulationEnabled!==false && eligible){
      for(let stamp=Math.max(time(profile.lastDate)+DAY,time(campaign.startDate));stamp<=time(through);stamp+=DAY){
        const date=day(stamp), weekday=new Date(stamp).getUTCDay();
        const noise=.65+(hash(`${campaign.id}:${date}:growth`)%1000)/1000;
        const duration=Math.max(1,(time(campaign.endDate)-time(campaign.startDate))/DAY);
        const phase=(stamp-time(campaign.startDate))/DAY/duration;
        let remaining=Math.max(1,Math.round(profile.dailyRate*noise*([0,6].includes(weekday)?1.12:1)*(phase>.8?1.2:1)));
        for(let batch=0;remaining>0;batch++){
          const quantity=Math.min(remaining,99),id=`PR-SIM-${campaign.id}-${date}-${batch}`;remaining-=quantity;
          if(known.has(id))continue;
          known.add(id);
          const order:StoreOrder={id,campaignId:campaign.id,productId:campaign.productId,sellerId:campaign.sellerId,customerId:`customer-sample-${hash(id)%100+1}`,quantity,unitPrice:campaign.price,total:quantity*campaign.price,variant:'Đơn mô phỏng theo ngày',createdAt:`${date}T12:00:00.000Z`,orderStatus:'Chờ kết quả chiến dịch',paymentStatus:'Đã thanh toán'};
          additions.push(order);newOrders.push(order);newPayments.push({id:`PAY-${id}`,orderId:id,amount:order.total,status:order.paymentStatus});
        }
      }
    }
    changed=true;
    campaign=addOrdersToHistory(campaign,additions);
    return {...campaign,salesSimulation:{...profile,lastDate:through}};
  });
  if(!changed)return state;
  orders=[...newOrders,...orders];payments=[...newPayments,...payments];
  return {...state,campaigns,orders,payments};
}
