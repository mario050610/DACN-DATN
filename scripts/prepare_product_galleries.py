import json,hashlib,urllib.request,urllib.parse,io
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'database/seeds/product_image_manifest.json').read_text(encoding='utf-8'))
feeds={}
for file in (ROOT/'tmp').glob('source-*.json'):
 try:
  for p in json.loads(file.read_text(encoding='utf-8')).get('products',[]):
   if p.get('handle'):feeds[p['handle']]=p
 except Exception:pass

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':urllib.parse.urlsplit(url).scheme+'://'+urllib.parse.urlsplit(url).netloc+'/'})
 return urllib.request.urlopen(req,timeout=20).read()
def process(e):
 if len(e.get('images',[]))>1:return e
 images=[e['image']];hashes={e['sha256']};urls=[]
 handle=e['sourcePage'].split('/products/')[-1].split('?')[0]
 p=feeds.get(handle)
 if len(e.get('sourceImages',[]))>1:urls=e['sourceImages']
 elif p:urls=[i['src'] if isinstance(i,dict) else i for i in p.get('images',[])]
 elif '/products/' in e['sourcePage'] and 'nshop' not in e['sourcePage']:
  try:
   p=json.loads(fetch(e['sourcePage']+'.json')).get('product',{});urls=[i['src'] for i in p.get('images',[])]
  except Exception:pass
 elif 'nshop' in e['sourcePage']:
  try:
   from bs4 import BeautifulSoup
   soup=BeautifulSoup(fetch(e['sourcePage']),'html.parser')
   urls=[x.get('data-image') or x.get('data-zoom-image') or x.get('data-src') or x.get('src') for x in soup.select('#sliderproduct img, .product-gallery img, .product-image-detail img, .product-thumb img, .product-image-feature')]
  except Exception:pass
 sources=[]
 for url in dict.fromkeys(urls):
  if len(images)>=5:break
  if not url:continue
  url='https:'+url if url.startswith('//') else url
  parts=urllib.parse.urlsplit(url);q=dict(urllib.parse.parse_qsl(parts.query));q['width']='900';url=urllib.parse.urlunsplit((parts.scheme,parts.netloc,parts.path,urllib.parse.urlencode(q),''))
  # Skip the original photo even when Shopify resized URL parameters differ.
  if urllib.parse.urlsplit(e['source']).path==parts.path:continue
  key=hashlib.sha256(url.encode()).hexdigest()[:20];cached=list((ROOT/'frontend/public/products').glob('gallery-'+key+'.*'))
  try:
   raw=cached[0].read_bytes() if cached else fetch(url);photo=Image.open(io.BytesIO(raw));fmt=photo.format;photo.verify()
   sha=hashlib.sha256(raw).hexdigest()
   if sha in hashes:continue
   suffix={'JPEG':'jpg','PNG':'png','WEBP':'webp','GIF':'gif'}[fmt];name='gallery-'+key+'.'+suffix
   (ROOT/'frontend/public/products'/name).write_bytes(raw);images.append('/products/'+name);hashes.add(sha);sources.append({'source':url,'sha256':sha})
  except Exception:continue
 return {**e,'images':images,'gallerySources':sources}
with ThreadPoolExecutor(max_workers=12) as pool:result=list(pool.map(process,manifest))
(ROOT/'database/seeds/product_image_manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
catalogue=[{k:e[k] for k in ['name','category','franchise','price','description','image','images']} for e in result]
(ROOT/'frontend/src/data/catalogue.json').write_text(json.dumps(catalogue,ensure_ascii=False,indent=2),encoding='utf-8')
print('Gallery result:',len(result),'products;',sum(len(e['images']) for e in result),'photos;',sum(len(e['images'])>1 for e in result),'multi-photo products',flush=True)
