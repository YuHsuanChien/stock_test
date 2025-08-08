import { StockData } from '../interfaces/stockData';
import { RawStockData } from '../interfaces/stockData';

/**
 * 動態檢查是否為交易日（基於實際數據）
 * @param date - 要檢查的日期
 * @param stockDataMap - 股票數據映射，用於檢查是否有數據
 * @returns boolean - 是否為交易日
 */
export const isTradingDay = (
  date: Date,
  stockDataMap?: Record<string, StockData[]>,
): boolean => {
  // 如果沒有提供股票數據，無法判斷，直接返回 false
  if (!stockDataMap || Object.keys(stockDataMap).length === 0) {
    return false;
  }

  // 檢查是否有任何股票在該日有數據
  const dateStr = date.toISOString().split('T')[0];
  for (const stockData of Object.values(stockDataMap)) {
    const hasDataOnDate = stockData.some(
      (data) => data.date.toISOString().split('T')[0] === dateStr,
    );
    if (hasDataOnDate) {
      return true; // 有交易紀錄就是交易日（包含補班日）
    }
  }

  return false; // 沒有交易紀錄就是休假日
};

/**
 * 找到下一個交易日
 * @param fromDate - 起始日期
 * @param stockDataMap - 股票數據映射
 * @param maxDaysToCheck - 最多檢查的天數（預設10天）
 * @returns Date | null - 下一個交易日，如果找不到則返回null
 */
export const findNextTradingDay = (
  fromDate: Date,
  stockDataMap: Record<string, StockData[]>,
  maxDaysToCheck: number = 10,
): Date | null => {
  const checkDate = new Date(fromDate);

  for (let i = 0; i < maxDaysToCheck; i++) {
    checkDate.setDate(checkDate.getDate() + 1);
    if (isTradingDay(checkDate, stockDataMap)) {
      return new Date(checkDate);
    }
  }

  return null; // 10天內找不到交易日
};

/*
 * 解析 Yahoo Finance Chart API 返回的數據
 * @param chartResult - Yahoo API 返回的圖表數據
 * @param symbol - 股票代號
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 解析後的股票數據陣列
 **/
export const parseYahooChartData = (
  chartResult: unknown,
  symbol: string,
  startDate: string,
  endDate: string,
): StockData[] => {
  try {
    console.log(`🔍 parseYahooChartData 開始解析 ${symbol} 的數據...`);
    const result = chartResult as {
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: number[];
          high?: number[];
          low?: number[];
          close?: number[];
          volume?: number[];
        }>;
      };
    };

    const { timestamp, indicators } = result;
    const quote = indicators?.quote?.[0];

    console.log(`🔍 timestamp 數量: ${timestamp?.length || 0}`);
    console.log(`🔍 quote 數據:`, quote ? '存在' : '不存在');

    if (!timestamp || !quote) {
      console.log(`❌ 數據不完整: timestamp=${!!timestamp}, quote=${!!quote}`);
      return [];
    }

    const rawData = timestamp.map((ts, index) => {
      // 將時間戳轉換為交易日期（統一使用 UTC 日期，避免時區問題）
      const utcDate = new Date(ts * 1000);
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth();
      const day = utcDate.getUTCDate();

      // 🔍 使用 UTC 創建日期，避免本地時區影響
      const tradingDate = new Date(Date.UTC(year, month, day));

      return {
        symbol: symbol,
        date: tradingDate,
        open: quote.open?.[index] || 0,
        high: quote.high?.[index] || 0,
        low: quote.low?.[index] || 0,
        close: quote.close?.[index] || 0,
        volume: quote.volume?.[index] || 0,
      };
    });

    console.log(`🔍 原始數據筆數: ${rawData.length}`);
    console.log(`🔍 原始數據範例:`, rawData.slice(0, 3));

    // 特別檢查第一筆數據的詳細信息
    if (rawData.length > 0) {
      const firstData = rawData[0];
      const utcTime = new Date(timestamp[0] * 1000);
      console.log(`🔍 第一筆數據詳細檢查:`);
      console.log(`   原始時間戳: ${timestamp[0]}`);
      console.log(`   UTC 時間: ${utcTime.toISOString()}`);
      console.log(
        `   轉換為交易日: ${firstData.date.toLocaleDateString('zh-TW')}`,
      );
      console.log(`   開盤: ${firstData.open} / 收盤: ${firstData.close}`);
      console.log(`   最高: ${firstData.high} / 最低: ${firstData.low}`);
      console.log(`   成交量: ${firstData.volume.toLocaleString()}`);
    }

    const filteredData = rawData.filter((data) => {
      const dateStr = data.date.toISOString().split('T')[0];
      const inDateRange = dateStr >= startDate && dateStr <= endDate;
      const hasValidPrice = data.close > 0;

      // 使用更寬鬆的條件：只要有有效價格且在日期範圍內就保留
      // 這樣可以包含補班日的數據，讓 isTradingDay 來做最終判斷
      return inDateRange && hasValidPrice;
    });

    console.log(`🔍 篩選後數據筆數: ${filteredData.length}`);
    console.log(`🔍 日期範圍: ${startDate} ~ ${endDate}`);
    return filteredData;
  } catch (error) {
    console.error('解析 Yahoo 數據錯誤:', error);
    return [];
  }
};


/**
 * 從nest.js後端向富邦取得資料
 * @param symbol - 股票代號
 * @param startDate - 開始日期
 * @endDate - 結束日期
 * @returns 股票數據陣列
 */
export const fetchFubonData = async (
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<StockData[]> => {
  console.log('🔍 從富邦取得資料:', symbol);
  try {
    const res = await fetch(
      `http://localhost:3100/api/historical-candles/${symbol}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      },
    );

    const result = await res.json();
    const data = result.map((item: RawStockData) => ({
      ...item,
      date: new Date(item.date),
    }));
    console.log('從富邦取得資料:', data);
    return data;
  } catch (err) {
    console.error('從富邦取得資料失敗:', err);
    alert('從富邦取得資料失敗，請稍後再試。');
    return [];
  }
};
