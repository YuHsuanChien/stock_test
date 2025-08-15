import { Position, StockData } from '../interfaces/stockData';

/**
 * 計算當前總曝險度
 *
 * @param positions - 當前持倉記錄
 * @param currentCapital - 當前資金
 * @param allStockData - 所有股票數據
 * @param currentDateStr - 當前日期字串
 * @returns number - 總曝險度比例 (0-1)
 */
export const calculateCurrentExposure = (
  positions: Record<string, Position>,
  currentCapital: number,
  allStockData: Record<string, StockData[]>,
  currentDateStr: string,
): number => {
  let totalPositionValue = 0;

  for (const [stock, position] of Object.entries(positions)) {
    const stockData = allStockData[stock];
    if (stockData) {
      const currentData = stockData.find(
        (d) => d.date.toISOString().split('T')[0] === currentDateStr,
      );
      if (currentData) {
        totalPositionValue += currentData.close * position.quantity;
      }
    }
  }

  const totalCapital = currentCapital + totalPositionValue;
  const exposure = totalPositionValue / totalCapital;

  console.log(
    `📊 當前曝險度計算: 持倉價值 ${totalPositionValue.toLocaleString()}, 總資本 ${totalCapital.toLocaleString()}, 曝險度: ${(
      exposure * 100
    ).toFixed(1)}%`,
  );

  return exposure;
};
