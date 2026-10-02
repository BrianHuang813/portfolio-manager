import numpy as np
import pandas as pd
from rs_line import rs_line


def test_relative_line(config):
    close = pd.DataFrame({'A': np.linspace(100, 110, 252)})
    flat = rs_line(close, pd.Series([100.] * 252), config['rs_line'])
    faster = rs_line(close, pd.Series(np.linspace(100, 120, 252)), config['rs_line'])
    assert flat['RS_Line'].A == 1.1
    assert flat['RS_Line_New_High'].A
    assert faster['RS_Line'].A < 1
    assert not faster['RS_Line_New_High'].A


def test_leading_price_and_tolerance(config):
    close = pd.DataFrame({'A': [100.] * 251 + [99.]})
    benchmark = pd.Series([100.] * 251 + [98.])
    assert rs_line(close, benchmark, config['rs_line'])['RS_Line_Leading_Price'].A
    close.iloc[-1] = 99.995
    result = rs_line(close, pd.Series([100.] * 252), config['rs_line'])
    assert result['RS_Line_New_High'].A
