"""Append real source products to 300; keep the original 200 positions/IDs stable."""
import hashlib,io,json,re,time,urllib.parse,urllib.request
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];TMP=ROOT/'tmp/catalogue-expansion';TMP.mkdir(exist_ok=True)
OUT=ROOT/'frontend/public/products'
FASHION='Thời trang';MERCH='Merchandise';COLLECT='Collectible';TECH='Công nghệ / Phụ kiện điện tử';PERFUME='Nước hoa';DECOR='Trang trí nhà cửa'
TOPICS=['Liên Quân Mobile','Doraemon','Thám tử Conan','Anime điện ảnh']

def fetch(url):
    # Quote only Unicode path/query characters, keeping existing URL escapes intact.
    url=urllib.parse.quote(url,safe=":/?&=%+#@,;!~*'()-")
    cache=TMP/(hashlib.sha256(url.encode()).hexdigest()+'.bin')
    if cache.exists():return cache.read_bytes()
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':urllib.parse.urlsplit(url).scheme+'://'+urllib.parse.urlsplit(url).netloc+'/'})
            raw=urllib.request.urlopen(req,timeout=20).read();cache.write_bytes(raw);return raw
        except Exception:
            if attempt==2:raise
            time.sleep(.3)

def entry(name,topic,category,image,page,price=299000,images=None):
    return {'name':re.sub(r'\s+',' ',name).strip(),'franchise':topic,'category':category,'price':price,'description':f'{name}. Mẫu danh mục PREORA; giá, chiến dịch và thời gian đặt trước là mô phỏng.','source':image,'sourcePage':page,'sourceId':page,'sourceImages':images or [image]}

def download(e):
    key=hashlib.sha256(e['source'].encode()).hexdigest()[:20]
    cached=list(OUT.glob('merch-'+key+'.*'));raw=cached[0].read_bytes() if cached else fetch(e['source'])
    photo=Image.open(io.BytesIO(raw));fmt=photo.format;photo.verify();suffix={'JPEG':'jpg','PNG':'png','WEBP':'webp','GIF':'gif'}[fmt]
    name='merch-'+key+'.'+suffix;(OUT/name).write_bytes(raw)
    return {**e,'image':'/products/'+name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}

def nshop(topic,keyword,files):
    candidates=[];seen=set()
    for file in files:
        page=1 if file in ['expand-dora.html','expand-conan.html'] else int(re.search(r'(\d+)\.html$',file).group(1))
        url=f'https://www.nshop.com.vn/collections/all/doraemon?page={page}' if topic=='Doraemon' else f'https://www.nshop.com.vn/search?q=conan&type=product&page={page}'
        cached=ROOT/'tmp'/file
        soup=BeautifulSoup((cached.read_bytes() if cached.exists() else fetch(url)).decode('utf-8'),'html.parser')
        for a in soup.select('a[href]'):
            img=a.find('img');href=a['href'];name=a.get('title') or (img.get('alt') if img else '') or ''
            if not img or not href.startswith('/products/') or href in seen or not re.search(keyword,name,re.I):continue
            source=img.get('data-src') or img.get('data-original') or img.get('src','')
            if not source or source.startswith('data:') or 'second-hand' in href:continue
            seen.add(href)
            group=FASHION if re.search(r'bóp|túi vải|túi đeo',name,re.I) else DECOR if re.search(r'gối|đèn ngủ',name,re.I) else TECH if 'điều khiển' in name.lower() else MERCH if re.search(r'bài|card game',name,re.I) else COLLECT
            candidates.append(entry(name,topic,group,urllib.parse.urljoin('https://www.nshop.com.vn',source),'https://www.nshop.com.vn'+href,349000 if group==COLLECT else 199000))
    return candidates

