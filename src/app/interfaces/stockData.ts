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
  ma60?: number; // 新增MA60季線
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
    initialCapital: number;
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
  }[];
}

export interface StrategyParams {
  rsiPeriod: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  volumeThreshold: number;
  volumeLimit: number;
  maxPositionSize: number;
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
  enableMA60: boolean; // 是否啟用MA60季線確認
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
