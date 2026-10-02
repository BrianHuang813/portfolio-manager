from pathlib import Path
import pandas as pd


def load_history(path):
    return pd.read_parquet(path) if Path(path).exists() else pd.DataFrame(columns=['Date', 'Ticker', 'Annual_RS', 'Utility_RS', 'Price'])


def momentum(frame, history, sessions):
    today = pd.Timestamp(frame.Date.iloc[0])
    sessions = pd.DatetimeIndex(sessions)
    position = sessions.get_indexer([today])[0]
    if position < 0:
        raise ValueError('Snapshot date is not a SPY trading session')
    history = history.copy()
    history['Date'] = pd.to_datetime(history.Date)
    for metric, lags in [('Annual_RS', (5, 20, 40, 60)), ('Utility_RS', (5, 10))]:
        for lag in lags:
            previous = history[history.Date == sessions[position-lag]] if position >= lag else history.iloc[:0]
            values = previous.drop_duplicates('Ticker', keep='last').set_index('Ticker')[metric]
            frame[f'{metric}_{lag}D_Ago'] = frame.Ticker.map(values)
            frame[f'{metric}_Change_{lag}D'] = frame[metric] - frame[f'{metric}_{lag}D_Ago']
    frame['Annual_RS_Acceleration'] = frame.Annual_RS - 2 * frame.Annual_RS_20D_Ago + frame.Annual_RS_40D_Ago
    return frame


def save_history(path, history, frame):
    columns = ['Date', 'Ticker', 'Annual_RS', 'Utility_RS', 'Price']
    merged = pd.concat([history[columns], frame[columns]], ignore_index=True)
    merged['Date'] = pd.to_datetime(merged.Date).dt.strftime('%Y-%m-%d')
    merged = merged.drop_duplicates(['Date', 'Ticker'], keep='last').sort_values(['Date', 'Ticker'])
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp.parquet')
    merged.to_parquet(temporary, index=False)
    temporary.replace(path)
    return merged
