import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

from train_congestion_model import train_congestion_model
from train_targeting_model import train_targeting_model
from train_trust_model import train_trust_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Datasets'))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')
PLOTS_DIR = os.path.join(BASE_DIR, '..', 'plots')
os.makedirs(PLOTS_DIR, exist_ok=True)

def generate_plots():
    print("\n=== Generating Evaluation Plots ===")
    
    # 1. Congestion Model Plot
    traffic_csv = os.path.join(DATA_DIR, 'link_traffic_history.csv')
    if os.path.exists(traffic_csv):
        df_traf = pd.read_csv(traffic_csv)
        df_ok = df_traf[df_traf['status'] == 'ok'].dropna(subset=['observed_latency_ms', 'load_ratio'])
        
        plt.figure(figsize=(10, 6))
        # Plot a sample of points to avoid massive scatter plots
        sample_df = df_ok.sample(min(10000, len(df_ok)))
        plt.scatter(sample_df['load_ratio'], sample_df['observed_latency_ms'], alpha=0.1, label='Historical Data', color='blue', s=2)
        
        # Load regressor
        reg_path = os.path.join(MODELS_DIR, 'congestion_regressor.joblib')
        if os.path.exists(reg_path):
            reg = joblib.load(reg_path)
            x_vals = np.linspace(0, 0.9, 100)
            X_pred = np.column_stack((x_vals, x_vals**2, x_vals**3))
            y_vals = reg.predict(X_pred)
            plt.plot(x_vals, y_vals, color='red', linewidth=2, label='Global Regressor Curve')
        
        plt.title('Congestion Model: Load Ratio vs Latency')
        plt.xlabel('Load Ratio')
        plt.ylabel('Observed Latency (ms)')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(PLOTS_DIR, 'congestion_evaluation.png'))
        plt.close()
        print("  [Saved] congestion_evaluation.png")
    
    # 2. Trust Model Plot
    telemetry_csv = os.path.join(DATA_DIR, 'link_telemetry.csv')
    trust_model_path = os.path.join(MODELS_DIR, 'trust_model.pkl')
    if os.path.exists(telemetry_csv) and os.path.exists(trust_model_path):
        df_tel = pd.read_csv(telemetry_csv).dropna(subset=['self_reported_latency_ms', 'measured_latency_ms'])
        df_tel = df_tel[df_tel['measured_latency_ms'] > 0]
        df_tel['ratio'] = df_tel['self_reported_latency_ms'] / df_tel['measured_latency_ms']
        
        trust_model = joblib.load(trust_model_path)
        mu = trust_model['honest_distribution']['mu']
        sigma = trust_model['honest_distribution']['sigma']
        
        plt.figure(figsize=(10, 6))
        
        # Filter for visualization (clip outliers)
        plot_data = df_tel['ratio'].clip(0, 2.0)
        
        # Histogram of ratios
        plt.hist(plot_data, bins=50, density=True, alpha=0.6, color='skyblue', label='Ratio Histogram')
        
        # Overlay the Gaussian
        x = np.linspace(0, 2.0, 200)
        p = stats.norm.pdf(x, mu, sigma)
        plt.plot(x, p, 'k', linewidth=2, label=f'Honest Bulk Fit (mu={mu:.4f}, sigma={sigma:.4f})')
        
        # Mark the deception zone
        plt.axvline(x=1.0, color='green', linestyle='--', alpha=0.5, label='Honest baseline (ratio=1.0)')
        
        plt.title('Trust Model: Reported/Measured Ratio Distribution')
        plt.xlabel('Ratio = Reported / Measured (< 1.0 = likely Chimera spoofing)')
        plt.ylabel('Density')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(PLOTS_DIR, 'trust_evaluation.png'))
        plt.close()
        print("  [Saved] trust_evaluation.png")
        
    # 3. Targeting Model Plot
    incident_csv = os.path.join(DATA_DIR, 'link_incident_history.csv')
    targeting_model_path = os.path.join(MODELS_DIR, 'targeting_classifier.joblib')
    if os.path.exists(incident_csv) and os.path.exists(targeting_model_path):
        df_inc = pd.read_csv(incident_csv).dropna(subset=['traffic_share', 'jammed_flag'])
        df_inc['jammed_flag'] = df_inc['jammed_flag'].map({True: 1, False: 0, 'True': 1, 'False': 0})
        
        plt.figure(figsize=(10, 6))
        sample_inc = df_inc.sample(min(5000, len(df_inc)))
        
        # Add slight jitter to y-axis for scatter
        jitter_y = sample_inc['jammed_flag'] + np.random.uniform(-0.05, 0.05, len(sample_inc))
        plt.scatter(sample_inc['traffic_share'], jitter_y, alpha=0.1, color='purple', s=10, label='Historical Incidents (jittered)')
        
        # Logistic curve
        clf = joblib.load(targeting_model_path)
        x_vals = np.linspace(0, df_inc['traffic_share'].max(), 100)
        X_pred = np.column_stack((x_vals, x_vals**2, np.log1p(x_vals)))
        y_probs = clf.predict_proba(X_pred)[:, 1] if clf.classes_.shape[0] > 1 else np.zeros_like(x_vals)
        
        plt.plot(x_vals, y_probs, 'red', linewidth=2, label='P(jammed) Logistic Curve')
        
        plt.title('Targeting Risk: Traffic Share vs Jam Probability')
        plt.xlabel('Traffic Share')
        plt.ylabel('Probability of being Jammed')
        plt.legend()
        plt.grid(True)
        plt.savefig(os.path.join(PLOTS_DIR, 'targeting_evaluation.png'))
        plt.close()
        print("  [Saved] targeting_evaluation.png")

def train_all_models():
    """
    Train all 3 models sequentially and generate evaluation plots.
    """
    print("==========================================")
    print("  Chimera Defense Model Training Suite    ")
    print("==========================================")
    
    train_congestion_model()
    train_targeting_model()
    train_trust_model()
    
    generate_plots()
    
    print("\n[OK] All models trained and plots generated in backend/plots/")

if __name__ == "__main__":
    train_all_models()
