"""Fred-compatible annual calculation; keep tail lengths, truncation and qcut.

Upstream accepts 120-session histories. New fields require 252 sessions, but
ranking is performed on the original eligible universe before masking them.
"""
import numpy as np
import pandas as pd


def strength(closes):
    values = []
    for length in (63, 126, 189, 252):
        changes = closes.tail(min(len(closes), length)).pct_change().dropna()
        values.append(((changes + 1).cumprod() - 1).iloc[-1])
    return sum(w * v for w, v in zip((.4, .2, .2, .2), values))


def relative_strength(closes, benchmark):
    score = (1 + strength(closes)) / (1 + strength(benchmark)) * 100
    return int(score * 100) / 100


def percentiles(scores):
    valid = scores.dropna()
    result = pd.Series(np.nan, index=scores.index, dtype=float)
    if not valid.empty:
        result.loc[valid.index] = pd.qcut(valid, 100, labels=False, duplicates='drop')
    return result
