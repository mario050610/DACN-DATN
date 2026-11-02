"""Allowlisted algorithms supported by local training workers."""
from typing import Literal
ModelAlgorithm = Literal['hist_gradient_boosting','random_forest','extra_trees']
MODEL_LABELS = {
    'hist_gradient_boosting':'HistGradientBoosting',
    'random_forest':'Random Forest',
    'extra_trees':'Extra Trees',
}
