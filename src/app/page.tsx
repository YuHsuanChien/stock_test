'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  parseYahooChartData,
  fetchTWSEData,
  fetchFubonData,
} from './services/stock_api';

// 型別定義
interface StockData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  ma20?: number;
  ma5?: number;
  ma60?: number; // 新增MA60季線
  volumeMA20?: number;
  volumeRatio?: number;
  atr?: number; // 新增ATR指標
  priceMomentum?: number; // 新增價格動能指標
  // RSI計算用的中間變數
  avgGain?: number;
  avgLoss?: number;
  // MACD計算用的EMA值
  ema12?: number;
  ema26?: number;
}

interface TradeResult {
  stock: string;
  action: string;
  date: Date;
  price: number;
  quantity: number;
  amount: number;
  entryPrice?: number;
  entryDate?: Date;
  holdingDays?: number;
  profit?: number;
  profitRate?: number;
  reason: string;
  confidence?: number;
}

interface Position {
  entryDate: Date;
  entryPrice: number;
  quantity: number;
  investAmount: number;
  confidence?: number;
  // 新增追蹤停利相關欄位
  highPriceSinceEntry: number; // 進場後最高價
  trailingStopPrice: number; // 追蹤停損價
  atrStopPrice?: number; // ATR動態停損價
  entryATR?: number; // 進場時的ATR值
}

interface BacktestResults {
  performance: {
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    annualReturn: number;
    totalProfit: number;
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
    profitFactor: number; // 新增獲利因子
  };
  detailedTrades: TradeResult[];
  equityCurve: {
    date: string;
    value: number;
    cash: number;
    positions: number;
  }[];
  stockPerformance: {
    stock: string;
    trades: number;
    winRate: number;
    totalProfit: number;
  }[];
}

interface StrategyParams {
  rsiPeriod: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  volumeThreshold: number;
  maxPositionSize: number;
  stopLoss: number;
  stopProfit: number;
  confidenceThreshold: number;
  // 高優先級新增參數
  enableTrailingStop: boolean; // 是否啟用追蹤停利
  trailingStopPercent: number; // 追蹤停利百分比
  trailingActivatePercent: number; // 追蹤停利啟動門檻
  // 中優先級新增參數
  enableATRStop: boolean; // 是否啟用ATR動態停損
  atrPeriod: number; // ATR計算週期
  atrMultiplier: number; // ATR停損倍數
  minHoldingDays: number; // 最小持有天數保護
  enablePriceMomentum: boolean; // 是否啟用價格動能指標
  priceMomentumPeriod: number; // 價格動能計算週期
  priceMomentumThreshold: number; // 價格動能門檻
  // 低優先級新增參數
  enableMA60: boolean; // 是否啟用MA60季線確認
  // 新增：Python風格優化參數
  maxTotalExposure: number; // 最大總曝險度 (Python風格)
  usePythonLogic: boolean; // 啟用Python決策邏輯
  hierarchicalDecision: boolean; // 階層決策模式
  dynamicPositionSize: boolean; // 動態倉位調整
}

interface BuySignalResult {
  signal: boolean;
  reason: string;
  confidence?: number;
}

interface SellSignalResult {
  signal: boolean;
  reason: string;
}

