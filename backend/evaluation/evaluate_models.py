"""
evaluate_models.py - Comprehensive evaluation of all three Chimera defense models.
Outputs metrics JSON + train/test performance plots to backend/evaluation/
"""

import os
import json
import math
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import joblib
from scipy import stats
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, confusion_matrix, roc_curve, precision_recall_curve,
    average_precision_score
)

# Paths
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE_DIR, 'Datasets')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
EVAL_DIR   = os.path.join(BASE_DIR, 'evaluation')
os.makedirs(EVAL_DIR, exist_ok=True)

STYLE = {
    'train_color': '#3b82f6',
    'test_color':  '#f59e0b',
    'accent':      '#10b981',
    'danger':      '#ef4444',
    'bg':          '#0f0a1a',
    'text':        '#e2d9f3',
    'grid':        '#2a2040',
}

plt.style.use('dark_background')

def apply_dark_theme(ax):
    ax.set_facecolor('#1a1028')
    ax.figure.patch.set_facecolor(STYLE['bg'])
    ax.tick_params(colors=STYLE['text'], labelsize=9)
    ax.xaxis.label.set_color(STYLE['text'])
    ax.yaxis.label.set_color(STYLE['text'])
    ax.title.set_color(STYLE['text'])
    for spine in ax.spines.values():
        spine.set_edgecolor(STYLE['grid'])
    ax.grid(color=STYLE['grid'], alpha=0.5, linestyle='--', linewidth=0.5)

from sklearn.preprocessing import OneHotEncoder

SPLIT_TICK = 400  # Must match training

