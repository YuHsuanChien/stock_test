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

export interface Position {
  entryDate: Date; // 實際進場日期
  entryPrice: number;
  quantity: number;
  investAmount: number;
  confidence?: number;
  buySignalDate?: Date; // 買進訊號日期
  // 新增追蹤停利相關欄位
  highPriceSinceEntry: number; // 進場後最高價
  trailingStopPrice: number; // 追蹤停損價
  atrStopPrice?: number; // ATR動態停損價
  entryATR?: number; // 進場時的ATR值
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