TECKI=[
'p1.398244135.12618116309-ao-thun-lien-quan-mobile-ngo-khong-sieu-viet',
'p1.2847964.2073114348-ao-thun-lien-quan-mobile-mau-trang-cotton-mem-min-arum-vu-khuc-long-ho',
'p1.128047893.15962671165-ao-thun-lien-quan-mobile-aov-support-black-ngan-tay',
'p1.6445049.7832628138-ao-thun-lien-quan-mobile-tuong-telannas-nu-vuong-tinh-linh',
'p1.411705342.12191068771-ao-thun-lien-quan-mobile-nakroth-thu-nguyen-ve-than-flo-tinh-he-doc-dep-cuc-chat',
'p1.144509299.12359181920-ao-sweater-ni-nam-nu-local-brand-clownz-x-lien-quan-nakroth-mau-den-vai-ni-bong-unisex-form-rong',
'p1.253617165.4264916323-ao-khoac-lien-quan-nakroth-aic',
'p1.19213889.2893378633-ao-lien-quan-mobile-nakroth-khieu-chien',
'p1.19213889.12005767706-ao-lien-quan-mobile-nakroth-thu-nguyen-ve-than',
'p1.228202741.20510558282-ao-thun-lien-quan-cuc-chat-flonakrothnatatel-lq06',
'p1.969716703.22678513511-bst-ao-thun-adtstore-x-lien-quan-moblie-game-in-hinh-zata-omen-yan-elsu-doc-dep',
'p1.710358537.17020968213-ao-lien-quan-mobile-bst-ao-game-in-hinh-lq-airi-bich-hai-thanh-nu-nakroth-thu-nguyen-ve-than-doc-dep',
'p1.257366334.3675209091-sale-ao-khoac-lien-quan-nakroth-sieu-viet-cuc-hot',
'p1.244661490.5332846157-mua-ao-lien-quan-superman',
]
def shirt(handle):
    url='https://tecki.vn/'+handle
    try:
        soup=BeautifulSoup(fetch(url).decode('utf-8'),'html.parser');h=next((h for h in soup.find_all('h1') if re.search('liên quân',h.get_text(' ',strip=True),re.I)),None)
        if not h:return None
        title=h.get_text(' ',strip=True)
        photos=list(dict.fromkeys(i.get('data-src') or i.get('src','') for i in soup.select('img') if i.get('alt')==title or i.get('alt')=='slide'))
        photos=[p for p in photos if p.startswith('http') and 'shopee' in p]
        if not photos or not re.search('liên quân',title,re.I):return None
        return entry(title,'Liên Quân Mobile',FASHION,photos[0],url,199000,photos)
    except Exception as e:print('Skip shirt',handle,str(e),flush=True);return None

def anime():
    products={}
    for query in ['Rebellion','Reze Arc','Walpurgisnacht','Rebellion tapestry','Rebellion mug','Rebellion blanket','Rebellion cushion']:
        file=ROOT/'tmp'/('expand-goodsmile-'+query+'.json')
        url='https://www.goodsmileus.com/search/suggest.json?'+urllib.parse.urlencode({'q':query,'resources[type]':'product','resources[limit]':10})
        data=json.loads(file.read_text(encoding='utf-8')) if file.exists() else json.loads(fetch(url))
        for p in data.get('resources',{}).get('results',{}).get('products',[]):
            name=p['title']
            if not re.search(r'the movie|reze arc|walpurgisnacht',name,re.I) or re.search('bunny|rabbit ears|swimsuit',name,re.I):continue
            page=urllib.parse.urljoin('https://www.goodsmileus.com',urllib.parse.urlsplit(p['url']).path)
            typ=p.get('type','')
            group=FASHION if re.search('hoodie|tote bag',typ,re.I) else TECH if 'smartphone' in name.lower() else MERCH if re.search('umbrella|pinback button case',name,re.I) else COLLECT
            products[page]=entry(name,'Anime điện ảnh',group,p['image'],page,max(50000,round(float(p.get('price') or 35)*25000/10000)*10000))
    return list(products.values())

def fill_candidates():
    output=[]
    for key,topic,group,base in [('8bitdo','Gaming gear',TECH,'https://shop.8bitdo.com'),('oakcha','Lifestyle',PERFUME,'https://www.oakcha.com'),('umbra','Lifestyle',DECOR,'https://www.umbra.com')]:
        file=ROOT/f'tmp/source-{key}.json'
        data=json.loads(file.read_text(encoding='utf-8')) if file.exists() else json.loads(fetch(base+'/products.json?limit=250'))
        for p in data['products']:
            title=p['title'];kind=p.get('product_type','');images=p.get('images',[])
            if not images:continue
            if key=='oakcha' and (kind!='Perfume & Cologne' or re.search('box set|bundle|collection|discovery|sample|gift|body|hair|diffuser|candle|soap|deodorant|mist|oil',title,re.I)):continue
            if key=='umbra' and not re.search('frame|vase|planter|wall decor|wall art|clock|lamp|decorative|sculpture|mirror|candle holder',title,re.I):continue
            if key=='8bitdo' and not re.search('keyboard|keycap|mouse|headphone|earbud|controller|gamepad|charging|receiver|usb|phone case|numpad|arcade|adapter',title+' '+kind,re.I):continue
            price=float(next((v['price'] for v in p.get('variants',[]) if float(v.get('price') or 0)>0),25))
            photo=images[0]['src'];parts=urllib.parse.urlsplit(photo);query=dict(urllib.parse.parse_qsl(parts.query));query['width']='640';photo=urllib.parse.urlunsplit((parts.scheme,parts.netloc,parts.path,urllib.parse.urlencode(query),''))
            output.append(entry(title,topic,group,photo,base+'/products/'+p['handle'],max(50000,round(price*25000/10000)*10000),[i['src'] for i in images]))
    return output

