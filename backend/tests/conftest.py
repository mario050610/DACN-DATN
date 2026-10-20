import pytest

@pytest.fixture(autouse=True)
def isolate_training_and_behavior_data(tmp_path,monkeypatch):
    monkeypatch.setenv('TRAINING_JOBS_DIR',str(tmp_path/'training-jobs'))
