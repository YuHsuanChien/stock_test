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
  date: string; // API 返回的是字串格式的日期
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // 根據你的 API 實際返回的欄位添加其他屬性
}
