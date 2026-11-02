const fs=require('fs'),ts=require('../frontend/node_modules/typescript'),assert=require('node:assert/strict');
function load(file){const e={};new Function('exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(e);return e;}
const {stampOrderChanges}=load('frontend/src/orderEvents.ts'),codec=load('frontend/src/demoStateStorage.ts');
const old={version:2,orders:[{id:'o',customerId:'c',sellerId:'s',campaignId:'x',productId:1,quantity:1,unitPrice:100,total:80,discount:20,variant:'test',createdAt:'2026-10-20T00:00:00Z',orderStatus:'Chờ kết quả chiến dịch',paymentStatus:'Đã thanh toán'}],campaigns:[{id:'x',status:'Đang hoạt động'}],payments:[]};
const time='2026-10-22T10:20:30Z';const next={...old,campaigns:[{id:'x',status:'Không đạt MOQ'}],orders:old.orders.map(o=>({...o,orderStatus:'Đang hoàn tiền',paymentStatus:'Đang hoàn tiền'}))};
const result=stampOrderChanges(old,next,time);assert.equal(result.orders[0].events.length,3);assert(result.orders[0].events.every(e=>e.at===time));
assert.deepEqual(result.campaigns[0].events,[{status:'Không đạt MOQ',at:time}]);
const created=stampOrderChanges(old,{...old,campaigns:[...old.campaigns,{id:'new',status:'Bản nháp'}]},time);assert.equal(created.campaigns[1].events[0].at,time);assert.equal(created.campaigns[1].events[0].status,'Tạo chiến dịch: Bản nháp');
const saved=codec.encodeStoredDemoState(result),restored=codec.decodeStoredDemoState(JSON.parse(saved));assert.deepEqual(restored,result);assert.equal(restored.orders[0].discount,20);
assert.deepEqual(stampOrderChanges(old,restored,time),restored,'a remotely stamped update must not duplicate events');assert.strictEqual(stampOrderChanges(result,result,time),result);
const refunded=stampOrderChanges(result,{...result,orders:result.orders.map(o=>({...o,orderStatus:'Đã hoàn tiền',paymentStatus:'Đã hoàn tiền'}))},'2026-10-22T11:00:00Z');assert.equal(refunded.orders[0].events.length,5);assert.equal(refunded.orders[0].events.at(-1).title,'Thanh toán: Đã hoàn tiền');console.log('PASS: observed timestamps, failure/refund branches, no remote duplicate events, compact persistence preserves timeline and discount.');