# =============================================================================
# 1. CONGESTION MODEL
# =============================================================================
def evaluate_congestion():
    print("\n" + "="*60)
    print("  CONGESTION MODEL EVALUATION (GBR + One-Hot Link ID)")
    print("="*60)

    # ── Load data and apply same cleaning as training ───────────────────
    df = pd.read_csv(os.path.join(DATA_DIR, 'link_traffic_history.csv'))
    df_ok = df[df['status'] == 'ok'].dropna(subset=['observed_latency_ms', 'load_ratio']).copy()

    # ── Chronological split (same as training) ─────────────────────────
    df_train = df_ok[df_ok['tick'] < SPLIT_TICK].copy()
    df_test  = df_ok[df_ok['tick'] >= SPLIT_TICK].copy()

    # ── Load saved model artifacts ─────────────────────────────────────
    reg     = joblib.load(os.path.join(MODELS_DIR, 'congestion_regressor.joblib'))
    encoder = joblib.load(os.path.join(MODELS_DIR, 'congestion_encoder.joblib'))

    # ── Build feature matrices (identical to training) ─────────────────
    def build_features(sub_df):
        poly = np.column_stack([
            sub_df['load_ratio'].values,
            sub_df['load_ratio'].values ** 2,
            sub_df['load_ratio'].values ** 3,
        ])
        link_ohe = encoder.transform(sub_df[['link_id']].values)
        return np.hstack([poly, link_ohe])

    X_train = build_features(df_train)
    X_test  = build_features(df_test)
    y_train = df_train['observed_latency_ms'].values
    y_test  = df_test['observed_latency_ms'].values

    y_train_pred = reg.predict(X_train)
    y_test_pred  = reg.predict(X_test)

    # ── Metrics ────────────────────────────────────────────────────────
    def reg_metrics(y_true, y_pred, label):
        rmse = math.sqrt(mean_squared_error(y_true, y_pred))
        mae  = mean_absolute_error(y_true, y_pred)
        r2   = r2_score(y_true, y_pred)
        mape = float(np.mean(np.abs((y_true - y_pred) / (np.abs(y_true) + 1e-9))) * 100)
        print(f"  [{label}]  RMSE={rmse:,.1f}ms  MAE={mae:,.1f}ms  R²={r2:.4f}  MAPE={mape:.2f}%")
        return {'rmse_ms': round(rmse, 2), 'mae_ms': round(mae, 2),
                'r2': round(r2, 4), 'mape_pct': round(mape, 4)}

    train_m = reg_metrics(y_train, y_train_pred, "TRAIN")
    test_m  = reg_metrics(y_test,  y_test_pred,  "TEST ")

    # ── Plots (2×2 grid) ──────────────────────────────────────────────
    fig = plt.figure(figsize=(16, 14), facecolor=STYLE['bg'])
    fig.suptitle('Congestion Model (GBR + Link-Aware) — Performance Evaluation',
                 color=STYLE['text'], fontsize=14, fontweight='bold', y=0.98)
    gs = gridspec.GridSpec(2, 2, figure=fig, hspace=0.35, wspace=0.30)

    # ── Panel 1: Actual vs Predicted Scatter (test set) ────────────────
    ax = fig.add_subplot(gs[0, 0])
    apply_dark_theme(ax)
    ax.scatter(y_test, y_test_pred, alpha=0.3, s=8, color=STYLE['test_color'], label='Test predictions')
    lims = [min(y_test.min(), y_test_pred.min()), max(y_test.max(), y_test_pred.max())]
    ax.plot(lims, lims, 'w--', linewidth=1.5, label='Ideal (45°)')
    ax.set_xlabel('Actual Latency (ms)')
    ax.set_ylabel('Predicted Latency (ms)')
    ax.set_title(f'Actual vs Predicted (Test)\nRMSE={test_m["rmse_ms"]:,.0f}ms  R²={test_m["r2"]:.3f}')
    ax.legend(fontsize=8)

    # ── Panel 2: Residual Plot (test set) ──────────────────────────────
    ax = fig.add_subplot(gs[0, 1])
    apply_dark_theme(ax)
    residuals = y_test - y_test_pred
    ax.scatter(y_test_pred, residuals, alpha=0.3, s=8, color=STYLE['test_color'])
    ax.axhline(0, color='white', linewidth=1.5, linestyle='--')
    ax.set_xlabel('Predicted Latency (ms)')
    ax.set_ylabel('Residual (Actual − Predicted) (ms)')
    ax.set_title('Residual Plot (Test) — Check for Systematic Bias')

    # ── Panel 3: Feature Importance ────────────────────────────────────
    ax = fig.add_subplot(gs[1, 0])
    apply_dark_theme(ax)
    link_feat_names = encoder.get_feature_names_out(['link_id']).tolist()
    feature_names = ['load_ratio', 'load_ratio²', 'load_ratio³'] + link_feat_names
    importances = reg.feature_importances_
    sorted_idx = np.argsort(importances)
    ax.barh(
        [feature_names[i] for i in sorted_idx],
        importances[sorted_idx],
        color=STYLE['accent'], alpha=0.85
    )
    ax.set_xlabel('Feature Importance')
    ax.set_title('GBR Feature Importances')
    ax.tick_params(axis='y', labelsize=7)

    # ── Panel 4: Per-Link Prediction Curves ────────────────────────────
    ax = fig.add_subplot(gs[1, 1])
    apply_dark_theme(ax)
    representative_links = sorted(df_ok['link_id'].unique())[:4]  # Pick 4 links
    colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']
    lr_range = np.linspace(0, 0.89, 200)

    for link_id, color in zip(representative_links, colors):
        # Historical data points for this link
        link_data = df_ok[df_ok['link_id'] == link_id]
        ax.scatter(link_data['load_ratio'], link_data['observed_latency_ms'],
                   alpha=0.1, s=4, color=color)

        # Model prediction curve for this specific link
        curve_df = pd.DataFrame({'link_id': [link_id] * len(lr_range), 'load_ratio': lr_range})
        X_curve = build_features(curve_df)
        y_curve = reg.predict(X_curve)
        ax.plot(lr_range, y_curve, color=color, linewidth=2, label=link_id)

    ax.set_xlabel('Load Ratio')
    ax.set_ylabel('Latency (ms)')
    ax.set_title('Per-Link Prediction Curves (GBR)')
    ax.legend(fontsize=7)

    plt.savefig(os.path.join(EVAL_DIR, 'congestion_evaluation.png'),
                dpi=150, bbox_inches='tight', facecolor=STYLE['bg'])
    plt.close()
    print("  [Saved] evaluation/congestion_evaluation.png")
    return {'train': train_m, 'test': test_m,
            'n_train': int(len(y_train)), 'n_test': int(len(y_test))}


