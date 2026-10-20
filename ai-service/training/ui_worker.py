"""One isolated, persistent admin training job; no web server ML dependencies."""
import json
import sys
import threading
import traceback
from datetime import date, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
from app.services import training_jobs as jobs


def run(job_id):
    stopped=threading.Event()
    def pulse():
        while not stopped.wait(10): jobs.heartbeat(job_id)
    threading.Thread(target=pulse,daemon=True).start()
    try:
        jobs.update(job_id,status='running',stage='Kiểm tra dữ liệu và môi trường AI',progress=5)
        payload=jobs.get(job_id)['request']
        if payload.get('mode') in ('campaign_demo','campaign_history'):
            from full_campaign import train_and_predict
            result=train_and_predict(payload,jobs.directory()/job_id,lambda stage,progress:jobs.update(job_id,stage=stage,progress=progress))
            jobs.update(job_id,status='succeeded',stage='Hoàn tất ba đầu ra theo sơ đồ',progress=100,result=result)
            return
        import train
        import joblib
        import numpy as np
        import pandas as pd
        from sklearn.ensemble import HistGradientBoostingRegressor
        for directory in (train.PROCESSED,train.REPORTS): directory.mkdir(parents=True,exist_ok=True)
        source=train.RAW/'uci/online_retail_II.xlsx'
        stamp={'size':source.stat().st_size,'mtime_ns':source.stat().st_mtime_ns,'top_products':100}
        cache=train.PROCESSED/'retail_samples.csv'
        manifest=train.PROCESSED/'retail_source.json'
        valid=cache.is_file() and manifest.is_file() and json.loads(manifest.read_text(encoding='utf-8'))==stamp
        if payload['rebuildData'] or not valid:
            jobs.update(job_id,stage='Đọc Excel UCI và tạo mẫu theo ngày; lần đầu có thể mất vài phút',progress=12)
            train.prepare_retail(100,train_model=False)
            train.write_json(manifest,stamp)
        jobs.update(job_id,stage='Chia train / validation / calibration / test theo thời gian',progress=40)
        data=pd.read_csv(cache,parse_dates=['asof'])
        features=['quantity_today','last7','last28','month']
        training=data.loc[data.split.eq('train')]
        validation=data.loc[data.split.eq('validation')].sort_values('asof')
        test=data.loc[data.split.eq('test')]
        dates=sorted(validation['asof'].unique())
        cutoff=dates[len(dates)//2]
        tuning=validation.loc[validation['asof']<cutoff]
        calibration=validation.loc[validation['asof']>=cutoff]
        if min(len(training),len(tuning),len(calibration),len(test))<20: raise ValueError('Không đủ mẫu cho bốn tập độc lập.')
        models=[]
        for index,leaves in enumerate((7,15)):
            jobs.update(job_id,stage=f'Huấn luyện mô hình {index+1}/2 trên dữ liệu lịch sử UCI',progress=50+index*12)
            model=HistGradientBoostingRegressor(max_iter=120,max_leaf_nodes=leaves,l2_regularization=2,early_stopping=False,random_state=42)
            model.fit(training[features],np.log1p(training.next7))
            tuning_prediction=np.maximum(0,np.expm1(model.predict(tuning[features])))
            models.append((train.regression_scores(tuning.next7,tuning_prediction)['mae'],leaves,model))
        _,leaves,model=min(models,key=lambda item:item[0])
        jobs.update(job_id,stage='Đánh giá trên test và dự báo cho chiến dịch đã chọn',progress=80)
        calibration_prediction=np.maximum(0,np.expm1(model.predict(calibration[features])))
        residual=np.abs(calibration.next7.to_numpy()-calibration_prediction)
        rank=min(len(residual),int(np.ceil((len(residual)+1)*.8)))
        radius=float(np.sort(residual)[rank-1])
        test_prediction=np.maximum(0,np.expm1(model.predict(test[features])))
        metrics=train.regression_scores(test.next7,test_prediction)
        baseline=train.regression_scores(test.next7,test.last7.to_numpy())
        coverage=float(np.mean((test.next7.to_numpy()>=np.maximum(0,test_prediction-radius))&(test.next7.to_numpy()<=test_prediction+radius)))
        daily={row['date']:row['quantity'] for row in payload['dailyOrderQuantities']}
        asof=date.fromisoformat(payload['currentDate'])
        def past(days): return sum(daily.get((asof-timedelta(days=i)).isoformat(),0) for i in range(days))
        row=pd.DataFrame([{'quantity_today':past(1),'last7':past(7),'last28':past(28),'month':asof.month}])
        next7=max(0,float(np.expm1(model.predict(row[features])[0])))
        remaining=(date.fromisoformat(payload['endDate'])-asof).days
        projected=payload['currentOrders']+next7*remaining/7
        lower=payload['currentOrders']+max(0,next7-radius)*remaining/7
        upper=payload['currentOrders']+(next7+radius)*remaining/7
        result={
            'modelVersion':f'uci-transfer-{job_id[:8]}', 'dataset':'UCI Online Retail II',
            'campaign':payload, 'trainingCounts':{'train':len(training),'validation':len(tuning),'calibration':len(calibration),'test':len(test)},
            'selectedLeafNodes':leaves,'metrics':metrics,'baseline':baseline,
            'retailIntervalCoverage':coverage,'retailIntervalNominal':.8,
            'next7':round(next7),'next7Lower':round(max(0,next7-radius)),'next7Upper':round(next7+radius),
            'remainingDays':remaining,'projectedFinal':round(projected),'projectedLower':round(lower),'projectedUpper':round(upper),
            'estimatedValue':round(projected*payload['price']), 'moqGap':max(0,payload['moq']-payload['currentOrders']),
            'requiredDaily':round(max(0,payload['moq']-payload['currentOrders'])/remaining,2),
            'moqAssessment':'Ước lượng cuối kỳ đạt MOQ' if projected>=payload['moq'] else 'Ước lượng cuối kỳ chưa đạt MOQ',
            'successProbability':None,
            'warnings':([f'Dự báo sớm với {len(daily)} ngày lịch sử; mô hình bán lẻ chưa được kiểm chứng cho chiến dịch mới.'] if len(daily)<7 else [])+[
                'Model học từ lượng bán UCI của 100 sản phẩm; chưa được kiểm chứng cho pre-order PREORA.',
                'Dữ liệu chiến dịch là snapshot do quản trị viên xác nhận; dữ liệu mẫu trên website vẫn là demo.',
                'Ước lượng cuối kỳ và giá trị là ngoại suy tốc độ dự báo 7 ngày, không phải model dự báo trực tiếp cuối chiến dịch.',
                'Khoảng tham khảo hiệu chỉnh trên dữ liệu bán lẻ; độ bao phủ trên PREORA chưa được kiểm chứng.',
                'Ngày hiện tại có thể chưa đủ 24 giờ; lượng đặt trong ngày là snapshot bạn xác nhận.',
                'Không có nhãn MOQ pre-order thực tế để tính xác suất thành công đáng tin cậy.',
                'Lịch sử ngắn hơn 28 ngày có thể khác các sản phẩm ổn định trong tập train.' if len(daily)<28 else 'Ngày không phát sinh được xác nhận bằng 0; chưa có thông tin hết hàng hay marketing.'
            ],
            'series':[{'date':(asof+timedelta(days=i)).isoformat(),'value':round(payload['currentOrders']+next7*i/7)} for i in range(remaining+1)]
        }
        folder=jobs.directory()/job_id
        model_path=folder/'model.joblib'
        joblib.dump({'model':model,'features':features,'radius':radius,'source_domain':'retail','target':'next7','target_transform':'log1p'},model_path)
        restored=joblib.load(model_path)
        np.testing.assert_allclose(model.predict(row[features]),restored['model'].predict(row[features]))
        (folder/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
        print(json.dumps({'test':metrics,'baseline':baseline,'campaignId':payload['campaignId']},ensure_ascii=False),flush=True)
        jobs.update(job_id,status='succeeded',stage='Huấn luyện và dự báo hoàn tất',progress=100,result=result)
    except Exception as cause:
        traceback.print_exc()
        jobs.update(job_id,status='failed',stage='Huấn luyện thất bại',error=str(cause))
    finally: stopped.set()

if __name__=='__main__':
    if len(sys.argv)!=2: raise SystemExit('Expected job ID')
    run(sys.argv[1])