const BacktestSystem = () => {
  const [stocks, setStocks] = useState<string[]>(['2330', '2454', '2317']);
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('2025-08-05');
  const [initialCapital, setInitialCapital] = useState<number>(1000000);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [newStock, setNewStock] = useState<string>('');

  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    // 基礎技術指標參數 (與Python一致)
    rsiPeriod: 14,
    rsiOversold: 35, // 調整為Python標準：35 (深度超賣為25)
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    volumeThreshold: 1.5, // 提高為Python標準：1.5倍
    maxPositionSize: 0.25, // Python: 最大單檔25%
    stopLoss: 0.06,
    stopProfit: 0.12,
    confidenceThreshold: 0.6, // 平衡Python(70%)與原版(40%)：設定60%

    // 高優先級參數 (追蹤停利機制)
    enableTrailingStop: true,
    trailingStopPercent: 0.05, // Python: 5%追蹤停利
    trailingActivatePercent: 0.03, // Python: 3%獲利後啟動追蹤

    // 中優先級參數 (ATR動態停損)
    enableATRStop: true,
    atrPeriod: 14, // Python: ATR週期14天
    atrMultiplier: 2.0, // Python: ATR倍數2.0
    minHoldingDays: 5, // Python: 最少持有5天 (避免剛進場就被洗出)

    // 價格動能指標
    enablePriceMomentum: true,
    priceMomentumPeriod: 5, // Python: 5日價格動能
    priceMomentumThreshold: 0.03, // Python: 3%動能門檻 (提高精準度)

    // 低優先級參數 (MA60季線)
    enableMA60: false, // Python預設不啟用，但可選擇開啟

    // 新增：Python風格優化參數
    maxTotalExposure: 0.75, // Python: 最大總曝險度75%
    usePythonLogic: true, // 啟用Python決策邏輯 (預設開啟以獲得更好表現)
    hierarchicalDecision: true, // 階層決策模式
    dynamicPositionSize: true, // 動態倉位調整
  });

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
  const fetchRealStockData = async (
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

    // 方法3: 使用台灣證券交易所官方API
    try {
      const twseData = await fetchTWSEData(symbol, startDate, endDate);
      if (twseData.length > 0) {
        console.log(
          `✅ 台灣證交所API成功獲取 ${symbol} 數據: ${twseData.length} 天`,
        );
        return twseData;
      }
    } catch (error) {
      console.log(`⚠️ 台灣證交所API失敗:`, error);
    }

    // 如果所有方法都失敗，拋出錯誤
    throw new Error(`無法從任何數據源獲取 ${symbol} 的真實股票數據`);
  };

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
  const generateStockData = async (
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
   * @returns StockData[] - 包含技術指標的股票數據陣列
   */
  const calculateIndicators = (data: StockData[]): StockData[] => {
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
        if (
          isNaN(result[i].rsi!) ||
          result[i].rsi! < 0 ||
          result[i].rsi! > 100
        ) {
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
   * @param previous - 前一天股票數據（可選）
   * @returns number - 信心度分數 (0.0-0.95)
   */
  const calculateConfidence = (
    current: StockData,
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
      if (
        strategyParams.enableMA60 &&
        close > ma5 &&
        ma5 > ma20 &&
        ma20 > ma60
      ) {
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
   * @param previous - 前一天股票數據（可選）
   * @returns BuySignalResult - 買入信號結果
   */
  const checkBuySignal = (
    current: StockData,
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
    const confidence = calculateConfidence(current, previous);
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

  /**
   * 賣出信號檢查器 (優化版)
   *
   * 用途：綜合多種出場條件判斷是否應該賣出股票
   * 出場條件：
   * 1. 基礎停利停損
   * 2. 追蹤停利機制 (高優先級)
   * 3. ATR動態停損 (中優先級)
   * 4. 持有天數保護 (中優先級)
   * 5. 技術指標確認
   *
   * @param current - 當前股票數據
   * @param position - 持倉資訊
   * @param holdingDays - 持有天數
   * @returns SellSignalResult - 賣出信號結果
   */
  const checkSellSignal = (
    current: StockData,
    position: Position,
    holdingDays: number,
  ): SellSignalResult => {
    const currentPrice = current.close;
    const entryPrice = position.entryPrice;
    const profitRate = (currentPrice - entryPrice) / entryPrice;

    // 更新進場後最高價 (追蹤停利用)
    if (currentPrice > position.highPriceSinceEntry) {
      position.highPriceSinceEntry = currentPrice;
    }

    // 高優先級: 追蹤停利機制
    if (strategyParams.enableTrailingStop) {
      const profitSinceEntry =
        (position.highPriceSinceEntry - entryPrice) / entryPrice;

      // 只有獲利超過啟動門檻才啟用追蹤停利
      if (profitSinceEntry >= strategyParams.trailingActivatePercent) {
        const trailingStopPrice =
          position.highPriceSinceEntry *
          (1 - strategyParams.trailingStopPercent);
        position.trailingStopPrice = trailingStopPrice;

        if (currentPrice <= trailingStopPrice) {
          return {
            signal: true,
            reason: `追蹤停利出場，最高點回落: ${(
              strategyParams.trailingStopPercent * 100
            ).toFixed(1)}%，獲利: ${(profitRate * 100).toFixed(2)}%`,
          };
        }
      }
    }

    // 中優先級: ATR動態停損
    if (strategyParams.enableATRStop && position.atrStopPrice) {
      if (currentPrice <= position.atrStopPrice) {
        return {
          signal: true,
          reason: `ATR動態停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
        };
      }
    }

    // 基礎停利停損
    if (profitRate >= strategyParams.stopProfit) {
      return {
        signal: true,
        reason: `固定停利出場，獲利: ${(profitRate * 100).toFixed(2)}%`,
      };
    }

    if (profitRate <= -strategyParams.stopLoss) {
      return {
        signal: true,
        reason: `固定停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
      };
    }

    // 中優先級: 持有天數保護 (避免剛進場就被技術指標洗出)
    if (holdingDays <= strategyParams.minHoldingDays) {
      // 在保護期內，只允許重大虧損出場
      if (profitRate <= -strategyParams.stopLoss * 1.5) {
        return {
          signal: true,
          reason: `保護期內重大虧損出場，虧損: ${(profitRate * 100).toFixed(
            2,
          )}%`,
        };
      }
      // 其他情況不出場
      return { signal: false, reason: '' };
    }

    // 技術指標出場 (保護期後才生效)
    if ((current.rsi || 0) > 70) {
      return { signal: true, reason: 'RSI超買出場' };
    }

    if (
      (current.macd || 0) < (current.macdSignal || 0) &&
      (current.macdHistogram || 0) < 0
    ) {
      return { signal: true, reason: 'MACD死亡交叉出場' };
    }

    // 長期持有出場
    if (holdingDays > 30) {
      return { signal: true, reason: '持有超過30天出場' };
    }

    return { signal: false, reason: '' };
  };

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
  const calculateDynamicPositionSize = (
    confidence: number,
    currentTotalExposure: number,
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

  /**
   * 計算當前總曝險度
   *
   * @param positions - 當前持倉記錄
   * @param currentCapital - 當前資金
   * @param allStockData - 所有股票數據
   * @param currentDateStr - 當前日期字串
   * @returns number - 總曝險度比例 (0-1)
   */
  const calculateCurrentExposure = (
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

  /**
   * 回測引擎主函數
   *
   * 用途：執行完整的股票投資策略回測流程
   * 主要流程：
   * 1. 獲取所有股票的歷史數據
   * 2. 計算技術指標
   * 3. 按時間順序模擬交易
   * 4. 執行買賣信號檢查
   * 5. 管理資金和倉位
   * 6. 記錄所有交易明細
   * 7. 計算績效統計數據
   *
   * 倉位管理：
   * - 根據信心度動態調整投入比例
   * - 單檔最大持倉不超過25%
   * - 考慮交易成本 (買入+0.1425%, 賣出-0.35%)
   *
   * @returns void - 結果存儲在 results state 中
   */
  const runBacktest = async () => {
    console.log('🔥🔥🔥 回測按鈕被點擊了！開始執行回測...');
    setLoading(true);

    try {
      let currentCapital = initialCapital;
      const trades: TradeResult[] = [];
      const positions: Record<string, Position> = {};
      const equityCurve: {
        date: string;
        value: number;
        cash: number;
        positions: number;
      }[] = [];

      console.log('🚀 開始獲取真實股票數據...');
      console.log('💡 請打開瀏覽器的開發者工具 Network 頁籤來查看 API 請求！');

      const allStockData: Record<string, StockData[]> = {};
      for (const stock of stocks) {
        console.log(`📈 正在處理 ${stock}...`);
        try {
          const rawData = await generateStockData(stock, startDate, endDate);
          if (rawData && rawData.length > 0) {
            const processedData = calculateIndicators(rawData);
            allStockData[stock] = processedData;
            console.log(`✅ ${stock} 數據處理完成: ${rawData.length} 天`);
            console.log(
              `🔍 ${stock} 處理後數據範例:`,
              processedData.slice(0, 3).map((d) => ({
                date: d.date.toISOString().split('T')[0],
                rsi: d.rsi,
                macd: d.macd,
              })),
            );
          } else {
            console.warn(`⚠️ ${stock} 數據為空，跳過處理`);
          }
        } catch (error) {
          console.error(`❌ ${stock} 數據獲取失敗:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const validStocks = Object.keys(allStockData).filter(
        (stock) => allStockData[stock] && allStockData[stock].length > 0,
      );

      if (validStocks.length === 0) {
        throw new Error('無法獲取任何股票的有效數據');
      }

      console.log(
        `📊 成功獲取 ${validStocks.length} 支股票的數據，開始回測...`,
      );

      const allDates = [
        ...new Set(
          Object.values(allStockData)
            .flat()
            .map((d) => d.date.toISOString().split('T')[0]),
        ),
      ].sort();

      for (const dateStr of allDates) {
        const currentDate = new Date(dateStr);

        for (const stock of validStocks) {
          const stockData = allStockData[stock];
          const currentIndex = stockData.findIndex(
            (d) => d.date.toISOString().split('T')[0] === dateStr,
          );

          // 確保指標數據已經計算完成（至少需要 MACD 計算完成的天數）
          const minRequiredIndex =
            strategyParams.macdSlow + strategyParams.macdSignal;
          if (currentIndex < minRequiredIndex) continue;

          const current = stockData[currentIndex];
          const previous = stockData[currentIndex - 1];

          // 確認當前數據有完整的技術指標
          if (!current.rsi || !current.macd || !current.macdSignal) {
            console.log(
              `🚫 ${dateStr} ${stock} 指標數據不完整: RSI=${current.rsi}, MACD=${current.macd}, Signal=${current.macdSignal}`,
            );
            continue;
          }

          // 添加調試信息來檢查數據
          if (currentIndex < minRequiredIndex + 5) {
            console.log(
              `🔍 ${dateStr} ${stock} - Index: ${currentIndex}, RSI: ${current.rsi?.toFixed(
                2,
              )}, MACD: ${current.macd?.toFixed(
                4,
              )}, Signal: ${current.macdSignal?.toFixed(4)}`,
            );
          }

          if (positions[stock]) {
            const position = positions[stock];
            const holdingDays = Math.floor(
              (currentDate.getTime() - position.entryDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const sellCheck = checkSellSignal(current, position, holdingDays);

            if (sellCheck.signal) {
              const sellAmount = current.close * position.quantity * 0.9965;
              const profit = sellAmount - position.investAmount;
              const profitRate = profit / position.investAmount;

              trades.push({
                stock,
                action: 'SELL',
                date: currentDate,
                price: current.close,
                quantity: position.quantity,
                amount: sellAmount,
                entryPrice: position.entryPrice,
                entryDate: position.entryDate,
                holdingDays,
                profit,
                profitRate,
                confidence: position.confidence,
                reason: sellCheck.reason,
              });

              currentCapital += sellAmount;
              delete positions[stock];
            }
          }

          if (!positions[stock]) {
            const buyCheck = checkBuySignal(current, previous);

            if (buyCheck.signal) {
              // 優化版：使用動態倉位管理系統
              const currentExposure = calculateCurrentExposure(
                positions,
                currentCapital,
                allStockData,
                dateStr,
              );

              const dynamicPositionSize = calculateDynamicPositionSize(
                buyCheck.confidence || 0,
                currentExposure,
              );

              const investAmount = Math.min(
                currentCapital * dynamicPositionSize,
                currentCapital * strategyParams.maxPositionSize,
              );

              console.log(`💰 ${dateStr} ${stock} 倉位計算:
								信心度: ${((buyCheck.confidence || 0) * 100).toFixed(1)}%
								當前曝險度: ${(currentExposure * 100).toFixed(1)}%
								動態倉位: ${(dynamicPositionSize * 100).toFixed(1)}%
								投資金額: ${investAmount.toLocaleString()}`);

              if (investAmount > 10000) {
                const quantity = Math.floor(
                  investAmount / (current.close * 1.001425),
                );
                const actualInvestAmount = current.close * quantity * 1.001425;

                if (actualInvestAmount <= currentCapital) {
                  positions[stock] = {
                    entryDate: currentDate,
                    entryPrice: current.close,
                    quantity,
                    investAmount: actualInvestAmount,
                    confidence: buyCheck.confidence,
                    // 初始化追蹤停利相關欄位
                    highPriceSinceEntry: current.close,
                    trailingStopPrice:
                      current.close * (1 - strategyParams.trailingStopPercent),
                    atrStopPrice: current.atr
                      ? current.close -
                        strategyParams.atrMultiplier * current.atr
                      : undefined,
                    entryATR: current.atr,
                  };

                  trades.push({
                    stock,
                    action: 'BUY',
                    date: currentDate,
                    price: current.close,
                    quantity,
                    amount: actualInvestAmount,
                    confidence: buyCheck.confidence,
                    reason: buyCheck.reason,
                  });

                  currentCapital -= actualInvestAmount;

                  console.log(`✅ ${dateStr} ${stock} 買入成功:
										價格: ${current.close}
										數量: ${quantity}
										金額: ${actualInvestAmount.toLocaleString()}
										剩餘現金: ${currentCapital.toLocaleString()}`);
                }
              } else {
                console.log(
                  `💸 ${dateStr} ${stock} 投資金額不足最低要求 (${investAmount.toLocaleString()} < 10,000)`,
                );
              }
            }
          }
        }

        let positionValue = 0;
        for (const [stock, position] of Object.entries(positions)) {
          const stockData = allStockData[stock];
          const currentData = stockData.find(
            (d) => d.date.toISOString().split('T')[0] === dateStr,
          );
          if (currentData) {
            positionValue += currentData.close * position.quantity;
          }
        }

        const totalValue = currentCapital + positionValue;
        equityCurve.push({
          date: dateStr,
          value: totalValue,
          cash: currentCapital,
          positions: positionValue,
        });
      }

      const completedTrades = trades.filter((t) => t.action === 'SELL');
      const winningTrades = completedTrades.filter((t) => (t.profit || 0) > 0);
      const losingTrades = completedTrades.filter((t) => (t.profit || 0) <= 0);

      const finalValue =
        equityCurve.length > 0
          ? equityCurve[equityCurve.length - 1].value
          : initialCapital;
      const totalReturn = (finalValue - initialCapital) / initialCapital;
      const years =
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const annualReturn =
        years > 0 ? Math.pow(finalValue / initialCapital, 1 / years) - 1 : 0;

      const resultsData = {
        performance: {
          initialCapital,
          finalCapital: finalValue,
          totalReturn,
          annualReturn,
          totalProfit: finalValue - initialCapital,
        },
        trades: {
          totalTrades: completedTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          winRate:
            completedTrades.length > 0
              ? winningTrades.length / completedTrades.length
              : 0,
          avgWin:
            winningTrades.length > 0
              ? winningTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) /
                winningTrades.length
              : 0,
          avgLoss:
            losingTrades.length > 0
              ? losingTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) /
                losingTrades.length
              : 0,
          maxWin:
            winningTrades.length > 0
              ? Math.max(...winningTrades.map((t) => t.profitRate || 0))
              : 0,
          maxLoss:
            losingTrades.length > 0
              ? Math.min(...losingTrades.map((t) => t.profitRate || 0))
              : 0,
          avgHoldingDays:
            completedTrades.length > 0
              ? completedTrades.reduce(
                  (sum, t) => sum + (t.holdingDays || 0),
                  0,
                ) / completedTrades.length
              : 0,
          // 新增獲利因子計算
          profitFactor: (() => {
            const totalGains = winningTrades.reduce(
              (sum, t) => sum + Math.abs(t.profit || 0),
              0,
            );
            const totalLosses = losingTrades.reduce(
              (sum, t) => sum + Math.abs(t.profit || 0),
              0,
            );
            return totalLosses > 0
              ? totalGains / totalLosses
              : totalGains > 0
              ? 999
              : 0;
          })(),
        },
        detailedTrades: completedTrades,
        equityCurve,
        stockPerformance: validStocks.map((stock) => {
          const stockTrades = completedTrades.filter((t) => t.stock === stock);
          const stockWins = stockTrades.filter((t) => (t.profit || 0) > 0);
          return {
            stock,
            trades: stockTrades.length,
            winRate:
              stockTrades.length > 0
                ? stockWins.length / stockTrades.length
                : 0,
            totalProfit: stockTrades.reduce(
              (sum, t) => sum + (t.profit || 0),
              0,
            ),
          };
        }),
      };

      console.log(`🎉 回測完成！共執行 ${completedTrades.length} 筆交易`);
      setResults(resultsData);
    } catch (error: unknown) {
      console.error('❌ 回測執行錯誤:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`回測執行失敗: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 股票添加功能
   *
   * 用途：將新股票代碼添加到回測股票清單
   * 驗證：
   * - 檢查股票代碼不為空
   * - 檢查不重複添加
   * - 成功添加後清空輸入框
   *
   * @returns void
   */
  const addStock = () => {
    if (newStock && !stocks.includes(newStock)) {
      setStocks([...stocks, newStock]);
      setNewStock('');
    }
  };

  /**
   * 股票移除功能
   *
   * 用途：從回測股票清單中移除指定股票
   *
   * @param stockToRemove - 要移除的股票代碼
   * @returns void
   */
  const removeStock = (stockToRemove: string) => {
    setStocks(stocks.filter((stock) => stock !== stockToRemove));
  };

  /**
   * 貨幣格式化工具
   *
   * 用途：將數字格式化為台幣顯示格式
   * 格式：NT$ 1,000,000
   *
   * @param value - 要格式化的數值
   * @returns string - 格式化後的貨幣字串
   */
  const formatCurrency = (value: number): string => {
    return `NT$ ${value.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}`;
  };

  /**
   * 百分比格式化工具
   *
   * 用途：將小數格式化為百分比顯示
   * 格式：12.34%
   *
   * @param value - 要格式化的數值 (0.1234 -> 12.34%)
   * @returns string - 格式化後的百分比字串
   */
  const formatPercent = (value: number): string => {
    return (value * 100).toFixed(2) + '%';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
          策略3.2 優化動態回測系統
        </h1>
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full shadow-lg">
            🚀 結合 Python & React 優點的智能回測引擎
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🐍 Python精華</h3>
            <ul className="text-blue-700 space-y-1 text-xs">
              <li>• 階層決策系統</li>
              <li>• 動態倉位管理</li>
              <li>• 嚴格信號篩選</li>
              <li>• 風險曝險控制</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">⚛️ React優勢</h3>
            <ul className="text-green-700 space-y-1 text-xs">
              <li>• 即時參數調整</li>
              <li>• 視覺化分析</li>
              <li>• 多資料源整合</li>
              <li>• 完整追蹤停利</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">✨ 融合創新</h3>
            <ul className="text-purple-700 space-y-1 text-xs">
              <li>• 雙模式切換</li>
              <li>• 智能風控</li>
              <li>• 專業指標算法</li>
              <li>• 最佳化參數</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">股票設定</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入股票代碼"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStock()}
              />
              <button
                onClick={addStock}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                新增
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stocks.map((stock) => (
                <span
                  key={stock}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {stock}
                  <button
                    onClick={() => removeStock(stock)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">回測期間</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  開始日期
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  結束日期
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">資金設定</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                初始資金 (NT$)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">策略參數</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                RSI週期
              </label>
              <input
                type="number"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.rsiPeriod}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    rsiPeriod: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                RSI超賣
              </label>
              <input
                type="number"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.rsiOversold}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    rsiOversold: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                MACD快線
              </label>
              <input
                type="number"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.macdFast}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    macdFast: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                MACD慢線
              </label>
              <input
                type="number"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.macdSlow}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    macdSlow: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                信心度門檻
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-yellow-50"
                value={strategyParams.confidenceThreshold}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    confidenceThreshold: Number(e.target.value),
                  })
                }
                title="設定進場所需的最低信心度 (0.0-1.0)，數值越高進場越嚴格"
              />
              <div className="text-xs text-yellow-600 mt-1">
                {(strategyParams.confidenceThreshold * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                停損(%)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.stopLoss}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    stopLoss: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                停利(%)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={strategyParams.stopProfit}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    stopProfit: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              💡 信心度門檻設定指南 (已優化至70%)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700">
              <div>
                <strong>保守型 (0.75-0.85)</strong>
                <br />
                極度嚴格進場，勝率極高但交易稀少
              </div>
              <div>
                <strong>最佳型 (0.70-0.75)</strong> ⭐
                <br />
                Python優化參數，平衡勝率與頻率
              </div>
              <div>
                <strong>積極型 (0.60-0.70)</strong>
                <br />
                適度放寬條件，增加交易機會
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              <strong>目前設定：</strong>
              {strategyParams.confidenceThreshold >= 0.75
                ? '保守型'
                : strategyParams.confidenceThreshold >= 0.7
                ? '最佳型 🎯'
                : strategyParams.confidenceThreshold >= 0.6
                ? '積極型'
                : '過度積進'}
              ({(strategyParams.confidenceThreshold * 100).toFixed(0)}%)
            </div>
          </div>

          {/* 新增進階參數設定區域 */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-700 mb-4">
              🎯 進階風控參數 (策略3.2優化版)
            </h4>

            {/* 高優先級參數 */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-green-700 mb-2">
                ⭐⭐⭐ 高優先級功能
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.enableTrailingStop}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          enableTrailingStop: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-green-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      啟用追蹤停利
                    </span>
                  </label>
                  {strategyParams.enableTrailingStop && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600">
                          追蹤停利 (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.2"
                          className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-1 focus:ring-green-500"
                          value={strategyParams.trailingStopPercent}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              trailingStopPercent: Number(e.target.value),
                            })
                          }
                        />
                        <div className="text-xs text-green-600">
                          {(strategyParams.trailingStopPercent * 100).toFixed(
                            1,
                          )}
                          %回落出場
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">
                          啟動門檻 (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.1"
                          className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-1 focus:ring-green-500"
                          value={strategyParams.trailingActivatePercent}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              trailingActivatePercent: Number(e.target.value),
                            })
                          }
                        />
                        <div className="text-xs text-green-600">
                          獲利
                          {(
                            strategyParams.trailingActivatePercent * 100
                          ).toFixed(1)}
                          %後啟動
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    成交量門檻 (倍)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 bg-orange-50"
                    value={strategyParams.volumeThreshold}
                    onChange={(e) =>
                      setStrategyParams({
                        ...strategyParams,
                        volumeThreshold: Number(e.target.value),
                      })
                    }
                  />
                  <div className="text-xs text-orange-600 mt-1">
                    {strategyParams.volumeThreshold.toFixed(1)}倍平均量
                  </div>
                </div>
              </div>
            </div>

            {/* 中優先級參數 */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-blue-700 mb-2">
                ⭐⭐ 中優先級功能
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.enableATRStop}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          enableATRStop: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      ATR動態停損
                    </span>
                  </label>
                  {strategyParams.enableATRStop && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600">
                          ATR週期
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="30"
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                          value={strategyParams.atrPeriod}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              atrPeriod: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">
                          ATR倍數
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="4.0"
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                          value={strategyParams.atrMultiplier}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              atrMultiplier: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    最小持有天數
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500"
                    value={strategyParams.minHoldingDays}
                    onChange={(e) =>
                      setStrategyParams({
                        ...strategyParams,
                        minHoldingDays: Number(e.target.value),
                      })
                    }
                  />
                  <div className="text-xs text-purple-600 mt-1">
                    保護期{strategyParams.minHoldingDays}天
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.enablePriceMomentum}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          enablePriceMomentum: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      價格動能指標
                    </span>
                  </label>
                  {strategyParams.enablePriceMomentum && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600">
                          動能週期
                        </label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                          value={strategyParams.priceMomentumPeriod}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              priceMomentumPeriod: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">
                          動能門檻 (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="0.1"
                          className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                          value={strategyParams.priceMomentumThreshold}
                          onChange={(e) =>
                            setStrategyParams({
                              ...strategyParams,
                              priceMomentumThreshold: Number(e.target.value),
                            })
                          }
                        />
                        <div className="text-xs text-indigo-600">
                          {(
                            strategyParams.priceMomentumThreshold * 100
                          ).toFixed(1)}
                          %動能門檻
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 低優先級參數 */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-600 mb-2">
                ⭐ 低優先級功能
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.enableMA60}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          enableMA60: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-gray-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      MA60季線確認
                    </span>
                  </label>
                  <div className="text-xs text-gray-500 mt-1">長期趨勢過濾</div>
                </div>
              </div>
            </div>

            {/* 新增：Python風格優化參數 */}
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
              <h5 className="text-sm font-medium text-purple-700 mb-3 flex items-center">
                🐍 Python風格優化功能
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  NEW!
                </span>
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.usePythonLogic}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          usePythonLogic: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-purple-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      Python決策邏輯
                    </span>
                  </label>
                  <div className="text-xs text-purple-600">
                    {strategyParams.usePythonLogic
                      ? '🔥 嚴格模式'
                      : '😊 寬鬆模式'}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.hierarchicalDecision}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          hierarchicalDecision: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-purple-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      階層決策系統
                    </span>
                  </label>
                  <div className="text-xs text-purple-600">層層篩選信號</div>
                </div>

                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={strategyParams.dynamicPositionSize}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          dynamicPositionSize: e.target.checked,
                        })
                      }
                      className="form-checkbox h-4 w-4 text-purple-600"
                    />
                    <span className="text-xs font-medium text-gray-700">
                      動態倉位調整
                    </span>
                  </label>
                  <div className="text-xs text-purple-600">依風險度調倉</div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    最大總曝險度 (%)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="50"
                    max="90"
                    className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500"
                    value={strategyParams.maxTotalExposure * 100}
                    onChange={(e) =>
                      setStrategyParams({
                        ...strategyParams,
                        maxTotalExposure: Number(e.target.value) / 100,
                      })
                    }
                  />
                  <div className="text-xs text-purple-600 mt-1">
                    風險控制上限
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2 bg-white bg-opacity-60 rounded border border-purple-200">
                <div className="text-xs text-purple-700 space-y-1">
                  <div>
                    <strong>Python風格特色：</strong>
                  </div>
                  <div>• 更嚴格的RSI門檻 (30→35)</div>
                  <div>• 階層式決策流程</div>
                  <div>• 動態風險控制倉位</div>
                  <div>• 總曝險度自動調節</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              🚀 策略3.2優化功能說明 (已設定最佳參數)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-700 mb-3">
              <div>
                <strong>追蹤停利機制</strong>
                <br />
                獲利3%後啟動，5%回落出場保護利潤
              </div>
              <div>
                <strong>ATR動態停損</strong>
                <br />
                2倍ATR動態停損，靈活應對波動
              </div>
              <div>
                <strong>持有天數保護</strong>
                <br />
                5天保護期，避免剛進場就被洗出
              </div>
            </div>
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>📈 Python最佳化參數已套用：</strong>
              RSI門檻35 | 成交量1.5倍 | 信心度70% | 價格動能3% | 持有保護5天
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={runBacktest}
            disabled={loading || stocks.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {loading ? '回測中...' : '開始回測'}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              回測結果摘要
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(results.performance.finalCapital)}
                </div>
                <div className="text-sm text-gray-600">最終資金</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatPercent(results.performance.totalReturn)}
                </div>
                <div className="text-sm text-gray-600">總報酬率</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPercent(results.performance.annualReturn)}
                </div>
                <div className="text-sm text-gray-600">年化報酬</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatPercent(results.trades.winRate)}
                </div>
                <div className="text-sm text-gray-600">勝率</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">交易統計</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {results.trades.totalTrades}
                </div>
                <div className="text-sm text-gray-600">總交易次數</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {results.trades.winningTrades}
                </div>
                <div className="text-sm text-gray-600">獲利交易</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold text-red-600">
                  {results.trades.losingTrades}
                </div>
                <div className="text-sm text-gray-600">虧損交易</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {formatPercent(results.trades.avgWin)}
                </div>
                <div className="text-sm text-gray-600">平均獲利</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {formatPercent(results.trades.avgLoss)}
                </div>
                <div className="text-sm text-gray-600">平均虧損</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {formatPercent(results.trades.maxWin)}
                </div>
                <div className="text-sm text-gray-600">最大獲利</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {formatPercent(results.trades.maxLoss)}
                </div>
                <div className="text-sm text-gray-600">最大虧損</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-lg font-semibold">
                  {results.trades.avgHoldingDays.toFixed(1)}天
                </div>
                <div className="text-sm text-gray-600">平均持股天數</div>
              </div>
              <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="text-lg font-semibold text-blue-600">
                  {results.trades.profitFactor >= 999
                    ? '∞'
                    : results.trades.profitFactor.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">獲利因子</div>
                <div className="text-xs text-gray-500 mt-1">
                  {results.trades.profitFactor >= 2.0
                    ? '優秀'
                    : results.trades.profitFactor >= 1.5
                    ? '良好'
                    : results.trades.profitFactor >= 1.0
                    ? '及格'
                    : '需改進'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">資金曲線</h3>
              <div className="w-full h-80">
                <LineChart
                  width={500}
                  height={300}
                  data={results.equityCurve.slice(-100)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString()
                    }
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'value'
                        ? '總資產'
                        : name === 'cash'
                        ? '現金'
                        : '持倉',
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="總資產"
                  />
                  <Line
                    type="monotone"
                    dataKey="cash"
                    stroke="#82ca9d"
                    strokeWidth={1}
                    name="現金"
                  />
                  <Line
                    type="monotone"
                    dataKey="positions"
                    stroke="#ffc658"
                    strokeWidth={1}
                    name="持倉"
                  />
                </LineChart>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">個股表現</h3>
              <div className="w-full h-80">
                <BarChart
                  width={500}
                  height={300}
                  data={results.stockPerformance}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stock" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'totalProfit'
                        ? formatCurrency(Number(value))
                        : name === 'winRate'
                        ? formatPercent(Number(value))
                        : value,
                      name === 'totalProfit'
                        ? '總獲利'
                        : name === 'winRate'
                        ? '勝率'
                        : '交易次數',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalProfit" fill="#8884d8" name="總獲利" />
                </BarChart>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              交易結果分布
            </h3>
            <div className="flex justify-center">
              <PieChart width={400} height={300}>
                <Pie
                  data={[
                    {
                      name: '獲利交易',
                      value: results.trades.winningTrades,
                      fill: '#00C49F',
                    },
                    {
                      name: '虧損交易',
                      value: results.trades.losingTrades,
                      fill: '#FF8042',
                    },
                  ]}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: '獲利交易', value: results.trades.winningTrades },
                    { name: '虧損交易', value: results.trades.losingTrades },
                  ].map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              詳細交易記錄
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">股票</th>
                    <th className="px-4 py-2 text-left">進場日期</th>
                    <th className="px-4 py-2 text-left">出場日期</th>
                    <th className="px-4 py-2 text-right">進場價</th>
                    <th className="px-4 py-2 text-right">出場價</th>
                    <th className="px-4 py-2 text-center">持有天數</th>
                    <th className="px-4 py-2 text-center">信心度</th>
                    <th className="px-4 py-2 text-right">獲利率</th>
                    <th className="px-4 py-2 text-right">獲利金額</th>
                    <th className="px-4 py-2 text-left">出場原因</th>
                  </tr>
                </thead>
                <tbody>
                  {results.detailedTrades.slice(-20).map((trade, index) => (
                    <tr
                      key={index}
                      className={`border-b ${
                        (trade.profit || 0) > 0 ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{trade.stock}</td>
                      <td className="px-4 py-2">
                        {trade.entryDate?.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        {trade.date.toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {trade.entryPrice?.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {trade.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {trade.holdingDays}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            (trade.confidence || 0) >= 0.7
                              ? 'bg-green-100 text-green-800'
                              : (trade.confidence || 0) >= 0.5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {trade.confidence
                            ? `${(trade.confidence * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          (trade.profit || 0) > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatPercent(trade.profitRate || 0)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          (trade.profit || 0) > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(trade.profit || 0)}
                      </td>
                      <td className="px-4 py-2 text-xs">{trade.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.detailedTrades.length > 20 && (
              <div className="mt-4 text-center text-gray-500">
                顯示最近20筆交易，共{results.detailedTrades.length}筆
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              策略分析建議
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">
                  ✅ 策略優勢
                </h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>
                    • 勝率: {formatPercent(results.trades.winRate)}{' '}
                    {results.trades.winRate > 0.7
                      ? '(優秀)'
                      : results.trades.winRate > 0.6
                      ? '(良好)'
                      : '(需改進)'}
                  </li>
                  <li>
                    • 年化報酬:{' '}
                    {formatPercent(results.performance.annualReturn)}{' '}
                    {results.performance.annualReturn > 0.15
                      ? '(優秀)'
                      : results.performance.annualReturn > 0.1
                      ? '(良好)'
                      : '(一般)'}
                  </li>
                  <li>
                    • 平均持股: {results.trades.avgHoldingDays.toFixed(1)}天
                    (適中週期)
                  </li>
                  <li>• 風險控制: 有明確停損停利機制</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-orange-600 mb-2">
                  ⚠️ 改進建議
                </h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  {results.trades.winRate < 0.6 && (
                    <li>• 考慮提高進場門檻以提升勝率</li>
                  )}
                  {results.trades.avgHoldingDays > 40 && (
                    <li>• 平均持股天數較長，考慮調整出場條件</li>
                  )}
                  {Math.abs(results.trades.avgLoss) >
                    Math.abs(results.trades.avgWin) && (
                    <li>• 虧損幅度大於獲利幅度，需要調整風險報酬比</li>
                  )}
                  <li>• 建議分散投資更多不同產業股票</li>
                  <li>• 可考慮加入市場環境過濾條件</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">使用說明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold mb-2">📈 策略邏輯</h4>
            <ul className="space-y-1">
              <li>
                • <strong>進場條件</strong>: RSI超賣回升 + MACD黃金交叉 +
                成交量放大 + 信心度≥
                {(strategyParams.confidenceThreshold * 100).toFixed(0)}%
              </li>
              <li>
                • <strong>出場條件</strong>: 停利
                {(strategyParams.stopProfit * 100).toFixed(0)}% 或 停損
                {(strategyParams.stopLoss * 100).toFixed(0)}% 或 技術面轉弱
              </li>
              <li>
                • <strong>倉位管理</strong>: 根據信心度動態調整投入比例
              </li>
              <li>
                • <strong>風險控制</strong>: 單檔最大25%，總倉位最大75%
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🔧 參數調整</h4>
            <ul className="space-y-1">
              <li>
                • <strong>RSI週期</strong>: 建議10-21，預設14
              </li>
              <li>
                • <strong>MACD參數</strong>: 快線8-15，慢線20-35
              </li>
              <li>
                • <strong>信心度門檻</strong>: 0.3-0.8，預設0.5
              </li>
              <li>
                • <strong>停損停利</strong>: 可根據個股波動度調整
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>📊 數據來源說明</strong>: 本系統優先使用Yahoo Finance
            API獲取真實台股歷史數據。
            如API無法連接，將自動降級使用增強型模擬數據（基於真實股價特性設計）。
            過去績效不代表未來表現，請謹慎評估風險後使用。
          </p>
        </div>
      </div>
    </div>
  );
};

export default BacktestSystem;
