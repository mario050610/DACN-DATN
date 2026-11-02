"""Estimator factory used by both full-campaign and retail training."""
import sys
from pathlib import Path
from sklearn.ensemble import (HistGradientBoostingClassifier,HistGradientBoostingRegressor,
    RandomForestClassifier,RandomForestRegressor,ExtraTreesClassifier,ExtraTreesRegressor)
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'backend'))
from app.services.model_choices import MODEL_LABELS

def make_estimator(algorithm='hist_gradient_boosting',classification=False,leaves=15):
    if algorithm not in MODEL_LABELS:raise ValueError('Unsupported model algorithm')
    if algorithm=='hist_gradient_boosting':
        cls=HistGradientBoostingClassifier if classification else HistGradientBoostingRegressor
        return cls(max_iter=120,max_leaf_nodes=leaves,l2_regularization=2,early_stopping=False,random_state=42)
    cls=(RandomForestClassifier if classification else RandomForestRegressor) if algorithm=='random_forest' else (ExtraTreesClassifier if classification else ExtraTreesRegressor)
    return cls(n_estimators=100,max_leaf_nodes=leaves,min_samples_leaf=2,n_jobs=1,random_state=42)