# =============================================================================
# 2. TARGETING MODEL
# =============================================================================
def evaluate_targeting():
    print("\n" + "="*60)
    print("  TARGETING MODEL EVALUATION")
    print("="*60)

    df = pd.read_csv(os.path.join(DATA_DIR, 'link_incident_history.csv'))
    df = df.dropna(subset=['traffic_share'])
    df['jammed_flag'] = df['jammed_flag'].map({True: 1, False: 0, 'True': 1, 'False': 0})
    df = df.dropna(subset=['jammed_flag'])
    df['traffic_share_sq']  = df['traffic_share'] ** 2
    df['traffic_share_log'] = np.log1p(df['traffic_share'])
    FEATURE_COLS = ['traffic_share', 'traffic_share_sq', 'traffic_share_log']
    X = np.nan_to_num(df[FEATURE_COLS].values, nan=0.0, posinf=0.0, neginf=0.0)
    y = df['jammed_flag'].astype(int).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    clf = joblib.load(os.path.join(MODELS_DIR, 'targeting_classifier.joblib'))
    y_train_pred = clf.predict(X_train)
    y_test_pred  = clf.predict(X_test)
    y_train_prob = clf.predict_proba(X_train)[:, 1]
    y_test_prob  = clf.predict_proba(X_test)[:, 1]

    def clf_metrics(y_true, y_pred, y_prob, label):
        acc  = accuracy_score(y_true, y_pred)
        f1   = f1_score(y_true, y_pred, zero_division=0)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec  = recall_score(y_true, y_pred, zero_division=0)
        try:
            auc = roc_auc_score(y_true, y_prob)
        except Exception:
            auc = float('nan')
        ap = average_precision_score(y_true, y_prob)
        print(f"  [{label}]  Acc={acc:.4f}  F1={f1:.4f}  Prec={prec:.4f}"
              f"  Rec={rec:.4f}  ROC-AUC={auc:.4f}  AP={ap:.4f}")
        return {'accuracy': round(acc,4), 'f1': round(f1,4), 'precision': round(prec,4),
                'recall': round(rec,4), 'roc_auc': round(auc,4), 'avg_precision': round(ap,4)}

    train_m = clf_metrics(y_train, y_train_pred, y_train_prob, "TRAIN")
    test_m  = clf_metrics(y_test,  y_test_pred,  y_test_prob,  "TEST ")

    fig = plt.figure(figsize=(16, 10), facecolor=STYLE['bg'])
    fig.suptitle('Targeting Model - Performance Evaluation',
                 color=STYLE['text'], fontsize=14, fontweight='bold', y=0.98)
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.38)

    # ROC
    ax = fig.add_subplot(gs[0, 0])
    apply_dark_theme(ax)
    for y_true, y_prob, label, color in [
        (y_train, y_train_prob, f'Train (AUC={train_m["roc_auc"]:.3f})', STYLE['train_color']),
        (y_test,  y_test_prob,  f'Test  (AUC={test_m["roc_auc"]:.3f})',  STYLE['test_color']),
    ]:
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        ax.plot(fpr, tpr, color=color, linewidth=1.8, label=label)
    ax.plot([0,1],[0,1],'w--',linewidth=0.8,label='Random')
    ax.set_xlabel('FPR'); ax.set_ylabel('TPR'); ax.set_title('ROC Curve')
    ax.legend(fontsize=8)

    # Precision-Recall
    ax = fig.add_subplot(gs[0, 1])
    apply_dark_theme(ax)
    for y_true, y_prob, label, color in [
        (y_train, y_train_prob, f'Train (AP={train_m["avg_precision"]:.3f})', STYLE['train_color']),
        (y_test,  y_test_prob,  f'Test  (AP={test_m["avg_precision"]:.3f})',  STYLE['test_color']),
    ]:
        prec_c, rec_c, _ = precision_recall_curve(y_true, y_prob)
        ax.plot(rec_c, prec_c, color=color, linewidth=1.8, label=label)
    ax.set_xlabel('Recall'); ax.set_ylabel('Precision')
    ax.set_title('Precision-Recall Curve'); ax.legend(fontsize=8)

    # Metrics bar
    ax = fig.add_subplot(gs[0, 2])
    apply_dark_theme(ax)
    m_names = ['Accuracy', 'F1', 'Precision', 'Recall', 'ROC-AUC']
    keys    = ['accuracy', 'f1', 'precision', 'recall', 'roc_auc']
    tr_vals = [train_m[k] for k in keys]
    te_vals = [test_m[k]  for k in keys]
    x = np.arange(len(m_names)); w = 0.35
    ax.bar(x - w/2, tr_vals, w, label='Train', color=STYLE['train_color'], alpha=0.85)
    ax.bar(x + w/2, te_vals, w, label='Test',  color=STYLE['test_color'],  alpha=0.85)
    ax.set_xticks(x); ax.set_xticklabels(m_names, fontsize=7, rotation=15)
    ax.set_ylim(0, 1.1); ax.set_title('Train vs Test Metrics'); ax.legend(fontsize=8)

    # Confusion matrices
    for col_idx, (y_true, y_pred, label) in enumerate([
        (y_train, y_train_pred, 'Train'),
        (y_test,  y_test_pred,  'Test'),
    ]):
        ax = fig.add_subplot(gs[1, col_idx])
        apply_dark_theme(ax)
        cm_data = confusion_matrix(y_true, y_pred)
        im = ax.imshow(cm_data, cmap='Blues')
        plt.colorbar(im, ax=ax, fraction=0.046)
        ax.set_xticks([0,1]); ax.set_yticks([0,1])
        ax.set_xticklabels(['Not Jammed','Jammed'], fontsize=8)
        ax.set_yticklabels(['Not Jammed','Jammed'], fontsize=8)
        ax.set_xlabel('Predicted'); ax.set_ylabel('Actual')
        ax.set_title(f'{label} Confusion Matrix')
        for i in range(2):
            for j in range(2):
                ax.text(j, i, str(cm_data[i,j]), ha='center', va='center',
                        fontsize=12, color='white', fontweight='bold')

    # Logistic curve
    ax = fig.add_subplot(gs[1, 2])
    apply_dark_theme(ax)
    ts_r = np.linspace(0, df['traffic_share'].max(), 200)
    X_c  = np.column_stack([ts_r, ts_r**2, np.log1p(ts_r)])
    sample_df = df.sample(min(3000, len(df)), random_state=1)
    jitter = np.random.uniform(-0.04, 0.04, len(sample_df))
    ax.scatter(sample_df['traffic_share'], sample_df['jammed_flag'] + jitter,
               alpha=0.1, s=4, color='#a78bfa', label='Data (jittered)')
    ax.plot(ts_r, clf.predict_proba(X_c)[:,1], color=STYLE['accent'], linewidth=2, label='P(jammed)')
    ax.axhline(0.5, color='white', linewidth=0.8, linestyle='--', alpha=0.5)
    ax.set_xlabel('Traffic Share'); ax.set_ylabel('P(jammed)')
    ax.set_title('Traffic Share vs Jam Probability'); ax.legend(fontsize=7)

    plt.savefig(os.path.join(EVAL_DIR, 'targeting_evaluation.png'),
                dpi=150, bbox_inches='tight', facecolor=STYLE['bg'])
    plt.close()
    print("  [Saved] evaluation/targeting_evaluation.png")
    return {'train': train_m, 'test': test_m,
            'n_train': int(len(y_train)), 'n_test': int(len(y_test))}


