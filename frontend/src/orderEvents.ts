import type {DemoState,StoreOrder} from './DemoStore';
export type OrderEvent={title:string;at:string;kind:'order'|'payment'|'campaign'};
/** Append only changes observed by this store; never infer a missing historical timestamp. */
export function stampOrderChanges(previous:DemoState,next:DemoState,at:string):DemoState {
  if(previous===next)return next;
  const oldOrders=new Map(previous.orders.map(o=>[o.id,o]));const oldCampaigns=new Map(previous.campaigns.map(c=>[c.id,c.status]));
  const campaignChanges=new Map(next.campaigns.filter(c=>oldCampaigns.has(c.id)&&oldCampaigns.get(c.id)!==c.status).map(c=>[c.id,c.status]));
  let changed=false;
  const orders=next.orders.map(order=>{
    const old=oldOrders.get(order.id),events:OrderEvent[]=[];
    if(old&&order.events&&order.events!==old.events)return order; // Already stamped by another tab/server.
    if(old&&old.orderStatus!==order.orderStatus)events.push({title:order.orderStatus,at,kind:'order'});
    if(old&&old.paymentStatus!==order.paymentStatus)events.push({title:`Thanh toán: ${order.paymentStatus}`,at,kind:'payment'});
    const campaign=campaignChanges.get(order.campaignId);if(campaign)events.push({title:`Chiến dịch: ${campaign}`,at,kind:'campaign'});
    if(!events.length)return order;changed=true;
    return {...order,events:[...(order.events||old?.events||[]),...events]};
  });
  const previousCampaigns=new Map(previous.campaigns.map(c=>[c.id,c]));
  const campaigns=next.campaigns.map(c=>{const old=previousCampaigns.get(c.id);if(old&&c.events&&c.events!==old.events)return c;if(old?.status===c.status)return c;changed=true;return {...c,events:[...(c.events||old?.events||[]),{status:old?c.status:'Tạo chiến dịch: '+c.status,at}]};});
  return changed?{...next,orders,campaigns}:next;
}
