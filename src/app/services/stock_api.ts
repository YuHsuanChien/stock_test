import { StockData } from '../interfaces/stockData';

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
      // 將時間戳轉換為交易日期（去除時間部分，只保留日期）
      const utcDate = new Date(ts * 1000);
      // 建立台北時區的日期，但只保留日期部分
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth();
      const day = utcDate.getUTCDate();
      const tradingDate = new Date(year, month, day);

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
 * 從台灣證券交易所獲取股票數據
 * @param symbol - 股票代號
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 股票數據陣列
 */
export const fetchTWSEData = async (
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<StockData[]> => {
  try {
    // 移除股票代號中的後綴（如 .TW）
    const cleanSymbol = symbol.replace(/\.(TW|TWO)$/, '');

    // TWSE API 通常需要年月格式
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: StockData[] = [];

    // 按月份獲取數據
    for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
      const startMonth =
        year === start.getFullYear() ? start.getMonth() + 1 : 1;
      const endMonth = year === end.getFullYear() ? end.getMonth() + 1 : 12;

      for (let month = startMonth; month <= endMonth; month++) {
        const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${year}${month
          .toString()
          .padStart(2, '0')}01&stockNo=${cleanSymbol}`;

        try {
          const response = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          );
          const jsonWrapper = await response.json();
          const data = JSON.parse(jsonWrapper.contents);

          if (data.stat === 'OK' && data.data) {
            data.data.forEach((row: string[]) => {
              const [
                dateStr,
                ,
                openStr,
                highStr,
                lowStr,
                closeStr,
                ,
                ,
                volumeStr,
              ] = row;
              const date = dateStr.replace(/\//g, '-');
              const formattedDate = `20${date.split('-').reverse().join('-')}`;

              if (formattedDate >= startDate && formattedDate <= endDate) {
                results.push({
                  symbol: cleanSymbol,
                  date: new Date(formattedDate),
                  open: parseFloat(openStr.replace(/,/g, '')),
                  high: parseFloat(highStr.replace(/,/g, '')),
                  low: parseFloat(lowStr.replace(/,/g, '')),
                  close: parseFloat(closeStr.replace(/,/g, '')),
                  volume: parseInt(volumeStr.replace(/,/g, '')),
                });
              }
            });
          }

          // 避免過度請求
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`TWSE API 月份 ${year}-${month} 請求失敗:`, error);
        }
      }
    }

    return results.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    console.error('TWSE API 錯誤:', error);
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
    const data = result.map((item: any) => ({
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
