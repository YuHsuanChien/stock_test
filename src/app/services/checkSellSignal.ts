// 🔍 checkSellSignal.ts 的調試版本

import {
  StockData,
  StrategyParams,
  Position,
  SellSignalResult,
} from '../interfaces/stockData';

/**
 * 賣出信號檢查器 (調試版)
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
  const dateStr = current.date.toISOString().split('T')[0];

  // 🔍 調試：追蹤停利詳細檢查
  if (
    current.symbol === '1517' &&
    ['2024-12-12', '2024-12-13', '2024-12-16', '2024-12-17'].includes(dateStr)
  ) {
    console.log(`🎯 前端 checkSellSignal ${dateStr} 進入檢查:`, {
      當前價格_收盤: currentPrice,
      當日最高價: current.high,
      當日最低價: current.low,
      進場價格: entryPrice,
      當前獲利率: (profitRate * 100).toFixed(2) + '%',
      持有天數: holdingDays,
      進場後最高價_檢查前: position.highPriceSinceEntry,
    });
  }

  // 🔍 檢查原有邏輯：更新進場後最高價 (這裡可能有問題)
  if (currentPrice > position.highPriceSinceEntry) {
    const oldHigh = position.highPriceSinceEntry;
    position.highPriceSinceEntry = currentPrice;

    // 🔍 調試日誌
    if (current.symbol === '1517') {
      console.log(
        `📈 checkSellSignal ${dateStr} 用收盤價更新最高價: ${oldHigh} → ${currentPrice}`,
      );
      console.log(`⚠️ 注意：這裡使用收盤價而非當日最高價 ${current.high}`);
    }
  }

  // 高優先級: 追蹤停利機制
  if (strategyParams.enableTrailingStop) {
    const profitSinceEntry =
      (position.highPriceSinceEntry - entryPrice) / entryPrice;

    // 🔍 調試：追蹤停利計算過程
    if (
      current.symbol === '1517' &&
      ['2024-12-12', '2024-12-13', '2024-12-16', '2024-12-17'].includes(dateStr)
    ) {
      console.log(`🎯 前端 checkSellSignal ${dateStr} 追蹤停利計算:`, {
        進場後最高價: position.highPriceSinceEntry,
        最高獲利率: (profitSinceEntry * 100).toFixed(2) + '%',
        啟動門檻:
          (strategyParams.trailingActivatePercent * 100).toFixed(1) + '%',
        停利百分比: (strategyParams.trailingStopPercent * 100).toFixed(1) + '%',
        是否達到啟動門檻:
          profitSinceEntry >= strategyParams.trailingActivatePercent,
      });
    }

    // 只有獲利超過啟動門檻才啟用追蹤停利
    if (profitSinceEntry >= strategyParams.trailingActivatePercent) {
      const trailingStopPrice =
        position.highPriceSinceEntry * (1 - strategyParams.trailingStopPercent);
      position.trailingStopPrice = trailingStopPrice;

      // 🔍 調試：停利價格計算和觸發檢查
      if (
        current.symbol === '1517' &&
        ['2024-12-12', '2024-12-13', '2024-12-16', '2024-12-17'].includes(
          dateStr,
        )
      ) {
        console.log(`🎯 前端 checkSellSignal ${dateStr} 追蹤停利觸發檢查:`, {
          計算出的停利價: trailingStopPrice.toFixed(4),
          當前收盤價: currentPrice,
          當日最低價: current.low,
          用收盤價檢查: currentPrice <= trailingStopPrice ? '觸發' : '未觸發',
          用最低價檢查: current.low <= trailingStopPrice ? '觸發' : '未觸發',
          實際使用邏輯: '收盤價檢查',
        });
      }

      if (currentPrice <= trailingStopPrice) {
        // 🔍 調試：觸發賣出信號
        if (current.symbol === '1517') {
          console.log(`🔴 前端 checkSellSignal ${dateStr} 追蹤停利觸發！`, {
            觸發價格: trailingStopPrice.toFixed(4),
            當前價格: currentPrice,
            獲利率: (profitRate * 100).toFixed(2) + '%',
          });
        }

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
      if (current.symbol === '1517') {
        console.log(`🔴 前端 checkSellSignal ${dateStr} ATR停損觸發`);
      }
      return {
        signal: true,
        reason: `ATR動態停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
      };
    }
  }

  // 基礎停利停損
  if (profitRate >= strategyParams.stopProfit) {
    if (current.symbol === '1517') {
      console.log(`🔴 前端 checkSellSignal ${dateStr} 固定停利觸發`);
    }
    return {
      signal: true,
      reason: `固定停利出場，獲利: ${(profitRate * 100).toFixed(2)}%`,
    };
  }

  if (profitRate <= -strategyParams.stopLoss) {
    if (current.symbol === '1517') {
      console.log(`🔴 前端 checkSellSignal ${dateStr} 固定停損觸發`);
    }
    return {
      signal: true,
      reason: `固定停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
    };
  }

  // 中優先級: 持有天數保護 (避免剛進場就被技術指標洗出)
  if (holdingDays <= strategyParams.minHoldingDays) {
    // 在保護期內，只允許重大虧損出場
    if (profitRate <= -strategyParams.stopLoss * 1.5) {
      if (current.symbol === '1517') {
        console.log(`🔴 前端 checkSellSignal ${dateStr} 保護期重大虧損觸發`);
      }
      return {
        signal: true,
        reason: `保護期內重大虧損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
      };
    }
    // 其他情況不出場
    if (current.symbol === '1517') {
      console.log(`🛡️ 前端 checkSellSignal ${dateStr} 保護期內，不出場`);
    }
    return { signal: false, reason: '' };
  }

  // 技術指標出場 (保護期後才生效)
  if ((current.rsi || 0) > 70) {
    if (current.symbol === '1517') {
      console.log(`🔴 前端 checkSellSignal ${dateStr} RSI超買觸發`);
    }
    return { signal: true, reason: 'RSI超買出場' };
  }

  if (
    (current.macd || 0) < (current.macdSignal || 0) &&
    (current.macdHistogram || 0) < 0
  ) {
    if (current.symbol === '1517') {
      console.log(`🔴 前端 checkSellSignal ${dateStr} MACD死叉觸發`);
    }
    return { signal: true, reason: 'MACD死亡交叉出場' };
  }

  // 長期持有出場
  if (holdingDays > 30) {
    if (current.symbol === '1517') {
      console.log(`🔴 前端 checkSellSignal ${dateStr} 長期持有觸發`);
    }
    return { signal: true, reason: '持有超過30天出場' };
  }

  // 沒有觸發任何賣出條件
  if (current.symbol === '1517') {
    console.log(`✅ 前端 checkSellSignal ${dateStr} 無賣出信號，繼續持有`);
  }

  return { signal: false, reason: '' };
};
