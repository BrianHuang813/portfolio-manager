import numpy as np
import pandas as pd
from annual_rs import percentiles


def windows(days):
    return tuple(max(1, round(days * fraction)) for fraction in (.25, .5, .75, 1))


def utility_rs(close, benchmark, state, config):
    empty = pd.Series(np.nan, index=close.columns)
    if not state['utility_active']:
        return empty
    ws = windows(state['utility_window'])
    if len(benchmark) <= max(ws) or len(close) <= max(ws):
        return empty
    stock = pd.Series(0., index=close.columns)
    reference = 0.
    for w, key in zip(ws, ('q1', 'q2', 'q3', 'q4')):
        weight = config['weights'][key]
        stock += weight * (close.iloc[-1] / close.iloc[-1-w] - 1)
        reference += weight * (benchmark.iloc[-1] / benchmark.iloc[-1-w] - 1)
    # No forward filling across missing sessions or IPO history.
    stock = stock.where(close.tail(max(ws) + 1).notna().all())
    return percentiles((1 + stock) / (1 + reference))
