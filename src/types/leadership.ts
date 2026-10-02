export interface LeadershipStock {
  Date: string
  Ticker: string
  Company: string | null
  Sector: string | null
  Industry: string | null
  Price: number | null
  Annual_RS: number | null
  Utility_RS: number | null
  Annual_RS_Change_20D: number | null
  RS_Line_New_High: boolean
  RS_Line_Leading_Price: boolean
  Trend_Template_Score: number
  Trend_Template_Pass: boolean
  Utility_Screen_Pass: boolean
  Established_Leader: boolean
  Emerging_Leader: boolean
  Resilient_Leader: boolean
  Fading_Leader: boolean
  data_quality_flag: string
  [key: string]: string | number | boolean | null
}

export interface LeadershipSnapshot {
  market: {
    date: string
    benchmark: string
    state: string
    days_since_200d_high: number
    drawdown_from_200d_high: number
    utility_active: boolean
    utility_window: number | null
  }
  summary: {
    universe_size: number
    failed_tickers: number
    data_quality_warnings: number
  }
  stocks: LeadershipStock[]
}
