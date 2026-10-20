"""Full diagram implementation. Synthetic demo and administrator-provided history stay distinct."""
import os
os.environ.setdefault('OMP_NUM_THREADS','4')
import hashlib
import json
from datetime import date,timedelta
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier,HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from app.services import campaign_forecasting as contract
from train import make_model,regression_scores,classification_scores

GENERATOR_VERSION='campaign-scenarios-v1'


def generate_demo(campaigns=1800,seed=42):
    """Simulate full daily trajectories first; snapshots use past observations ONLY."""
    rng=np.random.default_rng(seed);rows=[]
    categories=['Công nghệ / Phụ kiện điện tử','Sưu tầm','Thời trang','Nước hoa','Trang trí nhà cửa','Đời sống']
    types=['Phụ kiện','Figure','Thời trang','Nước hoa','Trang trí','Khác']
    origin=date(2018,1,1)
    for index in range(campaigns):
        start=origin+timedelta(days=int(rng.integers(0,2300)))
        duration=int(rng.integers(21,91));end=start+timedelta(days=duration)
        category=int(rng.integers(0,len(categories)))
        price=float(round(rng.lognormal(np.log(800000+category*100000),.55)/10000)*10000)
        moq=max(20,int(rng.lognormal(np.log(350),.7)));target=int(moq*rng.uniform(1.2,2.7))
        traffic=rng.lognormal(8.0,1.0)
        engagement=float(np.clip(rng.normal(.06,.018),.01,.15))
        intent=float(np.clip(rng.normal(.28,.08),.05,.6))
        conversion=float(np.clip(rng.normal(.32,.10)*(1_000_000/max(price,10000))**.15,.03,.8))
        cancel_rate=float(rng.beta(2,25))
        views=[];clicks=[];carts=[];favorites=[];valid=[];cancelled=[]
        slope=rng.normal(0,.009)
        shock_day=int(rng.integers(7,duration));shock=float(rng.lognormal(0,.45))
        for day in range(duration+1):
            level=traffic*np.exp(np.clip(slope*day,-2,2))*(1.35 if day<3 or day>duration-3 else 1)
            if day>=shock_day:level*=shock
            view=int(rng.poisson(max(1,level*rng.lognormal(0,.2))))
            click=int(rng.binomial(view,engagement));cart=int(rng.binomial(click,intent))
            gross=int(rng.binomial(cart,conversion));cancel=int(rng.binomial(gross,cancel_rate))
            views.append(view);clicks.append(click);carts.append(cart);favorites.append(int(rng.binomial(click,.1)))
            valid.append(gross-cancel);cancelled.append(cancel)
        final=int(sum(valid))
        for elapsed in sorted({1,3,7,14,duration//2,duration-5}):
            if elapsed>=duration:continue
            asof=start+timedelta(days=elapsed-1)
            payload={'startDate':start.isoformat(),'endDate':end.isoformat(),'currentDate':asof.isoformat(),
                'currentOrders':int(sum(valid[:elapsed])),'cancelledQuantity':int(sum(cancelled[:elapsed])),
                'moq':moq,'target':target,'price':price,'category':categories[category],'productType':types[category],
                'behavior':{'views':sum(views[:elapsed]),'clicks':sum(clicks[:elapsed]),'favorites':sum(favorites[:elapsed]),'addToCart':sum(carts[:elapsed])},
                'dailyOrderQuantities':[{'date':(start+timedelta(days=i)).isoformat(),'quantity':valid[i]} for i in range(max(0,elapsed-28),elapsed)]}
            features=contract.snapshot_features(payload)
            rows.append({**features,'campaignId':f'SIM-{seed}-{index:05d}','startDate':start.isoformat(),'endDate':end.isoformat(),
                         'snapshotDate':asof.isoformat(),'finalQuantity':final,'success':int(final>=moq)})
    return pd.DataFrame(rows)


def temporal_splits(data,asof,selected_campaign):
    data=data.loc[(data.endDate<asof)&data.campaignId.ne(selected_campaign)].copy()
    campaigns=data[['campaignId','startDate','endDate']].drop_duplicates('campaignId').sort_values(['startDate','campaignId'])
    if len(campaigns)<100:raise ValueError('Cần ít nhất 100 chiến dịch đã kết thúc trước ngày dự báo; chiến dịch đang chọn bị loại khỏi train.')
    starts=pd.to_datetime(campaigns.startDate)
    cuts=[starts.quantile(value) for value in (.60,.75,.875)]
    begin=pd.to_datetime(data.startDate);end=pd.to_datetime(data.endDate)
    data['split']='purged'
    data.loc[(begin<cuts[0])&(end<cuts[0]),'split']='train'
    data.loc[(begin>=cuts[0])&(begin<cuts[1])&(end<cuts[1]),'split']='validation'
    data.loc[(begin>=cuts[1])&(begin<cuts[2])&(end<cuts[2]),'split']='calibration'
    data.loc[begin>=cuts[2],'split']='test'
    audit={'cuts':[str(value) for value in cuts],'purgedSnapshots':int(data.split.eq('purged').sum()),'campaigns':len(campaigns)}
    splits={name:data.loc[data.split.eq(name)].copy() for name in ['train','validation','calibration','test']}
    for name,frame in splits.items():
        if len(frame)<30 or frame.campaignId.nunique()<10:raise ValueError(f'Tập {name} còn quá ít mẫu sau khi purge thời gian.')
        if frame.success.nunique()!=2:raise ValueError(f'Tập {name} cần cả chiến dịch đạt và không đạt MOQ.')
    for first,second in [('train','validation'),('validation','calibration'),('calibration','test')]:
        assert set(splits[first].campaignId).isdisjoint(splits[second].campaignId)
        assert pd.to_datetime(splits[first].endDate).max()<pd.to_datetime(splits[second].startDate).min()
    return data,splits,audit


def logits(probability):
    p=np.clip(probability,1e-6,1-1e-6)
    return np.log(p/(1-p)).reshape(-1,1)


def predict_artifact(artifact,frame):
    features=artifact['features']
    log_value=artifact['regressor'].predict(frame[features])
    demand=np.maximum(0,np.expm1(log_value))
    lower=np.maximum(0,np.expm1(log_value-artifact['logRadius']))
    upper=np.maximum(0,np.expm1(log_value+artifact['logRadius']))
    raw=artifact['classifier'].predict_proba(frame[features])[:,1]
    probability=artifact['calibrator'].predict_proba(logits(raw))[:,1]
    return demand,lower,upper,probability


def train_and_predict(payload,folder,progress):
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
    progress('Chuẩn bị dataset chiến dịch đầy đủ feature',12)
    synthetic=payload['mode']=='campaign_demo'
    if synthetic:
        data=generate_demo()
        provenance={'synthetic':True,'name':'Demo chiến dịch mô phỏng','generatorVersion':GENERATOR_VERSION,'seed':42,
                    'statement':'Toàn bộ hành vi, quantity và nhãn do mô phỏng; không phải dữ liệu PREORA hay Kickstarter thực tế.'}
    else:
        source=contract.dataset(payload['datasetId'])
        data=pd.read_csv(source/'samples.csv',dtype={'campaignId':str})
        provenance=json.loads((source/'metadata.json').read_text(encoding='utf-8'))
        synthetic=bool(provenance.get('synthetic',False))
    data,splits,audit=temporal_splits(data,payload['currentDate'],payload['campaignId'])
    data.to_csv(folder/'training_samples.csv',index=False)
    features=contract.FEATURES
    training=splits['train'];validation=splits['validation'];calibration=splits['calibration'];test=splits['test']
    regressors=[];classifiers=[];candidates=[]
    for index,leaves in enumerate((7,15)):
        progress(f'Train nhu cầu cuối kỳ và xác suất đạt MOQ, cấu hình {index+1}/2',35+index*15)
        regressor=make_model(contract.NUMERIC,contract.CATEGORICAL,False)
        classifier=make_model(contract.NUMERIC,contract.CATEGORICAL,True)
        regressor.steps[-1][1].set_params(max_leaf_nodes=leaves)
        classifier.steps[-1][1].set_params(max_leaf_nodes=leaves)
        regressor.fit(training[features],np.log1p(training.finalQuantity))
        classifier.fit(training[features],training.success)
        prediction=np.maximum(0,np.expm1(regressor.predict(validation[features])))
        probability=classifier.predict_proba(validation[features])[:,1]
        reg_score=regression_scores(validation.finalQuantity,prediction)
        cls_score=classification_scores(validation.success,probability)
        candidates.append({'leaves':leaves,'regressionValidation':reg_score,'classificationValidation':cls_score})
        regressors.append(regressor);classifiers.append(classifier)
    ri=min(range(2),key=lambda i:candidates[i]['regressionValidation']['mae'])
    ci=min(range(2),key=lambda i:candidates[i]['classificationValidation']['brier'])
    regressor=regressors[ri];classifier=classifiers[ci]
    progress('Hiệu chỉnh xác suất và khoảng dự báo bằng tập calibration riêng',68)
    calibrator=LogisticRegression(C=1,random_state=42)
    calibrator.fit(logits(classifier.predict_proba(calibration[features])[:,1]),calibration.success)
    residual=np.abs(np.log1p(calibration.finalQuantity.to_numpy())-regressor.predict(calibration[features]))
    rank=min(len(residual),int(np.ceil((len(residual)+1)*.8)))
    radius=float(np.sort(residual)[rank-1])
    artifact={'schemaVersion':2,'features':features,'regressor':regressor,'classifier':classifier,'calibrator':calibrator,'logRadius':radius,
              'provenance':provenance,'target':'finalQuantity','successLabel':'finalQuantity >= moq','featureContract':'campaign-full-v1'}
    progress('Đánh giá trên chiến dịch test chưa dùng khi train',80)
    predicted,lower,upper,probability=predict_artifact(artifact,test)
    baseline=test.currentOrders+test.ordersPerDay*test.daysRemaining
    prior=float(training.success.mean())
    metrics=regression_scores(test.finalQuantity,predicted)
    classifier_metrics=classification_scores(test.success,probability)
    classifier_baseline=classification_scores(test.success,np.full(len(test),prior))
    coverage=float(np.mean((test.finalQuantity>=lower)&(test.finalQuantity<=upper)))
    calibration_curve=[]
    for left in np.arange(0,1,.1):
        mask=(probability>=left)&(probability<left+.1 if left<.9 else probability<=1)
        if mask.any():calibration_curve.append({'count':int(mask.sum()),'predicted':float(probability[mask].mean()),'observed':float(test.success.to_numpy()[mask].mean())})
    output=test[['campaignId','snapshotDate','finalQuantity','success']].copy()
    output['predictedFinal']=predicted;output['lower']=lower;output['upper']=upper;output['probability']=probability
    output.to_csv(folder/'test_predictions.csv',index=False)
    selected=contract.snapshot_features(payload)
    row=pd.DataFrame([selected])
    demand,lo,hi,prob=predict_artifact(artifact,row)
    value=float(demand[0]);low=float(lo[0]);high=float(hi[0]);chance=float(prob[0])
    plan=contract.production_plan(payload['currentOrders'],payload['moq'],low,high,chance,payload.get('productionPolicy',{}))
    progress('Tạo đề xuất sản xuất và lưu cả hai model',92)
    model_path=folder/'model.joblib';joblib.dump(artifact,model_path)
    restored=predict_artifact(joblib.load(model_path),row)
    np.testing.assert_allclose(demand,restored[0]);np.testing.assert_allclose(prob,restored[3])
    # Permutation importance measured on validation, never used to choose on test.
    importance=permutation_importance(regressor,validation[features],np.log1p(validation.finalQuantity),
                                    scoring='neg_mean_absolute_error',n_repeats=2,random_state=42,n_jobs=1)
    influential=sorted([{'feature':key,'importance':round(float(score),6)} for key,score in zip(features,importance.importances_mean)],key=lambda item:item['importance'],reverse=True)
    warnings=[
        'DEMO: Model và xác suất học trên dữ liệu mô phỏng, không chứng minh hiệu quả trên PREORA thực tế.' if synthetic else 'Nguồn lịch sử do quản trị viên cung cấp; kết quả chỉ được đánh giá trên dataset này.',
        'Lịch sử, hành vi và dữ liệu sản phẩm của chiến dịch được chọn là snapshot do quản trị viên xác nhận.',
        'Khoảng dự báo có mức danh nghĩa 80%; tương quan thời gian/chiến dịch và dịch chuyển dữ liệu có thể làm độ bao phủ thay đổi.',
        'Khoảng sản xuất là quy tắc lập kế hoạch theo dự báo và ràng buộc, không tự phát lệnh hay chứng minh tối ưu lợi nhuận.',
        'Đường tiến độ hiển thị chỉ nội suy tới dự báo cuối kỳ, không phải model dự báo từng ngày.'
    ]
    if selected['elapsedDays']<7:
        warnings.append(f"Dự báo sớm với {selected['elapsedDays']} ngày lịch sử; cần cập nhật khi có thêm dữ liệu.")
    if selected['elapsedDays']<14:
        warnings.append('Chưa đủ hai tuần để so sánh tăng trưởng tuần; growthRate tạm dùng 0, không phải mức tăng trưởng đã đo.')
    if payload.get('behavior',{}).get('source')=='observed':warnings.append('Tracker chỉ có lượt tương tác từ khi bật ghi nhận; không có đầy đủ hành vi lịch sử chiến dịch.')
    if payload.get('behavior',{}).get('source')=='demo':warnings.append('Feature hành vi đầu vào là dữ liệu demo, không phải quan sát thị trường thực.')
    if payload.get('behavior',{}).get('source')=='manual':warnings.append('Các số hành vi được nhập tay; cần xác nhận cùng kỳ thời gian với snapshot.')
    unknown=[key for key in contract.CATEGORICAL if selected[key] not in set(training[key].astype(str))]
    if unknown:warnings.append('Giá trị phân loại chưa xuất hiện trong train: '+', '.join(unknown))
    outside=[key for key in contract.NUMERIC if selected[key]<training[key].min() or selected[key]>training[key].max()]
    if outside:warnings.append('Đầu vào ngoài miền giá trị train: '+', '.join(outside))
    current=payload['currentOrders'];remaining=selected['daysRemaining']
    result={'schemaVersion':2,'modelType':'campaign_full','modelVersion':f'campaign-full-{folder.name[:8]}',
        'dataset':provenance['name'],'provenance':provenance,'campaign':payload,'modelInputs':selected,'featuresUsed':features,
        'trainingCounts':{key:len(frame) for key,frame in splits.items()},'campaignCounts':{key:frame.campaignId.nunique() for key,frame in splits.items()},
        'splitAudit':audit,'candidates':candidates,'metrics':metrics,'baseline':regression_scores(test.finalQuantity,baseline.to_numpy()),
        'classificationMetrics':classifier_metrics,'classificationBaseline':classifier_baseline,'calibrationCurve':calibration_curve,
        'intervalCoverage':coverage,'intervalNominal':.8,'predictedFinalDemand':round(value),'demandLower':int(np.floor(low)),'demandUpper':int(np.ceil(high)),
        'projectedFinal':round(value),'projectedLower':int(np.floor(low)),'projectedUpper':int(np.ceil(high)),
        'successProbability':round(chance*100,2),'probabilityScale':'percent','productionRange':plan,
        'remainingDays':remaining,'moqGap':max(0,payload['moq']-current),'requiredDaily':round(max(0,payload['moq']-current)/remaining,2),
        'estimatedValue':round(value*payload['price']),'moqAssessment':'Dự báo cuối kỳ đạt MOQ' if value>=payload['moq'] else 'Dự báo cuối kỳ chưa đạt MOQ',
        'featureImportance':influential,'warnings':warnings,
        'series':[{'date':(date.fromisoformat(payload['currentDate'])+timedelta(days=i)).isoformat(),'value':round(current+(value-current)*i/remaining)} for i in range(remaining+1)],
        'artifactSha256':hashlib.sha256(model_path.read_bytes()).hexdigest()}
    (folder/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
    print(json.dumps({'source':provenance['name'],'synthetic':synthetic,'regressionTest':metrics,'classificationTest':classifier_metrics},ensure_ascii=False),flush=True)
    return result
