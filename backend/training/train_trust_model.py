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
    
    Key design decisions:
      1. Compute ratio = self_reported / measured
         (Chimera under-reports → ratio < 1.0; honest links → ratio ≈ 1.0)
      2. Fit the honest distribution using ONLY honest links (two-pass robust estimation)
      3. P(deceptive) is ONE-SIDED: only ratio << 1.0 is suspicious.
         ratio ≈ 1.0 or ratio > 1.0 is honest (or noise).
      4. Use a sigmoid centered at the 2-sigma lower threshold for smooth transition
      5. Soft Bayesian update: alpha += P(honest), beta += P(deceptive)
      6. Store per-link Beta(alpha, beta) parameters + median_ratio
    
    Trust score at inference = alpha / (alpha + beta)
    """
    print("\n=== Training Trust Model (Probabilistic Bayesian) ===")
    TELEMETRY_CSV = os.path.join(DATA_DIR, 'link_telemetry.csv')
    df = pd.read_csv(TELEMETRY_CSV)
    
    # 1. Clean 
    df = df.dropna(subset=['self_reported_latency_ms', 'measured_latency_ms']).copy()
    df = df[df['measured_latency_ms'] > 0]  # Avoid division by zero
    
    # 2. Compute ratio 
    #    Honest link → ratio ≈ 1.0
    #    Chimera-spoofed link → ratio < 1.0 (reports faster than reality)
    df['ratio'] = df['self_reported_latency_ms'] / df['measured_latency_ms']
    
    # 3. Two-pass robust estimation of the honest distribution ────────

    # PASS 1: Fit robustly on ALL data using median/MAD.
    all_ratios = df['ratio'].values
    median_pass1 = np.median(all_ratios)
    mad_pass1 = np.median(np.abs(all_ratios - median_pass1))
    sigma_pass1 = max(mad_pass1 * 1.4826, 1e-9)
    
    # Identify obviously deceptive links: per-link median ratio is more than
    # 3 robust-sigma below the global median. These are clear outliers.
    outlier_threshold = median_pass1 - 3 * sigma_pass1
    per_link_median = df.groupby('link_id')['ratio'].median()
    deceptive_links = set(per_link_median[per_link_median < outlier_threshold].index)
    honest_links = set(per_link_median.index) - deceptive_links
    
    if deceptive_links:
        print(f"  Pass 1: Identified {len(deceptive_links)} outlier link(s): {sorted(deceptive_links)}")
    
    # PASS 2: Refit using ONLY honest links' observations.
    # This gives an uncontaminated estimate of the honest distribution.
    honest_ratios = df[df['link_id'].isin(honest_links)]['ratio'].values
    mu_honest = float(np.median(honest_ratios))
    mad_honest = np.median(np.abs(honest_ratios - mu_honest))
    sigma_honest = float(max(mad_honest * 1.4826, 1e-9))
    
    print(f"  Pass 2 (honest only): mu={mu_honest:.4f}, sigma={sigma_honest:.4f}")
    
    # ── 4. Compute P(deceptive) — ONE-SIDED sigmoid ─────────────────────
    # For ratio ABOVE threshold → p_deceptive ≈ 0 (clearly honest territory)
    # For ratio AT threshold    → p_deceptive = 0.5
    # For ratio BELOW threshold → p_deceptive → 1.0 (clearly deceptive)
    
    threshold = mu_honest - 2 * sigma_honest
    steepness = 1.0 / sigma_honest  # Scale sigmoid by the honest distribution's width
    
    df['p_deceptive'] = 1.0 / (1.0 + np.exp(steepness * (df['ratio'] - threshold)))
    df['p_honest'] = 1.0 - df['p_deceptive']
    
    # Sanity check: show what the sigmoid produces for key ratio values
    for test_ratio in [1.0, 0.90, threshold, 0.65]:
        p_d = 1.0 / (1.0 + np.exp(steepness * (test_ratio - threshold)))
        print(f"    ratio={test_ratio:.4f} -> p_deceptive={p_d:.6f}")
    
    # ── 5. Soft Bayesian update per link ────────────────────────────────
    trust_params = {}
    
    for link_id, group in df.groupby('link_id'):
        alpha = 1.0  # Prior: one pseudo-honest observation
        beta = 1.0   # Prior: one pseudo-deceptive observation
        
        # Accumulate soft evidence from all observations
        alpha += group['p_honest'].sum()
        beta += group['p_deceptive'].sum()
        
        trust_score = alpha / (alpha + beta)
        link_median_ratio = float(group['ratio'].median())
        trust_params[link_id] = {
            'alpha': alpha,
            'beta': beta,
            'median_ratio': link_median_ratio  # Used at inference to correct self-reported latency
        }
    
    # ── 6. Compute global prior (average across all links) for unseen links
    all_alphas = [v['alpha'] for v in trust_params.values()]
    all_betas = [v['beta'] for v in trust_params.values()]
    global_prior = {
        'alpha': float(np.mean(all_alphas)),
        'beta': float(np.mean(all_betas))
    }
    
    # ── 7. Save ─────────────────────────────────────────────────────────
    model_data = {
        'links': trust_params,
        'global_prior': global_prior,
        'honest_distribution': {
            'mu': mu_honest,
            'sigma': sigma_honest,
            'deception_threshold': float(threshold),
        }
    }
    
    joblib.dump(model_data, os.path.join(MODELS_DIR, 'trust_model.pkl'))
    print(f"[OK] Saved probabilistic trust model for {len(trust_params)} links to {MODELS_DIR}/trust_model.pkl")
    print(f"  Global prior: alpha={global_prior['alpha']:.2f}, beta={global_prior['beta']:.2f}")

if __name__ == '__main__':
    train_trust_model()