# =============================================================================
# 3. TRUST MODEL
# =============================================================================
def evaluate_trust():
    print("\n" + "="*60)
    print("  TRUST MODEL EVALUATION")
    print("="*60)

    df = pd.read_csv(os.path.join(DATA_DIR, 'link_telemetry.csv'))
    df = df.dropna(subset=['self_reported_latency_ms', 'measured_latency_ms'])
    df = df[df['measured_latency_ms'] > 0].copy()
    df['ratio'] = df['self_reported_latency_ms'] / df['measured_latency_ms']

    model = joblib.load(os.path.join(MODELS_DIR, 'trust_model.pkl'))
    mu    = model['honest_distribution']['mu']
    sigma = model['honest_distribution']['sigma']
    gt_threshold = mu - 2 * sigma

    trust_scores = {
        lid: p['alpha'] / (p['alpha'] + p['beta'])
        for lid, p in model['links'].items()
    }

    link_stats = df.groupby('link_id')['ratio'].agg(
        mean='mean', median='median', std='std', count='count'
    ).reset_index()
    link_stats['trust_score']      = link_stats['link_id'].map(trust_scores)
    link_stats['gt_label']         = (link_stats['median'] < gt_threshold).astype(int)
    link_stats['pred_label']       = (link_stats['trust_score'] < 0.5).astype(int)

    corr = link_stats['trust_score'].corr(link_stats['median'])
    print(f"  Honest dist: mu={mu:.4f}, sigma={sigma:.4f}, 2-sigma threshold={gt_threshold:.4f}")
    print(f"  Pearson corr (trust_score vs median_ratio): {corr:.4f}")
    print(f"  Deceptive (2-sigma GT): {link_stats['gt_label'].sum()} / {len(link_stats)} links")
    print(f"  Deceptive (trust<0.5):  {link_stats['pred_label'].sum()} / {len(link_stats)} links")
    for _, row in link_stats.sort_values('trust_score').iterrows():
        flag = " ** CHIMERA-SPOOFED **" if row['pred_label'] else ""
        print(f"    {row['link_id']:25s}  ratio={row['median']:.4f}  trust={row['trust_score']:.4f}{flag}")

    fig = plt.figure(figsize=(16, 10), facecolor=STYLE['bg'])
    fig.suptitle('Trust Model - Performance Evaluation',
                 color=STYLE['text'], fontsize=14, fontweight='bold', y=0.98)
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.38)

    # Ratio distributions overlay
    ax = fig.add_subplot(gs[0, 0:2])
    apply_dark_theme(ax)
    for link_id, grp in df.groupby('link_id'):
        ts = trust_scores.get(link_id, 0.5)
        color = STYLE['danger'] if ts < 0.3 else ('#f59e0b' if ts < 0.5 else STYLE['train_color'])
        ax.hist(grp['ratio'].clip(0, 1.5), bins=25, alpha=0.3, density=True,
                color=color, label=f'{link_id} (t={ts:.2f})')
    x = np.linspace(0, 1.5, 300)
    ax.plot(x, stats.norm.pdf(x, mu, sigma), 'w-', linewidth=2.5,
            label=f'Honest Gaussian mu={mu:.3f}')
    ax.axvline(gt_threshold, color=STYLE['danger'], linewidth=1.5, linestyle='--',
               label=f'2-sigma threshold ({gt_threshold:.3f})')
    ax.axvline(1.0, color=STYLE['accent'], linewidth=1, linestyle=':', alpha=0.7,
               label='Honest baseline (ratio=1.0)')
    ax.set_xlabel('Ratio = Reported / Measured')
    ax.set_ylabel('Density')
    ax.set_title('Per-Link Ratio Distributions  (Red=deceptive, Amber=borderline, Blue=honest)')
    ax.legend(fontsize=6, ncol=2)

    # Trust score scatter vs median ratio
    ax = fig.add_subplot(gs[0, 2])
    apply_dark_theme(ax)
    c_map = [STYLE['danger'] if r else STYLE['train_color'] for r in link_stats['gt_label']]
    ax.scatter(link_stats['median'], link_stats['trust_score'], s=80, c=c_map,
               zorder=3, edgecolors='white', linewidths=0.5)
    for _, row in link_stats.iterrows():
        ax.annotate(row['link_id'], (row['median'], row['trust_score']),
                    fontsize=6, color=STYLE['text'], xytext=(3,2), textcoords='offset points')
    ax.axvline(gt_threshold, color=STYLE['danger'], linewidth=1.5, linestyle='--')
    ax.axhline(0.5, color='white', linewidth=1, linestyle='--', alpha=0.6)
    ax.set_xlabel('Median Ratio'); ax.set_ylabel('Trust Score')
    ax.set_title(f'Trust Score vs Median Ratio  (r={corr:.3f})')

    # Trust score bar chart
    ax = fig.add_subplot(gs[1, 0:2])
    apply_dark_theme(ax)
    ls_sorted = link_stats.sort_values('trust_score')
    bar_colors = [STYLE['danger'] if t < 0.3 else ('#f59e0b' if t < 0.5 else STYLE['train_color'])
                  for t in ls_sorted['trust_score']]
    bars = ax.bar(ls_sorted['link_id'], ls_sorted['trust_score'],
                  color=bar_colors, alpha=0.9, edgecolor='#2a2040')
    ax.axhline(0.5, color='white', linewidth=1.5, linestyle='--', alpha=0.7,
               label='Trust=0.5 threshold')
    ax.set_ylim(0, 1.1)
    ax.set_title('Per-Link Trust Scores  (Red=Chimera-spoofed)')
    ax.tick_params(axis='x', rotation=30, labelsize=8)
    ax.legend(fontsize=8)
    for bar, (_, row) in zip(bars, ls_sorted.iterrows()):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f'{row["trust_score"]:.2f}', ha='center', va='bottom',
                fontsize=7, color=STYLE['text'])

    # Std vs trust score
    ax = fig.add_subplot(gs[1, 2])
    apply_dark_theme(ax)
    ax.scatter(link_stats['std'], link_stats['trust_score'], s=80, c=c_map,
               zorder=3, edgecolors='white', linewidths=0.5)
    for _, row in link_stats.iterrows():
        ax.annotate(row['link_id'], (row['std'], row['trust_score']),
                    fontsize=6, color=STYLE['text'], xytext=(3,2), textcoords='offset points')
    ax.axhline(0.5, color='white', linewidth=1, linestyle='--', alpha=0.6)
    ax.set_xlabel('Std Dev of Ratio'); ax.set_ylabel('Trust Score')
    ax.set_title('Noise (Std Dev) vs Trust Score')

    plt.savefig(os.path.join(EVAL_DIR, 'trust_evaluation.png'),
                dpi=150, bbox_inches='tight', facecolor=STYLE['bg'])
    plt.close()
    print("  [Saved] evaluation/trust_evaluation.png")

    return {
        'honest_distribution': {'mu': round(mu,4), 'sigma': round(sigma,4)},
        'deception_threshold_2sigma': round(gt_threshold, 4),
        'trust_vs_median_correlation': round(corr, 4),
        'n_links': int(len(link_stats)),
        'n_flagged_deceptive_gt': int(link_stats['gt_label'].sum()),
        'n_flagged_deceptive_pred': int(link_stats['pred_label'].sum()),
        'per_link': {
            row['link_id']: {
                'trust_score': round(row['trust_score'], 4),
                'median_ratio': round(row['median'], 4),
                'mean_ratio': round(row['mean'], 4),
                'std_ratio': round(row['std'], 4),
                'n_observations': int(row['count']),
                'is_deceptive_gt': bool(row['gt_label']),
                'is_deceptive_pred': bool(row['pred_label'])
            }
            for _, row in link_stats.iterrows()
        }
    }


