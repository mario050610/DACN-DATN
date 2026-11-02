const fs=require('fs'),ts=require('../frontend/node_modules/typescript'),assert=require('node:assert/strict');
function load(path){const e={};new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(e);return e;}
const {planCapacity}=load('frontend/src/capacityPlanning.ts'),{workflowProgress}=load('frontend/src/productionProgress.ts');
const c={availableFrom:'2026-10-19',availableTo:'2026-10-30',leadDays:2,weekdays:[1,2,3,4,5],dailyUnits:100,batchSize:50,committedUnits:125};
const result=planCapacity(c,'2026-10-19','2026-10-25',240);assert.deepEqual(result,{workdays:3,available:150,required:250,enough:false,from:'2026-10-21'});
assert.equal(planCapacity(c,'2026-10-19','2026-10-30',240).available,650);assert.equal(planCapacity(c,'2026-11-01','2026-11-10',1).enough,false);assert.equal(planCapacity({...c,committedUnits:10000},'2026-10-19','2026-10-30',1).available,0);
assert.deepEqual(['Chờ tiếp nhận','Đã tiếp nhận','Đang sản xuất','Đang vận chuyển','Hoàn thành'].map(status=>workflowProgress({status,progress:0})),[0,10,20,90,100]);assert.equal(workflowProgress({status:'Đang sản xuất',progress:50}),50);assert.equal(workflowProgress({status:'Đang sản xuất',progress:100}),80);
console.log('PASS: category-window capacity arithmetic, working days, preparation, batch rounding, other commitments; workflow increases without inventing manufactured quantity.');
