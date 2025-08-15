import { StockData } from '../interfaces/stockData';
import { fetchRealStockData } from './fetchRealStockData';

/**
 * 股票數據生成統一入口
 *
 * 用途：作為數據獲取的統一接口，內部調用真實數據獲取器
 * 主要用於日誌記錄和未來擴展功能
 *
 * @param symbol - 股票代碼
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns Promise<StockData[]> - 股票數據陣列
 */
export const generateStockData = async (
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<StockData[]> => {
  console.log(
    `🔍🔍🔍 開始獲取 ${symbol} 的股票數據 (${startDate} - ${endDate})...`,
  );
  const result = await fetchRealStockData(symbol, startDate, endDate);
  console.log(`✅✅✅ ${symbol} 數據獲取完成，共 ${result.length} 筆數據`);
  return result;
};