# =============================================================================
# MAIN
# =============================================================================
def main():
    print("\n" + "="*60)
    print("  Chimera Defense - Model Evaluation Suite")
    print("="*60)
    print(f"  Output: {EVAL_DIR}")

    all_metrics = {}
    all_metrics['congestion'] = evaluate_congestion()
    all_metrics['targeting']  = evaluate_targeting()
    all_metrics['trust']      = evaluate_trust()

    out_path = os.path.join(EVAL_DIR, 'evaluation_metrics.json')
    with open(out_path, 'w') as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\n  [Saved] evaluation/evaluation_metrics.json")

    print("\n" + "="*60)
    print("  SUMMARY")
    print("="*60)
    cong = all_metrics['congestion']
    targ = all_metrics['targeting']
    trst = all_metrics['trust']
    print(f"  Congestion  | Train RMSE={cong['train']['rmse_ms']:,.0f}ms  R2={cong['train']['r2']:.3f}"
          f" | Test RMSE={cong['test']['rmse_ms']:,.0f}ms  R2={cong['test']['r2']:.3f}")
    print(f"  Targeting   | Train F1={targ['train']['f1']:.3f}  AUC={targ['train']['roc_auc']:.3f}"
          f" | Test  F1={targ['test']['f1']:.3f}  AUC={targ['test']['roc_auc']:.3f}")
    print(f"  Trust       | Corr={trst['trust_vs_median_correlation']:.3f}"
          f"  Flagged={trst['n_flagged_deceptive_pred']}/{trst['n_links']} links deceptive")
    print("="*60)

if __name__ == '__main__':
    main()
