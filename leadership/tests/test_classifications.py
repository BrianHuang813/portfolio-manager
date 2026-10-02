import pandas as pd
from classifications import classify


def test_classifications(config):
    common = dict(Utility_Active=False, Utility_RS=None, Annual_RS_Change_20D=10, Trend_Template_Pass=True, Pct_From_200D_High=-.05, Price=100, MA200=80)
    rows = [dict(common, Annual_RS=90), dict(common, Annual_RS=70), dict(common, Annual_RS=89, Utility_Active=True, Utility_RS=90), dict(common, Annual_RS=89, Annual_RS_Change_20D=-10), dict(common, Annual_RS=80, Utility_Active=True)]
    result = classify(pd.DataFrame(rows), config['classifications'])
    assert result.Established_Leader.tolist() == [True, False, False, False, False]
    assert result.Emerging_Leader.tolist() == [False, True, True, False, False]
    assert result.Resilient_Leader.tolist() == [False, False, True, False, False]
    assert result.Fading_Leader.tolist() == [False, False, False, True, False]
