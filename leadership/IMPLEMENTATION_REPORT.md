# Minervini Leadership Engine 實作與驗收報告

資料日期：2026-10-01。下列數字來自本機實際產生的輸出，並非合成測試結果。

1. **新增檔案**：`leadership/` 下的 annual_rs、market_state、utility_rs、rs_history、rs_line、trend_template、screens、classifications、pipeline、report 模組；config、requirements、README、tests；附來源版本與授權的 `vendor/fred`；`src/pages/Leadership.tsx`、services/leadership、types/leadership、前端測試；`scripts/leadership.mjs`；`.github/workflows/leadership.yml`。
2. **修改檔案**：App 路由、NavBar、package.json 快捷指令、README、.gitignore。Fred ranker 完整保留；資料模組僅延後 import 時的網路呼叫並保留公司名稱。
3. **Annual RS 相容性**：50 檔合成股票直接對原始 Fred 函式、60 檔合成完整歷史股票對完整原始 ranker CSV，percentile 完全一致。本次真實輸出另外抽樣 50 檔，對當期保留的 Fred CSV 最大 percentile 差異為 0。生產環境直接 join 原始 ranker 輸出；不足 252 session 另遮罩為 null。沒有更換年度權重、truncation、qcut 或 SPY。原始 1M/3M/6M 欄位是目前 universe 的回算，不當作每日快照。
4. **Utility RS**：N×25%/50%/75%/100% 四視窗，Python round，.4/.2/.2/.2 加權，SPY 正規化後 qcut；inactive / 歷史不足為 null。一般流動性另列，Utility 篩選依規格使用 $100M ADV20，沒有低點 +30% 條件。
5. **市場狀態**：最後一次 Close 等於歷史 rolling 200D high 的交易日位置；目前 `CORRECTION`，距高點 34 sessions，Utility active `True`，window `34`。獨立三年 SPY 市場快取不修改原始 annual price cache。
6. **輸出 schema**：leadership_stocks 包含規格全部必填欄位、九項 tt_* 明細、industry/sector percentile、資料品質、40D lag、RS Line 距高點、liquidity/annual eligibility。utility_screen、emerging_leaders 降冪排序；market_state JSON；run_summary JSON。CSV 空欄 / JSON null；百分比距離使用小數比例。Parquet 儲存 Date、Ticker、Annual_RS、Utility_RS、Price，Date/Ticker 唯一，同日重跑 replace。完整說明見 README。
7. **測試**：22 項 Python 測試、26 項前端測試通過；一般網址與 /portfolio-manager/ 子路徑 build 通過。涵蓋 20/21/200/201 邊界、百分位、RS Line、Trend Template、分類、null、原始 ranker、輸出與 Parquet idempotence。瀏覽器視覺檢查因 computer-use sandbox 初始化失敗未完成，頁面元件測試與 HTTP 200 已確認。
8. **股票 universe**：6,961 檔（不含 SPY）；當期有價格 6,737 檔；Annual RS 有效 5,628 檔；Utility RS 有效 6,433 檔。
9. **缺當期價格股票**：224 檔，其中實際下載失敗 3 檔，過期日線 221 檔。股票清單：AACOW, ADACW, AEAQW, AENTW, AESPR, AESPW, AFRIW, AIMDW, ALDFW, ALISR, ALOVW, ALPXR, ALPXW, ANGHW, ANNAW, APACR, APLMW, ASBPW, ASPCR, ATLQR, ATLQW, ATTT, AXINR, BCGWW, BDCIW, BDMDW, BETRW, BFRIW, BHAVR, BIAFW, BIDWR, BIVIW, BKHAR, BLRKW, BLUWW, BNCWW, BNCWZ, BPACR, BRKHW, BSAAR, BTBDW, CAIIW, CAPNR, CAQUW, CCCTW, CDROW, CDTTW, CHARR, CHPGR, CINGW, CNCKW, COOTW, CRACR, CRACW, CRAQR, CTAAR, CUBWW, DAAQW, DFSCW, DMIIR, DRDBW, DSACW, DSYWW, DYORW, EMISR, ENGNW, ESLAW, EUDAW, FACTW, FBYDP, FBYDW, FDMMW, FGIIW, FGIWW, FIGXW, FJDIW, FMACR, FMSTW, FOXXW, FTHAW, FWACW, FXACW, GGROW, GIBOW, GIWWR, GIXXR, GPACW, GSHRW, GTENW, GTERW, GUACW, HACQW, HAVAR, HCICR, HCMAW, HPAIW, HSCSW, HUBCZ, HVMCW, IACOW, IACQW, ICUCW, IDACW, ILLUW, INACR, IPVVW, IPXGW, ITHAW, KBONW, KFIIR, KOYNW, KTWOR, LATAW, LCCCR, LCFYW, LFACW, LIMNW, LOTWW, LPAAW, LPBBW, LPCVW, LTGRW, LWACW, MACIW, MBVIW, MDCXW, MESHW, MEVOW, MKDWW, MLAAW, MMEDV, MMTXW, MUZEW, MYXXR, MYXXW, NBRGR, NCOOW, NEXRW, NHIVW, NIOBW, NPACW, NRSNW, NSTR, NXATW, NXGLW, OABIW, OBAWW, OCSAW, OGGWZ, OHACR, OIMAW, OIOWW, ONCHW, ORIQW, PACHW, PALOW, PCTTW, PECER, PECEW, PGACR, PLCIR, PLMKW, POLEW, PONOR, PRENW, PRHIZ, PTACW, PTORW, QADRW, QETAR, RAINW, REVBW, RFAMR, RMCOW, RREVW, SAIHW, SBFMW, SCIIR, SCLXW, SCPQW, SDAWW, SDHIR, SHOTR, SIMAW, SORNW, SPEGR, SQFTW, STLNW, SUMAR, SVA, SVAQW, SVCCW, SVIVW, SVREW, SXTPW, SZZLR, TACHW, TACOW, TAVIR, TDACW, TDWDR, THEOR, TMTSW, TRGSR, TVACW, TVAIR, TVIVW, TWLVR, UCFIW, UYSCR, VHCPW, VLOSW, WENNW, WHLRL, WLDSW, WSTNR, XBPEW, XCBEW, XSLLW, YHNAR, YICCW, ZEOWW, ZKPW, ZOOZW。保留於完整表並標記，不靜默丟棄或沿用舊價格。
10. **資料品質**：1,385 檔有至少一項標記；各標記可重疊：

