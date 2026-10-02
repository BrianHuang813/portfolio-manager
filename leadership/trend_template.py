def trend_template(frame, config):
    conditions = {
        'tt_price_gt_ma50': frame.Price > frame.MA50,
        'tt_price_gt_ma150': frame.Price > frame.MA150,
        'tt_price_gt_ma200': frame.Price > frame.MA200,
        'tt_ma50_gt_ma150': frame.MA50 > frame.MA150,
        'tt_ma150_gt_ma200': frame.MA150 > frame.MA200,
        'tt_ma200_rising': frame.MA200 > frame.MA200_20D_Ago,
        'tt_above_52w_low': frame.Price >= frame.Low_52W * (1 + config['min_above_52w_low']),
        'tt_near_52w_high': frame.Price >= frame.High_52W * (1 - config['max_below_52w_high']),
        'tt_rs_pass': frame.Annual_RS >= config['rs_min'],
    }
    for name, value in conditions.items():
        frame[name] = value.fillna(False)
    frame['Trend_Template_Score'] = frame[list(conditions)].sum(axis=1)
    frame['Trend_Template_Pass'] = frame.Trend_Template_Score == 9
    return frame
