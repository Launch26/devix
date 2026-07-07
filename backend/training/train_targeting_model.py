import os
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Datasets'))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

INCIDENT_CSV = os.path.join(DATA_DIR, 'link_incident_history.csv')

def train_targeting_model():
    print("\n=== Training Targeting-Risk Model ===")
    df = pd.read_csv(INCIDENT_CSV)
    df = df.dropna(subset=['traffic_share'])
    df['jammed_flag'] = df['jammed_flag'].map({True: 1, False: 0, 'True': 1, 'False': 0})
    df = df.dropna(subset=['jammed_flag'])
    
    df['traffic_share_sq'] = df['traffic_share'] ** 2
    df['traffic_share_log'] = np.log1p(df['traffic_share'])
    
    FEATURE_COLS = ['traffic_share', 'traffic_share_sq', 'traffic_share_log']
    X = df[FEATURE_COLS].values
    y = df['jammed_flag'].astype(int).values
    
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    targeting_clf = LogisticRegression(
        max_iter=1000, random_state=42, class_weight='balanced'
    )
    targeting_clf.fit(X_train, y_train)
    
    y_pred = targeting_clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    
    link_jam_rates = {}
    for link_id, group in df.groupby('link_id'):
        jam_rate = group['jammed_flag'].mean()
        link_jam_rates[link_id] = round(float(jam_rate), 4)
    
    print(f"  Targeting model accuracy: {acc:.4f}")
    print(f"  Targeting model F1-score: {f1:.4f}")
    print(f"  Per-link jam rates calculated for {len(link_jam_rates)} links.")
    
    joblib.dump(targeting_clf, os.path.join(MODELS_DIR, 'targeting_classifier.joblib'))
    
    coefficients = {
        'intercept': float(targeting_clf.intercept_[0]),
        'coef_traffic_share': float(targeting_clf.coef_[0][0]),
        'coef_traffic_share_sq': float(targeting_clf.coef_[0][1]),
        'coef_traffic_share_log': float(targeting_clf.coef_[0][2])
    }
    
    params = {
        'per_link_jam_rates': link_jam_rates,
        'logistic_coefficients': coefficients,
        'feature_columns': FEATURE_COLS,
        'description': 'Logistic regression P(jammed) from traffic_share features'
    }
    
    params_path = os.path.join(MODELS_DIR, 'targeting_params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
        
    print(f"\n[OK] Targeting model saved to {MODELS_DIR}/targeting_params.json and targeting_classifier.joblib")

if __name__ == '__main__':
    train_targeting_model()
