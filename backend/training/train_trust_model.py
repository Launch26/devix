import pandas as pd
import numpy as np
from scipy import stats
import joblib
import os

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Datasets'))
MODELS_DIR = os.path.join(BASE_DIR, '..', 'models')

os.makedirs(MODELS_DIR, exist_ok=True)

def train_trust_model():
    """
    Bayesian Probabilistic Trust Model (Beta-distribution based).
    
    Instead of training an ML classifier with an arbitrary threshold,
    this model:
      1. Computes deviation_ratio = |reported - measured| / measured
      2. Fits a Gaussian to the "honest bulk" of deviation ratios (data-driven)
      3. Uses P(deceptive) = 1 - CDF(deviation | mu, sigma) per observation
      4. Performs soft Bayesian updates: alpha += P(honest), beta += P(deceptive)
      5. Stores per-link Beta(alpha, beta) parameters
    
    Trust score at inference = alpha / (alpha + beta)
    """
    print("\n=== Training Trust Model (Probabilistic Bayesian) ===")
    TELEMETRY_CSV = os.path.join(DATA_DIR, 'link_telemetry.csv')
    df = pd.read_csv(TELEMETRY_CSV)
    
    # 1. Clean
    df = df.dropna(subset=['self_reported_latency_ms', 'measured_latency_ms']).copy()
    df = df[df['measured_latency_ms'] > 0]  # Avoid division by zero
    
    # 2. Compute deviation ratio for all observations
    df['deviation_ratio'] = (
        np.abs(df['self_reported_latency_ms'] - df['measured_latency_ms']) 
        / df['measured_latency_ms']
    )
    
    # 3. Fit a Gaussian to the "honest bulk" of the data
    all_ratios = df['deviation_ratio'].values
    median_ratio = np.median(all_ratios)
    mad = np.median(np.abs(all_ratios - median_ratio))
    robust_sigma = mad * 1.4826
    
    mu_honest = median_ratio
    sigma_honest = max(robust_sigma, 1e-9)  # Prevent zero
    
    print(f"  Honest distribution: mu={mu_honest:.4f}, sigma={sigma_honest:.4f}")
    
    # 4. For each observation, compute P(deceptive)
    df['p_deceptive'] = 1.0 - stats.norm.cdf(df['deviation_ratio'], loc=mu_honest, scale=sigma_honest)
    df['p_honest'] = 1.0 - df['p_deceptive']
    
    # 5. Soft Bayesian update per link
    trust_params = {}
    
    for link_id, group in df.groupby('link_id'):
        alpha = 1.0  # Prior: one pseudo-honest observation
        beta = 1.0   # Prior: one pseudo-deceptive observation
        
        # Accumulate soft evidence from all observations
        alpha += group['p_honest'].sum()
        beta += group['p_deceptive'].sum()
        
        trust_score = alpha / (alpha + beta)
        trust_params[link_id] = {'alpha': alpha, 'beta': beta}
        # print(f"  {link_id}: alpha={alpha:.2f}, beta={beta:.2f}, trust={trust_score:.4f}")
    
    # 6. Compute global prior (average across all links) for unseen links
    all_alphas = [v['alpha'] for v in trust_params.values()]
    all_betas = [v['beta'] for v in trust_params.values()]
    global_prior = {
        'alpha': float(np.mean(all_alphas)),
        'beta': float(np.mean(all_betas))
    }
    
    # 7. Save
    model_data = {
        'links': trust_params,
        'global_prior': global_prior,
        'honest_distribution': {'mu': mu_honest, 'sigma': sigma_honest}
    }
    
    joblib.dump(model_data, os.path.join(MODELS_DIR, 'trust_model.pkl'))
    print(f"[OK] Saved probabilistic trust model for {len(trust_params)} links to {MODELS_DIR}/trust_model.pkl")
    print(f"  Global prior: alpha={global_prior['alpha']:.2f}, beta={global_prior['beta']:.2f}")

if __name__ == '__main__':
    train_trust_model()
