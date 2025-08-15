import { StrategyParams } from '../interfaces/stockData';
/**
 * 動態倉位大小計算器 (Python風格優化版)
 *
 * 用途：根據信心度和當前風險暴露度計算最適倉位大小
 * 特點：
 * - 支援 Python 風格的動態調整
 * - 考慮總曝險度風險控制
 * - 根據信心度分層調整
 *
 * Python風格邏輯：
 * - 基礎倉位: 15%
 * - 高信心度(>80%): 倍數 1.5 = 22.5%
 * - 中信心度(>65%): 倍數 1.0 = 15%
 * - 低信心度(<65%): 倍數 0.7 = 10.5%
 * - 總曝險度>60%時: 倍數 * 0.5 (風險控制)
 *
 * @param confidence - 信心度分數 (0-1)
 * @param currentTotalExposure - 當前總曝險度 (0-1)
 * @returns number - 建議倉位大小比例 (0-1)
 */
export const calculateDynamicPositionSize = (
  confidence: number,
  currentTotalExposure: number,
  strategyParams: StrategyParams,
): number => {
  if (!strategyParams.dynamicPositionSize) {
    // 如果未啟用動態倉位，使用固定邏輯
    return confidence > 0.8 ? 0.225 : confidence > 0.65 ? 0.15 : 0.105;
  }

  console.log(
    `💰 開始計算動態倉位 - 信心度: ${(confidence * 100).toFixed(
      1,
    )}%, 當前曝險度: ${(currentTotalExposure * 100).toFixed(1)}%`,
  );

  // Python風格的基礎倉位計算
  const basePosition = 0.15; // 15% 基礎倉位
  let multiplier = 1.0;

  // 根據信心度調整倍數
  if (confidence > 0.8) {
    multiplier = 1.5; // 高信心度
    console.log(`📈 高信心度模式 (>80%)，倍數: ${multiplier}`);
  } else if (confidence > 0.65) {
    multiplier = 1.0; // 中等信心度
    console.log(`📊 中信心度模式 (65-80%)，倍數: ${multiplier}`);
  } else {
    multiplier = 0.7; // 低信心度
    console.log(`📉 低信心度模式 (<65%)，倍數: ${multiplier}`);
  }

  let suggestedPosition = basePosition * multiplier;

  // Python風格風險控制：當總曝險度過高時減少倉位
  if (currentTotalExposure > strategyParams.maxTotalExposure) {
    const riskReduction = 0.5; // 減半
    suggestedPosition *= riskReduction;
    console.log(
      `⚠️ 總曝險度過高 (${(currentTotalExposure * 100).toFixed(1)}% > ${(
        strategyParams.maxTotalExposure * 100
      ).toFixed(1)}%)，倉位減半至: ${(suggestedPosition * 100).toFixed(1)}%`,
    );
  } else if (currentTotalExposure > 0.6) {
    // 當曝險度接近限制時，適度減少倉位
    const riskReduction = 0.75;
    suggestedPosition *= riskReduction;
    console.log(
      `🔶 曝險度偏高 (${(currentTotalExposure * 100).toFixed(
        1,
      )}% > 60%)，倉位調整至: ${(suggestedPosition * 100).toFixed(1)}%`,
    );
  }

  // 最終限制：不能超過單一持股上限
  const finalPosition = Math.min(
    suggestedPosition,
    strategyParams.maxPositionSize,
  );

  console.log(
    `💼 最終倉位決定: ${(finalPosition * 100).toFixed(1)}% (限制: ${(
      strategyParams.maxPositionSize * 100
    ).toFixed(1)}%)`,
  );

  return finalPosition;
};
