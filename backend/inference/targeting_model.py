import os
import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Now in backend/inference, so models is at backend/models
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'models', 'targeting_classifier.joblib'))

clf = None
if os.path.exists(MODEL_PATH):
    clf = joblib.load(MODEL_PATH)

def compute_targeting_risk(link_id, traffic_share):
    """
    Computes the risk of a link being targeted for a jamming attack.
    Uses the logistic regression model trained on traffic_share features.
    """
    if clf is None or traffic_share is None:
        return 0.0
    try:
        ts = float(traffic_share)
        ts_sq = ts ** 2
        ts_log = np.log1p(ts)
        X = np.array([[ts, ts_sq, ts_log]])
        prob = clf.predict_proba(X)[0][1]
        return float(prob)
    except Exception:
        return 0.0
