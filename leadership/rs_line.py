def rs_line(close, benchmark, config):
    line = close.div(benchmark, axis=0)
    high = line.rolling(252, min_periods=252).max().iloc[-1]
    today = line.iloc[-1]
    new_high = today >= high * config['high_tolerance']
    return dict(RS_Line=today, RS_Line_52W_High=high, RS_Line_New_High=new_high,
                RS_Line_Pct_From_High=today / high - 1,
                RS_Line_Leading_Price=new_high & (close.iloc[-1] < close.rolling(252).max().iloc[-1]))
