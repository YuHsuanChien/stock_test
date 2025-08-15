import { StockData } from '../interfaces/stockData';
import { fetchFubonData, parseYahooChartData } from './stock_api';

/**
 * 真實台股數據獲取器 (更新版)
 *
 * 用途：使用多個可靠的API來源獲取真實台股數據
 * API來源優先級：
 * 1. Yahoo Finance Chart API (通過CORS代理)
 * 2. 台灣證券交易所官方API
 * 3. Alpha Vantage API (需要免費API Key)
 * 4. 多個CORS代理服務輪替
 *
 * @param symbol - 股票代碼 (例：'2330')
 * @param startDate - 開始日期 (YYYY-MM-DD格式)
 * @param endDate - 結束日期 (YYYY-MM-DD格式)
 * @returns Promise<StockData[]> - 股票歷史數據陣列
 */
export const fetchRealStockData = async (
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<StockData[]> => {
  console.log(
    `🔍🔍🔍 fetchRealStockData 被調用: ${symbol} (${startDate} - ${endDate})`,
  );

  // 方法1: 使用 Fubon API
  try {
    const data = await fetchFubonData(symbol, startDate, endDate);
    if (data.length > 0) {
      console.log(`✅ Fubon API 成功獲取 ${symbol} 數據: ${data.length} 天`);
      return data;
    }
  } catch (err) {
    console.log(`⚠️ Fubon API 失敗:`, err);
  }

  // 方法2: 使用 Yahoo Finance Chart API (通過CORS代理)
  try {
    console.log(`🌐 開始嘗試 Yahoo Finance Chart API...`);
    const corsProxies = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/get?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://proxy.cors.sh/',
    ];

    for (const proxy of corsProxies) {
      try {
        const ticker = symbol + '.TW';
        // 修改API請求，使用更精確的參數
        const start = Math.floor(new Date(startDate).getTime() / 1000);
        const end = Math.floor(new Date(endDate).getTime() / 1000);
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${start}&period2=${end}&interval=1d&includeAdjustedClose=false`;

        let proxyUrl: string;
        if (proxy.includes('allorigins')) {
          proxyUrl = `${proxy}${encodeURIComponent(chartUrl)}`;
        } else {
          proxyUrl = `${proxy}${chartUrl}`;
        }

        console.log(`🌐 嘗試使用代理: ${proxy}`);
        console.log(`🔗 請求 URL: ${chartUrl}`);
        console.log(`🔗 完整代理 URL: ${proxyUrl}`);
        console.log(
          `🕐 請求時間範圍: ${startDate} (${start}) ~ ${endDate} (${end})`,
        );
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          let chartData: unknown;

          if (proxy.includes('allorigins')) {
            const jsonWrapper = await response.json();
            chartData = JSON.parse(jsonWrapper.contents);
          } else {
            chartData = await response.json();
          }

          if (
            chartData &&
            typeof chartData === 'object' &&
            'chart' in chartData
          ) {
            const chart = (chartData as { chart: { result?: unknown[] } })
              .chart;
            if (chart?.result?.[0]) {
              console.log(`🔍 Yahoo API 原始數據結構:`, chart.result[0]);
              const data = parseYahooChartData(
                chart.result[0],
                symbol,
                startDate,
                endDate,
              );
              console.log(`🔍 解析後的數據範例 (前5筆):`, data.slice(0, 5));
              if (data.length > 0) {
                console.log(
                  `✅ Yahoo Finance Chart API 成功獲取 ${symbol} 數據: ${data.length} 天`,
                  data,
                );
                return data;
              }
            }
          }
        }
      } catch (proxyError) {
        console.log(`⚠️ 代理 ${proxy} 失敗:`, proxyError);
      }

      // 添加延遲避免被API限制
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.log(`⚠️ Yahoo Finance Chart API 整體失敗:`, error);
  }

  // 如果所有方法都失敗，拋出錯誤
  throw new Error(`無法從任何數據源獲取 ${symbol} 的真實股票數據`);
};
