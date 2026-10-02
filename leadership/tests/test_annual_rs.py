"""Compare against executable functions extracted from the pinned original."""
import ast
from pathlib import Path
import numpy as np
import pandas as pd
from annual_rs import relative_strength, percentiles


def fred_functions():
    source = Path(__file__).resolve().parents[1] / 'vendor/fred/rs_ranking.py'
    tree = ast.parse(source.read_text(encoding='utf-8'))
    functions = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ('relative_strength', 'strength', 'quarters_perf')]
    namespace = {'pd': pd}
    exec(compile(ast.Module(body=functions, type_ignores=[]), str(source), 'exec'), namespace)
    return namespace


def test_50_ticker_fred_compatibility():
    rng = np.random.default_rng(7)
    prices = 100 * np.exp(np.cumsum(rng.normal(.001, .02, (380, 50)), axis=0))
    reference = pd.Series(100 * np.exp(np.cumsum(rng.normal(.0003, .01, 380))))
    original = fred_functions()['relative_strength']
    expected = pd.Series({f'T{i}': original(pd.Series(prices[:, i]), reference) for i in range(50)})
    actual = pd.Series({f'T{i}': relative_strength(pd.Series(prices[:, i]), reference) for i in range(50)})
    pd.testing.assert_series_equal(actual, expected)
    pd.testing.assert_series_equal(percentiles(actual), pd.qcut(expected, 100, labels=False, duplicates='drop').astype(float))


def test_percentile_ties_and_order():
    result = percentiles(pd.Series([3., 2., 1., np.nan]))
    assert result[0] > result[1] > result[2]
    assert pd.isna(result[3])
    assert percentiles(pd.Series([2., 2.])).isna().all()
