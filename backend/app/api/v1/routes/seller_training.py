"""Seller-owned access to the same isolated training worker used by admins."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from .auth import current_user, database, origin_guard
from . import training
from .shopping import CAMPAIGNS, PRODUCTS
from pydantic import BaseModel, Field
from app.services import training_jobs as jobs, campaign_forecasting as full

router=APIRouter(prefix='/seller/ai-training',tags=['Seller AI training'])

def seller(request: Request):
    with database() as db:
        user=current_user(db,request)
        if user['role']!='seller': raise HTTPException(403,'Chức năng dành cho người bán.')
        return user['id']

def initialize_scopes(db):
    db.execute('CREATE TABLE IF NOT EXISTS seller_campaign_scopes(id TEXT PRIMARY KEY,owner TEXT NOT NULL,product_id INTEGER NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS seller_product_scopes(id INTEGER PRIMARY KEY,owner TEXT NOT NULL)')


def owns_campaign(uid, campaign_id, product_id=None):
    campaign=CAMPAIGNS.get(campaign_id)
    if campaign:
        owner=campaign['sellerId']; pid=campaign['productId']
    else:
        with database() as db:
            initialize_scopes(db)
            row=db.execute('SELECT owner,product_id FROM seller_campaign_scopes WHERE id=?',(campaign_id,)).fetchone()
        owner=row['owner'] if row else None;pid=row['product_id'] if row else None
    if owner!=uid:raise HTTPException(403,'Campaign is not owned by this seller or has not been synchronized.')
    if product_id is not None and pid!=product_id:raise HTTPException(422,'Product does not match campaign.')
    return {'sellerId':owner,'productId':pid,'id':campaign_id}


class CampaignScope(BaseModel):
    campaignId: str=Field(min_length=1,max_length=100)
    productId: int=Field(gt=0)


@router.post('/campaigns',dependencies=[Depends(origin_guard)])
def register_campaign(payload:CampaignScope,uid=Depends(seller)):
    if payload.campaignId in CAMPAIGNS:
        owns_campaign(uid,payload.campaignId,payload.productId)
        return {'registered':True}
    product=PRODUCTS.get(payload.productId)
    if product and product['sellerId']!=uid:raise HTTPException(403,'Product belongs to another seller.')
    with database() as db:
        initialize_scopes(db)
        db.execute('INSERT OR IGNORE INTO seller_product_scopes VALUES(?,?)',(payload.productId,uid))
        owner=db.execute('SELECT owner FROM seller_product_scopes WHERE id=?',(payload.productId,)).fetchone()['owner']
        if owner!=uid:raise HTTPException(403,'Product belongs to another seller.')
        db.execute('INSERT OR IGNORE INTO seller_campaign_scopes VALUES(?,?,?)',(payload.campaignId,uid,payload.productId))
        existing=db.execute('SELECT owner,product_id FROM seller_campaign_scopes WHERE id=?',(payload.campaignId,)).fetchone()
        if existing['owner']!=uid or existing['product_id']!=payload.productId:raise HTTPException(409,'Campaign identifier is already registered.')
    return {'registered':True}


def owned_dataset_ids(uid):
    with database() as db:
        db.execute('CREATE TABLE IF NOT EXISTS training_dataset_owners(id TEXT PRIMARY KEY,owner TEXT NOT NULL)')
        return {row['id'] for row in db.execute('SELECT id FROM training_dataset_owners WHERE owner=?',(uid,))}

@router.get('')
def inventory(response:Response,uid=Depends(seller)):
    response.headers['Cache-Control']='no-store'
    ids=owned_dataset_ids(uid)
    return {'jobs':jobs.recent_for_owner(uid),'datasetAvailable':(training.ROOT/'ai-service/data/raw/uci/online_retail_II.xlsx').is_file(),'datasets':[d for d in full.datasets() if d['id'] in ids]}

@router.post('',status_code=202,dependencies=[Depends(origin_guard)])
def start(payload:training.TrainingRequest,uid=Depends(seller)):
    owns_campaign(uid,payload.campaignId,payload.productId)
    if payload.mode=='campaign_history' and payload.datasetId not in owned_dataset_ids(uid):
        raise HTTPException(403,'Dataset không thuộc cửa hàng.')
    return training.create_training(payload,owner_id=uid)

@router.post('/datasets',status_code=201,dependencies=[Depends(origin_guard)])
def upload(payload:training.DatasetUpload,uid=Depends(seller)):
    result=training.upload_dataset(payload)
    owned_dataset_ids(uid)
    with database() as db:db.execute('INSERT INTO training_dataset_owners VALUES(?,?)',(result['id'],uid))
    return result

@router.get('/dataset-template')
def template(uid=Depends(seller)):
    return training.dataset_template()

@router.get('/{job_id}')
def status(job_id:str,response:Response,uid=Depends(seller)):
    item=training.valid_job(job_id)
    if item['request'].get('ownerId')!=uid:raise HTTPException(404,'Không tìm thấy phiên huấn luyện của cửa hàng.')
    return training.job_status(job_id,response)
