import pandas as pd
from rs_history import save_history, load_history, momentum


def test_idempotent_and_session_lags(tmp_path):
    dates = pd.bdate_range('2024-01-01', periods=65)
    history = pd.DataFrame({'Date': dates.strftime('%Y-%m-%d'), 'Ticker': 'A', 'Annual_RS': range(65), 'Utility_RS': None, 'Price': 100.})
    path = tmp_path / 'history.parquet'
    today = history.tail(1).copy()
    today.Annual_RS = 90
    first = save_history(path, history, today)
    second = save_history(path, first, today)
    assert len(second) == 65
    assert load_history(path).iloc[-1].Annual_RS == 90
    result = momentum(today, second, dates)
    assert result.iloc[0].Annual_RS_Change_20D == 46
    assert pd.isna(result.iloc[0].Utility_RS_Change_5D)
    # Missed snapshots do not substitute a different session.
    missing = history.drop(index=44)
    assert pd.isna(momentum(today.copy(), missing, dates).iloc[0].Annual_RS_20D_Ago)
