import { StockData } from '../interfaces/stockData';
import {
  RawStockData,
  WStrategyParams,
  RsiStrategyParams,
} from '../interfaces/stockData';

/**
 * 股票清單項目的介面定義
 */
interface StockListItem {
  symbol: string;
}

/**
 * 回測請求介面
 */
interface BacktestRequest {
  stocks: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  strategyParams?: RsiStrategyParams | WStrategyParams;
}

// 回測結果介面 - 與前端保持一致
interface BacktestResults {
  performance: {
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    annualReturn: number;
    totalProfit: number;
    maxDrawdown: number;
  };
  trades: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    maxWin: number;
    maxLoss: number;
    avgHoldingDays: number;
    profitFactor: number;
  };
  detailedTrades: Array<{
    stock: string;
    action: string;
    date: Date;
    price: number;
    quantity: number;
    amount: number;
    buySignalDate?: Date;
    sellSignalDate?: Date;
    actualBuyDate?: Date;
    actualSellDate?: Date;
    entryPrice?: number;
    entryDate?: Date;
    holdingDays?: number;
    profit?: number;
    profitRate?: number;
    reason: string;
    confidence?: number;
  }>;
  equityCurve: Array<{
    date: string;
    value: number;
    cash: number;
    positions: number;
  }>;
  stockPerformance: Array<{
    stock: string;
    trades: number;
    winRate: number;
    totalProfit: number;
  }>;
}

/**
 * 回測結果介面
 */
interface BacktestResponse {
  statusCode: number;
  message: string;
  data: BacktestResults;
}

/**
 * 執行後端回測
 */
export const runBacktestOnServer = async (
  stocks: string[],
  startDate: string,
  endDate: string,
  initialCapital: number,
  strategyParams: RsiStrategyParams | WStrategyParams,
): Promise<BacktestResults> => {
  console.log('🔥 開始執行後端回測...');

  try {
    const requestBody: BacktestRequest = {
      stocks,
      startDate,
      endDate,
      initialCapital,
      strategyParams,
    };

    const response = await fetch('http://localhost:3100/api/backtest/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: BacktestResponse = await response.json();

    if (result.statusCode === 200) {
      console.log('✅ 後端回測執行成功');
      return result.data;
    } else {
      throw new Error(result.message || '回測執行失敗');
    }
  } catch (error) {
    console.error('❌ 後端回測失敗:', error);
    throw error;
  }
};

/**
 * 向nest.js獲取所有股票清單
 * @returns 股票代號陣列
 */
export const fetchAllStocksList = async (): Promise<string[]> => {
  console.log('🔍 正在獲取所有股票清單...');
  try {
    const res = await fetch(
      'http://localhost:3100/api/historical-candles/stockList',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();

    // 處理物件陣列格式：[{ "symbol": "1101" }, { "symbol": "1101B" }, ...]
    let stocks: string[] = [];

    if (Array.isArray(result)) {
      // 如果是陣列，檢查元素格式
      if (
        result.length > 0 &&
        typeof result[0] === 'object' &&
        result[0].symbol
      ) {
        // 物件陣列格式：[{ "symbol": "1101" }, ...]
        stocks = (result as StockListItem[])
          .map((item) => item.symbol)
          .filter((symbol) => symbol && symbol.trim().length > 0);
      } else if (result.length > 0 && typeof result[0] === 'string') {
        // 字串陣列格式：["1101", "1102", ...]
        stocks = (result as string[]).filter(
          (symbol) => symbol && symbol.trim().length > 0,
        );
      }
    } else if (result.stocks && Array.isArray(result.stocks)) {
      // 物件包裝格式：{ stocks: [...] }
      if (
        result.stocks.length > 0 &&
        typeof result.stocks[0] === 'object' &&
        result.stocks[0].symbol
      ) {
        stocks = (result.stocks as StockListItem[])
          .map((item) => item.symbol)
          .filter((symbol) => symbol && symbol.trim().length > 0);
      } else {
        stocks = (result.stocks as string[]).filter(
          (symbol) => symbol && symbol.trim().length > 0,
        );
      }
    }

    console.log(
      `✅ 成功獲取 ${stocks.length} 支股票:`,
      stocks.slice(0, 10),
      stocks.length > 10 ? '...' : '',
    );
    return stocks;
  } catch (err) {
    console.error('獲取股票清單失敗:', err);
    alert('獲取股票清單失敗，請檢查後端服務');
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
      `http://localhost:3100/api/historical-candles/duration/${symbol}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();

    // 處理富邦API返回的資料，將欄位映射為StockData格式
    const data = result
      .map((item: RawStockData) => {
        try {
          // 驗證日期
          const tradeDate = new Date(item.tradeDate);
          if (isNaN(tradeDate.getTime())) {
            console.warn('富邦API返回無效日期:', item.tradeDate);
            return null;
          }

          // 映射欄位並驗證數據
          return {
            symbol: symbol, // 加入股票代號
            date: tradeDate, // 將 tradeDate 映射為 date
            open: Number(item.open) || 0,
            high: Number(item.high) || 0,
            low: Number(item.low) || 0,
            close: Number(item.close) || 0,
            volume: Number(item.volume) || 0,
          } as StockData;
        } catch (error) {
          console.warn('處理富邦數據項目時出錯:', item, error);
          return null;
        }
      })
      .filter((item: StockData | null): item is StockData => item !== null); // 過濾掉無效項目

    console.log('從富邦取得資料:', data);
    return data;
  } catch (err) {
    console.error('從富邦取得資料失敗:', err);
    alert(`從富邦取得資料失敗，股票: ${symbol} 請稍後再試。`);
    return [];
  }
};