- MISSING_HISTORY: 1126
- MISSING_SECTOR: 717
- MISSING_INDUSTRY: 717
- MISSING_VOLUME: 488
- STALE_PRICE: 221
- POSSIBLE_SPLIT: 69
- PRICE_FETCH_ERROR: 3

11. **GitHub Actions**：workflow 已建立，每個工作日 23:30 UTC 使用單一 fetch/rank/enrich 管線，還原前次成功的歷史並保存 artifacts。程式尚未推送或觸發雲端 workflow，因此不能宣稱 Actions 已成功執行。GitHub Pages 部署為可選設定，沒有擅自發布網站。
12. **Utility Screen 前 10 檔**（當期總數 150）：

| Ticker | Price | Annual_RS | Utility_RS | Annual_RS_Change_20D |
| --- | --- | --- | --- | --- |
| GRAL | 132.56 | 97.00 | 99.00 | — |
| IOVA | 14.23 | 99.00 | 99.00 | — |
| KOD | 98.46 | 99.00 | 99.00 | — |
| MRNA | 188.94 | 99.00 | 99.00 | — |
| VICR | 308.59 | 99.00 | 99.00 | — |
| ACVA | 10.45 | 93.00 | 98.00 | — |
| ASST | 30.11 | 98.00 | 98.00 | — |
| FORM | 148.44 | 98.00 | 98.00 | — |
| OKTA | 212.63 | 98.00 | 98.00 | — |
| TWST | 188.05 | 99.00 | 98.00 | — |

13. **Emerging Leaders 前 10 檔**（當期總數 0）：

目前沒有符合條件的股票；不填入合成或替代結果。

14. **剩餘限制**：首次跑沒有 5/20/60D 歷史，相關動能欄位為 null，Emerging 需累積快照。Yahoo 個別錯誤或限流仍可能造成缺資料；調整後價格異常只是 corporate-action 警示，非確認拆股。並未回建歷史 universe 或進行績效/預測效力回測。附加計算本次耗時 15.592 秒；完整管線相對原始 Fred 的 3× 性能目標未做獨立全市場對照。Artifact 保留 90 日；長期停跑須另備份 Parquet。雲端 workflow 與實際網站部署仍待執行。
