"""Curated coursework catalogue: Sonic/Mario merchandise, gaming gear, perfume and decor."""
import hashlib,io,json,re,time,urllib.request,urllib.parse
from pathlib import Path
from collections import Counter,defaultdict,deque
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'frontend/public/products';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'frontend/src/data';DATA.mkdir(parents=True,exist_ok=True)
FASHION='Thời trang';MERCH='Merchandise';COLLECT='Collectible';TECH='Công nghệ / Phụ kiện điện tử';PERFUME='Nước hoa';DECOR='Trang trí nhà cửa'
SOURCES={'Sonic':('https://shop.sega.com/collections/sonic/products.json?limit=250','https://shop.sega.com'),'Super Mario':('https://www.toynk.com/collections/super-mario-bros/products.json?limit=250','https://www.toynk.com'),'Gaming':('https://shop.8bitdo.com/products.json?limit=250','https://shop.8bitdo.com'),'Perfume':('https://www.oakcha.com/products.json?limit=250','https://www.oakcha.com'),'Decor':('https://www.umbra.com/products.json?limit=250','https://www.umbra.com')}
def fetch(url):
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':urllib.parse.urlsplit(url).scheme+'://'+urllib.parse.urlsplit(url).netloc+'/'})
   with urllib.request.urlopen(req,timeout=25) as r:return r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(.5)
def category(title,kind):
 text=title.lower()+' '+kind.lower()
 if re.search(r'keyboard|keycap|mouse|headphone|earbud|controller|gamepad|charging|receiver|usb|phone case|numpad|arcade|adapter',text):return TECH
 if re.search(r'lamp|light|ornament|clock|frame|decoration|wall art|poster|tree topper|art print',text):return DECOR
 if re.search(r'plush|figure|statue|keychain|key chain|keyring|key ring|action figure|figurine|collectible|blind box|enamel pin|model kit',text):return COLLECT
 if re.search(r'hoodie|shirt|tee\b|sweat|crewneck|jersey|hat|beanie|cap\b|backpack|tote|socks|apparel|clothing|bag',text):return FASHION
 return MERCH
def candidates(franchise):
 url,base=SOURCES[franchise]
 products=json.loads(fetch(url)).get('products',[])
 result=[]
 for p in products:
  title=p.get('title','').strip()
  if not p.get('images'):continue
  if franchise=='Super Mario' and not re.search(r'mario|luigi|yoshi|bowser|princess peach|rosalina|toad|boo\b|question block|mushroom',title,re.I):continue
  if re.search(r'costume|wig\b|gift card|mystery box|digital|replacement|1 pcs|\(pcba\)',title,re.I):continue
  if franchise=='Perfume' and (p.get('product_type')!='Perfume & Cologne' or re.search(r'box set|bundle|collection|discovery|sample|gift|body|hair|diffuser|candle|soap|deodorant|mist|oil',title,re.I)):continue
  if franchise=='Decor' and not re.search(r'frame|vase|planter|wall decor|wall art|clock|lamp|decorative|sculpture|mirror|candle holder',title,re.I):continue
  kind=PERFUME if franchise=='Perfume' else DECOR if franchise=='Decor' else category(title,p.get('product_type',''))
  if franchise=='Gaming' and kind!=TECH:continue
  if franchise=='Sonic' and p.get('product_type')=='Games':continue
  title=re.sub(r'\s*\(Ships on.*?\)\s*','',title,flags=re.I).strip()
  source=p['images'][0]['src'];parts=urllib.parse.urlsplit(source);query=dict(urllib.parse.parse_qsl(parts.query));query['width']='640';source=urllib.parse.urlunsplit((parts.scheme,parts.netloc,parts.path,urllib.parse.urlencode(query),''))
  price=float(next((v['price'] for v in p.get('variants',[]) if float(v.get('price') or 0)>0),25))
  result.append({'name':title,'category':kind,'franchise':franchise if franchise in ['Sonic','Super Mario'] else 'Gaming gear' if franchise=='Gaming' else 'Lifestyle','price':max(50000,round(price*25000/10000)*10000),'description':f'{title}. Sản phẩm mẫu thuộc nhóm {kind.lower()}; giá VND, chiến dịch và thời gian đặt trước được mô phỏng cho PREORA.','source':source,'sourcePage':base+'/products/'+p['handle'],'sourceId':franchise+':'+str(p['id'])})
 # Mix categories, instead of presenting dozens of adjacent T-shirts.
 groups=defaultdict(deque)
 for entry in result:groups[entry['category']].append(entry)
 mixed=[]
 while any(groups.values()):
  for group in [COLLECT,FASHION,MERCH,TECH,PERFUME,DECOR]:
   if groups[group]:mixed.append(groups[group].popleft())
 return mixed
with ThreadPoolExecutor(max_workers=5) as pool:
 futures={pool.submit(candidates,key):key for key in SOURCES};buckets={futures[f]:f.result() for f in as_completed(futures)}
