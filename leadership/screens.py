def screens(frame, config):
    utility = config['utility']
    frame['Utility_Screen_Pass'] = (frame.Utility_Active & (frame.Utility_RS >= utility['rs_threshold']) &
        (frame.Price > frame.MA200) & (frame.MA50 > frame.MA200) &
        (frame.Avg_Dollar_Volume_20 >= utility['min_avg_dollar_volume']) &
        (frame.Price >= frame.High_200D * (1 - utility['max_distance_from_200d_high'])))
    liquidity = config['liquidity']
    frame['Liquidity_Pass'] = (frame.Price >= liquidity['min_price']) & (frame.Avg_Dollar_Volume_20 >= liquidity['min_avg_dollar_volume'])
    return frame
