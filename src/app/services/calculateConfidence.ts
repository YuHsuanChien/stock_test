import { StockData, StrategyParams } from '../interfaces/stockData';

/**
 * 買入信心度計算器 (優化版 - 結合Python階層決策)
 *
 * 用途：根據多個技術指標計算進場的信心度分數
 * 優化特點：
 * - 支援 Python 風格的階層決策模式
 * - 更精確的權重分配
 * - 動態調整評分標準
 *
 * 評估因子：
 * - RSI深度分析 (+0.15~0.30)：分層評估超賣程度
 * - MACD趨勢確認 (+0.10~0.25)：黃金交叉強度判斷
 * - 成交量驗證 (+0.05~0.15)：資金流入確認
 * - 趨勢排列 (+0.05~0.15)：多頭格局評估
 * - 價格動能 (+0.05~0.10)：短期動力評估
 *
 * @param current - 當前股票數據
 * @param strategyParams - 策略參數
 * @param previous - 前一天股票數據（可選）
 * @returns number - 信心度分數 (0.0-0.95)
 */
export const calculateConfidence = (
  current: StockData,
  strategyParams: StrategyParams,
  previous?: StockData,
): number => {
  // Python 風格：較低的起始信心度，透過嚴格評估提升
  let confidence = strategyParams.usePythonLogic ? 0.3 : 0.45;

  console.log(
    `🧮 開始計算信心度，Python模式: ${strategyParams.usePythonLogic}`,
  );

  // RSI 深度分析（Python 風格更嚴格）
  const rsi = current.rsi || 0;
  if (strategyParams.usePythonLogic) {
    // Python 階層決策：更嚴格的 RSI 評分
    if (rsi < 20) {
      confidence += 0.35; // 極度超賣，高度看多
    } else if (rsi < 25) {
      confidence += 0.3; // 深度超賣
    } else if (rsi < 30) {
      confidence += 0.25; // 標準超賣
    } else if (rsi < 35) {
      confidence += 0.15; // 輕度超賣
    } else {
      // RSI > 35，Python 模式下直接降低信心度
      confidence -= 0.1;
    }
  } else {
    // 原版較寬鬆的評分
    if (rsi < 25) {
      confidence += 0.25;
    } else if (rsi < 35) {
      confidence += 0.2;
    } else if (rsi < 45) {
      confidence += 0.15;
    }
  }

  // RSI 回升趨勢（兩種模式都支援）
  if (previous && rsi > (previous.rsi || 0)) {
    const rsiImprovement = rsi - (previous.rsi || 0);
    if (rsiImprovement > 3) {
      confidence += 0.15; // 強勢回升
    } else if (rsiImprovement > 1) {
      confidence += 0.1; // 一般回升
    } else {
      confidence += 0.05; // 輕微回升
    }
  }

  // MACD 趨勢確認（Python 風格更注重交叉強度）
  const macd = current.macd || 0;
  const macdSignal = current.macdSignal || 0;
  const macdHisto = current.macdHistogram || 0;

  if (macd > macdSignal) {
    // 檢查是否為新的黃金交叉
    const prevMacd = previous?.macd || 0;
    const prevSignal = previous?.macdSignal || 0;
    const isNewGoldenCross = prevMacd <= prevSignal && macd > macdSignal;

    if (strategyParams.usePythonLogic) {
      if (isNewGoldenCross && macdHisto > 0) {
        confidence += 0.25; // 新黃金交叉且柱狀圖為正
      } else if (isNewGoldenCross) {
        confidence += 0.2; // 新黃金交叉
      } else if (macdHisto > 0) {
        confidence += 0.15; // 持續黃金交叉且強化
      } else {
        confidence += 0.1; // 基本黃金交叉
      }
    } else {
      confidence += 0.15; // 原版固定加分
    }
  }

  // 成交量驗證（Python 風格更高門檻）
  const volumeRatio = current.volumeRatio || 0;
  const volumeThreshold = strategyParams.volumeThreshold;

  if (strategyParams.usePythonLogic) {
    if (volumeRatio > volumeThreshold * 1.5) {
      confidence += 0.15; // 爆量
    } else if (volumeRatio > volumeThreshold) {
      confidence += 0.1; // 量增
    } else {
      confidence -= 0.05; // 量不足扣分
    }
  } else {
    if (volumeRatio > volumeThreshold) {
      confidence += 0.1;
    }
  }

  // 趨勢排列確認
  const close = current.close;
  const ma5 = current.ma5 || 0;
  const ma20 = current.ma20 || 0;
  const ma60 = current.ma60 || 0;

  if (strategyParams.usePythonLogic) {
    // Python 風格：更注重多頭排列
    if (strategyParams.enableMA60 && close > ma5 && ma5 > ma20 && ma20 > ma60) {
      confidence += 0.15; // 完美多頭排列
    } else if (close > ma5 && ma5 > ma20) {
      confidence += 0.12; // 短中期多頭排列
    } else if (close > ma20) {
      confidence += 0.08; // 基本多頭
    } else {
      confidence -= 0.05; // 空頭排列扣分
    }
  } else {
    // 原版評分
    if (close > ma20) {
      confidence += 0.08;
    }
  }

  // 價格動能評估
  const priceMomentum = current.priceMomentum || 0;
  if (strategyParams.enablePriceMomentum) {
    if (priceMomentum > strategyParams.priceMomentumThreshold) {
      confidence += 0.1; // 強勢動能
    } else if (priceMomentum > 0) {
      confidence += 0.05; // 正動能
    } else if (priceMomentum < -strategyParams.priceMomentumThreshold) {
      confidence -= 0.05; // 負動能扣分
    }
  }

  // 最終調整
  const finalConfidence = Math.max(0, Math.min(confidence, 0.95));

  console.log(
    `📊 信心度計算完成: ${(finalConfidence * 100).toFixed(
      1,
    )}% (RSI: ${rsi.toFixed(1)}, MACD: ${macd > macdSignal ? '✅' : '❌'})`,
  );

  return finalConfidence;
};
