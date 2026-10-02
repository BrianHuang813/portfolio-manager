import pandas as pd
from trend_template import trend_template
from screens import screens


def test_nine_conditions(config):
    frame = pd.DataFrame([dict(Price=100., MA50=95., MA150=90., MA200=80., MA200_20D_Ago=75., High_52W=105., Low_52W=60., Annual_RS=90)])
    result = trend_template(frame, config['trend_template'])
    assert result.Trend_Template_Pass[0]
    assert result.Trend_Template_Score[0] == 9
    result.loc[0, 'MA200_20D_Ago'] = 85
    assert not trend_template(result, config['trend_template']).Trend_Template_Pass[0]


def test_utility_screen_does_not_require_52w_low(config):
    frame = pd.DataFrame([dict(Price=100, MA50=95, MA200=80, High_200D=105, Low_52W=99, Utility_RS=85, Utility_Active=True, Avg_Dollar_Volume_20=100000000)])
    assert screens(frame, config).Utility_Screen_Pass[0]
