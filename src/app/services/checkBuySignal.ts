import {
  StockData,
  BuySignalResult,
  StrategyParams,
} from '../interfaces/stockData';
import { calculateConfidence } from './calculateConfidence';

/**
 * 買入信號檢查器 (優化版 - Python階層決策系統)
 *
 * 用途：綜合多個條件判斷是否應該買入股票
 *
 * 優化特點：
 * - 支援 Python 風格的階層決策
 * - 可切換嚴格/寬鬆模式
 * - 更詳細的日誌記錄
 *
 * 階層決策流程：
 * 第一層：基礎技術指標篩選
 * 第二層：趨勢確認
 * 第三層：信心度評估
 * 第四層：風險控制
 *
 * @param current - 當前股票數據
 * @param strategyParams - 策略參數
 * @param previous - 前一天股票數據（可選）
 * @returns BuySignalResult - 買入信號結果
 */
export const checkBuySignal = (
  current: StockData,
  strategyParams: StrategyParams,
  previous?: StockData,
): BuySignalResult => {
  const dateStr = current.date.toISOString().split('T')[0];
  const isPythonMode = strategyParams.usePythonLogic;

  console.log(
    `🔍 ${dateStr} 開始${isPythonMode ? 'Python階層' : '標準'}決策分析...`,
  );

  // 第一層：數據完整性檢查
  if (!current.rsi || !current.macd || !current.macdSignal) {
    console.log(
      `🚫 ${dateStr} 數據不足: RSI=${current.rsi}, MACD=${current.macd}, Signal=${current.macdSignal}`,
    );
    return { signal: false, reason: '數據不足' };
  }

  const rsi = current.rsi;
  const macd = current.macd;
  const macdSignal = current.macdSignal;
  const volumeRatio = current.volumeRatio || 0;

  console.log(
    `� ${dateStr} 技術指標 - RSI: ${rsi.toFixed(2)}, MACD: ${macd.toFixed(
      4,
    )}, 量比: ${volumeRatio.toFixed(2)}`,
  );

  // 第二層：基礎技術指標篩選（Python風格更嚴格）
  if (isPythonMode && strategyParams.hierarchicalDecision) {
    // Python 階層決策：嚴格的條件檢查

    // 檢查 1: RSI 超賣條件
    if (rsi > strategyParams.rsiOversold) {
      console.log(
        `🚫 ${dateStr} Python模式 - RSI不符合條件: ${rsi.toFixed(2)} > ${
          strategyParams.rsiOversold
        }`,
      );
      return {
        signal: false,
        reason: `RSI不符合條件 (Python嚴格模式: >${strategyParams.rsiOversold})`,
      };
    }

    // 檢查 2: MACD 黃金交叉
    if (macd <= macdSignal) {
      console.log(
        `🚫 ${dateStr} Python模式 - MACD未黃金交叉: ${macd.toFixed(
          4,
        )} <= ${macdSignal.toFixed(4)}`,
      );
      return { signal: false, reason: 'MACD未黃金交叉' };
    }

    // 檢查 3: RSI 回升確認
    if (!previous || rsi <= (previous.rsi || 0)) {
      console.log(
        `🚫 ${dateStr} Python模式 - RSI未回升: ${rsi.toFixed(2)} <= ${
          previous?.rsi?.toFixed(2) || 'N/A'
        }`,
      );
      return { signal: false, reason: 'RSI未回升' };
    }

    // 檢查 4: 成交量確認
    if (volumeRatio < strategyParams.volumeThreshold) {
      console.log(
        `🚫 ${dateStr} Python模式 - 成交量不足: ${volumeRatio.toFixed(2)} < ${
          strategyParams.volumeThreshold
        }`,
      );
      return { signal: false, reason: '成交量不足' };
    }

    // 檢查 5: K線型態確認
    if (current.close <= current.open) {
      console.log(
        `🚫 ${dateStr} Python模式 - 收黑K線: Close=${current.close} <= Open=${current.open}`,
      );
      return { signal: false, reason: '收黑K線' };
    }

    // 檢查 6: 價格動能確認（Python額外條件）
    if (
      strategyParams.enablePriceMomentum &&
      current.priceMomentum !== undefined
    ) {
      if (current.priceMomentum < 0) {
        console.log(
          `🚫 ${dateStr} Python模式 - 價格動能為負: ${(
            current.priceMomentum * 100
          ).toFixed(2)}%`,
        );
        return { signal: false, reason: '價格動能為負' };
      }
    }
  } else {
    // 原版較寬鬆的條件檢查
    if (rsi > strategyParams.rsiOversold) {
      console.log(
        `🚫 ${dateStr} 標準模式 - RSI不符合條件: ${rsi.toFixed(2)} > ${
          strategyParams.rsiOversold
        }`,
      );
      return {
        signal: false,
        reason: `RSI不符合條件 (>${strategyParams.rsiOversold})`,
      };
    }

    if (macd <= macdSignal) {
      console.log(
        `🚫 ${dateStr} 標準模式 - MACD未黃金交叉: ${macd.toFixed(
          4,
        )} <= ${macdSignal.toFixed(4)}`,
      );
      return { signal: false, reason: 'MACD未黃金交叉' };
    }

    if (!previous || rsi <= (previous.rsi || 0)) {
      console.log(
        `🚫 ${dateStr} 標準模式 - RSI未回升: ${rsi.toFixed(2)} <= ${
          previous?.rsi?.toFixed(2) || 'N/A'
        }`,
      );
      return { signal: false, reason: 'RSI未回升' };
    }

    if (volumeRatio < strategyParams.volumeThreshold) {
      console.log(
        `🚫 ${dateStr} 標準模式 - 成交量不足: ${volumeRatio.toFixed(2)} < ${
          strategyParams.volumeThreshold
        }`,
      );
      return { signal: false, reason: '成交量不足' };
    }

    if (current.close <= current.open) {
      console.log(
        `🚫 ${dateStr} 標準模式 - 收黑K線: Close=${current.close} <= Open=${current.open}`,
      );
      return { signal: false, reason: '收黑K線' };
    }
  }

  // 第三層：信心度評估
  const confidence = calculateConfidence(current, strategyParams, previous);
  const confidenceThreshold = strategyParams.confidenceThreshold;

  if (confidence < confidenceThreshold) {
    console.log(
      `🚫 ${dateStr} 信心度不足: ${(confidence * 100).toFixed(1)}% < ${(
        confidenceThreshold * 100
      ).toFixed(1)}%`,
    );
    return {
      signal: false,
      reason: `信心度不足: ${(confidence * 100).toFixed(1)}% < ${(
        confidenceThreshold * 100
      ).toFixed(1)}%`,
    };
  }

  // 通過所有檢查！
  console.log(
    `✅ ${dateStr} ${
      isPythonMode ? 'Python階層決策' : '標準決策'
    }通過！信心度: ${(confidence * 100).toFixed(1)}%`,
  );
  return {
    signal: true,
    reason: `${isPythonMode ? 'Python階層決策' : '標準'}買進訊號，信心度: ${(
      confidence * 100
    ).toFixed(1)}%`,
    confidence,
  };
};
