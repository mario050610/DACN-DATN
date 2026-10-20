"""Import additional fandom products without changing the balanced category totals."""
import json,re,urllib.parse
from collections import Counter,defaultdict,deque
from bs4 import BeautifulSoup
COLLECT='Collectible'
NEW_TOPICS=['Liên Quân Mobile','Doraemon','Thám tử Conan','Anime điện ảnh']
TOPIC_ORDER=['Sonic','Super Mario',*NEW_TOPICS]

def add_topics(base,fetch,download):
    candidates=[]
    def make(name,topic,source,page,source_id,price=299000):
        return {'name':name.strip(),'franchise':topic,'category':COLLECT,'price':price,'description':f'{name.strip()}. Bộ sưu tập {topic}; giá và chiến dịch đặt trước trong PREORA là dữ liệu mẫu.','source':source,'sourcePage':page,'sourceId':source_id}
    pages=[('Doraemon','https://www.nshop.com.vn/collections/all/doraemon',r'doraemon|dorami'),('Thám tử Conan','https://www.nshop.com.vn/search?q=conan&type=product',r'conan')]
    for topic,url,pattern in pages:
        soup=BeautifulSoup(fetch(url).decode('utf-8','replace'),'html.parser')
        seen=set();selected=0
        for anchor in soup.select('a[href]'):
            image=anchor.find('img');href=anchor.get('href','')
            if not image or not href.startswith('/products/') or href in seen:continue
            title=anchor.get('title') or image.get('alt') or ''
            if not re.search(pattern,title,re.I):continue
            if re.search(r'thẻ bài|card game|bài detective|pin sạc|bóp nhỏ',title,re.I):continue
            src=image.get('data-src') or image.get('data-original') or image.get('src','')
            if not src or src.startswith('data:'):continue
            src=urllib.parse.urljoin(url,src)
            seen.add(href)
            candidates.append(make(title,topic,src,urllib.parse.urljoin(url,href),'nshop:'+href.rsplit('/',1)[-1],349000 if 'bông' in title.lower() else 199000))
            selected+=1
            if selected==5:break
        if selected<5:raise ValueError(f'Not enough verified {topic} products: {selected}')
    lienquan_page='https://inan2h.vn/san-pham/moc-khoa-lien-quan/'
    # These three source photos were visually checked. Descriptive names avoid inventing hero identities.
    for name,path in [
        ('Bộ đôi móc khóa Liên Quân mica — nữ tướng','2025/10/moc-khoa-lien-quan-10.jpg'),
        ('Móc khóa Liên Quân in hai mặt — nam tướng','2025/10/moc-khoa-lien-quan-12.jpg'),
        ('Móc khóa Liên Quân — Joker chibi','2025/10/moc-khoa-lien-quan-9.jpg'),
    ]:candidates.append(make(name,'Liên Quân Mobile','https://inan2h.vn/wp-content/uploads/'+path,lienquan_page,'lienquan:'+path,59000))
    anime=[]
    for query,matcher in [('Reze',r'chainsaw man.*reze arc'),('Doma',r'demon slayer'),('Infinity Castle',r'demon slayer')]:
        url='https://www.goodsmileus.com/search/suggest.json?'+urllib.parse.urlencode({'q':query,'resources[type]':'product','resources[limit]':10})
        data=json.loads(fetch(url))
        for p in data.get('resources',{}).get('results',{}).get('products',[]):
            title=p.get('title','')
            if not re.search(matcher,title,re.I) or re.search(r'bunny|swimsuit',title,re.I):continue
            href=urllib.parse.urlsplit(p['url']).path
            src=p.get('image')
            if not src:continue
            anime.append(make(title,'Anime điện ảnh',src,urllib.parse.urljoin('https://www.goodsmileus.com',href),'goodsmile:'+href.rsplit('/',1)[-1],max(50000,round(float(p.get('price') or 35)*25000/10000)*10000)))
    # A specific movie product avoids relying solely on fuzzy search results.
    url='https://www.goodsmileus.com/products/nendoroid-reze-55455'
    soup=BeautifulSoup(fetch(url).decode('utf-8','replace'),'html.parser')
    title=soup.find('meta',property='og:title');image=soup.find('meta',property='og:image')
    if title and image and 'reze' in title.get('content','').lower():
        anime.append(make(title['content'].split(' – Good Smile')[0],'Anime điện ảnh',urllib.parse.urljoin(url,image['content']),url,'goodsmile:nendoroid-reze-55455',1350000))
    used=set();unique=[]
    for item in anime:
        if item['sourceId'] not in used:unique.append(item);used.add(item['sourceId'])
    if len(unique)<5:raise ValueError(f'Not enough verified anime movie products: {len(unique)}')
    candidates+=unique[:5]
    result=list(base);names={p['name'].casefold() for p in result};hashes={p['sha256'] for p in result}
    # Do not touch perfume/decor or reduce any old main theme below a useful selection.
    imported=[]
    for entry in candidates:
        if entry['sourceId'] in {p.get('sourceId') for p in result}:continue
        item=download(entry)
        if item['sha256'] in hashes or item['name'].casefold() in names:raise ValueError('A new-topic product duplicates an existing photo/name: '+item['name'])
        eligible=[(i,p) for i,p in enumerate(result) if p['category']==item['category'] and p['franchise'] in ['Sonic','Super Mario']]
        counts=Counter(p['franchise'] for _,p in eligible)
        topic=max(counts,key=counts.get)
        index=next(i for i,p in reversed(eligible) if p['franchise']==topic)
        names.discard(result[index]['name'].casefold());hashes.discard(result[index]['sha256'])
        result[index]=item;names.add(item['name'].casefold());hashes.add(item['sha256']);imported.append(item)
    # Mix fandoms and product groups; Sonic and Mario lead each round.
    def mix_categories(items):
        groups=defaultdict(deque)
        for item in items:groups[item['category']].append(item)
        output=[]
        while any(groups.values()):
            for group in ['Collectible','Thời trang','Merchandise','Công nghệ / Phụ kiện điện tử','Trang trí nhà cửa','Nước hoa']:
                if groups[group]:output.append(groups[group].popleft())
        return output
    queues={topic:deque(mix_categories([p for p in result if p['franchise']==topic])) for topic in TOPIC_ORDER}
    ordered=[]
    while any(queues.values()):
        for topic in TOPIC_ORDER:
            if queues[topic]:ordered.append(queues[topic].popleft())
    ordered+=mix_categories([p for p in result if p['franchise'] not in TOPIC_ORDER])
    assert len(ordered)==200
    assert all(any(p['franchise']==topic for p in ordered) for topic in TOPIC_ORDER)
    print('New themes:',dict(Counter(p['franchise'] for p in ordered)),flush=True)
    return ordered
