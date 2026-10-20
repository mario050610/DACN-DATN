import type { DemoState } from './DemoStore';
const orderFields=['id','customerId','sellerId','campaignId','productId','quantity','unitPrice','total','variant','createdAt','orderStatus','paymentStatus'] as const;
const textFields=new Set(['id','customerId','sellerId','campaignId','variant','createdAt','orderStatus','paymentStatus']);
/** Column layout + shared strings keep many synthetic days below localStorage quota. */
export function encodeStoredDemoState(state: DemoState) {
  const strings:string[]=[],lookup=new Map<string,number>();
  const token=(value:string)=>{let index=lookup.get(value);if(index===undefined){index=strings.length;strings.push(value);lookup.set(value,index);}return index;};
  const compactOrders=state.orders.map(order=>orderFields.map(key=>textFields.has(key)?token(String(order[key])):order[key]));
  const compactPayments=state.payments.map(p=>[p.id===`PAY-${p.orderId}`?-1:token(p.id),token(p.orderId),p.amount,token(p.status)]);
  const {orders: _orders,payments: _payments,...rest}=state;
  return JSON.stringify({...rest,storageFormat:'compact-v1',strings,compactOrders,compactPayments});
}
export function decodeStoredDemoState(value: unknown): unknown {
  if(!value||typeof value!=='object'||!('storageFormat' in value)||value.storageFormat!=='compact-v1')return value;
  const data=value as Record<string,unknown>;
  const strings=data.strings as string[],orders=data.compactOrders as (number|string)[][],payments=data.compactPayments as number[][];
  if(!Array.isArray(strings)||!Array.isArray(orders)||!Array.isArray(payments))throw new Error('Invalid saved demo data');
  const text=(index:unknown)=>{if(typeof index!=='number'||!Number.isInteger(index)||typeof strings[index]!=='string')throw new Error('Invalid saved string');return strings[index];};
  const expandedOrders=orders.map(row=>{if(row.length!==orderFields.length)throw new Error('Invalid saved order');return Object.fromEntries(orderFields.map((key,i)=>[key,textFields.has(key)?text(row[i]):row[i]]));});
  const expandedPayments=payments.map(row=>{if(row.length!==4)throw new Error('Invalid saved payment');const orderId=text(row[1]);return {id:row[0]===-1?`PAY-${orderId}`:text(row[0]),orderId,amount:row[2],status:text(row[3])};});
  const {storageFormat:_format,strings:_strings,compactOrders:_orders,compactPayments:_payments,...rest}=data;
  return {...rest,orders:expandedOrders,payments:expandedPayments};
}
