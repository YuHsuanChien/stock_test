import { StockData, StrategyParams } from '../interfaces/stockData';

/**
 * 技術指標計算器 (優化版 - 結合Python優點)
 *
 * 用途：為原始股價數據計算各種技術分析指標
 * 計算指標包括：
 * - RSI (相對強弱指標)：使用威爾德平滑法，更精確
 * - MACD (指數平滑移動平均線)：趨勢追蹤指標
 * - MA5/MA20/MA60 (移動平均線)：趨勢判斷
 * - 成交量比率：量價關係分析
 * - ATR：動態停損計算
 * - 價格動能：短期趨勢判斷
 *
 * 優化特點：
 * - 統一使用 EMA 平滑算法
 * - 添加數據品質檢查
 * - 支援 Python 風格的批量計算
 *
 * @param data - 原始股票數據陣列
 * @param strategyParams - 策略參數
 * @returns StockData[] - 包含技術指標的股票數據陣列
 */
export const calculateIndicators = (
  data: StockData[],
  strategyParams: StrategyParams,
): StockData[] => {
  console.log(
    `🔍 calculateIndicators 開始計算技術指標，數據筆數: ${data.length}`,
  );
  const result = [...data];

  // 優化版 RSI 計算（統一使用威爾德平滑法，與專業軟體一致）
  console.log(`📊 開始計算 RSI，週期: ${strategyParams.rsiPeriod}`);
  for (let i = 1; i < result.length; i++) {
    const change = result[i].close - result[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i === strategyParams.rsiPeriod) {
      // 初始值：使用簡單移動平均（威爾德方法）
      let avgGain = 0;
      let avgLoss = 0;
      for (let j = 1; j <= strategyParams.rsiPeriod; j++) {
        const pastChange = result[j].close - result[j - 1].close;
        if (pastChange > 0) avgGain += pastChange;
        else avgLoss += -pastChange;
      }
      result[i].avgGain = avgGain / strategyParams.rsiPeriod;
      result[i].avgLoss = avgLoss / strategyParams.rsiPeriod;
    } else if (i > strategyParams.rsiPeriod) {
      // 後續使用威爾德平滑法（比標準EMA更穩定）
      const alpha = 1 / strategyParams.rsiPeriod;
      result[i].avgGain =
        (1 - alpha) * (result[i - 1].avgGain || 0) + alpha * gain;
      result[i].avgLoss =
        (1 - alpha) * (result[i - 1].avgLoss || 0) + alpha * loss;
    }

    // 計算 RSI
    if (i >= strategyParams.rsiPeriod) {
      const avgGain = result[i].avgGain || 0;
      const avgLoss = result[i].avgLoss || 0;

      // 避免除零錯誤
      if (avgLoss === 0) {
        result[i].rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i].rsi = 100 - 100 / (1 + rs);
      }

      // 數據品質檢查
      if (isNaN(result[i].rsi!) || result[i].rsi! < 0 || result[i].rsi! > 100) {
        console.warn(`⚠️ RSI 異常值: ${result[i].rsi} at index ${i}`);
        result[i].rsi = i > 0 ? result[i - 1].rsi : 50; // 使用前值或中性值
      }
    }
  }

  // MACD 計算（保持原有精確實現）
  console.log(
    `📈 開始計算 MACD，參數: ${strategyParams.macdFast}/${strategyParams.macdSlow}/${strategyParams.macdSignal}`,
  );
  const fastMultiplier = 2 / (strategyParams.macdFast + 1);
  const slowMultiplier = 2 / (strategyParams.macdSlow + 1);
  const signalMultiplier = 2 / (strategyParams.macdSignal + 1);

  for (let i = 0; i < result.length; i++) {
    if (i === 0) {
      // 初始值
      result[i].ema12 = result[i].close;
      result[i].ema26 = result[i].close;
    } else {
      // EMA 計算公式: EMA = (Close - EMA_prev) * multiplier + EMA_prev
      result[i].ema12 =
        (result[i].close - (result[i - 1].ema12 || 0)) * fastMultiplier +
        (result[i - 1].ema12 || 0);
      result[i].ema26 =
        (result[i].close - (result[i - 1].ema26 || 0)) * slowMultiplier +
        (result[i - 1].ema26 || 0);
    }

    // MACD = EMA12 - EMA26
    if (i >= strategyParams.macdSlow - 1) {
      result[i].macd = (result[i].ema12 || 0) - (result[i].ema26 || 0);

      // 信號線計算 (MACD 的 9 日 EMA)
      if (i === strategyParams.macdSlow - 1) {
        result[i].macdSignal = result[i].macd || 0; // 初始值
      } else if (i > strategyParams.macdSlow - 1) {
        result[i].macdSignal =
          ((result[i].macd || 0) - (result[i - 1].macdSignal || 0)) *
            signalMultiplier +
          (result[i - 1].macdSignal || 0);
      }

      // MACD 柱狀圖
      if (result[i].macdSignal !== undefined) {
        result[i].macdHistogram =
          (result[i].macd || 0) - (result[i].macdSignal || 0);
      }
    }
  }

  // 計算移動平均和成交量比率
  for (let i = 0; i < result.length; i++) {
    // MA20
    if (i >= 20) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) {
        sum += result[j].close;
      }
      result[i].ma20 = sum / 20;
    }

    // MA5
    if (i >= 5) {
      let sum = 0;
      for (let j = i - 4; j <= i; j++) {
        sum += result[j].close;
      }
      result[i].ma5 = sum / 5;
    }

    // MA60 (季線) - 低優先級功能
    if (i >= 60 && strategyParams.enableMA60) {
      let sum = 0;
      for (let j = i - 59; j <= i; j++) {
        sum += result[j].close;
      }
      result[i].ma60 = sum / 60;
    }

    // 成交量比率
    if (i >= 20) {
      let volumeSum = 0;
      for (let j = i - 19; j <= i; j++) {
        volumeSum += result[j].volume;
      }
      result[i].volumeMA20 = volumeSum / 20;
      result[i].volumeRatio = result[i].volume / (result[i].volumeMA20 || 1);
    }

    // ATR (Average True Range) - 中優先級功能
    if (i > 0 && strategyParams.enableATRStop) {
      if (i >= strategyParams.atrPeriod) {
        let atrSum = 0;
        for (let j = i - strategyParams.atrPeriod + 1; j <= i; j++) {
          if (j > 0) {
            const tr = Math.max(
              result[j].high - result[j].low,
              Math.abs(result[j].high - result[j - 1].close),
              Math.abs(result[j].low - result[j - 1].close),
            );
            atrSum += tr;
          }
        }
        result[i].atr = atrSum / strategyParams.atrPeriod;
      }
    }

    // 價格動能指標 - 中優先級功能
    if (
      i >= strategyParams.priceMomentumPeriod &&
      strategyParams.enablePriceMomentum
    ) {
      const currentPrice = result[i].close;
      const pastPrice = result[i - strategyParams.priceMomentumPeriod].close;
      result[i].priceMomentum = (currentPrice - pastPrice) / pastPrice;
    }
  }

  console.log(
    `✅ 技術指標計算完成，有效數據從第 ${
      strategyParams.macdSlow + strategyParams.macdSignal
    } 天開始`,
  );
  return result;
};