print('Candidates:',{k:len(v) for k,v in buckets.items()},flush=True)
# Preserve exactly the five perfume and five decor items from the previous catalogue.
original=json.loads(fetch('https://raw.githubusercontent.com/Ovi/DummyJSON/master/database/products.json'))
extras=[]
for p in original:
 if p['category'] not in ['fragrances','home-decoration']:continue
 extras.append({'name':p['title'],'category':PERFUME if p['category']=='fragrances' else DECOR,'franchise':'Lifestyle','price':max(50000,round(p['price']*25000/10000)*10000),'description':f"{p['title']}. Sản phẩm mẫu PREORA, thông tin đặt trước và giá bán là mô phỏng.",'source':p['thumbnail'],'sourcePage':'https://github.com/Ovi/DummyJSON','sourceId':'dummyjson:'+str(p['id'])})
quotas={FASHION:34,MERCH:34,COLLECT:33,TECH:33,PERFUME:33,DECOR:33}
category_candidates={}
for group in quotas:
 themed=[]
 sonic=[entry for entry in buckets['Sonic'] if entry['category']==group]
 mario=[entry for entry in buckets['Super Mario'] if entry['category']==group]
 for index in range(max(len(sonic),len(mario))):
  if index<len(sonic):themed.append(sonic[index])
  if index<len(mario):themed.append(mario[index])
 preserved=[entry for entry in extras if entry['category']==group]
 other=[entry for key in ['Gaming','Perfume','Decor'] for entry in buckets[key] if entry['category']==group]
 category_candidates[group]=preserved+themed+other
print('By group:',{group:len(items) for group,items in category_candidates.items()},flush=True)
# A stable filename derived from the source URL allows reruns to reuse verified photos.
def download(entry):
 key=hashlib.sha256(entry['source'].encode()).hexdigest()[:20]
 cached=list(OUT.glob('merch-'+key+'.*'))
 data=cached[0].read_bytes() if cached else fetch(entry['source'])
 photo=Image.open(io.BytesIO(data));fmt=photo.format;photo.verify()
 suffix={'JPEG':'jpg','PNG':'png','WEBP':'webp','GIF':'gif'}.get(fmt)
 if not suffix:raise ValueError('Unsupported image format '+str(fmt))
 filename='merch-'+key+'.'+suffix
 (OUT/filename).write_bytes(data)
 return {**entry,'image':'/products/'+filename,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
selected={};seen_hashes=set();seen_names=set()
for bucket,quota in quotas.items():
 selected[bucket]=[];pending=category_candidates[bucket][:quota+18]
 with ThreadPoolExecutor(max_workers=8) as pool:
  # Preserve curated order, irrespective of download completion order.
  downloaded=list(pool.map(download,pending))
 for entry in downloaded:
  if entry['sha256'] in seen_hashes or entry['name'].casefold() in seen_names:continue
  selected[bucket].append(entry);seen_hashes.add(entry['sha256']);seen_names.add(entry['name'].casefold())
  if len(selected[bucket])==quota:break
 assert len(selected[bucket])==quota,(bucket,len(selected[bucket]),quota)
 print('Selected',bucket,len(selected[bucket]),flush=True)
# Interleave Sonic and Mario first, then the retained lifestyle/gaming products.
all_selected=[entry for items in selected.values() for entry in items]
def mix_categories(entries):
 groups=defaultdict(deque)
 for entry in entries:groups[entry['category']].append(entry)
 mixed=[]
 while any(groups.values()):
  for group in [COLLECT,FASHION,MERCH,TECH,DECOR,PERFUME]:
   if groups[group]:mixed.append(groups[group].popleft())
 return mixed
sonic=mix_categories([entry for entry in all_selected if entry['franchise']=='Sonic'])
mario=mix_categories([entry for entry in all_selected if entry['franchise']=='Super Mario'])
ordered=[]
for index in range(max(len(sonic),len(mario))):
 if index<len(sonic):ordered.append(sonic[index])
 if index<len(mario):ordered.append(mario[index])
others=defaultdict(deque)
for entry in all_selected:
 if entry['franchise'] not in ['Sonic','Super Mario']:others[entry['category']].append(entry)
while any(others.values()):
 for group in quotas:
  if others[group]:ordered.append(others[group].popleft())
from import_topic_products import add_topics
ordered=add_topics(ordered,fetch,download)
assert len(ordered)==len({x['sha256'] for x in ordered})==len({x['name'].casefold() for x in ordered})==200
fields=['name','category','franchise','price','description','image']
(DATA/'catalogue.json').write_text(json.dumps([{k:p[k] for k in fields} for p in ordered],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'database/seeds/product_image_manifest.json').write_text(json.dumps(ordered,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Verified:',json.dumps({'products':len(ordered),'groups':dict(Counter(p['category'] for p in ordered)),'franchises':dict(Counter(p['franchise'] for p in ordered))},ensure_ascii=False),flush=True)
