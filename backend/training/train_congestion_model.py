import os
import json
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Datasets'))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

TRAFFIC_CSV = os.path.join(DATA_DIR, 'link_traffic_history.csv')

def train_congestion_model():
    print("\n=== Training Congestion Model ===")
    df = pd.read_csv(TRAFFIC_CSV)
    
    df_ok = df[df['status'] == 'ok'].copy()
    df_ok = df_ok.dropna(subset=['observed_latency_ms', 'load_ratio'])
    
    link_params = {}
    all_links = df['link_id'].unique()
    
    for link_id in all_links:
        link_data = df_ok[df_ok['link_id'] == link_id]
        if len(link_data) < 10:
            continue
        
        x = link_data['load_ratio'].values
        y = link_data['observed_latency_ms'].values
        
        try:
            coeffs = np.polyfit(x, y, 3)
            base_latency = np.polyval(coeffs, 0.0)
            
            saturated = df[(df['link_id'] == link_id) & (df['status'] == 'saturated')]
            if len(saturated) > 0:
                sat_threshold = saturated['load_ratio'].min()
            else:
                sat_threshold = 0.90
            
            link_params[link_id] = {
                'poly_coeffs': coeffs.tolist(),
                'base_latency': float(base_latency),
                'saturation_threshold': float(sat_threshold),
                'sample_count': int(len(link_data))
            }
        except Exception as e:
            print(f"  Warning: could not fit {link_id}: {e}")
    
    X_all = df_ok[['load_ratio']].copy()
    X_all['load_ratio_sq'] = X_all['load_ratio'] ** 2
    X_all['load_ratio_cb'] = X_all['load_ratio'] ** 3
    y_all = df_ok['observed_latency_ms'].values
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_all.values, y_all, test_size=0.2, random_state=42
    )
    
    congestion_reg = GradientBoostingRegressor(
        n_estimators=100, max_depth=4, random_state=42, learning_rate=0.1
    )
    congestion_reg.fit(X_train, y_train)
    
    y_pred = congestion_reg.predict(X_test)
    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    print(f"  Global congestion model RMSE: {rmse:.2f} ms")
    print(f"  Trained on {len(df_ok)} samples across {len(link_params)} links")
    
    joblib.dump(congestion_reg, os.path.join(MODELS_DIR, 'congestion_regressor.joblib'))
    
    params = {
        'per_link': link_params,
        'saturation_load_ratio': 0.90,
        'description': 'Polynomial curves mapping load_ratio to predicted latency (ms)'
    }
    
    params_path = os.path.join(MODELS_DIR, 'congestion_params.json')
    with open(params_path, 'w') as f:
        json.dump(params, f, indent=2)
        
    print(f"\nCongestion model saved to {MODELS_DIR}/congestion_params.json and congestion_regressor.joblib")

if __name__ == '__main__':
    train_congestion_model()
