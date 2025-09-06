// 型別定義
export interface StockData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  ma20?: number;
  ma5?: number;
  ma10?: number; // 新增MA10中線
  ma60?: number; // 新增MA60長線
  volumeMA20?: number;
  volumeRatio?: number;
  atr?: number; // 新增ATR指標
  priceMomentum?: number; // 新增價格動能指標
  // RSI計算用的中間變數
  avgGain?: number;
  avgLoss?: number;
  // MACD計算用的EMA值
  ema12?: number;
  ema26?: number;
}

/**
 * 富邦證券API返回的原始股票數據格式
 */
export interface RawStockData {
  stockId: number; // 股票ID
  tradeDate: string; // API 返回的日期字串
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestResults {
  performance: {
    finalCapital: number;
    totalReturn: number;
    annualReturn: number;
    totalProfit: number;
    maxDrawdown: number;
  };
  trades: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    maxWin: number;
    maxLoss: number;
    avgHoldingDays: number;
    profitFactor: number; // 新增獲利因子
  };
  detailedTrades: TradeResult[];
  equityCurve: {
    date: string;
    value: number;
    cash: number;
    positions: number;
  }[];
  stockPerformance: {
    stock: string;
    trades: number;
    winRate: number;
    totalProfit: number;
    totalInvestment: number; // 新增：實際投入成本
    returnRate: number; // 新增：真實報酬率（百分比）
  }[];
  // 新增：高低點分析結果
  highLowAnalysis?: {
    [symbol: string]: HighLowAnalysis;
  };
  // 新增：圖表數據
  chartData?: {
    [symbol: string]: {
      stockData: StockData[];
      highLowPoints: HighLowPoint[];
      buyPoints?: BuyPoint[]; // 新增買點數據
      sellPoints?: SellPoint[]; // 新增賣點數據
    };
  };
}

export interface WStrategyParams {
  strategy: string;

  // 底底高、頭頭高分析
  enableHighLowAnalysis: boolean; // 啟用底底高、頭頭高分析
  showHighLowChart: boolean; // 顯示標記圖表

  // 基本進場條件（暫時保留，後續可擴展）
  ma5Breakthrough: boolean; // 必須站上MA5
  previousHighBreak: boolean; // 必須突破前日高點
  volumeConfirm: boolean; // 是否需要量能確認
  volumeThreshold: number; // 量能倍數 (預設1.2倍)
  ma20UpTrend: boolean; // 20線向上條件
  ma60UpTrend: boolean; // 60線向上條件
  bullishAlignment: boolean; // 多頭排列條件 (5日>20日>60日)

  // 風控參數
  stopProfit: number; // 停利比例 (預設15%)
  // 注意：W策略停損機制為跌破買入訊號日開盤價，現在固定買1000股

  // 新增：回後買上漲策略
  enableBuyUpTrend: boolean; // 啟用回後買上漲策略
  showBuyPoints: boolean; // 顯示買點標記

  // 新增：MA5跌破賣出功能
  enableMA5SellSignal: boolean; // 啟用跌破MA5賣出訊號

  // 新增：價格區間限制功能
  enablePriceRangeFilter: boolean; // 啟用價格區間過濾
  minPrice?: number; // 最低價格限制
  maxPrice?: number; // 最高價格限制
}

// 2. 高低點標記數據結構
export interface HighLowPoint {
  date: Date;
  price: number;
  type: 'HIGH' | 'LOW';
  index: number; // 在序列中的索引
  cycleStart: Date; // 週期開始日期
  cycleEnd: Date; // 週期結束日期
  confirmed: boolean; // 是否已確認
}

// 新增：買點標記數據結構
export interface BuyPoint {
  date: Date;
  price: number;
  index: number;
  reason: string;
  confirmed: boolean;
}

// 新增：賣點標記數據結構
export interface SellPoint {
  date: Date;
  price: number;
  index: number;
  reason: string;
  profit?: number;
  profitRate?: number;
  holdingDays?: number;
}

// 3. 底底高、頭頭高分析結果
export interface HighLowAnalysis {
  highs: HighLowPoint[]; // 所有高點
  lows: HighLowPoint[]; // 所有低點
  isHigherHighs: boolean; // 是否符合頭頭高
  isHigherLows: boolean; // 是否符合底底高
  trendConfirmed: boolean; // 趨勢確認（兩者都成立）
  lastAnalysisDate: Date; // 最後分析日期
}

export interface RsiStrategyParams {
  strategy: string;
  rsiPeriod: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  volumeThreshold: number;
  volumeLimit: number;
  stopLoss: number;
  stopProfit: number;
  confidenceThreshold: number;
  // 高優先級新增參數
  enableTrailingStop: boolean; // 是否啟用追蹤停利
  trailingStopPercent: number; // 追蹤停利百分比
  trailingActivatePercent: number; // 追蹤停利啟動門檻
  // 中優先級新增參數
  enableATRStop: boolean; // 是否啟用ATR動態停損
  atrPeriod: number; // ATR計算週期
  atrMultiplier: number; // ATR停損倍數
  minHoldingDays: number; // 最小持有天數保護
  enablePriceMomentum: boolean; // 是否啟用價格動能指標
  priceMomentumPeriod: number; // 價格動能計算週期
  priceMomentumThreshold: number; // 價格動能門檻
  // 低優先級新增參數
  enableMA10: boolean; // 是否啟用MA10中線確認
  // 新增：Python風格優化參數
  maxTotalExposure: number; // 最大總曝險度 (Python風格)
  usePythonLogic: boolean; // 啟用Python決策邏輯
  hierarchicalDecision: boolean; // 階層決策模式
  dynamicPositionSize: boolean; // 動態倉位調整
}

export interface BuySignalResult {
  signal: boolean;
  reason: string;
  confidence?: number;
}

export interface SellSignalResult {
  signal: boolean;
  reason: string;
}

export interface TradeResult {
  stock: string;
  action: string;
  date: Date; // 實際執行日期（買入/賣出）
  price: number;
  quantity: number;
  amount: number;
  // 詳細日期資訊
  buySignalDate?: Date; // 買進訊號日期
  sellSignalDate?: Date; // 賣出訊號日期
  actualBuyDate?: Date; // 實際購買日期
  actualSellDate?: Date; // 實際賣出日期
  // 舊欄位保留向後相容
  entryPrice?: number;
  entryDate?: Date;
  holdingDays?: number;
  profit?: number;
  profitRate?: number;
  reason: string;
  confidence?: number;
}
