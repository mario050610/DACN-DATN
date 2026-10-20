const fs=require('fs'),path=require('path'),ts=require('../frontend/node_modules/typescript'),assert=require('node:assert/strict');
function compile(text){return ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}
const sim={};new Function('exports',compile(fs.readFileSync('frontend/src/demoSalesSimulation.ts','utf8')))(sim);
const source=fs.readFileSync('frontend/src/DemoStore.tsx','utf8');const fixture=source.slice(0,source.indexOf('type StoreValue = {')).replace(/^import .*;\r?\n/gm,'');const e={};new Function('exports','catalogue','seedDailyHistory',compile(fixture+'\nexport {initialState};'))(e,JSON.parse(fs.readFileSync('frontend/src/data/catalogue.json','utf8')),sim.seedDailyHistory);const base=e.initialState;
const anchor=base.campaigns.find(c=>c.salesSimulation).salesSimulation.anchorDate;
const plus=n=>new Date(Date.parse(anchor+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const total=c=>(c.dailyObservations||[]).reduce((n,r)=>n+r.quantity,0);
for(const c of base.campaigns){if(c.currentOrders>0)assert.equal(total(c),c.currentOrders,c.id);if(c.salesSimulation&&c.status==='Đang hoạt động'){assert.equal(c.dailyObservations.length,(Date.parse(anchor)-Date.parse(c.startDate))/86400000+1);assert(c.dailyObservations.some(r=>r.quantity>0));}}
assert.equal(base.campaigns.find(c=>c.id==='CD-2408').currentOrders,184);
const grown=sim.advanceDemoSales(base,plus(1));assert(grown.orders.length>base.orders.length);assert.equal(new Set(grown.orders.map(o=>o.id)).size,grown.orders.length);
assert.strictEqual(sim.advanceDemoSales(grown,plus(1)),grown);
const persisted=JSON.parse(JSON.stringify(grown));assert.strictEqual(sim.advanceDemoSales(persisted,plus(1)),persisted);
for(const c of grown.campaigns)if(c.salesSimulation){assert.equal(total(c),c.currentOrders);assert.equal(grown.orders.filter(o=>o.campaignId===c.id).reduce((n,o)=>n+o.quantity,0),c.currentOrders);}
for(const o of grown.orders.filter(o=>o.id.startsWith('PR-SIM-'))){const c=grown.campaigns.find(c=>c.id===o.campaignId);assert(o.createdAt.slice(0,10)>=c.startDate&&o.createdAt.slice(0,10)<=c.endDate);assert(grown.payments.some(p=>p.orderId===o.id&&p.amount===o.total));}
const paused=sim.advanceDemoSales({...base,salesSimulationEnabled:false},plus(3));assert.equal(paused.orders.length,base.orders.length);const resumed=sim.advanceDemoSales({...paused,salesSimulationEnabled:true},plus(3));assert.equal(resumed.orders.length,base.orders.length);const tomorrow=sim.advanceDemoSales(resumed,plus(4));assert(tomorrow.orders.length>base.orders.length);assert(tomorrow.orders.filter(o=>o.id.startsWith('PR-SIM-')).every(o=>o.createdAt.startsWith(plus(4))));
const rewind=sim.advanceDemoSales(grown,anchor);assert.deepEqual(rewind.campaigns,base.campaigns);assert.deepEqual(rewind.orders,base.orders);assert.deepEqual(rewind.payments,base.payments);
const far=sim.advanceDemoSales(base,plus(60));for(const o of far.orders.filter(o=>o.id.startsWith('PR-SIM-'))){const c=far.campaigns.find(c=>c.id===o.campaignId);assert(o.createdAt.slice(0,10)<=c.endDate);}
assert.deepEqual(sim.advanceDemoSales({...base,campaigns:base.campaigns.map(c=>({...c,salesSimulation:undefined}))},plus(1)).orders,base.orders);
// Migration preserves purchases/custom products/campaigns while replacing only seed data.
const migrateText=source.slice(source.indexOf('function migrateState('),source.indexOf('\nfunction reconcileLifecycle'));
const m={};new Function('exports','initialState','addOrdersToHistory','seedDailyHistory',compile(migrateText+'\nexport {migrateState};'))(m,base,sim.addOrdersToHistory,sim.seedDailyHistory);
const old=structuredClone(base);old.sampleRevision=8;const user={...base.orders.find(o=>o.campaignId==='CD-2408'),id:'PR-USER-PRESERVE',quantity:2,total:2*base.campaigns[0].price,createdAt:anchor+'T09:00:00.000Z'};old.orders.push(user);old.payments.push({id:'PAY-USER-PRESERVE',orderId:user.id,amount:user.total,status:user.paymentStatus});old.products.push({...base.products[0],id:99999,name:'User custom product'});old.campaigns.push({...base.campaigns[0],id:'CUSTOM-KEEP',productId:99999,salesSimulation:undefined});
const migrated=m.migrateState(old);assert(migrated.orders.some(o=>o.id===user.id));assert(migrated.products.some(p=>p.id===99999));assert(migrated.campaigns.some(c=>c.id==='CUSTOM-KEEP'));const c=migrated.campaigns.find(c=>c.id==='CD-2408');assert.equal(c.currentOrders,186);assert.equal(total(c),186);assert(sim.advanceDemoSales(migrated,plus(1)).orders.some(o=>o.id===user.id));
console.log('PASS: dense exact-total history; deterministic daily growth; reload idempotence; pause/resume; rollback synthetic future; dates/end limits; order/payment reconciliation; migration preserves user records.');
console.log(JSON.stringify({revision:base.sampleRevision,seedOrders:base.orders.length,afterOneDay:grown.orders.length,afterEnd:far.orders.length,seedChars:JSON.stringify(base).length,afterEndChars:JSON.stringify(far).length,auroraBefore:184,auroraAfter:grown.campaigns.find(c=>c.id==='CD-2408').currentOrders}));

// Exercise the actual lifecycle function for jumps beyond end dates and rewind.
const business={};new Function('exports',compile(fs.readFileSync('frontend/src/services/businessRules.ts','utf8')))(business);
const life={};const lifeText=source.slice(source.indexOf('function reconcileLifecycle('),source.indexOf('\nfunction mergeAccount'));
new Function('exports','isoDay','getEffectiveNow','advanceDemoSales','evaluateCampaignOutcome',compile(lifeText+'\nexport {reconcileLifecycle};'))(life,date=>date.toISOString().slice(0,10),state=>new Date(state.demoNow||anchor+'T12:00:00Z'),sim.advanceDemoSales,business.evaluateCampaignOutcome);
const before=structuredClone(base);before.campaigns.find(c=>c.id==='CD-2408').moq=1000000;
const closed=life.reconcileLifecycle({...before,demoNow:plus(60)+'T12:00:00Z'});
assert(!closed.campaigns.some(c=>c.salesSimulation&&['Đang hoạt động','Đã lên lịch'].includes(c.status)),'scheduled campaign not closed on a long jump');
assert.equal(closed.campaigns.find(c=>c.id==='CD-2408').status,'Không đạt MOQ');
const back=life.reconcileLifecycle({...closed,demoNow:anchor+'T12:00:00Z'});
for(const original of before.campaigns){const actual=back.campaigns.find(c=>c.id===original.id);assert.deepEqual({...actual,dailyObservations:actual.dailyObservations||[]},{...original,dailyObservations:original.dailyObservations||[]},original.id);}
assert.equal(JSON.stringify(back.orders)===JSON.stringify(before.orders),true,'rollback changed original orders');assert.equal(JSON.stringify(back.payments)===JSON.stringify(before.payments),true,'rollback changed original payments');
console.log('PASS lifecycle: closes scheduled/active campaigns after end; rewind restores automatic closure/refunds and exact baseline counts.');

{
﻿const fs=require('fs'),ts=require('../frontend/node_modules/typescript'),assert=require('node:assert/strict');const compile=text=>ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const storage={};new Function('exports',compile(fs.readFileSync('frontend/src/demoStateStorage.ts','utf8')))(storage);const sim={};new Function('exports',compile(fs.readFileSync('frontend/src/demoSalesSimulation.ts','utf8')))(sim);const data=JSON.parse(fs.readFileSync('database/seeds/sample_data.json','utf8'));
for(const state of [data,sim.advanceDemoSales(data,new Date(Math.max(...data.campaigns.map(c=>Date.parse(c.endDate)||0))+86400000).toISOString().slice(0,10))]){const encoded=storage.encodeStoredDemoState(state);assert.deepEqual(storage.decodeStoredDemoState(JSON.parse(encoded)),state);console.log('PASS storage roundtrip',{orders:state.orders.length,originalChars:JSON.stringify(state).length,storedChars:encoded.length});fs.writeFileSync(state===data?'tmp/sim-seed-compact.json':'tmp/sim-far-compact.json',encoded);}
assert.strictEqual(storage.decodeStoredDemoState(data),data);console.log('PASS legacy object compatibility');

}

const older=structuredClone(old);older.orders.find(o=>o.id===user.id).createdAt=new Date(Date.parse(base.campaigns[0].startDate)-86400000).toISOString();
const prior=m.migrateState(older);const priorCampaign=prior.campaigns.find(c=>c.id==='CD-2408');assert.equal(total(priorCampaign),priorCampaign.currentOrders);assert(priorCampaign.startDate<=older.orders.find(o=>o.id===user.id).createdAt.slice(0,10));
const protectedState=structuredClone(base);protectedState.sampleRevision=8;const protectedCampaign=protectedState.campaigns.find(c=>c.id==='CD-2408');protectedCampaign.status='Thành công';protectedCampaign.moq=100;protectedState.productionRequests.push({id:'MFG-USER-KEEP',campaignId:protectedCampaign.id,sellerId:protectedCampaign.sellerId,partnerId:'partner-demo',quantity:184,status:'Đang sản xuất',progress:10,estimatedCompletion:plus(20),updatedAt:anchor+'T12:00:00Z'});
const protectedMigration=m.migrateState(protectedState);assert.deepEqual(protectedMigration.campaigns.find(c=>c.id===protectedCampaign.id),protectedCampaign);assert.deepEqual(protectedMigration.orders.filter(o=>o.campaignId===protectedCampaign.id),protectedState.orders.filter(o=>o.campaignId===protectedCampaign.id));assert(protectedMigration.productionRequests.some(r=>r.id==='MFG-USER-KEEP'));
console.log('PASS migration: old purchase dates remain in campaign history; user production workflows retain snapshots and linked orders.');