def main():
    path=ROOT/'database/seeds/product_image_manifest.json';original=json.loads(path.read_text(encoding='utf-8'))
    if len(original)==300:print('Already expanded; keeping all IDs.');return
    assert len(original)==200
    result=list(original);names={p['name'].casefold() for p in result};hashes={p['sha256'] for p in result};pages={p['sourcePage'] for p in result}
    def append(candidates,topic,target):
        # Prefer non-collectible merchandise before topping up with figures.
        candidates=sorted(candidates,key=lambda e:e['category']==COLLECT)
        for e in candidates:
            if sum(p['franchise']==topic for p in result)>=target:break
            if e['sourcePage'] in pages or e['name'].casefold() in names:continue
            try:p=download(e)
            except Exception as ex:print('Skip image',e['name'],str(ex),flush=True);continue
            if p['sha256'] in hashes:continue
            result.append(p);names.add(p['name'].casefold());hashes.add(p['sha256']);pages.add(p['sourcePage'])
        count=sum(p['franchise']==topic for p in result);assert count==target,(topic,count,target)
        print('Ready',topic,count,flush=True)
    with ThreadPoolExecutor(max_workers=8) as pool:lq=[p for p in pool.map(shirt,TECKI) if p]
    # Additional genuinely different keychain designs; not alternate detail shots.
    for suffix,label in [('7','bộ nam tướng tóc bạc'),('6','bộ nam tướng chiến đấu'),('5','bộ nữ tướng sắc hồng'),('4','bộ tướng phiên bản mica')]:
        lq.append(entry('Bộ móc khóa Liên Quân — '+label,'Liên Quân Mobile',COLLECT,'https://inan2h.vn/wp-content/uploads/2025/10/moc-khoa-lien-quan-'+suffix+'.jpg','https://inan2h.vn/san-pham/moc-khoa-lien-quan/#design-'+suffix,59000))
    # Each design uses one photograph and a stable design-specific source anchor.
    for e in lq:
        if '#design-' in e['sourcePage']:e['sourcePage']=e['sourcePage'].replace('#design-','?design=')
    # Same source-page family can legitimately contain different printed designs.
    pages.discard('https://inan2h.vn/san-pham/moc-khoa-lien-quan/')
    append(lq,'Liên Quân Mobile',20)
    append(nshop('Doraemon',r'doraemon|dorami',['expand-dora.html','expand-dora2.html']),'Doraemon',20)
    append(nshop('Thám tử Conan',r'conan',['expand-conan.html','expand-conan2.html','expand-conan3.html']),'Thám tử Conan',20)
    append(anime(),'Anime điện ảnh',20)
    candidates=fill_candidates()
    while len(result)<300:
        counts=Counter(p['category'] for p in result)
        available=sorted({p['category'] for p in candidates},key=lambda k:counts[k])
        added=False
        for category in available:
            match=next((e for e in candidates if e['category']==category and e['sourcePage'] not in pages and e['name'].casefold() not in names),None)
            if not match:continue
            candidates.remove(match)
            try:p=download(match)
            except Exception:continue
            if p['sha256'] in hashes:continue
            result.append(p);names.add(p['name'].casefold());hashes.add(p['sha256']);pages.add(p['sourcePage']);added=True;break
        if not added and not candidates:raise RuntimeError('Not enough unique filler products')
    assert result[:200]==original
    assert len(result)==len(names)==len(hashes)==300
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    fields=['name','category','franchise','price','description','image','images']
    for p in result:p.setdefault('images',[p['image']])
    (ROOT/'frontend/src/data/catalogue.json').write_text(json.dumps([{k:p[k] for k in fields} for p in result],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('EXPANDED',dict(Counter(p['franchise'] for p in result)),dict(Counter(p['category'] for p in result)),flush=True)
if __name__=='__main__':main()
