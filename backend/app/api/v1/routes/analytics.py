from datetime import date
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException,Request
from pydantic import BaseModel,Field
from .auth import origin_guard,current_user,database
from .training import admin
from .shopping import CAMPAIGNS
from app.services import behavior_events
router=APIRouter(prefix='/analytics',tags=['Campaign behavior'])

class Event(BaseModel):
    campaignId:str=Field(min_length=1,max_length=100)
    kind:Literal['view','click']
    eventId:str=Field(min_length=16,max_length=80,pattern=r'^[a-zA-Z0-9-]+$')

@router.post('/events',dependencies=[Depends(origin_guard)])
def event(payload:Event):
    if payload.campaignId not in CAMPAIGNS:raise HTTPException(404,'Không tìm thấy chiến dịch.')
    return {'recorded':behavior_events.record(payload.campaignId,payload.kind,payload.eventId)}

@router.get('/campaigns/{campaign_id}')
def counts(campaign_id:str,startDate:date,endDate:date,request:Request):
    with database() as db:
        user=current_user(db,request)
        if user['role']!='admin':
            if user['role']!='seller':raise HTTPException(403,'Campaign access denied.')
            from .seller_training import owns_campaign
            owns_campaign(user['id'],campaign_id)
    if startDate>endDate:raise HTTPException(422,'Khoảng thời gian không hợp lệ.')
    return behavior_events.summary(campaign_id,startDate.isoformat(),endDate.isoformat())
