export type CapacityRow={id:string;category:string;productType:string;dailyUnits:number;batchSize:number;leadDays:number;committedUnits:number;availableFrom:string;availableTo:string;weekdays:number[]};
export function planCapacity(c:CapacityRow,start:string,end:string,quantity:number) {
 const day=86400000;let from=Math.max(Date.parse(start+'T00:00:00Z'),Date.parse(c.availableFrom+'T00:00:00Z'))+c.leadDays*day;const to=Math.min(Date.parse(end+'T00:00:00Z'),Date.parse(c.availableTo+'T00:00:00Z'));
 if(!Number.isFinite(from)||!Number.isFinite(to)||to-from>730*day)throw new Error('Khoảng ngày không hợp lệ hoặc vượt 730 ngày.');
 let workdays=0;for(let t=from;t<=to;t+=day)if(c.weekdays.includes(new Date(t).getUTCDay()))workdays++;
 const available=Math.floor(Math.max(0,workdays*c.dailyUnits-c.committedUnits)/c.batchSize)*c.batchSize,required=Math.ceil(quantity/c.batchSize)*c.batchSize;
 return {workdays,available,required,enough:available>=required&&workdays>0,from:new Date(from).toISOString().slice(0,10)};
}
