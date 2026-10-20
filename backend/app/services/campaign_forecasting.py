"""Full campaign feature contract, validated training CSV, and constrained production planning."""
import csv
import io
import json
import math
import uuid
from datetime import date,timedelta
from pathlib import Path
from typing import Literal
from pydantic import BaseModel,Field,model_validator
from app.services import training_jobs as jobs

NUMERIC=['durationDays','daysRemaining','elapsedDays','moq','target','price','views','clicks','favorites','addToCart','currentOrders','ordersPerDay','growthRate','cancellationRate']
CATEGORICAL=['category','productType']
FEATURES=NUMERIC+CATEGORICAL
CSV_FIELDS=['campaignId','snapshotDate','startDate','endDate','moq','target','category','price','productType','views','clicks','favorites','addToCart','currentOrders','ordersPerDay','growthRate','cancellationRate','finalQuantity']

def normalize_category(value):
    return {'collectible':'Sưu tầm','merchandise':'Đời sống'}.get(str(value).strip().casefold(),str(value).strip())

class Behavior(BaseModel):
    views:int=Field(default=0,ge=0,le=1_000_000_000)
    clicks:int=Field(default=0,ge=0,le=1_000_000_000)
    favorites:int=Field(default=0,ge=0,le=1_000_000_000)
    addToCart:int=Field(default=0,ge=0,le=1_000_000_000)
    source:Literal['observed','manual','demo']='manual'

class ProductionPolicy(BaseModel):
    batchSize:int=Field(default=10,ge=1,le=100000)
    capacity:int=Field(default=100000,ge=1,le=100_000_000)
    safetyBuffer:float=Field(default=.05,ge=0,le=.3,allow_inf_nan=False)
    minimumProbability:float=Field(default=.7,ge=.5,le=.99,allow_inf_nan=False)

class CampaignRow(BaseModel):
    campaignId:str=Field(min_length=1,max_length=100)
    snapshotDate:date
    startDate:date
    endDate:date
    moq:int=Field(gt=0,le=100_000_000)
    target:int=Field(gt=0,le=100_000_000)
    category:str=Field(min_length=1,max_length=100)
    price:float=Field(gt=0,le=1_000_000_000,allow_inf_nan=False)
    productType:str=Field(min_length=1,max_length=100)
    views:int=Field(ge=0,le=1_000_000_000)
    clicks:int=Field(ge=0,le=1_000_000_000)
    favorites:int=Field(ge=0,le=1_000_000_000)
    addToCart:int=Field(ge=0,le=1_000_000_000)
    currentOrders:int=Field(ge=0,le=100_000_000)
    ordersPerDay:float=Field(ge=0,le=100_000_000,allow_inf_nan=False)
    growthRate:float=Field(ge=-1,le=1000,allow_inf_nan=False)
    cancellationRate:float=Field(ge=0,le=1,allow_inf_nan=False)
    finalQuantity:int=Field(ge=0,le=100_000_000)

    @model_validator(mode='after')
    def chronology(self):
        self.campaignId=self.campaignId.strip();self.category=self.category.strip();self.productType=self.productType.strip()
        if not self.campaignId or not self.category or not self.productType:raise ValueError('Mã chiến dịch/danh mục/loại sản phẩm không được để trống.')
        if not self.startDate<=self.snapshotDate<self.endDate:raise ValueError('snapshotDate phải nằm trong chiến dịch.')
        if (self.endDate-self.startDate).days>730:raise ValueError('Chiến dịch không quá 730 ngày.')
        if self.endDate>=date.today():raise ValueError('Chỉ nhập chiến dịch đã kết thúc trước hôm nay.')
        return self

    def record(self):
        row=self.model_dump(mode='json')
        row['category']=normalize_category(row['category'])
        row.update(durationDays=(self.endDate-self.startDate).days,daysRemaining=(self.endDate-self.snapshotDate).days,
                   elapsedDays=(self.snapshotDate-self.startDate).days+1,success=int(self.finalQuantity>=self.moq))
        return row


def dataset_dir():
    path=jobs.directory()/'datasets';path.mkdir(exist_ok=True)
    return path


