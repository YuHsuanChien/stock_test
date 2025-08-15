import {
  StockData,
  StrategyParams,
  Position,
  SellSignalResult,
} from '../interfaces/stockData';

/**
 * 賣出信號檢查器 (優化版)
 *
 * 用途：綜合多種出場條件判斷是否應該賣出股票
 * 出場條件：
 * 1. 基礎停利停損
 * 2. 追蹤停利機制 (高優先級)
 * 3. ATR動態停損 (中優先級)
 * 4. 持有天數保護 (中優先級)
 * 5. 技術指標確認
 *
 * @param current - 當前股票數據
 * @param position - 持倉資訊
 * @param holdingDays - 持有天數
 * @param strategyParams - 策略參數
 * @returns SellSignalResult - 賣出信號結果
 */
export const checkSellSignal = (
  current: StockData,
  position: Position,
  holdingDays: number,
  strategyParams: StrategyParams,
): SellSignalResult => {
  const currentPrice = current.close;
  const entryPrice = position.entryPrice;
  const profitRate = (currentPrice - entryPrice) / entryPrice;

  // 更新進場後最高價 (追蹤停利用)
  if (currentPrice > position.highPriceSinceEntry) {
    position.highPriceSinceEntry = currentPrice;
  }

  // 高優先級: 追蹤停利機制
  if (strategyParams.enableTrailingStop) {
    const profitSinceEntry =
      (position.highPriceSinceEntry - entryPrice) / entryPrice;

    // 只有獲利超過啟動門檻才啟用追蹤停利
    if (profitSinceEntry >= strategyParams.trailingActivatePercent) {
      const trailingStopPrice =
        position.highPriceSinceEntry * (1 - strategyParams.trailingStopPercent);
      position.trailingStopPrice = trailingStopPrice;

      if (currentPrice <= trailingStopPrice) {
        return {
          signal: true,
          reason: `追蹤停利出場，最高點回落: ${(
            strategyParams.trailingStopPercent * 100
          ).toFixed(1)}%，最高獲利: ${(profitSinceEntry * 100).toFixed(
            2,
          )}%，當前獲利: ${(profitRate * 100).toFixed(2)}%`,
        };
      }
    }
  }

  // 中優先級: ATR動態停損
  if (strategyParams.enableATRStop && position.atrStopPrice) {
    if (currentPrice <= position.atrStopPrice) {
      return {
        signal: true,
        reason: `ATR動態停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
      };
    }
  }

  // 基礎停利停損
  if (profitRate >= strategyParams.stopProfit) {
    return {
      signal: true,
      reason: `固定停利出場，獲利: ${(profitRate * 100).toFixed(2)}%`,
    };
  }

  if (profitRate <= -strategyParams.stopLoss) {
    return {
      signal: true,
      reason: `固定停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
    };
  }

  // 中優先級: 持有天數保護 (避免剛進場就被技術指標洗出)
  if (holdingDays <= strategyParams.minHoldingDays) {
    // 在保護期內，只允許重大虧損出場
    if (profitRate <= -strategyParams.stopLoss * 1.5) {
      return {
        signal: true,
        reason: `保護期內重大虧損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
      };
    }
    // 其他情況不出場
    return { signal: false, reason: '' };
  }

  // 技術指標出場 (保護期後才生效)
  if ((current.rsi || 0) > 70) {
    return { signal: true, reason: 'RSI超買出場' };
  }

  if (
    (current.macd || 0) < (current.macdSignal || 0) &&
    (current.macdHistogram || 0) < 0
  ) {
    return { signal: true, reason: 'MACD死亡交叉出場' };
  }

  // 長期持有出場
  if (holdingDays > 30) {
    return { signal: true, reason: '持有超過30天出場' };
  }

  return { signal: false, reason: '' };
};
