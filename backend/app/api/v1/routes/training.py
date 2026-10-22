"""Admin-only local training launcher. No shell commands or paths from client input."""
import re
import sqlite3
import subprocess
from datetime import date, timedelta
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, model_validator
from .auth import current_user, database, origin_guard
from app.services import training_jobs as jobs
from app.services import campaign_forecasting as full

router=APIRouter(prefix='/admin/ai-training',tags=['Admin AI training'])
ROOT=Path(__file__).resolve().parents[5]


def admin(request:Request):
    with database() as db:
        user=current_user(db,request)
        if user['role']!='admin': raise HTTPException(403,'Chỉ quản trị viên được huấn luyện AI.')
        return user['id']


class DailyQuantity(BaseModel):
    date: date
    quantity: int=Field(ge=0,le=10_000_000)


class TrainingRequest(BaseModel):
    campaignId: str=Field(min_length=1,max_length=100)
    campaignName: str=Field(min_length=1,max_length=300)
    productId: int=Field(gt=0)
    productName: str=Field(min_length=1,max_length=300)
    status: Literal['Đang hoạt động']
    startDate: date
    endDate: date
    currentDate: date
    currentOrders: int=Field(ge=0,le=100_000_000)
    moq: int=Field(gt=0,le=100_000_000)
    target: int=Field(gt=0,le=100_000_000)
    price: float=Field(gt=0,le=1_000_000_000,allow_inf_nan=False)
    dailyOrderQuantities: list[DailyQuantity]=Field(min_length=1,max_length=28)
    historyConfirmed: Literal[True]
    rebuildData: bool=False
    mode: Literal['retail','campaign_demo','campaign_history']='retail'
    datasetId: str | None=Field(default=None,max_length=32)
    category: str=Field(default='Chưa phân loại',min_length=1,max_length=100)
    productType: str=Field(default='Khác',min_length=1,max_length=100)
    cancelledQuantity: int=Field(default=0,ge=0,le=100_000_000)
    behavior: full.Behavior=Field(default_factory=full.Behavior)
    productionPolicy: full.ProductionPolicy=Field(default_factory=full.ProductionPolicy)

    @model_validator(mode='after')
    def validate_history(self):
        if not self.startDate<=self.currentDate<self.endDate:
            raise ValueError('Chọn chiến dịch đang chạy và chưa đến ngày kết thúc.')
        if (self.endDate-self.startDate).days>730: raise ValueError('Thời hạn chiến dịch quá dài.')
        first=max(self.startDate,self.currentDate-timedelta(days=27))
        expected={first+timedelta(days=i) for i in range((self.currentDate-first).days+1)}
        actual={row.date for row in self.dailyOrderQuantities}
        if actual!=expected or len(actual)!=len(self.dailyOrderQuantities):
            raise ValueError('Nhập từng ngày từ lúc bắt đầu đến hôm nay; nếu đã chạy quá 28 ngày chỉ cần 28 ngày gần nhất. Không trùng ngày hoặc có ngày tương lai.')
        if first==self.startDate and sum(row.quantity for row in self.dailyOrderQuantities)!=self.currentOrders:
            raise ValueError('Lịch sử từ đầu chiến dịch phải khớp tổng số lượng hiện tại.')
        if sum(row.quantity for row in self.dailyOrderQuantities)>self.currentOrders:
            raise ValueError('Tổng số lượng lịch sử không được vượt số lượng hiện tại.')
        return self


def valid_job(job_id):
    if not re.fullmatch(r'[a-f0-9]{32}',job_id): raise HTTPException(404,'Không tìm thấy phiên huấn luyện.')
    item=jobs.get(job_id)
    if item is None: raise HTTPException(404,'Không tìm thấy phiên huấn luyện.')
    return item


def launch(job_id):
    python=ROOT/'ai-service/.venv/Scripts/python.exe'
    if not python.exists(): python=ROOT/'ai-service/.venv/bin/python'
    if not python.exists(): raise RuntimeError('Chưa có môi trường AI. Chạy TRAIN_AI.bat một lần để cài thư viện.')
    log_path=jobs.directory()/job_id/'worker.log'
    with log_path.open('ab') as log:
        process=subprocess.Popen([str(python),'-u','-X','utf8',str(ROOT/'ai-service/training/ui_worker.py'),job_id],
            cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    return process.pid


@router.get('',dependencies=[Depends(admin)])
def list_jobs(response:Response):
    response.headers['Cache-Control']='no-store'
    source=ROOT/'ai-service/data/raw/uci/online_retail_II.xlsx'
    return {'jobs':jobs.recent(),'datasetAvailable':source.is_file(),'dataset':'UCI Online Retail II','datasets':full.datasets(),'modes':['campaign_demo','campaign_history','retail']}


@router.post('',status_code=202,dependencies=[Depends(admin),Depends(origin_guard)])
def start_training(payload:TrainingRequest):
    return create_training(payload)


def create_training(payload:TrainingRequest, owner_id=None):
    if payload.mode=='retail' and not (ROOT/'ai-service/data/raw/uci/online_retail_II.xlsx').is_file():
        raise HTTPException(409,'Thiếu dữ liệu UCI trong ai-service/data/raw/uci/.')
    if payload.mode=='campaign_history':
        try: full.dataset(payload.datasetId or '')
        except ValueError as cause: raise HTTPException(409,str(cause))
    snapshot=payload.model_dump(mode='json')
    if owner_id is not None: snapshot['ownerId']=owner_id
    snapshot['computedFeatures']=full.snapshot_features(snapshot)
    try: job_id=jobs.create(snapshot)
    except sqlite3.IntegrityError:
        raise HTTPException(409,'Đã có phiên huấn luyện đang chạy. Hãy chờ phiên đó hoàn tất.')
    try:
        pid=launch(job_id)
        jobs.update(job_id,pid=pid)
    except Exception as cause:
        jobs.update(job_id,status='failed',stage='Không khởi động được',error=str(cause))
        raise HTTPException(503,'Không khởi động được worker AI. Kiểm tra môi trường AI và nhật ký phiên huấn luyện.')
    return valid_job(job_id)



class DatasetUpload(BaseModel):
    name: str=Field(min_length=1,max_length=100)
    provenance: str=Field(min_length=10,max_length=1000)
    content: str=Field(min_length=100,max_length=8_000_000)
    confirmedHistorical: Literal[True]

@router.post('/datasets',dependencies=[Depends(admin),Depends(origin_guard)],status_code=201)
def upload_dataset(payload:DatasetUpload):
    try:return full.ingest_csv(payload.content,payload.name,payload.provenance)
    except ValueError as cause:raise HTTPException(422,str(cause))

@router.get('/dataset-template',dependencies=[Depends(admin)])
def dataset_template():
    content=','.join(full.CSV_FIELDS)+'\n'
    return Response(content,media_type='text/csv',headers={'Content-Disposition':'attachment; filename="preora-campaign-history-template.csv"','Cache-Control':'no-store'})


@router.get('/{job_id}',dependencies=[Depends(admin)])
def job_status(job_id:str,response:Response):
    response.headers['Cache-Control']='no-store'
    item=valid_job(job_id)
    path=jobs.directory()/job_id/'worker.log'
    if path.is_file():
        with path.open('rb') as stream:
            stream.seek(max(0,path.stat().st_size-12000))
            item['log']=stream.read().decode('utf-8',errors='replace')
    else: item['log']=''
    return item
