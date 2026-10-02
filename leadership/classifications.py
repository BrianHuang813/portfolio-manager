def classify(frame, config):
    active = frame.Utility_Active
    frame['Established_Leader'] = (frame.Annual_RS >= config['established_rs_min']) & frame.Trend_Template_Pass
    frame['Emerging_Leader'] = ((frame.Annual_RS >= config['emerging_rs_min']) &
        (frame.Annual_RS < config['emerging_rs_max']) &
        (frame.Annual_RS_Change_20D >= config['emerging_change_min']) &
        (~active | (frame.Utility_RS >= config['emerging_utility_min'])))
    frame['Resilient_Leader'] = (active & (frame.Utility_RS >= config['resilient_utility_min']) &
        (frame.Pct_From_200D_High >= -config['resilient_max_drawdown']) & (frame.Price > frame.MA200))
    fading = (frame.Annual_RS >= config['fading_rs_min']) & (frame.Annual_RS_Change_20D <= config['fading_change_max'])
    if config['fading_require_weak_utility']:
        fading &= ~active | (frame.Utility_RS < config['fading_utility_max'])
    frame['Fading_Leader'] = fading
    return frame