def ingest_csv(content,name,provenance):
    if len(content.encode('utf-8'))>8_000_000:raise ValueError('CSV tối đa 8 MB UTF-8.')
    reader=csv.DictReader(io.StringIO(content.lstrip('\ufeff')))
    if set(reader.fieldnames or [])!=set(CSV_FIELDS):raise ValueError('CSV cần đúng các cột: '+','.join(CSV_FIELDS))
    rows=[];seen=set();outcomes={}
    for index,raw in enumerate(reader,start=2):
        if index>100002:raise ValueError('Tối đa 100.000 snapshot mỗi file.')
        try: item=CampaignRow.model_validate(raw)
        except Exception as cause:raise ValueError(f'Dòng {index}: {cause}') from cause
        key=(item.campaignId,item.snapshotDate)
        if key in seen:raise ValueError(f'Dòng {index}: trùng snapshot chiến dịch/ngày.')
        seen.add(key)
        outcome=(item.startDate,item.endDate,item.finalQuantity,item.moq,item.target)
        if item.campaignId in outcomes and outcomes[item.campaignId]!=outcome:raise ValueError(f'Dòng {index}: kết quả/lịch chiến dịch không nhất quán.')
        outcomes[item.campaignId]=outcome;rows.append(item.record())
    if len(outcomes)<100:raise ValueError('Cần ít nhất 100 chiến dịch đã kết thúc để chia train/validation/calibration/test.')
    labels={row['success'] for row in rows}
    if labels!={0,1}:raise ValueError('Cần cả chiến dịch đạt và không đạt MOQ.')
    dataset_id=uuid.uuid4().hex
    folder=dataset_dir()/dataset_id;folder.mkdir()
    output=io.StringIO();writer=csv.DictWriter(output,fieldnames=rows[0].keys());writer.writeheader();writer.writerows(rows)
    (folder/'samples.csv').write_text(output.getvalue(),encoding='utf-8')
    metadata={'id':dataset_id,'name':name,'provenance':provenance,'rows':len(rows),'campaigns':len(outcomes),'synthetic':False,
              'sourceStatement':'Do quản trị viên cung cấp; chưa xác minh độc lập nguồn dữ liệu.'}
    (folder/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False),encoding='utf-8')
    return metadata


def datasets():
    return [json.loads(path.read_text(encoding='utf-8')) for path in sorted(dataset_dir().glob('*/metadata.json'),key=lambda p:p.stat().st_mtime,reverse=True)]


def dataset(dataset_id):
    if len(dataset_id)!=32 or any(c not in '0123456789abcdef' for c in dataset_id):raise ValueError('Dataset không hợp lệ.')
    folder=dataset_dir()/dataset_id
    if not (folder/'metadata.json').is_file():raise ValueError('Không tìm thấy dataset đã nhập.')
    return folder


def snapshot_features(payload):
    asof=date.fromisoformat(str(payload['currentDate']));start=date.fromisoformat(str(payload['startDate']));end=date.fromisoformat(str(payload['endDate']))
    daily={str(row['date']):row['quantity'] for row in payload['dailyOrderQuantities']}
    def total(first,last):return sum(daily.get((asof-timedelta(days=i)).isoformat(),0) for i in range(first,last))
    recent=total(0,7);previous=total(7,14)
    age=(asof-start).days+1
    behavior=payload.get('behavior',{})
    cancelled=payload.get('cancelledQuantity',0)
    gross=payload['currentOrders']+cancelled
    return {'durationDays':(end-start).days,'daysRemaining':(end-asof).days,'elapsedDays':age,
        'moq':payload['moq'],'target':payload['target'],'category':normalize_category(payload.get('category','Chưa phân loại')),
        'price':payload['price'],'productType':payload.get('productType','Khác'),
        **{key:behavior.get(key,0) for key in ['views','clicks','favorites','addToCart']},
        'currentOrders':payload['currentOrders'],'ordersPerDay':recent/min(7,age),
        'growthRate':max(-1,min(1000,(recent-previous)/max(1,previous))) if age>=14 else 0,
        'cancellationRate':cancelled/max(1,gross)}


def production_plan(current,moq,lower,upper,probability,policy):
    policy=ProductionPolicy.model_validate(policy).model_dump()
    batch=policy['batchSize'];limit=policy['capacity']//batch*batch
    def rounded(value):return int(math.ceil(value/batch)*batch)
    floor=rounded(max(current,moq,lower))
    ceiling=rounded(max(floor,upper*(1+policy['safetyBuffer'])))
    feasible=limit>=floor
    low=floor if feasible else None
    high=min(ceiling,limit) if feasible else None
    return {'lower':low,'upper':high,'feasible':feasible,'capacity':policy['capacity'],'batchSize':batch,
            'safetyBuffer':policy['safetyBuffer'],'capacityLimited':ceiling>limit,
            'status':'Cần tăng năng lực sản xuất' if not feasible else 'Lập kế hoạch, chưa phát lệnh sản xuất' if probability>=policy['minimumProbability'] else 'Chưa nên chốt sản xuất; xác suất dưới ngưỡng',
            'minimumProbability':policy['minimumProbability'],
            'basis':'Khoảng dự báo cuối kỳ + cam kết hiện tại + MOQ; làm tròn theo lô, giới hạn năng lực. Đây là quy tắc lập kế hoạch, không phải tối ưu chi phí đã chứng minh.'}
