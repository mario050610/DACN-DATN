// Export the actual frontend fixture without mounting React or reading localStorage.
// Run from repo root: node scripts/export_sample_data.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'frontend/node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'frontend/src/DemoStore.tsx'), 'utf8');
const fixture = source.slice(0, source.indexOf('type StoreValue = {')).replace(/^import .*;\r?\n/gm, '');
const js = ts.transpileModule(fixture + '\nexport { initialState };', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const helperJs = ts.transpileModule(fs.readFileSync(path.join(root,'frontend/src/demoSalesSimulation.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const helper = {}; new Function('exports',helperJs)(helper);
const exported = {};
new Function('exports', 'catalogue', 'seedDailyHistory', js)(exported, JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/data/catalogue.json'), 'utf8')),helper.seedDailyHistory);
const data = exported.initialState;
for (const campaign of data.campaigns) {
  const product = data.products.find(p => p.id === campaign.productId);
  if (!product || product.sellerId !== campaign.sellerId) throw Error('Campaign ownership mismatch');
  const orders = data.orders.filter(o => o.campaignId === campaign.id);
  if (orders.reduce((n, o) => n + o.quantity, 0) !== campaign.currentOrders) throw Error('Order total mismatch');
  for (const order of orders) {
    if (order.total !== order.quantity * order.unitPrice) throw Error('Amount mismatch');
    if (!data.payments.some(p => p.orderId === order.id && p.amount === order.total && p.status === order.paymentStatus)) throw Error('Payment mismatch');
    if (order.createdAt.slice(0,10) < campaign.startDate || order.createdAt.slice(0,10) > campaign.endDate) throw Error('Order outside campaign');
  }
}
for (const request of data.productionRequests) {
  const campaign = data.campaigns.find(c => c.id === request.campaignId);
  if (!campaign || campaign.status !== 'Thành công' || campaign.currentOrders !== request.quantity) throw Error('Production mismatch');
}
const active = data.campaigns.filter(c => c.status === data.campaigns[0].status);
const activeProducts = active.map(c => data.products.find(p => p.id === c.productId));
if (new Set(activeProducts.map(p => p.name.toLowerCase())).size !== 300 || new Set(activeProducts.map(p => p.image)).size !== 300) throw Error('Active product names and images must be unique');
const expectedGroups = ['Thời trang', 'Merchandise', 'Collectible', 'Công nghệ / Phụ kiện điện tử', 'Nước hoa', 'Trang trí nhà cửa'];
if (activeProducts.some(p => !expectedGroups.includes(p.category)) || new Set(activeProducts.map(p => p.category)).size !== 6) throw Error('Expected exactly six product groups');
const counts = expectedGroups.map(group => activeProducts.filter(p => p.category === group).length);
if (Math.min(...counts) < 40 || Math.max(...counts) - Math.min(...counts) > 20 || counts.reduce((a,b) => a+b,0) !== 300) throw Error('The six groups must stay balanced within 20 products');
if (!activeProducts.some(p => p.franchise === 'Sonic') || !activeProducts.some(p => p.franchise === 'Super Mario')) throw Error('Sonic and Mario must remain in catalogue');
const topics = ['Sonic', 'Super Mario', 'Liên Quân Mobile', 'Doraemon', 'Thám tử Conan', 'Anime điện ảnh'];
if (topics.some(topic => !activeProducts.some(p => p.franchise === topic))) throw Error('A requested topic is missing');
const personal = data.orders.filter(o => o.customerId === 'customer-demo');
if (personal.length !== 5 || new Set(personal.map(o => o.productId)).size !== 5) throw Error('Personal samples must be five distinct products');
for (const topic of topics.slice(2)) if (activeProducts.filter(p => p.franchise === topic).length !== 20) throw Error(`Expected 20 products for ${topic}`);
if (data.campaigns.filter(c => c.status === data.campaigns[0].status).length !== 300) throw Error('Expected 300 active campaigns');
for (const order of data.orders) if (!data.users.some(u => u.id === order.customerId && u.role === 'customer')) throw Error('Customer reference missing');
const output = path.join(root, 'database/seeds/sample_data.json');
fs.writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
const shoppingCatalogue = path.join(root, 'backend/app/data/shopping_catalogue.json');
fs.mkdirSync(path.dirname(shoppingCatalogue), {recursive:true});
fs.writeFileSync(shoppingCatalogue, JSON.stringify({products:data.products,campaigns:data.campaigns}, null, 2) + '\n');
console.log(JSON.stringify({ users: data.users.length, products: data.products.length, campaigns: data.campaigns.length, orders: data.orders.length, payments: data.payments.length, productionRequests: data.productionRequests.length }));
