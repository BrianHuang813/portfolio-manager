import numpy as np
import pandas as pd
from utility_rs import windows, utility_rs
from annual_rs import percentiles


def test_windows():
    assert windows(24) == (6, 12, 18, 24)
    assert windows(60) == (15, 30, 45, 60)
    assert windows(21) == (5, 10, 16, 21)


def test_formula_and_missing_history(config):
    close = pd.DataFrame({'A': np.linspace(50, 100, 61), 'B': np.linspace(100, 110, 61), 'C': np.linspace(100, 90, 61), 'IPO': [np.nan] * 50 + [100.] * 11})
    benchmark = pd.Series(np.linspace(100, 95, 61))
    result = utility_rs(close, benchmark, {'utility_active': True, 'utility_window': 60}, config['utility'])
    raw = sum(w * (close.iloc[-1] / close.iloc[-1-n] - 1) for w, n in zip((.4, .2, .2, .2), (15, 30, 45, 60)))
    ref = sum(w * (benchmark.iloc[-1] / benchmark.iloc[-1-n] - 1) for w, n in zip((.4, .2, .2, .2), (15, 30, 45, 60)))
    pd.testing.assert_series_equal(result, percentiles((1 + raw) / (1 + ref)))
    assert result.A > result.B > result.C
    assert pd.isna(result.IPO)
    assert utility_rs(close, benchmark, {'utility_active': False}, config['utility']).isna().all()
